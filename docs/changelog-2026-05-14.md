# Changelog — 2026-05-14

## Fix 1 — C-02: `syncPrices` respeta `isManualOverride` para LP4

**Archivo:** `apps/api/src/products/products.service.ts:712`

**Problema:** `syncPrices()` seteaba `isManualOverride = false` siempre, incluso para LP4. Esto causaba que precios de LP4 cargados vía creación/importación de producto se marcaran como fórmula, siendo sobreescritos en el próximo recálculo masivo.

**Fix:** Busca la lista por ID en el array `priceLists` y setea `isManualOverride = true` solo si el código de lista es LP4.

```
// Antes
const isManualOverride = false;

// Después
const list = priceLists.find((l: { id: string }) => l.id === priceListId);
const isManualOverride = list ? this.priceListCode(list.name) === 'LP4' : false;
```

**Verificación:** Build + lint pasan. Un solo foco de cambio (solo hay un `priceListItem.upsert` en todo el archivo).

---

## Fix 3 — C-03: `convertToDocument` pasa por `DocumentsService.writeDraft`

**Archivos:**
- `apps/api/src/documents/documents.service.ts` — nuevo método público `createDraftFromOrderData`
- `apps/api/src/sales-orders/sales-orders.module.ts` — importa `DocumentsModule`
- `apps/api/src/sales-orders/sales-orders.service.ts` — inyecta `DocumentsService`, rewrite de `convertToDocument`

**Problema:** SalesOrders.convertToDocument() creaba un `Document` directamente con `prisma.document.create`, salteando `buildCustomerSnapshot` (sin snapshot fiscal histórico) y `assertPricesAllowed` (sin validación de precios contra lista activa).

**Fix:**
1. Nuevo método público `DocumentsService.createDraftFromOrderData()` que envuelve `writeDraft` privado en su propia transacción
2. SalesOrdersService inyecta DocumentsService (sin forwardRef — DocumentsModule no depende de SalesOrdersModule)
3. `convertToDocument` ahora llama al wrapper en vez de hacer `prisma.document.create` directo
4. El wrapper ejecuta el pipeline completo: `computeItems` → `assertPricesAllowed` → `buildCustomerSnapshot` → creación del DRAFT
5. Se eliminaron `needsPuntoDeVenta` y `appendNote` (dead code) y el import de `DocumentStatus` (no usado)

**Pipeline que ahora corre:**
```
order → createDraftFromOrderData → $transaction → writeDraft →
  computeItems() → assertPricesAllowed() → buildCustomerSnapshot() →
  prisma.document.create() ← con snapshot fiscal + precios validados
```

**Atomicidad:** Dos transacciones separadas: 1) creación del draft (propia de DocumentsService), 2) update del pedido + auditoría. Aceptable porque el documento queda DRAFT.

---

## Fix 4 — C-06: CC balance real vía aggregate en DB

**Archivos:**
- `apps/api/src/current-account/current-account.service.ts`
- `apps/api/src/customers/customers.service.ts`

**Problema:** `current-account.service.findAll()` y `customers.service.account()` traían hasta 200/300 entries y computaban el running balance solo sobre ese subset. Con clientes de +200 movimientos, el saldo mostrado era incorrecto.

**Fix:** Cuando `customerId` está presente en la query, se ejecuta `aggregate({ _sum: { amount: true }, where: { tenantId, customerId } })` antes del fetching paginado. El saldo real se retorna como campo `balance` en la respuesta. El listado paginado sigue mostrando running balance sobre entries visibles.

El aggregate incluye `tenantId` obligatoriamente (a diferencia de un aggregate similar en `documents.service.ts` que filtraba solo por `customerId` porque el documento ya estaba validado por tenant).

**Response shape:**
```
// Antes (paginado con customerId):
{ data: [...], total, page, limit }  ← balance sobre subset

// Después:
{ data: [...], total, page, limit, balance: 12345.67 }  ← real + subset
```

---

## Fix 5 — U-01: UI de caja usa `hasPermission()` en vez de `!isOwner`

**Archivo:** `apps/web/app/(dashboard)/caja/page.tsx`

**Problema:** Los botones de Abrir/Mover/Cerrar caja estaban deshabilitados para todo rol no-OWNER (`!isOwner`), aunque el backend ya tiene permisos granulares `cash.open`, `cash.move`, `cash.close` en los defaults de ADMIN y EMPLOYEE.

**Fix:**
1. Agrega `hasPermission` al destructuring de `useAuth()`
2. Reemplaza los 3 guards:
   - Abrir: `!isOwner` → `!hasPermission('cash.open')`
   - Mover: `!isOwner` → `!hasPermission('cash.move')`
   - Cerrar: `!isOwner` → `!hasPermission('cash.close')`

El backend ya valida con `@RequirePermission('cash.open')` en cash.controller, el frontend ahora se alinea.

---

## Fix 6 — I-02: Confirm dialog al retomar borrador con carrito activo

**Archivo:** `apps/web/app/(dashboard)/ventas/ventas-page.tsx`

