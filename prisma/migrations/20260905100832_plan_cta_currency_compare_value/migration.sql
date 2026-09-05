-- AlterTable
ALTER TABLE "plan_features" ADD COLUMN     "value" TEXT;

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "ctaText" TEXT,
ADD COLUMN     "ctaUrl" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'CHF';
