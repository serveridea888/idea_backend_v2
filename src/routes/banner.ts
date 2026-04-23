import { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/authenticate";
import * as bannerService from "../services/bannerService";

const BannerResponse = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    imageUrl: { type: "string" },
    altText: { type: "string", nullable: true },
    linkUrl: { type: "string", nullable: true },
    tag: { type: "string", nullable: true },
    title: { type: "string", nullable: true },
    description: { type: "string", nullable: true },
    ctaLabel: { type: "string", nullable: true },
    isActive: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const;

export default async function bannerRoutes(app: FastifyInstance) {
  app.get(
    "/banner",
    {
      schema: {
        tags: ["Banners"],
        summary: "Obter banner ativo",
        description: "Retorna o banner ativo mais recente.",
        response: {
          200: BannerResponse,
        },
      },
    },
    async () => {
      return bannerService.getActiveBanner();
    }
  );

  app.get(
    "/banners",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Banners"],
        summary: "Listar banners",
        description: "Retorna todos os banners. Requer autenticação.",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "array",
            items: BannerResponse,
          },
        },
      },
    },
    async () => {
      return bannerService.listBanners();
    }
  );

  app.post(
    "/banners",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Banners"],
        summary: "Criar banner",
        description: "Cria um novo banner. Requer autenticação.",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["imageUrl"],
          properties: {
            imageUrl: { type: "string" },
            altText: { type: "string" },
            linkUrl: { type: "string" },
            tag: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            ctaLabel: { type: "string" },
          },
        },
        response: {
          201: BannerResponse,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        imageUrl: string;
        altText?: string;
        linkUrl?: string;
        tag?: string;
        title?: string;
        description?: string;
        ctaLabel?: string;
      };
      const banner = await bannerService.createBanner(body);
      return reply.code(201).send(banner);
    }
  );

  app.put(
    "/banners/:id",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["Banners"],
        summary: "Atualizar banner",
        description: "Atualiza um banner existente. Requer autenticação.",
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
            imageUrl: { type: "string" },
            altText: { type: "string" },
            linkUrl: { type: "string" },
            tag: { type: "string", nullable: true },
            title: { type: "string", nullable: true },
            description: { type: "string", nullable: true },
            ctaLabel: { type: "string", nullable: true },
            isActive: { type: "boolean" },
          },
        },
        response: {
          200: BannerResponse,
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        imageUrl?: string;
        altText?: string;
        linkUrl?: string;
        tag?: string | null;
        title?: string | null;
        description?: string | null;
        ctaLabel?: string | null;
        isActive?: boolean;
      };
      return bannerService.updateBanner(id, body);
    }
  );
}
