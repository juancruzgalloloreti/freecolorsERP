# ERP — Estado Actual

## Bugs Cerrados

### Sesión 2026-05-14 — Auditoría técnica + bugs críticos

| ID | Bug | Estado | Archivos tocados |
|----|-----|--------|-----------------|
| CRIT-01 | Auth HttpOnly cookies + refresh token rotation | ✅ Cerrado | `auth.service.ts`, `login/route.ts`, `refresh/route.ts`, `api.ts`, `schema.prisma` |
| CRIT-02 | Permissions escalation — OWNER validation | ✅ Cerrado | `permissions.service.ts`, `permissions.controller.ts` |
| CRIT-03 | Refresh token rotation con familyId + reuse detection | ✅ Cerrado | (mismo que CRIT-01) |
| CRIT-05 | Cost helper centralizado con 4 decimales | ✅ Cerrado | `cost-utils.ts`, `stock.service.ts`, `documents.service.ts` |
| CRIT-07 | CC running balance con window function SQL | ✅ Cerrado | `current-account.service.ts` |
| CRIT-09 | Stock pagination siempre activo | ✅ Cerrado | `stock.service.ts` |
| CRIT-10 | FOR UPDATE lock antes de lectura de OC | ✅ Cerrado | `purchases.service.ts` |
| CRIT-13 | Stock `current()` sin fallback a carga completa | ✅ Cerrado | (mismo que CRIT-09) |

### Bugs encontrados en búsqueda exhaustiva (misma sesión)

| ID | Bug | Severidad | Fix |
|----|-----|-----------|-----|
| BUG-01 | `Prisma.empty` usado como valor en `$queryRaw` (customerId=NULL nunca matchea) | **Alta** | `current-account.service.ts` — condicional `Prisma.sql` |
| BUG-02 | `recalculateAverageCost` duplicado en purchases con 2 decimales vs 4 | Media | `purchases.service.ts` — usar `cost-utils.ts` compartido |
| BUG-03 | Customer CC modal siempre vacío (`data.entries` vs `data.data`) | **Alta** | `clientes/page.tsx` — `?.data` en vez de `?.entries` |
| BUG-04 | `shouldPage` dead code en stock `current()` | Baja | `stock.service.ts` — variable eliminada |

## Tests
- **30/30** Playwright tests pasando
- Build: 31 rutas, compila limpio (API + Web)
- Auth: login, refresh, logout funcionando con HttpOnly cookies

## Pendientes
- (ninguno)
