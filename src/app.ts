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
import healthRoutes from "./routes/health";

export async function buildApp() {
  const app = Fastify({ logger: true });

  // Accept empty JSON bodies (common on DELETE with Content-Type set by some clients).
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser(
    /^application\/json(?:;.*)?$/,
    { parseAs: "string" },
    (request, body, done) => {
      const rawBody = typeof body === "string" ? body : body.toString("utf8");
      const payload = rawBody.trim();

      if (payload.length === 0) {
        done(null, {});
        return;
      }

      try {
        done(null, JSON.parse(payload));
      } catch (error) {
        done(error as Error, undefined);
      }
    },
  );

  const configuredOrigins = (process.env.ALLOWED_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = Array.from(
    new Set(
      process.env.NODE_ENV === "production"
        ? configuredOrigins
        : [...configuredOrigins, "http://localhost:3000", "http://127.0.0.1:3000"],
    ),
  );

  await app.register(cors, {
    origin: allowedOrigins,
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
  await app.register(healthRoutes);
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
