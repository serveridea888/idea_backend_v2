import crypto from "node:crypto";

import { GoogleAuth } from "google-auth-library";
import { TranslationStatus } from "@prisma/client";

import prisma from "../lib/prisma";

export const TRANSLATION_LOCALES = ["en", "zh-CN"] as const;
const MAX_ATTEMPTS = Number(process.env.TRANSLATION_MAX_ATTEMPTS ?? 3);
const STALE_PROCESSING_MS = Number(process.env.TRANSLATION_STALE_MS ?? 60_000);
const POLL_MS = Number(process.env.TRANSLATION_POLL_MS ?? 5_000);
const PROVIDER_TIMEOUT_MS = Number(process.env.TRANSLATION_PROVIDER_TIMEOUT_MS ?? 30_000);

type Source = { metaTitle: string; metaDescription: string | null; content: string };

function isRetryableSetupFailure(lastError: string | null) {
  return lastError === "Google Cloud Translation is not configured" || Boolean(lastError?.includes("Empty request."));
}

function withProviderTimeout<T>(promise: Promise<T>, stage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Google Cloud Translation ${stage} timed out`)), PROVIDER_TIMEOUT_MS)),
  ]);
}

export function translationHash(source: Source) {
  const { metaTitle, metaDescription, content } = source;
  return crypto.createHash("sha256").update(JSON.stringify({ metaTitle, metaDescription, content })).digest("hex");
}

export async function scheduleArticleTranslations(article: Source & { id: string; status: string }) {
  if (article.status !== "PUBLISHED") return;
  const sourceHash = translationHash(article);
  await Promise.all(TRANSLATION_LOCALES.map(async (locale) => {
    const existing = await prisma.articleTranslation.findUnique({ where: { articleId_locale: { articleId: article.id, locale } } });
    if (!existing) {
      await prisma.articleTranslation.create({ data: { articleId: article.id, locale, sourceHash, status: TranslationStatus.PENDING } });
    } else if (existing.sourceHash !== sourceHash || (existing.status === TranslationStatus.FAILED && isRetryableSetupFailure(existing.lastError))) {
      await prisma.articleTranslation.update({ where: { id: existing.id }, data: { sourceHash, status: TranslationStatus.PENDING, attempts: 0, lastError: null, processingAt: null, completedAt: null } });
    }
  }));
}

export async function scheduleNewsTranslations(news: Source & { id: string; status: string }) {
  if (news.status !== "PUBLISHED") return;
  const sourceHash = translationHash(news);
  await Promise.all(TRANSLATION_LOCALES.map(async (locale) => {
    const existing = await prisma.newsTranslation.findUnique({ where: { newsId_locale: { newsId: news.id, locale } } });
    if (!existing) {
      await prisma.newsTranslation.create({ data: { newsId: news.id, locale, sourceHash, status: TranslationStatus.PENDING } });
    } else if (existing.sourceHash !== sourceHash || (existing.status === TranslationStatus.FAILED && isRetryableSetupFailure(existing.lastError))) {
      await prisma.newsTranslation.update({ where: { id: existing.id }, data: { sourceHash, status: TranslationStatus.PENDING, attempts: 0, lastError: null, processingAt: null, completedAt: null } });
    }
  }));
}

async function scheduleLegacyContentTranslations() {
  const [articles, news] = await Promise.all([
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, status: true, metaTitle: true, metaDescription: true, content: true },
    }),
    prisma.news.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, status: true, metaTitle: true, metaDescription: true, content: true },
    }),
  ]);

  await Promise.all([
    ...articles.map(scheduleArticleTranslations),
    ...news.map(scheduleNewsTranslations),
  ]);

  return { articles: articles.length, news: news.length };
}

function client() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  if (!projectId) return null;
  const credentials = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON)
    : undefined;
  return {
    projectId,
    auth: new GoogleAuth({
      projectId,
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-translation"],
    }),
  };
}

async function translate(source: Source, locale: string) {
  const configured = client();
  if (!configured) throw new Error("Google Cloud Translation is not configured");
  console.info("Translation provider authentication started", { locale });
  const accessToken = await withProviderTimeout(configured.auth.getAccessToken(), "authentication");
  if (!accessToken) throw new Error("Google Cloud Translation authentication returned no token");
  const fields = [
    ["metaTitle", source.metaTitle],
    ["metaDescription", source.metaDescription],
    ["content", source.content],
  ].filter((entry): entry is ["metaTitle" | "metaDescription" | "content", string] => Boolean(entry[1]?.trim()));
  if (!fields.length) throw new Error("Translation source is empty");
  console.info("Translation provider request started", { locale });
  const response = await fetch(
    `https://translation.googleapis.com/v3/projects/${configured.projectId}/locations/global:translateText`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceLanguageCode: "pt",
        targetLanguageCode: locale,
        mimeType: "text/html",
        contents: fields.map(([, value]) => value),
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    },
  );
  if (!response.ok) throw new Error(`Google Cloud Translation request failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  const payload = await response.json() as { translations?: Array<{ translatedText?: string }> };
  const values = payload.translations?.map((item) => item.translatedText ?? "") ?? [];
  if (values.length !== fields.length) throw new Error("Unexpected translation response");
  const translated = Object.fromEntries(fields.map(([field], index) => [field, values[index]]));
  return {
    metaTitle: translated.metaTitle ?? source.metaTitle,
    metaDescription: source.metaDescription ? translated.metaDescription ?? source.metaDescription : null,
    content: translated.content ?? source.content,
  };
}

let running = false;
async function processArticle() {
  const job = await prisma.articleTranslation.findFirst({ where: { status: TranslationStatus.PENDING }, include: { article: true }, orderBy: { updatedAt: "asc" } });
  if (!job) return false;
  const claimed = await prisma.articleTranslation.updateMany({ where: { id: job.id, status: TranslationStatus.PENDING }, data: { status: TranslationStatus.PROCESSING, processingAt: new Date(), attempts: { increment: 1 } } });
  if (!claimed.count) return true;
  console.info("Translation processing", { contentType: "article", contentId: job.articleId, locale: job.locale });
  try {
    const source = { metaTitle: job.article.metaTitle, metaDescription: job.article.metaDescription, content: job.article.content };
    if (translationHash(source) !== job.sourceHash) { await scheduleArticleTranslations(job.article); return true; }
    const result = await translate(source, job.locale);
    await prisma.articleTranslation.update({ where: { id: job.id }, data: { ...result, status: TranslationStatus.READY, completedAt: new Date(), processingAt: null, lastError: null } });
    console.info("Translation ready", { contentType: "article", contentId: job.articleId, locale: job.locale });
  } catch (error) {
    const lastError = error instanceof Error ? error.message.slice(0, 500) : "Translation failed";
    await prisma.articleTranslation.update({ where: { id: job.id }, data: { status: job.attempts + 1 >= MAX_ATTEMPTS ? TranslationStatus.FAILED : TranslationStatus.PENDING, processingAt: null, lastError } });
    console.error("Translation failed", { contentType: "article", contentId: job.articleId, locale: job.locale, attempts: job.attempts + 1, error: lastError });
  }
  return true;
}

async function processNews() {
  const job = await prisma.newsTranslation.findFirst({ where: { status: TranslationStatus.PENDING }, include: { news: true }, orderBy: { updatedAt: "asc" } });
  if (!job) return false;
  const claimed = await prisma.newsTranslation.updateMany({ where: { id: job.id, status: TranslationStatus.PENDING }, data: { status: TranslationStatus.PROCESSING, processingAt: new Date(), attempts: { increment: 1 } } });
  if (!claimed.count) return true;
  console.info("Translation processing", { contentType: "news", contentId: job.newsId, locale: job.locale });
  try {
    const source = { metaTitle: job.news.metaTitle, metaDescription: job.news.metaDescription, content: job.news.content };
    if (translationHash(source) !== job.sourceHash) { await scheduleNewsTranslations(job.news); return true; }
    const result = await translate(source, job.locale);
    await prisma.newsTranslation.update({ where: { id: job.id }, data: { ...result, status: TranslationStatus.READY, completedAt: new Date(), processingAt: null, lastError: null } });
    console.info("Translation ready", { contentType: "news", contentId: job.newsId, locale: job.locale });
  } catch (error) {
    const lastError = error instanceof Error ? error.message.slice(0, 500) : "Translation failed";
    await prisma.newsTranslation.update({ where: { id: job.id }, data: { status: job.attempts + 1 >= MAX_ATTEMPTS ? TranslationStatus.FAILED : TranslationStatus.PENDING, processingAt: null, lastError } });
    console.error("Translation failed", { contentType: "news", contentId: job.newsId, locale: job.locale, attempts: job.attempts + 1, error: lastError });
  }
  return true;
}

async function processTranslationQueue() {
  if (running) return;
  running = true;
  try {
    await prisma.articleTranslation.updateMany({ where: { status: TranslationStatus.PROCESSING, processingAt: { lt: new Date(Date.now() - STALE_PROCESSING_MS) } }, data: { status: TranslationStatus.PENDING, processingAt: null } });
    await prisma.newsTranslation.updateMany({ where: { status: TranslationStatus.PROCESSING, processingAt: { lt: new Date(Date.now() - STALE_PROCESSING_MS) } }, data: { status: TranslationStatus.PENDING, processingAt: null } });
    await processArticle() || await processNews();
  } catch (error) { console.error("Translation worker failure", error instanceof Error ? error.message : error); }
  finally { running = false; }
}

export function startTranslationWorker() {
  if (process.env.TRANSLATION_WORKER_ENABLED === "false") return;
  void scheduleLegacyContentTranslations()
    .then(({ articles, news }) => console.info("Translation backfill queued", { articles, news }))
    .then(() => processTranslationQueue())
    .catch((error) => console.error("Translation backfill failure", error instanceof Error ? error.message : error));
  setInterval(() => { void processTranslationQueue(); }, POLL_MS).unref();
}
