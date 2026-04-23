import prisma from "../lib/prisma";

interface CreateNoticeInput {
  message: string;
  badge?: string;
  linkLabel?: string;
  linkUrl?: string;
}

interface UpdateNoticeInput {
  message?: string;
  badge?: string | null;
  linkLabel?: string | null;
  linkUrl?: string | null;
  isActive?: boolean;
}

export async function getActiveNotice() {
  return prisma.notice.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createNotice(data: CreateNoticeInput) {
  return prisma.notice.create({ data });
}

export async function updateNotice(id: string, data: UpdateNoticeInput) {
  return prisma.notice.update({ where: { id }, data });
}

export async function listNotices() {
  return prisma.notice.findMany({ orderBy: { createdAt: "desc" } });
}
