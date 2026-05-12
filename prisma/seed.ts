import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const exampleTemplates = [
  {
    name: "Boletim Semanal",
    description: "Template padrão para resumo da semana com card de artigo opcional.",
    subject: "Novidades da semana na IDEA",
    content: `
      <div style="background:#f7f7f8;padding:28px 0;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #ececec;border-radius:12px;overflow:hidden;font-family:Arial,sans-serif;">
          <div style="padding:28px 28px 18px;background:#111827;color:#ffffff;">
            <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">IDEA Newsletter</p>
            <h1 style="margin:10px 0 0;font-size:24px;line-height:1.3;">Resumo da semana</h1>
          </div>
          <div style="padding:24px 28px;color:#1f2937;font-size:16px;line-height:1.65;">
            {{content}}
            {{articleCard}}
          </div>
          <div style="padding:18px 28px;border-top:1px solid #ececec;color:#6b7280;font-size:12px;line-height:1.5;">
            Você recebeu este email por estar inscrito na IDEA.
            <a href="{{unsubscribeUrl}}" style="color:#6b7280;">Cancelar inscrição</a>
          </div>
        </div>
      </div>
    `.trim(),
  },
  {
    name: "Comunicado Institucional",
    description: "Template limpo para mensagens oficiais e avisos rápidos.",
    subject: "Comunicado importante da IDEA",
    content: `
      <div style="max-width:640px;margin:0 auto;padding:28px;font-family:Arial,sans-serif;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;">
        <p style="margin:0 0 8px;color:#6b7280;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">IDEA</p>
        <h2 style="margin:0 0 18px;color:#111827;font-size:26px;line-height:1.25;">Comunicado oficial</h2>
        <div style="color:#374151;font-size:16px;line-height:1.7;">
          {{content}}
        </div>
        {{articleCard}}
        <div style="margin-top:26px;padding-top:16px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
          Para não receber mais comunicados, <a href="{{unsubscribeUrl}}" style="color:#6b7280;">clique aqui</a>.
        </div>
      </div>
    `.trim(),
  },
  {
    name: "Lançamento de Conteúdo",
    description: "Template para anunciar novo artigo com destaque visual.",
    subject: "Novo conteúdo no ar na IDEA",
    content: `
      <div style="background:#0f172a;padding:30px 0;font-family:Arial,sans-serif;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;">
          <div style="padding:22px 26px;background:linear-gradient(135deg,#0f172a,#1d4ed8);color:#ffffff;">
            <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">IDEA Conteúdo</p>
            <h2 style="margin:10px 0 0;font-size:25px;line-height:1.25;">Tem novidade para você</h2>
          </div>
          <div style="padding:24px 26px;color:#1f2937;font-size:16px;line-height:1.65;">
            {{content}}
          </div>
          <div style="padding:0 26px 24px;">
            {{articleCard}}
          </div>
          <div style="padding:16px 26px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
            Não quer mais receber? <a href="{{unsubscribeUrl}}" style="color:#6b7280;">Cancelar inscrição</a>
          </div>
        </div>
      </div>
    `.trim(),
  },
] as const;

const defaultAbout = {
  title: "Sobre a IDEA",
  description:
    "A IDEA é uma iniciativa socioambiental dedicada a regenerar ecossistemas, fortalecer comunidades e ampliar o acesso à educação ambiental. Atuamos conectando pessoas, conhecimento e ação prática para transformar desafios climáticos em impacto positivo e duradouro.",
  mission:
    "Compartilhar o conhecimento científico produzido sobre Amazônia, trazendo perspectivas locais e internacionais.",
  vision:
    "Aumentar o debate sobre Amazônia sob a lógica de inclusão de perspectivas locais, visando um desenvolvimento econômico sustentável.",
  imageUrl: null,
  imageAlt: "Equipe da IDEA em ação de restauração ambiental",
  stats: [],
} as const;

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      passwordHash,
      name: "Admin",
    },
  });

  const existingAbout = await prisma.about.findFirst();

  if (existingAbout) {
    await prisma.about.update({
      where: { id: existingAbout.id },
      data: defaultAbout,
    });
  } else {
    await prisma.about.create({ data: defaultAbout });
  }

  for (const template of exampleTemplates) {
    const id = randomUUID();

    await prisma.$executeRaw`
      INSERT INTO email_templates (id, name, description, subject, content, created_at, updated_at)
      SELECT ${id}::uuid, ${template.name}, ${template.description}, ${template.subject}, ${template.content}, NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM email_templates WHERE name = ${template.name}
      )
    `;
  }
}

main().finally(() => prisma.$disconnect());
