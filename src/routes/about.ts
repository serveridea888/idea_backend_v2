import { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/authenticate";
import * as aboutService from "../services/aboutService";

const StatSchema = {
  type: "object",
  properties: {
    label: { type: "string" },
    value: { type: "string" },
  },
} as const;

const AboutResponse = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    title: { type: "string" },
    description: { type: "string" },
    mission: { type: "string" },
    vision: { type: "string" },
    imageUrl: { type: "string", nullable: true },
    imageAlt: { type: "string", nullable: true },
    stats: { type: "array", items: StatSchema },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const;

export default async function aboutRoutes(app: FastifyInstance) {
  app.get(
    "/about",
    {
      schema: {
        tags: ["About"],
        summary: "Obter dados da seção Sobre",
        description:
          "Retorna os dados da seção Sobre da organização.",
        response: {
          200: AboutResponse,
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const about = await aboutService.getAbout();
      if (!about) {
        return reply.code(404).send({ error: "About data not found" });
      }
      return about;
    }
  );

  app.put(
    "/about",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["About"],
        summary: "Criar ou atualizar dados da seção Sobre",
        description:
          "Cria ou atualiza os dados da seção Sobre. Requer autenticação.",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["title", "description", "mission", "vision"],
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            mission: { type: "string" },
            vision: { type: "string" },
            imageUrl: { type: "string", nullable: true },
            imageAlt: { type: "string", nullable: true },
            stats: { type: "array", items: StatSchema },
          },
        },
        response: {
          200: AboutResponse,
        },
      },
    },
    async (request) => {
      const body = request.body as {
        title: string;
        description: string;
        mission: string;
        vision: string;
        imageUrl?: string | null;
        imageAlt?: string | null;
        stats?: Array<{ label: string; value: string }>;
      };
      return aboutService.upsertAbout(body);
    }
  );
}
