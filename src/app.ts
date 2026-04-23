import Fastify, { FastifyError } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import fastifySwagger from "@fastify/swagger";
import scalarApiReference from "@scalar/fastify-api-reference";

import authRoutes from "./routes/auth";
import articleRoutes from "./routes/articles";
import tagRoutes from "./routes/tags";
import bannerRoutes from "./routes/banner";
import noticeRoutes from "./routes/notice";
import aboutRoutes from "./routes/about";
import subscriberRoutes from "./routes/subscribers";
import newsletterRoutes from "./routes/newsletter";
import newsRoutes from "./routes/news";
import searchRoutes from "./routes/search";
import uploadRoutes from "./routes/upload";
import translationRoutes from "./routes/translations";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET,
  });

  await app.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024 },
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET!,
  });

  await app.register(rateLimit, {
    global: false,
  });

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "IDEA API",
        description: "API do projeto IDEA — gerenciamento de artigos, tags, banners, avisos, newsletter e upload de imagens.",
        version: "1.0.0",
      },
      servers: [
        { url: "http://localhost:3333", description: "Development" },
      ],
      tags: [
        { name: "Auth", description: "Autenticação e gerenciamento de sessão" },
        { name: "Articles", description: "CRUD de artigos" },
        { name: "Tags", description: "CRUD de tags" },
        { name: "Banners", description: "Gerenciamento de banners" },
        { name: "Notices", description: "Gerenciamento de avisos" },
        { name: "About", description: "Dados da seção Sobre" },
        { name: "Subscribers", description: "Newsletter e assinantes" },
        { name: "Newsletter", description: "Envio de newsletter" },
        { name: "News", description: "CRUD de notícias" },
        { name: "Search", description: "Busca de artigos e notícias" },
        { name: "Upload", description: "Upload de imagens" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await app.register(scalarApiReference, {
    routePrefix: "/reference",
    configuration: {
      theme: "kepler",
    },
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode = error.statusCode ?? 500;

    if (statusCode >= 500) {
      request.log.error(error);
    }

    reply.code(statusCode).send({
      error: statusCode >= 500 ? "Internal Server Error" : error.message,
    });
  });

  await app.register(authRoutes);
  await app.register(articleRoutes);
  await app.register(newsRoutes);
  await app.register(tagRoutes);
  await app.register(bannerRoutes);
  await app.register(noticeRoutes);
  await app.register(aboutRoutes);
  await app.register(subscriberRoutes);
  await app.register(newsletterRoutes);
  await app.register(searchRoutes);
  await app.register(uploadRoutes);
  await app.register(translationRoutes);

  return app;
}
