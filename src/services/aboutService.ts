import prisma from "../lib/prisma";

interface UpsertAboutInput {
  title: string;
  description: string;
  mission: string;
  vision: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  stats?: Array<{ label: string; value: string }>;
}

export async function getAbout() {
  return prisma.about.findFirst();
}

export async function upsertAbout(data: UpsertAboutInput) {
  const existing = await prisma.about.findFirst();

  if (existing) {
    return prisma.about.update({ where: { id: existing.id }, data });
  }

  return prisma.about.create({ data });
}
