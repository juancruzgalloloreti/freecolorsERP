# ERP — Decisiones Tomadas

## 2026-05-14: Refresh Token Rotation (CRIT-01/03)

### Migración manual por shadow DB corrupta

**Problema:** La migración `20260510183000_price_list_formulas` referencia la tabla `price_lists` que no existe en la shadow DB (solo en la DB real). Esto causa que `prisma migrate dev` falle con error de foreign key, impidiendo crear migraciones nuevas.

**Solución:** Crear el archivo de migración manualmente en:
`packages/db/prisma/migrations/20260514120000_refresh_token_rotation/migration.sql`

Y aplicarlo con:
```bash
pnpm --filter @erp/db db:push --accept-data-loss  # dev local
# o
prisma migrate deploy  # staging/producción
```

**Riesgo:** En dev local `db:push --accept-data-loss` dropea las columnas `refreshTokenHash`/`refreshTokenExpiry` (2 filas en DB dev). En producción usar `migrate deploy` que ejecuta el SQL manual sin pérdida de datos.

**Workaround permanente:** Si se necesita generar más migraciones, hay que borrar el shadow DB manualmente o crear la tabla `price_lists` faltante. Alternativa: apuntar DATABASE_URL a la DB real sin shadow DB.
