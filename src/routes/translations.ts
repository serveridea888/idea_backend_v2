import { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/authenticate";
import prisma from "../lib/prisma";
import { TranslationStatus } from "@prisma/client";

export default async function translationRoutes(app: FastifyInstance) {
  app.post("/translations/:type/:id/:locale/retry", { preHandler: [authenticate] }, async (request, reply) => {
    const { type, id, locale } = request.params as { type: "articles" | "news"; id: string; locale: string };
    if (!["articles", "news"].includes(type) || !["en", "zh-CN"].includes(locale)) return reply.code(400).send({ error: "Invalid translation target" });
    const result = type === "articles"
      ? await prisma.articleTranslation.updateMany({ where: { articleId: id, locale }, data: { status: TranslationStatus.PENDING, attempts: 0, lastError: null, processingAt: null } })
      : await prisma.newsTranslation.updateMany({ where: { newsId: id, locale }, data: { status: TranslationStatus.PENDING, attempts: 0, lastError: null, processingAt: null } });
    if (!result.count) return reply.code(404).send({ error: "Translation not found" });
    return { queued: true };
  });
}
