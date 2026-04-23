-- AlterTable
ALTER TABLE "banners" ADD COLUMN     "cta_label" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "tag" TEXT,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "notices" ADD COLUMN     "badge" TEXT,
ADD COLUMN     "link_label" TEXT,
ADD COLUMN     "link_url" TEXT;

-- CreateTable
CREATE TABLE "about" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mission" TEXT NOT NULL,
    "vision" TEXT NOT NULL,
    "image_url" TEXT,
    "image_alt" TEXT,
    "stats" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "about_pkey" PRIMARY KEY ("id")
);
