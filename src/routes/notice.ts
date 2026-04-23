import { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/authenticate";
import * as noticeService from "../services/noticeService";

const NoticeResponse = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    message: { type: "string" },
    badge: { type: "string", nullable: true },
    linkLabel: { type: "string", nullable: true },
    linkUrl: { type: "string", nullable: true },
    isActive: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const;

export default async function noticeRoutes(app: FastifyInstance) {
  app.get(
    "/notice",
    {
      schema: {
        tags: ["Notices"],
        summary: "Obter aviso ativo",
        description: "Retorna o aviso ativo mais recente.",
        response: {
          200: NoticeResponse,
        },
      },
    },
    async () => {
      return noticeService.getActiveNotice();
    }
  );

  app.get(
    "/notices",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Notices"],
        summary: "Listar avisos",
        description: "Retorna todos os avisos. Requer autenticação.",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "array",
            items: NoticeResponse,
          },
        },
      },
    },
    async () => {
      return noticeService.listNotices();
    }
  );

  app.post(
    "/notices",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Notices"],
        summary: "Criar aviso",
        description: "Cria um novo aviso. Requer autenticação.",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["message"],
          properties: {
            message: { type: "string" },
            badge: { type: "string" },
            linkLabel: { type: "string" },
            linkUrl: { type: "string" },
          },
        },
        response: {
          201: NoticeResponse,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        message: string;
        badge?: string;
        linkLabel?: string;
        linkUrl?: string;
      };
      const notice = await noticeService.createNotice(body);
      return reply.code(201).send(notice);
    }
  );

  app.put(
    "/notices/:id",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Notices"],
        summary: "Atualizar aviso",
        description: "Atualiza um aviso existente. Requer autenticação.",
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
            message: { type: "string" },
            badge: { type: "string", nullable: true },
            linkLabel: { type: "string", nullable: true },
            linkUrl: { type: "string", nullable: true },
            isActive: { type: "boolean" },
          },
        },
        response: {
          200: NoticeResponse,
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        message?: string;
        badge?: string | null;
        linkLabel?: string | null;
        linkUrl?: string | null;
        isActive?: boolean;
      };
      return noticeService.updateNotice(id, body);
    }
  );
}
