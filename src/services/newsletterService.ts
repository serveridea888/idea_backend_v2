import prisma from "../lib/prisma";
import { sendWelcomeEmail } from "./emailService";

export async function subscribe(email: string) {
  const existing = await prisma.subscriber.findUnique({ where: { email } });

  const subscriber = await prisma.subscriber.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  if (!existing) {
    sendWelcomeEmail(email, subscriber.id).catch((err) =>
      console.error("Falha ao enviar email de boas-vindas:", err)
    );
  }

  return subscriber;
}

export async function unsubscribe(id: string) {
  return prisma.subscriber.delete({ where: { id } });
}

export async function listSubscribers(page = 1, limit = 50) {
  const skip = (page - 1) * limit;

  const [subscribers, total] = await Promise.all([
    prisma.subscriber.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.subscriber.count(),
  ]);

  return {
    data: subscribers,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
