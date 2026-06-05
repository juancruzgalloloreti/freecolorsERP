-- Migration: add_product_stock
-- 1. Agrega columna stock al modelo Product
-- 2. Trigger para mantener Product.stock sincronizado con StockMovement

BEGIN;

-- AlterTable
ALTER TABLE "products" ADD COLUMN "stock" INTEGER NOT NULL DEFAULT 0;

-- CreateFunction
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE "products" SET "stock" = "stock" + NEW.quantity::int
    WHERE "id" = NEW."productId";
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE "products" SET "stock" = "stock" - OLD.quantity::int
    WHERE "id" = OLD."productId";
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE "products" SET "stock" = "stock" + (NEW.quantity::int - OLD.quantity::int)
    WHERE "id" = NEW."productId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- CreateTrigger
CREATE TRIGGER trg_stock_movement_after_change
AFTER INSERT OR DELETE OR UPDATE ON "stock_movements"
FOR EACH ROW
EXECUTE FUNCTION update_product_stock();

COMMIT;
