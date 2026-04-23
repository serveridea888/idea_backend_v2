import prisma from "../lib/prisma";

export async function searchNews(query: string, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const where = {
    status: "PUBLISHED" as const,
    OR: [
      { metaTitle: { contains: query, mode: "insensitive" as const } },
      { content: { contains: query, mode: "insensitive" as const } },
      { metaDescription: { contains: query, mode: "insensitive" as const } },
    ],
  };

  const [news, total] = await Promise.all([
    prisma.news.findMany({
      where,
      skip,
      take: limit,
      orderBy: { publishedAt: "desc" },
      include: { tags: { include: { tag: true } } },
    }),
    prisma.news.count({ where }),
  ]);

  return {
    data: news,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function searchArticles(query: string, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const where = {
    status: "PUBLISHED" as const,
    OR: [
      { metaTitle: { contains: query, mode: "insensitive" as const } },
      { content: { contains: query, mode: "insensitive" as const } },
      { metaDescription: { contains: query, mode: "insensitive" as const } },
    ],
  };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      skip,
      take: limit,
      orderBy: { publishedAt: "desc" },
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
