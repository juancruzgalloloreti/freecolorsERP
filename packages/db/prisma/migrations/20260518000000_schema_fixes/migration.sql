-- Migration: schema_fixes
-- Bugs #12, #13, #14, #15
-- 1. Bug #12: FK de RefreshToken a Tenant
-- 2. Bug #13: Payment.document onDelete Cascade → Restrict
-- 3. Bug #14: @@unique([purchaseOrderId, productId]) en PurchaseOrderItem
-- 4. Bug #15: @@unique([tenantId, cuit]) en Supplier (con condicional IS NOT NULL)

BEGIN;

-- Bug #12: Agregar FK de RefreshToken a Tenant
ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE;

-- Bug #13: Payment.document onDelete Cascade → Restrict
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_documentId_fkey";
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "documents"("id")
  ON DELETE RESTRICT;

ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_tenantId_fkey";
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE RESTRICT;

-- Bug #14: @@unique([purchaseOrderId, productId])
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_order_items_purchaseOrderId_productId_key"
  ON "purchase_order_items"("purchaseOrderId", "productId");

-- Bug #15: @@unique([tenantId, cuit]) en Supplier (solo cuando cuit IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS "suppliers_tenantId_cuit_key"
  ON "suppliers"("tenantId", "cuit")
  WHERE "cuit" IS NOT NULL;

COMMIT;
