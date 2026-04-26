import { Resend } from "resend";
import { ArticleStatus } from "@prisma/client";
import prisma from "../lib/prisma";
import { getEmailTemplateById } from "./emailTemplateService";

let resendClient: Resend | null = null;

function isEmailEnabled() {
  return Boolean(process.env.RESEND_API_KEY);
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

interface ArticleForNewsletter {
  metaTitle: string;
  slug: string;
  metaDescription?: string | null;
  coverImageUrl?: string | null;
  authorName?: string | null;
}

interface SendNewsletterInput {
  subject: string;
  content: string;
  html?: string;
  templateId?: string | null;
  articleId?: string | null;
}

function unsubscribeLink(subscriberId: string) {
  return `${FRONTEND_URL}/unsubscribe/${subscriberId}`;
}

function articleLink(slug: string) {
  return `${FRONTEND_URL}/artigos/${slug}`;
}

function wrapNewsletterHtml(content: string, subscriberId: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
        IDEA Newsletter
      </h2>
      <div style="color: #444; font-size: 16px; line-height: 1.6;">
        ${content}
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="color: #999; font-size: 12px;">
        Você recebeu este e-mail porque está inscrito na IDEA Newsletter.
        <a href="${unsubscribeLink(subscriberId)}" style="color: #999;">Cancelar inscrição</a>
      </p>
    </div>
  `;
}

function buildArticleCard(article: ArticleForNewsletter) {
  const url = articleLink(article.slug);

  return `
    <div style="margin-top: 32px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #ffffff;">
      ${article.coverImageUrl ? `<img src="${article.coverImageUrl}" alt="${article.metaTitle}" style="display: block; width: 100%; max-height: 260px; object-fit: cover;" />` : ""}
      <div style="padding: 24px;">
        <p style="margin: 0 0 8px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Artigo em destaque</p>
        <h3 style="margin: 0 0 12px; color: #1a1a1a; font-size: 24px; line-height: 1.3;">${article.metaTitle}</h3>
        ${article.metaDescription ? `<p style="margin: 0 0 20px; color: #444; font-size: 16px; line-height: 1.6;">${article.metaDescription}</p>` : ""}
        <a href="${url}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Leia completo</a>
      </div>
    </div>
  `;
}

function renderTemplateContent(template: string, values: Record<string, string>) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => values[key] ?? "");
}

function composeNewsletterHtml(
  bodyContent: string,
  subscriberId: string,
  templateContent?: string | null,
  articleCard?: string,
  subject?: string,
) {
  if (!templateContent) {
    return wrapNewsletterHtml(
      `${bodyContent}${articleCard ? `<div>${articleCard}</div>` : ""}`,
      subscriberId,
    );
  }

  const renderedTemplate = renderTemplateContent(templateContent, {
    content: bodyContent,
    subject: subject ?? "",
    articleCard: articleCard ?? "",
    unsubscribeUrl: unsubscribeLink(subscriberId),
  });

  const shouldAppendArticleCard = Boolean(articleCard) && !/{{\s*articleCard\s*}}/.test(templateContent);
  const templateWithArticle = shouldAppendArticleCard
    ? `${renderedTemplate}${articleCard}`
    : renderedTemplate;

  if (/{{\s*unsubscribeUrl\s*}}/.test(templateContent)) {
    return templateWithArticle;
  }

  return wrapNewsletterHtml(templateWithArticle, subscriberId);
}

async function getPublishedArticleForNewsletter(articleId: string) {
  return prisma.article.findFirst({
    where: { id: articleId, status: ArticleStatus.PUBLISHED },
    select: {
      metaTitle: true,
      slug: true,
      metaDescription: true,
      coverImageUrl: true,
      authorName: true,
    },
  });
}

export async function sendWelcomeEmail(email: string, subscriberId: string) {
  if (!isEmailEnabled()) return;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a1a1a;">Bem-vindo à IDEA Newsletter! 🎉</h1>
      <p style="color: #444; font-size: 16px; line-height: 1.6;">
        Obrigado por se inscrever! Você agora receberá nossas atualizações e novos artigos diretamente no seu e-mail.
      </p>
      <p style="color: #444; font-size: 16px; line-height: 1.6;">
        Fique de olho na sua caixa de entrada — conteúdos incríveis estão a caminho.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="color: #999; font-size: 12px;">
        Se você não se inscreveu, pode
        <a href="${unsubscribeLink(subscriberId)}" style="color: #999;">cancelar sua inscrição aqui</a>.
      </p>
    </div>
  `;

  await getResendClient().emails.send({
    from: `IDEA Newsletter <${FROM_EMAIL}>`,
    to: email,
    subject: "Bem-vindo à IDEA Newsletter!",
    html,
  });
}

export async function sendArticleNewsletter(article: ArticleForNewsletter) {
  if (!isEmailEnabled()) return;

  const subscribers = await prisma.subscriber.findMany({
    select: { id: true, email: true },
  });

  if (subscribers.length === 0) return;

  const articleUrl = articleLink(article.slug);

  for (const subscriber of subscribers) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
          IDEA Newsletter
        </h2>
        ${article.coverImageUrl ? `<img src="${article.coverImageUrl}" alt="${article.metaTitle}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;" />` : ""}
        <h1 style="color: #1a1a1a; font-size: 24px;">${article.metaTitle}</h1>
        ${article.authorName ? `<p style="color: #888; font-size: 14px;">Por ${article.authorName}</p>` : ""}
        ${article.metaDescription ? `<p style="color: #444; font-size: 16px; line-height: 1.6;">${article.metaDescription}</p>` : ""}
        <a href="${articleUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
          Ler artigo completo
        </a>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          Você recebeu este e-mail porque está inscrito na IDEA Newsletter.
          <a href="${unsubscribeLink(subscriber.id)}" style="color: #999;">Cancelar inscrição</a>
        </p>
      </div>
    `;

    await getResendClient().emails.send({
      from: `IDEA Newsletter <${FROM_EMAIL}>`,
      to: subscriber.email,
      subject: `Novo artigo: ${article.metaTitle}`,
      html,
    });
  }
}

interface NewsForNewsletter {
  metaTitle: string;
  slug: string;
  metaDescription?: string | null;
  coverImageUrl?: string | null;
  authorName?: string | null;
}

export async function sendNewsNewsletter(news: NewsForNewsletter) {
  if (!isEmailEnabled()) return;

  const subscribers = await prisma.subscriber.findMany({
    select: { id: true, email: true },
  });

  if (subscribers.length === 0) return;

  const newsUrl = `${FRONTEND_URL}/news/${news.slug}`;

  for (const subscriber of subscribers) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
          IDEA Newsletter
        </h2>
        ${news.coverImageUrl ? `<img src="${news.coverImageUrl}" alt="${news.metaTitle}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;" />` : ""}
        <h1 style="color: #1a1a1a; font-size: 24px;">${news.metaTitle}</h1>
        ${news.authorName ? `<p style="color: #888; font-size: 14px;">Por ${news.authorName}</p>` : ""}
        ${news.metaDescription ? `<p style="color: #444; font-size: 16px; line-height: 1.6;">${news.metaDescription}</p>` : ""}
        <a href="${newsUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
          Ler notícia completa
        </a>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          Você recebeu este e-mail porque está inscrito na IDEA Newsletter.
          <a href="${unsubscribeLink(subscriber.id)}" style="color: #999;">Cancelar inscrição</a>
        </p>
      </div>
    `;

    await getResendClient().emails.send({
      from: `IDEA Newsletter <${FROM_EMAIL}>`,
      to: subscriber.email,
      subject: `Nova notícia: ${news.metaTitle}`,
      html,
    });
  }
}

