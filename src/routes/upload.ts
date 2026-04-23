import { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/authenticate";
import { uploadImage } from "../services/storageService";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/gif",
];

export default async function uploadRoutes(app: FastifyInstance) {
  app.post(
    "/upload",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Upload"],
        summary: "Upload de imagem",
        description: "Faz upload de uma imagem para o storage. Tipos aceitos: JPEG, PNG, WebP, SVG, GIF. Máximo 20 MB. Requer autenticação.",
        security: [{ bearerAuth: [] }],
        consumes: ["multipart/form-data"],
        querystring: {
          type: "object",
          properties: {
            folder: { type: "string", default: "general", description: "Pasta de destino no storage" },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              url: { type: "string" },
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
      const file = await request.file();
      if (!file) {
        return reply.code(400).send({ error: "No file provided" });
      }

      if (!ALLOWED_TYPES.includes(file.mimetype)) {
        return reply.code(400).send({ error: "Invalid file type" });
      }

      const buffer = await file.toBuffer();
      const folder =
        (request.query as { folder?: string }).folder ?? "general";
      const url = await uploadImage(buffer, file.mimetype, folder);

      return reply.code(201).send({ url });
    }
  );
}
