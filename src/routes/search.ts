import { FastifyInstance } from "fastify";
import { searchArticles, searchNews } from "../services/searchService";

export default async function searchRoutes(app: FastifyInstance) {
  app.get(
    "/search",
    {
      schema: {
        tags: ["Search"],
        summary: "Buscar artigos e notícias",
        description: "Busca artigos e notícias publicados por título, conteúdo ou meta description. Mínimo 2 caracteres.",
        querystring: {
          type: "object",
          required: ["q"],
          properties: {
            q: { type: "string", minLength: 2, description: "Termo de busca" },
            page: { type: "integer", default: 1 },
            limit: { type: "integer", default: 10 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              articles: {
                type: "object",
                properties: {
                  data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        slug: { type: "string" },
                        metaTitle: { type: "string" },
                        content: { type: "string" },
                        coverImageUrl: { type: "string", nullable: true },
                        authorName: { type: "string", nullable: true },
                        metaDescription: { type: "string", nullable: true },
                        publishedAt: { type: "string", format: "date-time", nullable: true },
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
                    },
                  },
                  meta: {
                    type: "object",
                    properties: {
                      total: { type: "integer" },
                      page: { type: "integer" },
                      limit: { type: "integer" },
                      totalPages: { type: "integer" },
                    },
                  },
                },
              },
              news: {
                type: "object",
                properties: {
                  data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        slug: { type: "string" },
                        metaTitle: { type: "string" },
                        content: { type: "string" },
                        coverImageUrl: { type: "string", nullable: true },
                        authorName: { type: "string", nullable: true },
                        metaDescription: { type: "string", nullable: true },
                        publishedAt: { type: "string", format: "date-time", nullable: true },
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
                    },
                  },
                  meta: {
                    type: "object",
                    properties: {
                      total: { type: "integer" },
                      page: { type: "integer" },
                      limit: { type: "integer" },
                      totalPages: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { q, page, limit } = request.query as {
        q?: string;
        page?: string;
        limit?: string;
      };

      if (!q || q.trim().length < 2) {
        return reply
          .code(400)
          .send({ error: "Query must be at least 2 characters" });
      }

      const [articles, newsResults] = await Promise.all([
        searchArticles(
          q.trim(),
          page ? parseInt(page) : undefined,
          limit ? parseInt(limit) : undefined
        ),
        searchNews(
          q.trim(),
          page ? parseInt(page) : undefined,
          limit ? parseInt(limit) : undefined
        ),
      ]);

      return {
        articles,
        news: newsResults,
      };
    }
  );
}
