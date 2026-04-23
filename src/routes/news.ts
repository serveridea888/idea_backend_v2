import { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/authenticate";
import * as newsService from "../services/newsService";
import { ArticleStatus } from "@prisma/client";

const NewsResponse = {
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

export default async function newsRoutes(app: FastifyInstance) {
  app.get(
    "/news",
    {
      schema: {
        tags: ["News"],
        summary: "Listar notícias",
        description: "Retorna uma lista paginada de notícias com filtros opcionais.",
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
              data: { type: "array", items: NewsResponse },
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

      return newsService.listNews({
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        status,
        tagSlug: tag,
        isFeatured: featured !== undefined ? featured === "true" : undefined,
      });
    }
  );

  app.get(
    "/news/:idOrSlug",
    {
      schema: {
        tags: ["News"],
        summary: "Obter notícia",
        description: "Retorna uma notícia pelo ID (UUID) ou slug.",
        params: {
          type: "object",
          required: ["idOrSlug"],
          properties: {
            idOrSlug: { type: "string" },
          },
        },
        response: {
          200: NewsResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { idOrSlug } = request.params as { idOrSlug: string };

      const UUID_REGEX =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      const news = UUID_REGEX.test(idOrSlug)
        ? await newsService.getNewsById(idOrSlug)
        : await newsService.getNewsBySlug(idOrSlug);

      if (!news) return reply.code(404).send({ error: "News not found" });
      return news;
    }
  );

  app.post(
    "/news",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["News"],
        summary: "Criar notícia",
        description: "Cria uma nova notícia. Requer autenticação.",
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
          201: NewsResponse,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as Parameters<
        typeof newsService.createNews
      >[0];
      const news = await newsService.createNews(body);
      return reply.code(201).send(news);
    }
  );

  app.put(
    "/news/:id",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["News"],
        summary: "Atualizar notícia",
        description: "Atualiza uma notícia existente. Requer autenticação.",
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
          200: NewsResponse,
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as Parameters<
        typeof newsService.updateNews
      >[1];
      return newsService.updateNews(id, body);
    }
  );

  app.delete(
    "/news/:id",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["News"],
        summary: "Deletar notícia",
        description: "Remove uma notícia pelo ID. Requer autenticação.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          204: { type: "null", description: "Notícia removida com sucesso" },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await newsService.deleteNews(id);
      return reply.code(204).send();
    }
  );
}
