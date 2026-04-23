import prisma from "../lib/prisma";
import { ArticleStatus, Prisma } from "@prisma/client";
import { sanitize } from "./sanitizeService";
import { generateSlug } from "../utils/slug";
import { sendArticleNewsletter } from "./emailService";

interface CreateArticleInput {
  metaTitle: string;
  content: string;
  originalLanguage?: string;
  isFeatured?: boolean;
  status?: ArticleStatus;
  coverImageUrl?: string;
  authorName?: string;
  metaDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  publishedAt?: string;
  tagIds?: string[];
}

interface UpdateArticleInput {
  metaTitle?: string;
  slug?: string;
  content?: string;
  originalLanguage?: string;
  isFeatured?: boolean;
  status?: ArticleStatus;
  coverImageUrl?: string;
  authorName?: string;
  metaDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  publishedAt?: string;
  tagIds?: string[];
}

interface ListArticlesParams {
  page?: number;
  limit?: number;
  status?: ArticleStatus;
  tagSlug?: string;
  isFeatured?: boolean;
}

async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

export async function createArticle(data: CreateArticleInput) {
  const slug = await ensureUniqueSlug(generateSlug(data.metaTitle));
  const content = sanitize(data.content);

  const publishedAt =
    data.status === "PUBLISHED"
      ? data.publishedAt
        ? new Date(data.publishedAt)
        : new Date()
      : data.publishedAt
        ? new Date(data.publishedAt)
        : undefined;

  return prisma.article.create({
    data: {
      slug,
      metaTitle: data.metaTitle,
      content,
      originalLanguage: data.originalLanguage ?? "pt",
      isFeatured: data.isFeatured ?? false,
      status: data.status ?? "DRAFT",
      coverImageUrl: data.coverImageUrl,
      authorName: data.authorName,
      metaDescription: data.metaDescription,
      ogImage: data.ogImage,
      canonicalUrl: data.canonicalUrl,
      publishedAt,
      tags: data.tagIds?.length
        ? { create: data.tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: { tags: { include: { tag: true } } },
  });
}

export async function updateArticle(id: string, data: UpdateArticleInput) {
  const currentArticle = await prisma.article.findUnique({
    where: { id },
    select: { status: true, publishedAt: true },
  });

  if (data.tagIds !== undefined) {
    await prisma.articleTag.deleteMany({ where: { articleId: id } });
    if (data.tagIds.length) {
      await prisma.articleTag.createMany({
        data: data.tagIds.map((tagId) => ({ articleId: id, tagId })),
      });
    }
  }

  const slug = data.slug
    ? await ensureUniqueSlug(generateSlug(data.slug), id)
    : undefined;

  let publishedAt: Date | undefined;
  if (data.publishedAt) {
    publishedAt = new Date(data.publishedAt);
  } else if (data.status === "PUBLISHED") {
    if (!currentArticle?.publishedAt) publishedAt = new Date();
  }

  const isBeingPublished =
    data.status === "PUBLISHED" &&
    currentArticle?.status !== "PUBLISHED";

  const updated = await prisma.article.update({
    where: { id },
    data: {
      ...(data.metaTitle !== undefined && { metaTitle: data.metaTitle }),
      ...(slug && { slug }),
      ...(data.content !== undefined && { content: sanitize(data.content) }),
      ...(data.originalLanguage !== undefined && { originalLanguage: data.originalLanguage }),
      ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.coverImageUrl !== undefined && { coverImageUrl: data.coverImageUrl }),
      ...(data.authorName !== undefined && { authorName: data.authorName }),
      ...(data.metaDescription !== undefined && { metaDescription: data.metaDescription }),
      ...(data.ogImage !== undefined && { ogImage: data.ogImage }),
      ...(data.canonicalUrl !== undefined && { canonicalUrl: data.canonicalUrl }),
      ...(publishedAt && { publishedAt }),
    },
    include: { tags: { include: { tag: true } } },
  });

  if (isBeingPublished) {
    sendArticleNewsletter(updated).catch((err) =>
      console.error("Falha ao enviar newsletter do artigo:", err)
    );
  }

  return updated;
}

export async function deleteArticle(id: string) {
  return prisma.article.delete({ where: { id } });
}

export async function getArticleById(id: string) {
  return prisma.article.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } } },
  });
}

export async function getArticleBySlug(slug: string) {
  return prisma.article.findUnique({
    where: { slug },
    include: { tags: { include: { tag: true } } },
  });
}

export async function listArticles(params: ListArticlesParams = {}) {
  const { page = 1, limit = 10, status, tagSlug, isFeatured } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.ArticleWhereInput = {};
  if (status) where.status = status;
  if (isFeatured !== undefined) where.isFeatured = isFeatured;
  if (tagSlug) where.tags = { some: { tag: { slug: tagSlug } } };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { tags: { include: { tag: true } } },
    }),
    prisma.article.count({ where }),
  ]);

  return {
    data: articles,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
