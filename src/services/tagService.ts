import prisma from "../lib/prisma";
import { generateSlug } from "../utils/slug";

export async function createTag(name: string) {
  return prisma.tag.create({
    data: { name, slug: generateSlug(name) },
  });
}

export async function updateTag(id: string, name: string) {
  return prisma.tag.update({
    where: { id },
    data: { name, slug: generateSlug(name) },
  });
}

export async function deleteTag(id: string) {
  return prisma.tag.delete({ where: { id } });
}

export async function getTagById(id: string) {
  return prisma.tag.findUnique({ where: { id } });
}

export async function getTagBySlug(slug: string) {
  return prisma.tag.findUnique({ where: { slug } });
}

export async function listTags() {
  return prisma.tag.findMany({ orderBy: { name: "asc" } });
}
