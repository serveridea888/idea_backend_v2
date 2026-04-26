import { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/authenticate";
import { sendNewsletter } from "../services/emailService";
import {
  createEmailTemplate,
  deleteEmailTemplate,
  listEmailTemplates,
  updateEmailTemplate,
} from "../services/emailTemplateService";

const EmailTemplateResponse = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    description: { type: "string", nullable: true },
    subject: { type: "string", nullable: true },
    content: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const;

export default async function newsletterRoutes(app: FastifyInstance) {
  app.get(
    "/newsletter/templates",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Newsletter"],
        summary: "Listar templates de newsletter",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "array",
            items: EmailTemplateResponse,
          },
        },
      },
    },
    async () => listEmailTemplates()
  );

  app.post(
    "/newsletter/templates",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Newsletter"],
        summary: "Criar template de newsletter",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["name", "content"],
          properties: {
            name: { type: "string", minLength: 1 },
            description: { type: "string", nullable: true },
            subject: { type: "string", nullable: true },
            content: { type: "string", minLength: 1 },
          },
        },
        response: {
          201: EmailTemplateResponse,
        },
      },
    },
    async (request, reply) => {
      const template = await createEmailTemplate(
        request.body as Parameters<typeof createEmailTemplate>[0]
      );
      return reply.code(201).send(template);
    }
  );

  app.put(
    "/newsletter/templates/:id",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Newsletter"],
        summary: "Atualizar template de newsletter",
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
            name: { type: "string", minLength: 1 },
            description: { type: "string", nullable: true },
            subject: { type: "string", nullable: true },
            content: { type: "string", minLength: 1 },
          },
        },
        response: {
          200: EmailTemplateResponse,
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      return updateEmailTemplate(id, request.body as Parameters<typeof updateEmailTemplate>[1]);
    }
  );

  app.delete(
    "/newsletter/templates/:id",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Newsletter"],
        summary: "Excluir template de newsletter",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          204: { type: "null" },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await deleteEmailTemplate(id);
      return reply.code(204).send();
    }
  );

  app.post(
    "/newsletter/send",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Newsletter"],
        summary: "Enviar newsletter manual",
        description:
          "Envia um e-mail personalizado para todos os assinantes. Requer autenticação.",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["subject", "content"],
          properties: {
            subject: { type: "string", minLength: 1 },
            content: { type: "string", minLength: 1, description: "Conteúdo HTML do e-mail" },
            html: { type: "string", minLength: 1 },
            templateId: { type: "string", format: "uuid", nullable: true },
            articleId: { type: "string", format: "uuid", nullable: true },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              sent: { type: "integer", description: "Quantidade de e-mails enviados" },
            },
          },
        },
      },
    },
    async (request) => {
      const body = request.body as {
        subject: string;
        content: string;
        html?: string;
        templateId?: string | null;
        articleId?: string | null;
      };
      const sent = await sendNewsletter(body);
      return { sent };
    }
  );
}
