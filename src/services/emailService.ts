import { Resend } from "resend";
import prisma from "../lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

interface ArticleForNewsletter {
  metaTitle: string;
  slug: string;
  metaDescription?: string | null;
  coverImageUrl?: string | null;
  authorName?: string | null;
}

function unsubscribeLink(subscriberId: string) {
  return `${FRONTEND_URL}/unsubscribe/${subscriberId}`;
}

export async function sendWelcomeEmail(email: string, subscriberId: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a1a1a;">Bem-vindo à IDEA Newsletter! 🎉</h1>
      <p style="color: #444; font-size: 16px; line-height: 1.6;">
        Obrigado por se inscrever! Você agora receberá nossas atualizações e novos artigos diretamente no seu e-mail.
      </p>
      <p style="color: #444; font-size: 16px; line-height: 1.6;">
        Fique de olho na sua caixa de entrada — conteúdos incríveis estão a caminho.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="color: #999; font-size: 12px;">
        Se você não se inscreveu, pode
        <a href="${unsubscribeLink(subscriberId)}" style="color: #999;">cancelar sua inscrição aqui</a>.
      </p>
    </div>
  `;

  await resend.emails.send({
    from: `IDEA Newsletter <${FROM_EMAIL}>`,
    to: email,
    subject: "Bem-vindo à IDEA Newsletter!",
    html,
  });
}

export async function sendArticleNewsletter(article: ArticleForNewsletter) {
  const subscribers = await prisma.subscriber.findMany({
    select: { id: true, email: true },
  });

  if (subscribers.length === 0) return;

  const articleUrl = `${FRONTEND_URL}/articles/${article.slug}`;

  for (const subscriber of subscribers) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
          IDEA Newsletter
        </h2>
        ${article.coverImageUrl ? `<img src="${article.coverImageUrl}" alt="${article.metaTitle}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;" />` : ""}
        <h1 style="color: #1a1a1a; font-size: 24px;">${article.metaTitle}</h1>
        ${article.authorName ? `<p style="color: #888; font-size: 14px;">Por ${article.authorName}</p>` : ""}
        ${article.metaDescription ? `<p style="color: #444; font-size: 16px; line-height: 1.6;">${article.metaDescription}</p>` : ""}
        <a href="${articleUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
          Ler artigo completo
        </a>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          Você recebeu este e-mail porque está inscrito na IDEA Newsletter.
          <a href="${unsubscribeLink(subscriber.id)}" style="color: #999;">Cancelar inscrição</a>
        </p>
      </div>
    `;

    await resend.emails.send({
      from: `IDEA Newsletter <${FROM_EMAIL}>`,
      to: subscriber.email,
      subject: `Novo artigo: ${article.metaTitle}`,
      html,
    });
  }
}

interface NewsForNewsletter {
  metaTitle: string;
  slug: string;
  metaDescription?: string | null;
  coverImageUrl?: string | null;
  authorName?: string | null;
}

export async function sendNewsNewsletter(news: NewsForNewsletter) {
  const subscribers = await prisma.subscriber.findMany({
    select: { id: true, email: true },
  });

  if (subscribers.length === 0) return;

  const newsUrl = `${FRONTEND_URL}/news/${news.slug}`;

  for (const subscriber of subscribers) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
          IDEA Newsletter
        </h2>
        ${news.coverImageUrl ? `<img src="${news.coverImageUrl}" alt="${news.metaTitle}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;" />` : ""}
        <h1 style="color: #1a1a1a; font-size: 24px;">${news.metaTitle}</h1>
        ${news.authorName ? `<p style="color: #888; font-size: 14px;">Por ${news.authorName}</p>` : ""}
        ${news.metaDescription ? `<p style="color: #444; font-size: 16px; line-height: 1.6;">${news.metaDescription}</p>` : ""}
        <a href="${newsUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
          Ler notícia completa
        </a>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          Você recebeu este e-mail porque está inscrito na IDEA Newsletter.
          <a href="${unsubscribeLink(subscriber.id)}" style="color: #999;">Cancelar inscrição</a>
        </p>
      </div>
    `;

    await resend.emails.send({
      from: `IDEA Newsletter <${FROM_EMAIL}>`,
      to: subscriber.email,
      subject: `Nova notícia: ${news.metaTitle}`,
      html,
    });
  }
}

export async function sendNewsletter(subject: string, content: string) {
  const subscribers = await prisma.subscriber.findMany({
    select: { id: true, email: true },
  });

  if (subscribers.length === 0) return 0;

  let sent = 0;

  for (const subscriber of subscribers) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
          IDEA Newsletter
        </h2>
        <div style="color: #444; font-size: 16px; line-height: 1.6;">
          ${content}
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          Você recebeu este e-mail porque está inscrito na IDEA Newsletter.
          <a href="${unsubscribeLink(subscriber.id)}" style="color: #999;">Cancelar inscrição</a>
        </p>
      </div>
    `;

    await resend.emails.send({
      from: `IDEA Newsletter <${FROM_EMAIL}>`,
      to: subscriber.email,
      subject,
      html,
    });

    sent++;
  }

  return sent;
}
