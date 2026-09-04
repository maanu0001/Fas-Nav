-- Datenimport: Recherche-Metadaten an Organisationen sowie Modelle für
-- Quellen, Feldherkunft, Importläufe und Einzelergebnisse.
-- Rein additiv: keine bestehenden Spalten oder Tabellen werden entfernt.

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('ACTIVE', 'LIKELY_ACTIVE', 'UNCERTAIN', 'INACTIVE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FieldOriginType" AS ENUM ('IMPORTED', 'ADMIN_EDITED', 'ORGANIZATION_EDITED');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('DRY_RUN', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "ImportRecordAction" AS ENUM ('CREATE', 'UPDATE', 'SKIP', 'DUPLICATE', 'REVIEW', 'INVALID', 'FAILED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "activityStatus" "ActivityStatus",
ADD COLUMN     "alternativeNames" TEXT[],
ADD COLUMN     "associationType" TEXT,
ADD COLUMN     "bookingInfo" TEXT,
ADD COLUMN     "catchmentArea" TEXT,
ADD COLUMN     "confidenceScore" INTEGER,
ADD COLUMN     "dataNotes" TEXT,
ADD COLUMN     "externalImportId" TEXT,
ADD COLUMN     "hasBeizenfasnacht" BOOLEAN,
ADD COLUMN     "hasChildrensCarnival" BOOLEAN,
ADD COLUMN     "hasMaskedBall" BOOLEAN,
ADD COLUMN     "hasMonsterConcert" BOOLEAN,
ADD COLUMN     "hasParade" BOOLEAN,
ADD COLUMN     "hasSchnitzelbank" BOOLEAN,
ADD COLUMN     "headerAssetUrl" TEXT,
ADD COLUMN     "headerSourceUrl" TEXT,
ADD COLUMN     "headerStatus" TEXT,
ADD COLUMN     "homeCarnival" TEXT,
ADD COLUMN     "importSource" TEXT,
ADD COLUMN     "importedAt" TIMESTAMP(3),
ADD COLUMN     "instrumentation" TEXT,
ADD COLUMN     "knownAppearances" TEXT[],
ADD COLUMN     "lastActivityEvidence" TEXT,
ADD COLUMN     "lastImportJobId" TEXT,
ADD COLUMN     "lastVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "logoAssetUrl" TEXT,
ADD COLUMN     "logoSourceUrl" TEXT,
ADD COLUMN     "logoStatus" TEXT,
ADD COLUMN     "motto" TEXT,
ADD COLUMN     "needsManualReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organizerName" TEXT,
ADD COLUMN     "performanceArea" TEXT,
ADD COLUMN     "programHighlights" TEXT[],
ADD COLUMN     "recurrence" TEXT,
ADD COLUMN     "reviewReasons" TEXT[],
ADD COLUMN     "specialFeatures" TEXT[],
ADD COLUMN     "typicalPeriod" TEXT;

-- CreateTable
CREATE TABLE "organization_sources" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT,
    "title" TEXT,
    "accessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_origins" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "origin" "FieldOriginType" NOT NULL,
    "changedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "field_origins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileHash" TEXT,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'RUNNING',
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "importedById" TEXT,
    "importedByLabel" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "createdRecords" INTEGER NOT NULL DEFAULT 0,
    "updatedRecords" INTEGER NOT NULL DEFAULT 0,
    "skippedRecords" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "duplicateRecords" INTEGER NOT NULL DEFAULT 0,
    "reviewRecords" INTEGER NOT NULL DEFAULT 0,
    "invalidRecords" INTEGER NOT NULL DEFAULT 0,
    "eventRecords" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "metadata" JSONB,
    "rollbackAt" TIMESTAMP(3),
    "rollbackById" TEXT,
    "rollbackSummary" JSONB,
    "errorMessage" TEXT,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_records" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "action" "ImportRecordAction" NOT NULL,
    "importId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType",
    "canton" TEXT,
    "locality" TEXT,
    "confidenceScore" INTEGER,
    "organizationId" TEXT,
    "createdByThisJob" BOOLEAN NOT NULL DEFAULT false,
    "details" JSONB,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_sources_organizationId_idx" ON "organization_sources"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_sources_organizationId_url_key" ON "organization_sources"("organizationId", "url");

-- CreateIndex
CREATE INDEX "field_origins_organizationId_idx" ON "field_origins"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "field_origins_organizationId_field_key" ON "field_origins"("organizationId", "field");

-- CreateIndex
CREATE UNIQUE INDEX "import_jobs_reference_key" ON "import_jobs"("reference");

-- CreateIndex
CREATE INDEX "import_jobs_status_idx" ON "import_jobs"("status");

-- CreateIndex
CREATE INDEX "import_jobs_startedAt_idx" ON "import_jobs"("startedAt");

-- CreateIndex
CREATE INDEX "import_records_jobId_action_idx" ON "import_records"("jobId", "action");

-- CreateIndex
CREATE INDEX "import_records_organizationId_idx" ON "import_records"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "import_records_jobId_importId_key" ON "import_records"("jobId", "importId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_externalImportId_key" ON "organizations"("externalImportId");

-- CreateIndex
CREATE INDEX "organizations_externalImportId_idx" ON "organizations"("externalImportId");

-- CreateIndex
CREATE INDEX "organizations_needsManualReview_idx" ON "organizations"("needsManualReview");

-- CreateIndex
CREATE INDEX "organizations_activityStatus_idx" ON "organizations"("activityStatus");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_lastImportJobId_fkey" FOREIGN KEY ("lastImportJobId") REFERENCES "import_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_sources" ADD CONSTRAINT "organization_sources_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_origins" ADD CONSTRAINT "field_origins_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_records" ADD CONSTRAINT "import_records_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_records" ADD CONSTRAINT "import_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

