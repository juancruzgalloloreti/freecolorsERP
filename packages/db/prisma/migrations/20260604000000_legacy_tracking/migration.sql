-- Migration: legacy_tracking
-- Agrega modelos de trazabilidad para migración histórica Aguila3G
-- 1. LegacyDocumentLink — puente entre documentos legacy y ERP
-- 2. LegacyImportBatch — control de ejecuciones de importación
-- 3. LegacyImportError — log de errores por fila
-- 4. PuntoDeVenta.isLegacy — flag para PV de migración

BEGIN;

-- CreateTable: legacy_document_links
CREATE TABLE IF NOT EXISTS "legacy_document_links" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT,
    "legacyIdComprobante" TEXT NOT NULL,
    "legacyDocumentName" TEXT,
    "legacyType" TEXT,
    "legacyLetter" TEXT,
    "legacyPos" INTEGER,
    "legacyNumber" INTEGER,
    "legacyDate" TIMESTAMP(3),
    "rawJson" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "statusNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legacy_document_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable: legacy_import_batches
CREATE TABLE IF NOT EXISTS "legacy_import_batches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "summaryJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legacy_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable: legacy_import_errors
CREATE TABLE IF NOT EXISTS "legacy_import_errors" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "idComprobante" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "field" TEXT,
    "message" TEXT NOT NULL,
    "rawJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legacy_import_errors_pkey" PRIMARY KEY ("id")
);

-- AlterTable: PuntoDeVenta.isLegacy
ALTER TABLE "puntos_de_venta" ADD COLUMN IF NOT EXISTS "isLegacy" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: legacy_document_links
CREATE UNIQUE INDEX IF NOT EXISTS "legacy_document_links_tenantId_legacyIdComprobante_key"
    ON "legacy_document_links"("tenantId", "legacyIdComprobante");

CREATE INDEX IF NOT EXISTS "legacy_document_links_tenantId_status_idx"
    ON "legacy_document_links"("tenantId", "status");

-- CreateIndex: legacy_import_batches
CREATE INDEX IF NOT EXISTS "legacy_import_batches_tenantId_status_idx"
    ON "legacy_import_batches"("tenantId", "status");

-- CreateIndex: legacy_import_errors
CREATE INDEX IF NOT EXISTS "legacy_import_errors_batchId_idx"
    ON "legacy_import_errors"("batchId");

-- AddForeignKey: legacy_document_links -> tenants
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'legacy_document_links_tenantId_fkey') THEN
        ALTER TABLE "legacy_document_links"
            ADD CONSTRAINT "legacy_document_links_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: legacy_document_links -> documents
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'legacy_document_links_documentId_fkey') THEN
        ALTER TABLE "legacy_document_links"
            ADD CONSTRAINT "legacy_document_links_documentId_fkey"
            FOREIGN KEY ("documentId") REFERENCES "documents"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: legacy_import_batches -> tenants
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'legacy_import_batches_tenantId_fkey') THEN
        ALTER TABLE "legacy_import_batches"
            ADD CONSTRAINT "legacy_import_batches_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: legacy_import_errors -> legacy_import_batches
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'legacy_import_errors_batchId_fkey') THEN
        ALTER TABLE "legacy_import_errors"
            ADD CONSTRAINT "legacy_import_errors_batchId_fkey"
            FOREIGN KEY ("batchId") REFERENCES "legacy_import_batches"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

COMMIT;
