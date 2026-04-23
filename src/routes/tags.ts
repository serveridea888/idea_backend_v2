import { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/authenticate";
import * as tagService from "../services/tagService";

const TagResponse = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    slug: { type: "string" },
  },
} as const;

const ErrorResponse = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
} as const;

export default async function tagRoutes(app: FastifyInstance) {
  app.get(
    "/tags",
    {
      schema: {
        tags: ["Tags"],
        summary: "Listar tags",
        description: "Retorna todas as tags ordenadas por nome.",
        response: {
          200: {
            type: "array",
            items: TagResponse,
          },
        },
      },
    },
    async () => {
      return tagService.listTags();
    }
  );

  app.get(
    "/tags/:idOrSlug",
    {
      schema: {
        tags: ["Tags"],
        summary: "Obter tag",
        description: "Retorna uma tag pelo ID (UUID) ou slug.",
        params: {
          type: "object",
          required: ["idOrSlug"],
          properties: {
            idOrSlug: { type: "string" },
          },
        },
        response: {
          200: TagResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { idOrSlug } = request.params as { idOrSlug: string };

      const UUID_REGEX =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      const tag = UUID_REGEX.test(idOrSlug)
        ? await tagService.getTagById(idOrSlug)
        : await tagService.getTagBySlug(idOrSlug);

      if (!tag) return reply.code(404).send({ error: "Tag not found" });
      return tag;
    }
  );

  app.post(
    "/tags",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Tags"],
        summary: "Criar tag",
        description: "Cria uma nova tag. Requer autenticação.",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
          },
        },
        response: {
          201: TagResponse,
        },
      },
    },
    async (request, reply) => {
      const { name } = request.body as { name: string };
      const tag = await tagService.createTag(name);
      return reply.code(201).send(tag);
    }
  );

  app.put(
    "/tags/:id",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Tags"],
        summary: "Atualizar tag",
        description: "Atualiza o nome de uma tag. Requer autenticação.",
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
          required: ["name"],
          properties: {
            name: { type: "string" },
          },
        },
        response: {
          200: TagResponse,
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { name } = request.body as { name: string };
      return tagService.updateTag(id, name);
    }
  );

  app.delete(
    "/tags/:id",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Tags"],
        summary: "Deletar tag",
        description: "Remove uma tag pelo ID. Requer autenticação.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          204: { type: "null", description: "Tag removida com sucesso" },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await tagService.deleteTag(id);
      return reply.code(204).send();
    }
  );
}