export async function sendNewsletter(input: SendNewsletterInput | string, legacyContent?: string) {
  const payload: SendNewsletterInput =
    typeof input === "string"
      ? {
          subject: input,
          content: legacyContent ?? "",
        }
      : {
          ...input,
          html: input.html ?? input.content,
        };

  const subscribers = await prisma.subscriber.findMany({
    select: { id: true, email: true },
  });

  if (subscribers.length === 0) return 0;
  if (!isEmailEnabled()) return 0;

  const template = payload.templateId
    ? await getEmailTemplateById(payload.templateId)
    : null;

  const article = payload.articleId
    ? await getPublishedArticleForNewsletter(payload.articleId)
    : null;

  if (payload.templateId && !template) {
    const error = new Error("Email template not found") as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  if (payload.articleId && !article) {
    const error = new Error("Published article not found") as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const baseContent = payload.html ?? payload.content;
  const articleCard = article ? buildArticleCard(article) : "";

  let sent = 0;

  for (const subscriber of subscribers) {
    const html = composeNewsletterHtml(
      baseContent,
      subscriber.id,
      template?.content,
      articleCard,
      payload.subject,
    );

    await getResendClient().emails.send({
      from: `IDEA Newsletter <${FROM_EMAIL}>`,
      to: subscriber.email,
      subject: payload.subject,
      html,
    });

    sent++;
  }

  return sent;
}
