ALTER TABLE "price_lists"
  ADD COLUMN IF NOT EXISTS "formulaBaseCode" TEXT,
  ADD COLUMN IF NOT EXISTS "formulaOperation" TEXT NOT NULL DEFAULT 'multiply',
  ADD COLUMN IF NOT EXISTS "formulaCoefficient" DECIMAL(12, 6),
  ADD COLUMN IF NOT EXISTS "formulaRoundingMode" TEXT NOT NULL DEFAULT 'nearest',
  ADD COLUMN IF NOT EXISTS "formulaRoundingValue" DECIMAL(18, 4);

ALTER TABLE "price_list_items"
  ADD COLUMN IF NOT EXISTS "isManualOverride" BOOLEAN NOT NULL DEFAULT false;

UPDATE "price_lists"
SET
  "formulaBaseCode" = 'LP1',
  "formulaCoefficient" = 0.600000,
  "formulaRoundingValue" = 10
WHERE lower("name") LIKE 'lp2%' AND "formulaBaseCode" IS NULL;

UPDATE "price_lists"
SET
  "formulaBaseCode" = 'LP1',
  "formulaCoefficient" = 0.800000,
  "formulaRoundingValue" = 10
WHERE lower("name") LIKE 'lp3%' AND "formulaBaseCode" IS NULL;

UPDATE "price_lists"
SET
  "formulaBaseCode" = 'CR',
  "formulaCoefficient" = 1.200000,
  "formulaRoundingValue" = 10
WHERE lower("name") LIKE 'lp4%' AND "formulaBaseCode" IS NULL;

UPDATE "price_lists"
SET
  "formulaBaseCode" = 'CR',
  "formulaCoefficient" = 1.000000,
  "formulaRoundingValue" = 10
WHERE lower("name") LIKE 'lp5%' AND "formulaBaseCode" IS NULL;
