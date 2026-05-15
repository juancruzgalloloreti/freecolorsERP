import { Prisma } from '@erp/db';

export const COST_PRECISION = 4;

export async function recalculateAverageCost(
  tx: any,
  tenantId: string,
  productId: string,
): Promise<void> {
  const rows = await tx.$queryRaw(Prisma.sql`
    SELECT
      COALESCE(SUM("quantity"), 0)::float AS "quantity",
      COALESCE(SUM("quantity" * "unitCost"), 0)::float AS "value"
    FROM "stock_movements"
    WHERE "tenantId" = ${tenantId}
      AND "productId" = ${productId}
  `) as Array<{ quantity: number; value: number }>;
  const totalQty = Number(rows[0]?.quantity ?? 0);
  if (totalQty <= 0) return;
  await tx.product.update({
    where: { id: productId },
    data: { averageCost: Math.round((Number(rows[0]?.value ?? 0) / totalQty) * 10 ** COST_PRECISION) / 10 ** COST_PRECISION },
  });
}