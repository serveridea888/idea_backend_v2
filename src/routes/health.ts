import { FastifyInstance } from "fastify";

import prisma from "../lib/prisma";

export default async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return { ok: true };
  });

  app.get("/health/database", async (_request, reply) => {
    await prisma.$queryRaw`SELECT 1`;

    return reply.send({
      ok: true,
      database: "reachable",
      checkedAt: new Date().toISOString(),
    });
  });
}
