import { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/authenticate";
import * as articleService from "../services/articleService";
import { ArticleStatus } from "@prisma/client";

const ArticleResponse = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    slug: { type: "string" },
    originalLanguage: { type: "string" },
    isFeatured: { type: "boolean" },
    status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] },
    content: { type: "string" },
    coverImageUrl: { type: "string", nullable: true },
    authorName: { type: "string", nullable: true },
    metaTitle: { type: "string" },
    metaDescription: { type: "string", nullable: true },
    ogImage: { type: "string", nullable: true },
    canonicalUrl: { type: "string", nullable: true },
    publishedAt: { type: "string", format: "date-time", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    tags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tag: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              slug: { type: "string" },
            },
          },
        },
      },
    },
  },
} as const;

const PaginationMeta = {
  type: "object",
  properties: {
    total: { type: "integer" },
    page: { type: "integer" },
    limit: { type: "integer" },
    totalPages: { type: "integer" },
  },
} as const;

const ErrorResponse = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
} as const;

export default async function articleRoutes(app: FastifyInstance) {
  app.get(
    "/articles",
    {
      schema: {
        tags: ["Articles"],
        summary: "Listar artigos",
        description: "Retorna uma lista paginada de artigos com filtros opcionais.",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", default: 1 },
            limit: { type: "integer", default: 10 },
            status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] },
            tag: { type: "string", description: "Slug da tag para filtro" },
            featured: { type: "string", enum: ["true", "false"] },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: { type: "array", items: ArticleResponse },
              meta: PaginationMeta,
            },
          },
        },
      },
    },
    async (request) => {
    const { page, limit, status, tag, featured } = request.query as {
      page?: string;
      limit?: string;
      status?: ArticleStatus;
      tag?: string;
      featured?: string;
    };

    return articleService.listArticles({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      status,
      tagSlug: tag,
      isFeatured: featured !== undefined ? featured === "true" : undefined,
    });
  });

  app.get(
    "/articles/:idOrSlug",
    {
      schema: {
        tags: ["Articles"],
        summary: "Obter artigo",
        description: "Retorna um artigo pelo ID (UUID) ou slug.",
        params: {
          type: "object",
          required: ["idOrSlug"],
          properties: {
            idOrSlug: { type: "string" },
          },
        },
        response: {
          200: ArticleResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { idOrSlug } = request.params as { idOrSlug: string };

      const UUID_REGEX =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      const article = UUID_REGEX.test(idOrSlug)
        ? await articleService.getArticleById(idOrSlug)
        : await articleService.getArticleBySlug(idOrSlug);

      if (!article) return reply.code(404).send({ error: "Article not found" });
      return article;
    }
  );

  app.post(
    "/articles",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Articles"],
        summary: "Criar artigo",
        description: "Cria um novo artigo. Requer autenticação.",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["metaTitle", "content"],
          properties: {
            metaTitle: { type: "string" },
            content: { type: "string" },
            originalLanguage: { type: "string", default: "pt" },
            isFeatured: { type: "boolean", default: false },
            status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT" },
            coverImageUrl: { type: "string" },
            authorName: { type: "string" },
            metaDescription: { type: "string" },
            ogImage: { type: "string" },
            canonicalUrl: { type: "string" },
            publishedAt: { type: "string", format: "date-time" },
            tagIds: { type: "array", items: { type: "string", format: "uuid" } },
          },
        },
        response: {
          201: ArticleResponse,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as Parameters<
        typeof articleService.createArticle
      >[0];
      const article = await articleService.createArticle(body);
      return reply.code(201).send(article);
    }
  );

  app.put(
    "/articles/:id",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Articles"],
        summary: "Atualizar artigo",
        description: "Atualiza um artigo existente. Requer autenticação.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            metaTitle: { type: "string" },
            slug: { type: "string" },
            content: { type: "string" },
            originalLanguage: { type: "string" },
            isFeatured: { type: "boolean" },
            status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] },
            coverImageUrl: { type: "string" },
            authorName: { type: "string" },
            metaDescription: { type: "string" },
            ogImage: { type: "string" },
            canonicalUrl: { type: "string" },
            publishedAt: { type: "string", format: "date-time" },
            tagIds: { type: "array", items: { type: "string", format: "uuid" } },
          },
        },
        response: {
          200: ArticleResponse,
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as Parameters<
        typeof articleService.updateArticle
      >[1];
      return articleService.updateArticle(id, body);
    }
  );

  app.delete(
    "/articles/:id",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Articles"],
        summary: "Deletar artigo",
        description: "Remove um artigo pelo ID. Requer autenticação.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          204: { type: "null", description: "Artigo removido com sucesso" },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await articleService.deleteArticle(id);
      return reply.code(204).send();
    }
  );
}
