import { randomUUID } from "crypto";
import prisma from "../lib/prisma";

interface EmailTemplateInput {
  name: string;
  description?: string | null;
  subject?: string | null;
  content: string;
}

interface UpdateEmailTemplateInput {
  name?: string;
  description?: string | null;
  subject?: string | null;
  content?: string;
}

export interface EmailTemplateRecord {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function listEmailTemplates() {
  return prisma.$queryRaw<EmailTemplateRecord[]>`
    SELECT
      id,
      name,
      description,
      subject,
      content,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM email_templates
    ORDER BY created_at DESC
  `;
}

export async function getEmailTemplateById(id: string) {
  const [template] = await prisma.$queryRaw<EmailTemplateRecord[]>`
    SELECT
      id,
      name,
      description,
      subject,
      content,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM email_templates
    WHERE id = ${id}::uuid
    LIMIT 1
  `;

  return template ?? null;
}

export async function createEmailTemplate(data: EmailTemplateInput) {
  const id = randomUUID();

  const [template] = await prisma.$queryRaw<EmailTemplateRecord[]>`
    INSERT INTO email_templates (id, name, description, subject, content, created_at, updated_at)
    VALUES (
      ${id}::uuid,
      ${data.name},
      ${data.description ?? null},
      ${data.subject ?? null},
      ${data.content},
      NOW(),
      NOW()
    )
    RETURNING
      id,
      name,
      description,
      subject,
      content,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;

  return template;
}

export async function updateEmailTemplate(id: string, data: UpdateEmailTemplateInput) {
  const current = await getEmailTemplateById(id);

  if (!current) {
    const error = new Error("Email template not found") as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const [template] = await prisma.$queryRaw<EmailTemplateRecord[]>`
    UPDATE email_templates
    SET
      name = ${data.name ?? current.name},
      description = ${data.description !== undefined ? data.description : current.description},
      subject = ${data.subject !== undefined ? data.subject : current.subject},
      content = ${data.content ?? current.content},
      updated_at = NOW()
    WHERE id = ${id}::uuid
    RETURNING
      id,
      name,
      description,
      subject,
      content,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;

  return template;
}

export async function deleteEmailTemplate(id: string) {
  const deletedCount = await prisma.$executeRaw`
    DELETE FROM email_templates
    WHERE id = ${id}::uuid
  `;

  if (deletedCount === 0) {
    const error = new Error("Email template not found") as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }
}