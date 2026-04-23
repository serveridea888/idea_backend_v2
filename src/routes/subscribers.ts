import { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/authenticate";
import * as newsletterService from "../services/newsletterService";

const SubscriberResponse = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    email: { type: "string", format: "email" },
    createdAt: { type: "string", format: "date-time" },
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

export default async function subscriberRoutes(app: FastifyInstance) {
  app.post(
    "/subscribers",
    {
      schema: {
        tags: ["Subscribers"],
        summary: "Inscrever-se na newsletter",
        description: "Adiciona um e-mail à lista de assinantes da newsletter.",
        body: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email" },
          },
        },
        response: {
          201: SubscriberResponse,
        },
      },
    },
    async (request, reply) => {
      const { email } = request.body as { email: string };
      const subscriber = await newsletterService.subscribe(email);
      return reply.code(201).send(subscriber);
    }
  );

  app.get(
    "/subscribers",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Subscribers"],
        summary: "Listar assinantes",
        description: "Retorna uma lista paginada de assinantes. Requer autenticação.",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", default: 1 },
            limit: { type: "integer", default: 50 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: { type: "array", items: SubscriberResponse },
              meta: PaginationMeta,
            },
          },
        },
      },
    },
    async (request) => {
      const { page, limit } = request.query as {
        page?: string;
        limit?: string;
      };
      return newsletterService.listSubscribers(
        page ? parseInt(page) : undefined,
        limit ? parseInt(limit) : undefined
      );
    }
  );

  app.delete(
    "/subscribers/:id",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Subscribers"],
        summary: "Remover assinante",
        description: "Remove um assinante pelo ID. Requer autenticação.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          204: { type: "null", description: "Assinante removido com sucesso" },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await newsletterService.unsubscribe(id);
      return reply.code(204).send();
    }
  );

  app.post(
    "/subscribers/unsubscribe/:id",
    {
      schema: {
        tags: ["Subscribers"],
        summary: "Cancelar inscrição (público)",
        description:
          "Permite que o usuário cancele sua inscrição na newsletter através do link enviado por e-mail. Não requer autenticação.",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        await newsletterService.unsubscribe(id);
        return reply.send({ message: "Inscrição cancelada com sucesso." });
      } catch {
        return reply.code(404).send({ error: "Assinante não encontrado." });
      }
    }
  );
}
