import prisma from "../lib/prisma";

interface UpdateBannerInput {
  imageUrl?: string;
  altText?: string;
  linkUrl?: string;
  tag?: string | null;
  title?: string | null;
  description?: string | null;
  ctaLabel?: string | null;
  isActive?: boolean;
}

export async function getActiveBanner() {
  return prisma.banner.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createBanner(data: {
  imageUrl: string;
  altText?: string;
  linkUrl?: string;
  tag?: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
}) {
  return prisma.banner.create({ data });
}

export async function updateBanner(id: string, data: UpdateBannerInput) {
  return prisma.banner.update({ where: { id }, data });
}

export async function listBanners() {
  return prisma.banner.findMany({ orderBy: { createdAt: "desc" } });
}

export async function deleteBanner(id: string) {
  return prisma.banner.delete({ where: { id } });
}
