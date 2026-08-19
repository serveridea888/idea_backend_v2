CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

CREATE TABLE "article_translations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "article_id" UUID NOT NULL,
  "locale" TEXT NOT NULL,
  "meta_title" TEXT,
  "meta_description" TEXT,
  "content" TEXT,
  "source_hash" TEXT NOT NULL,
  "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT NOT NULL DEFAULT 'google-cloud',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "processing_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "article_translations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "article_translations_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "news_translations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "news_id" UUID NOT NULL,
  "locale" TEXT NOT NULL,
  "meta_title" TEXT,
  "meta_description" TEXT,
  "content" TEXT,
  "source_hash" TEXT NOT NULL,
  "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT NOT NULL DEFAULT 'google-cloud',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "processing_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "news_translations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "news_translations_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "news"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "article_translations_article_id_locale_key" ON "article_translations"("article_id", "locale");
CREATE INDEX "article_translations_status_updated_at_idx" ON "article_translations"("status", "updated_at");
CREATE UNIQUE INDEX "news_translations_news_id_locale_key" ON "news_translations"("news_id", "locale");
CREATE INDEX "news_translations_status_updated_at_idx" ON "news_translations"("status", "updated_at");
