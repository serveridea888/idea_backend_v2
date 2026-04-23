import { FastifyInstance } from "fastify";
import {
  validateCredentials,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from "../services/authService";

const REFRESH_COOKIE = "refresh_token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

export default async function authRoutes(app: FastifyInstance) {
  app.post(
    "/auth/login",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
      schema: {
        tags: ["Auth"],
        summary: "Login",
        description: "Autentica um administrador e retorna access token + refresh token via cookie.",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 1 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              accessToken: { type: "string" },
              admin: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  email: { type: "string", format: "email" },
                  name: { type: "string" },
                },
              },
            },
          },
          401: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as {
        email: string;
        password: string;
      };

      const admin = await validateCredentials(email, password);
      if (!admin) {
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      const accessToken = app.jwt.sign(
        { id: admin.id, email: admin.email },
        { expiresIn: "15m" }
      );

      const refreshToken = await createRefreshToken(admin.id);

      const isProduction = process.env.NODE_ENV === "production";

      reply.setCookie(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/auth",
        maxAge: COOKIE_MAX_AGE,
      });

      return { accessToken, admin };
    }
  );

  app.post(
    "/auth/refresh",
    {
      schema: {
        tags: ["Auth"],
        summary: "Refresh token",
        description: "Rotaciona o refresh token (via cookie) e retorna um novo access token.",
        response: {
          200: {
            type: "object",
            properties: {
              accessToken: { type: "string" },
            },
          },
          401: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const token = request.cookies[REFRESH_COOKIE];
      if (!token) {
        return reply.code(401).send({ error: "No refresh token" });
      }

      const result = await rotateRefreshToken(token);
      if (!result) {
        reply.clearCookie(REFRESH_COOKIE, { path: "/auth" });
        return reply.code(401).send({ error: "Invalid or expired refresh token" });
      }

      const admin = await import("../lib/prisma").then((m) =>
        m.default.admin.findUnique({
          where: { id: result.adminId },
          select: { id: true, email: true },
        })
      );

      const accessToken = app.jwt.sign(
        { id: result.adminId, email: admin?.email ?? "" },
        { expiresIn: "15m" }
      );

      const isProduction = process.env.NODE_ENV === "production";

      reply.setCookie(REFRESH_COOKIE, result.newToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/auth",
        maxAge: COOKIE_MAX_AGE,
      });

      return { accessToken };
    }
  );

  app.post(
    "/auth/logout",
    {
      schema: {
        tags: ["Auth"],
        summary: "Logout",
        description: "Revoga o refresh token e limpa o cookie de sessão.",
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const token = request.cookies[REFRESH_COOKIE];
      if (token) {
        await revokeRefreshToken(token);
      }

      reply.clearCookie(REFRESH_COOKIE, { path: "/auth" });
      return { success: true };
    }
  );
}