**Problema:** Si el usuario tenía items en el Mostrador y navegaba a `/ventas?retomar=<id>`, los items se descartaban silenciosamente sin confirmación.

**Fix:**
1. Importa `ConfirmDialog` de `@/components/erp/layout`
2. Extrae `hydrateDraft` del `useEffect` a un `useCallback` independiente para que sea llamable desde ambos lados
3. Agrega estado `resumeConfirm` y ref `pendingResumeRef` para guardar el documento pendiente
4. El `useEffect` ahora verifica `lines.length > 0` antes de hidratar. Si hay items, muestra el `ConfirmDialog` en vez de ejecutar directamente
5. `confirmResume`: ejecuta `hydrateDraft` con el documento pendiente
6. `cancelResume`: limpia el estado y navega a `/ventas` (sin parámetro)

---

## Fix 7 — I-01: Errores en español en purchases y checks

**Archivos:**
- `apps/api/src/purchases/purchases.service.ts`
- `apps/api/src/checks/checks.service.ts`

**Problema:** 7 strings de error en inglés (violación de `AI_RULES.md` línea 41).

**Traducciones aplicadas:**

| Archivo | Original | Traducción |
|---------|----------|------------|
| purchases.service.ts | `Purchase order not found` (×2) | `Orden de compra no encontrada` |
| purchases.service.ts | `Cannot cancel a received order` | `No se puede cancelar una orden ya recibida` |
| purchases.service.ts | `Reception not found` | `Recepción no encontrada` |
| checks.service.ts | `Check not found` | `Cheque no encontrado` |
| checks.service.ts | `Check must be in RECEIVED status to deposit` | `El cheque debe estar en estado Recibido para depositarse` |
| checks.service.ts | `Check must be in DEPOSITED status to clear` | `El cheque debe estar en estado Depositado para compensarse` |
| checks.service.ts | `Check must be in RECEIVED status to endorse` | `El cheque debe estar en estado Recibido para endosarse` |

---

## Fix 8 — U-02: `parseMoney` en modal de stock

**Archivo:** `apps/web/app/(dashboard)/stock/page.tsx`

**Problema:** El modal de registro de movimiento usaba `parseFloat(form.quantity)` que no soporta locale AR — `parseFloat('1,5')` devuelve 1 en vez de 1.5.

**Fix:**
1. Agrega función local `parseMoney()` (mismo patrón que `caja/page.tsx:37`)
2. Reemplaza `parseFloat(form.quantity)` → `parseMoney(form.quantity)`
3. Reemplaza `parseFloat(form.unitCost || '0')` → `parseMoney(form.unitCost)`

---

## Fix 9 — D-01: Idempotency key no se queda trabada en PROCESSING

**Archivo:** `apps/api/src/common/idempotency.interceptor.ts`

**Problema:** Si el proceso moría después de responder pero antes de que el `tap()` actualizara la key a `COMPLETED`, quedaba en estado `PROCESSING` para siempre. La próxima request con la misma key obtenía `409 Conflict` permanente.

**Fix:** Cuando se encuentra una key existente en estado `PROCESSING`, se verifica si `expiresAt` ya pasó. Si expiró, se actualiza a `FAILED` y se permite reintentar. Si no expiró, se lanza el `ConflictException` normal.

---

## Fix 10 — D-02: Seed aborta en producción

**Archivo:** `seed.ts`

**Problema:** Ejecutar `pnpm db:seed` contra producción reseteaba la contraseña del OWNER a `Admin1234!`.

**Fix:** Guard al inicio de `main()`:
```
if (process.env.NODE_ENV === 'production') {
  console.error('❌ No ejecutar seed en producción');
  process.exit(1);
}
```

---

---

## Fix 11 — CRIT-01/03: Auth HttpOnly cookies + refresh token rotation

**Archivos:**
- `apps/api/src/auth/auth.service.ts` — refresh token rotation con familyId + reuse detection
- `packages/db/prisma/schema.prisma` — modelo RefreshToken + drop columnas old
- `packages/db/prisma/migrations/20260514120000_refresh_token_rotation/migration.sql` — migration manual
- `apps/web/app/api/auth/login/route.ts` — HttpOnly solo en refresh_token
- `apps/web/app/api/auth/refresh/route.ts` — server-side cookies() en vez de js-cookie
- `apps/web/lib/api.ts` — interceptor refresh llama a Next.js route
- `apps/web/contexts/AuthContext.tsx` — alineado con nuevo flujo

**Problema:** T-02 identificaba que el refresh token viajaba en localStorage (vulnerable a XSS). Se implementó rotation con familyId + reuse detection.

**Fix:**
1. Modelo RefreshToken: `id, familyId, tokenHash, userId, tenantId, expiresAt, revokedAt, createdAt`
2. Login: crea token con nuevo familyId, setea refresh_token como HttpOnly
3. Refresh: revoca token actual, crea nuevo con mismo familyId, detecta reuse (token ya revoked = toda la familia se invalida)
4. Logout: revoca todos los tokens del usuario
5. Access_token y user cookies NO son HttpOnly (JS las necesita para axios interceptor y AuthContext)

