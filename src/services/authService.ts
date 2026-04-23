import prisma from "../lib/prisma";
import bcrypt from "bcrypt";
import { randomBytes, createHash } from "crypto";

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function validateCredentials(email: string, password: string) {
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) return null;

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) return null;

  return { id: admin.id, email: admin.email, name: admin.name };
}

export async function createRefreshToken(adminId: string): Promise<string> {
  const token = randomBytes(48).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: { tokenHash, adminId, expiresAt },
  });

  return token;
}

export async function rotateRefreshToken(
  oldToken: string
): Promise<{ adminId: string; newToken: string } | null> {
  const tokenHash = hashToken(oldToken);

  const stored = await prisma.refreshToken.findFirst({
    where: { tokenHash, expiresAt: { gt: new Date() } },
  });

  if (!stored) return null;

  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const newToken = await createRefreshToken(stored.adminId);

  return { adminId: stored.adminId, newToken };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

export async function revokeAllTokens(adminId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { adminId } });
}
