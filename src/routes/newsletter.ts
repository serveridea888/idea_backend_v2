import { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/authenticate";
import { sendNewsletter } from "../services/emailService";

export default async function newsletterRoutes(app: FastifyInstance) {
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
      const { subject, content } = request.body as {
        subject: string;
        content: string;
      };
      const sent = await sendNewsletter(subject, content);
      return { sent };
    }
  );
}