---

## Fix 12 — CRIT-02: Permissions escalation — OWNER validation

**Archivos:**
- `apps/api/src/permissions/permissions.service.ts` — assertManagePermissions checkea OWNER
- `apps/api/src/permissions/permissions.controller.ts` — usa assertManagePermissions

**Problema:** ADMIN podía modificar permisos de OWNER.

---

## Fix 13 — CRIT-05: Cost helper centralizado

**Archivo:** `apps/api/src/common/cost-utils.ts`

**Problema:** `recalculateAverageCost` duplicado en stock y documents con distinta precisión.

**Fix:** helper compartido con `COST_PRECISION = 4`.

---

## Fix 14 — CRIT-07: CC running balance con window function SQL

**Archivo:** `apps/api/src/current-account/current-account.service.ts`

**Problema:** Running balance calculado en JS sobre subset de entries (±200). Con clientes de +200 movimientos el saldo era incorrecto.

**Fix:** `$queryRaw` con `SUM(amount) OVER (PARTITION BY customerId ORDER BY date ASC, id ASC)`.

---

## Fix 15 — CRIT-09/13: Stock pagination siempre activo

**Archivo:** `apps/api/src/stock/stock.service.ts`

**Problema:** `current()` cargaba todos los productos sin paginar si no se pasaba `page`.

**Fix:** Siempre usa `paged()` con `pageParams(query, 100, 300)`.

---

## Fix 16 — CRIT-10: FOR UPDATE en purchases

**Archivo:** `apps/api/src/purchases/purchases.service.ts`

**Problema:** Lock adquirido DESPUÉS de leer la OC.

**Fix:** `SELECT ... FOR UPDATE` antes de cualquier operación.

---

## Fix 17 — BUG-01: Prisma.empty como valor en `$queryRaw`

**Archivo:** `apps/api/src/current-account/current-account.service.ts`

**Problema:** `AND e."customerId" = ${query.customerId ?? Prisma.empty}` — cuando no hay customerId, produce `= NULL` que nunca matchea. Causaba que `/cuenta-corriente` siempre mostrara "No hay movimientos".

**Fix:** `${query.customerId ? Prisma.sql\`AND e."customerId" = ${query.customerId}\` : Prisma.empty}`

---

## Fix 18 — BUG-02: recalculateAverageCost duplicado en purchases

**Archivo:** `apps/api/src/purchases/purchases.service.ts`

**Problema:** Versión privada usaba 2 decimales y filtraba `quantity > 0` (incorrecto).

**Fix:** Usa `cost-utils.ts` compartido + actualiza `lastPurchaseCost` por separado.

---

## Fix 19 — BUG-03: Customer CC modal siempre vacío

**Archivo:** `apps/web/app/(dashboard)/clientes/page.tsx`

**Problema:** `data.entries` pero backend devuelve `{ data, balance }`. Modal siempre sin movimientos.

**Fix:** `data.entries` → `data.data`

---

## Resumen de archivos tocados

### Backend API
| Archivo | Bug |
|---------|-----|
| `apps/api/src/auth/auth.service.ts` | CRIT-01/03 |
| `apps/api/src/permissions/permissions.service.ts` | CRIT-02 |
| `apps/api/src/permissions/permissions.controller.ts` | CRIT-02 |
| `apps/api/src/common/cost-utils.ts` | CRIT-05 |
| `apps/api/src/common/pagination.ts` | (referencia) |
| `apps/api/src/current-account/current-account.service.ts` | CRIT-07 + BUG-01 |
| `apps/api/src/stock/stock.service.ts` | CRIT-09/13 + BUG-04 |
| `apps/api/src/purchases/purchases.service.ts` | CRIT-10 + BUG-02 |
| `apps/api/src/documents/documents.service.ts` | CRIT-05 import |

### Frontend Web
| Archivo | Bug |
|---------|-----|
| `apps/web/app/api/auth/login/route.ts` | CRIT-01/03 |
| `apps/web/app/api/auth/refresh/route.ts` | CRIT-01/03 |
| `apps/web/app/api/auth/logout/route.ts` | CRIT-01/03 |
| `apps/web/lib/api.ts` | CRIT-01/03 |
| `apps/web/contexts/AuthContext.tsx` | CRIT-01/03 |
| `apps/web/app/(dashboard)/clientes/page.tsx` | BUG-03 |
| `apps/web/e2e/tests/erp-smoke.spec.ts` | CRIT-09/13 |

### Base de datos
| Archivo | Bug |
|---------|-----|
| `packages/db/prisma/schema.prisma` | CRIT-01/03 |
| `packages/db/prisma/migrations/20260514120000_refresh_token_rotation/migration.sql` | CRIT-01/03 |

### Config / Docs
| Archivo | Propósito |
|---------|-----------|
| `apps/web/.env.local` | Remove NODE_ENV=production |
| `docs/ERP - Decisiones tomadas.md` | Shadow DB workaround |
| `ERP - Estado actual.md` | Estado de bugs |
