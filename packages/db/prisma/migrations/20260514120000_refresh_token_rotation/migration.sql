-- Migration: refresh_token_rotation
-- Desc: Reemplaza refreshTokenHash/refreshTokenExpiry en User por tabla RefreshToken
--       Rotation + reuse detection. familyId agrupa tokens de una misma sesión.
-- Date: 2026-05-14

BEGIN;

-- Crear tabla RefreshToken
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refresh_tokens_tokenHash_key" UNIQUE ("tokenHash"),
    CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Compatibilidad con bases donde la tabla ya fue creada antes de agregar tenantId al modelo.
ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

UPDATE "refresh_tokens" rt
SET "tenantId" = u."tenantId"
FROM "users" u
WHERE rt."userId" = u."id" AND rt."tenantId" IS NULL;

DELETE FROM "refresh_tokens"
WHERE "tenantId" IS NULL;

ALTER TABLE "refresh_tokens" ALTER COLUMN "tenantId" SET NOT NULL;

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS "refresh_tokens_familyId_idx" ON "refresh_tokens"("familyId");
CREATE INDEX IF NOT EXISTS "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
CREATE INDEX IF NOT EXISTS "refresh_tokens_tenantId_idx" ON "refresh_tokens"("tenantId");
CREATE INDEX IF NOT EXISTS "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- Eliminar columnas old del modelo User
ALTER TABLE "users" DROP COLUMN IF EXISTS "refreshTokenHash";
ALTER TABLE "users" DROP COLUMN IF EXISTS "refreshTokenExpiry";

COMMIT;
