# ERP_MAP.md - Mapa operativo del proyecto

Ultima actualización: 2026-05-08

Este archivo documenta rutas, módulos, dependencias y riesgos para trabajar en modo orquestador. No reemplaza pruebas; sirve para evitar cambios aislados a ciegas.

## Reglas de uso

- Leer `AI_RULES.md` antes de tocar cualquier módulo.
- En módulos críticos, primero mapear y diagnosticar; después aplicar cambios mínimos.
- Si un cambio toca más de 5 archivos productivos, pedir aprobación.
- No tocar estilos globales ni arquitectura compartida para arreglar un caso puntual sin justificar impacto.

## Mapa de carpetas

```text
/apps
  /api/src
    /auth
    /permissions
    /products
    /stock
    /documents
    /cash
    /current-account
    /customers
    /suppliers
    /price-lists
    /reports
    /sales-orders
    /purchases
    /checks
    /approvals
    /afip
    /audit
    /common
  /web/app
    /(auth)/login
    /(dashboard)
      /ventas
      /pedidos
      /documentos
      /productos
      /stock
      /listas-de-precio
      /clientes
      /proveedores
      /cuenta-corriente
      /caja
      /cheques
      /compras
      /aprobaciones
      /empleados
      /reportes
      /perfil
      /configuracion/afip
    /legacy
/packages/db/prisma/schema.prisma
```

## Inventario de pantallas y módulos

| Ruta o pantalla | Archivo principal | Componentes relacionados | Funcionalidad actual | Estado estimado | Dependencias con otros módulos | Riesgos si se modifica |
|---|---|---|---|---|---|---|
| `/login` | `apps/web/app/(auth)/login/page.tsx` | `AuthContext`, `authApi` | Inicio de sesión con email/contraseña y redirección al dashboard/mostrador. | Completo | API `auth`, JWT/cookies, middleware/proxy web. | Alto: si falla bloquea todo el ERP. |
| Layout dashboard | `apps/web/app/(dashboard)/layout.tsx` | `Sidebar`, `BottomNav`, `GlobalShortcuts` | Shell principal, navegación lateral, navegación móvil, atajos globales. | Completo con riesgo visual | Auth, permisos, todas las rutas dashboard. | Alto: cambios globales pueden romper navegación o móvil. |
| `/dashboard` e `/` dashboard | `apps/web/app/(dashboard)/page.tsx`, `apps/web/app/(dashboard)/dashboard/page.tsx` | `reportsApi`, cards/resumen | Inicio operativo con KPIs y accesos rápidos. | Parcial | Reportes, rutas principales. | Bajo/medio: puede cambiarse UI, pero no debe ocultar accesos críticos. |
| `/ventas` Mostrador | `apps/web/app/(dashboard)/ventas/ventas-page.tsx` | `PageHeader`, `MoneyInput`, `QuantityInput`, `printDocumentA4`, APIs de clientes/productos/stock/documentos/caja/precios | Flujo de venta, búsqueda de producto, alta rápida, cliente/datos fiscales, presupuesto/factura/remito, pagos, caja, impresión y últimos documentos. | Completo, crítico | Products, PriceLists, Stock, Documents, Cash, Customers, CurrentAccount, PuntoDeVenta. | Muy alto: toca plata, stock, caja, comprobantes y cuenta corriente. |
| `/pedidos` | `apps/web/app/(dashboard)/pedidos/page.tsx` | `QuantityInput`, `salesOrdersApi`, productos/clientes/documentos | Prepara pedidos, cambia estado, exporta y convierte pedido facturable a factura borrador. | Parcial/completo | SalesOrders, Products, Customers, Documents, PuntoDeVenta. | Alto: conversión a documento puede duplicar o facturar mal. |
| `/documentos` Comprobantes | `apps/web/app/(dashboard)/documentos/page.tsx` | `ConfirmDialog`, `printDocumentA4` | Historial, filtros, detalle drawer, confirmar/anular/convertir, imprimir y CSV. | Completo, crítico | Documents, Payments, Cash, Stock, CurrentAccount, DocumentConversion. | Muy alto: confirmar/anular afecta stock, caja y deuda. |
| `/productos` | `apps/web/app/(dashboard)/productos/page.tsx` | Import/export CSV, price list rules, modales inline | ABM productos, importación/exportación, marcas/categorías, stock inicial, precios LP1/CR/CU y cálculo visual LP2-LP5. | Completo con deuda de UX | Products, PriceLists, Stock, Documents. | Alto: precios y stock impactan ventas; importación puede ensuciar catálogo. |
| `/stock` Existencias | `apps/web/app/(dashboard)/stock/page.tsx` | Stock table/view components, `stockApi`, `productsApi` | Consulta stock, movimientos, depósitos, ajustes y posible archivo de producto. | Completo/parcial | Products, StockMovement, Deposits, Purchases, Documents. | Muy alto: ajustes incorrectos alteran inventario real. |
| `/listas-de-precio` Precios | `apps/web/app/(dashboard)/listas-de-precio/page.tsx` | `price-list-rules`, `priceListsApi`, `productsApi` | Muestra LP1-LP5/CR/CU, reglas automáticas, coeficientes por producto/categoría y listas heredadas. | Completo reciente; vigilar | Products search/import/export, Customers, Sales/Counter, Documents price validation. | Alto: un cambio rompe precios de mostrador y facturación. |
| `/clientes` | `apps/web/app/(dashboard)/clientes/page.tsx` | Customer modal, account detail modal, `price-list-rules` | ABM clientes, import/export, lista de precio fija, cuenta corriente por cliente. | Completo/parcial | Customers, PriceLists, CurrentAccount, Documents. | Alto: impacta facturación, deuda y datos fiscales. |
| `/proveedores` | `apps/web/app/(dashboard)/proveedores/page.tsx` | `NuevoProveedorModal`, `ImportCSVModal` | ABM proveedores, import/export, archivo/eliminación. | Parcial/completo | Suppliers, Purchases, SupplierAccount. | Medio: impacta compras y recepción. |
| `/cuenta-corriente` | `apps/web/app/(dashboard)/cuenta-corriente/page.tsx` | `ccApi`, `customersApi`, modal de asiento manual | Consulta movimientos, saldo y carga asiento manual. | Parcial | CurrentAccount, Customers, Documents, Payments. | Muy alto: deuda de clientes y pagos. |
| `/caja` | `apps/web/app/(dashboard)/caja/page.tsx` | `cashApi` | Apertura, movimientos ingreso/egreso, cierre con contado, sesiones. | Completo, crítico | CashSession, CashMovement, Documents payments, Audit. | Muy alto: plata real y arqueo. |
| `/cheques` | `apps/web/app/(dashboard)/cheques/page.tsx` | `checksApi`, modales de acción | Alta/lista de cheques, depositar, compensar, endosar, rechazar, cancelar, resumen. | Completo/parcial | Checks, Payments, Documents. | Alto: estados financieros y trazabilidad. |
| `/compras` | `apps/web/app/(dashboard)/compras/page.tsx` | `purchasesApi`, `suppliersApi`, `stockApi`, `productsApi` | Orden de compra, líneas, recepción y aumento de stock. | Parcial/completo | Purchases, Suppliers, Products, StockMovement. | Alto: recepción modifica stock y costos. |
| `/aprobaciones` | `apps/web/app/(dashboard)/aprobaciones/page.tsx` | `approvalsApi` | Flujos, solicitudes y decisiones de aprobación. | Parcial | Approvals, Permissions. | Medio/alto: si se integra a operaciones críticas puede bloquear o permitir de más. |
| `/empleados` | `apps/web/app/(dashboard)/empleados/page.tsx` | `authApi`, `permissionsApi` | ABM empleados, edición básica, permisos por categoría. | Parcial reciente | Auth, Permissions, Sidebar. | Muy alto: permisos mal asignados exponen operaciones críticas. |
| `/reportes` | `apps/web/app/(dashboard)/reportes/page.tsx` | `reportsApi` | Reportes comerciales/gestión/stock con filtros. | Parcial | Reports, Documents, Payments, Stock, Customers, Products. | Medio: lecturas erróneas afectan decisiones, no datos transaccionales. |
| `/perfil` | `apps/web/app/(dashboard)/perfil/page.tsx` | `authApi` | Gestión de perfil/usuarios y cambio de contraseña. | Dudoso/solapado con empleados | Auth, Users. | Alto: duplicación con Empleados puede generar inconsistencias de permisos. |
| `/configuracion/afip` | `apps/web/app/(dashboard)/configuracion/afip/page.tsx` | `afipApi` | Credenciales/test AFIP. Actualmente fuera del sidebar por decisión de producto. | Parcial/fuera de alcance | AFIP credentials. | Medio: no incluir en venta si AFIP queda excluido. |
| `/legacy/menu` | `apps/web/app/legacy/menu/page.tsx` | `legacy-ui` | Menú de pantallas legacy. | Dudoso | Rutas legacy. | Medio: puede confundir si queda accesible al usuario final. |
| `/legacy/ventas/factura-presupuesto` | `apps/web/app/legacy/ventas/factura-presupuesto/page.tsx` | `legacy-ui`, APIs de ventas | Flujo viejo de factura/presupuesto. | Dudoso | Cash, Customers, Documents, Products, Stock, PriceLists. | Alto: duplicar flujo de ventas puede crear comportamientos distintos. |
| `/legacy/productos/consulta` | `apps/web/app/legacy/productos/consulta/page.tsx` | `legacy-ui` | Consulta legacy de productos/precios/stock. | Dudoso | Products, Stock, PriceLists. | Medio: inconsistencia visual o de reglas de precio. |
| `/legacy/compras/factura-proveedores` | `apps/web/app/legacy/compras/factura-proveedores/page.tsx` | `legacy-ui` | Pantalla legacy de compras/proveedores. | Dudoso/parcial | Suppliers, Purchases. | Medio/alto si se usa en paralelo a Compras. |
| `/legacy/operaciones/cargar` | `apps/web/app/legacy/operaciones/cargar/page.tsx` | `legacy-ui` | Carga operativa legacy. | Dudoso | No relevado en detalle. | Medio: posible flujo obsoleto. |

## Módulos backend

| Módulo API | Archivos principales | Responsabilidad | Depende de | Riesgo |
|---|---|---|---|---|
| Auth | `apps/api/src/auth/*` | Login, refresh, usuarios, password. | User, Tenant, JWT, Permissions. | Muy alto |
| Permissions | `apps/api/src/permissions/*`, `apps/api/src/common/permissions.ts` | Permisos granulares y guards. | UserPermission, Permission. | Muy alto |
| Products | `apps/api/src/products/*` | Productos, marcas, categorías, import/export, precios, stock inicial. | PriceLists, Stock, Documents. | Alto |
| PriceLists | `apps/api/src/price-lists/*` | LP1-LP5/CR/CU, coeficientes, reglas heredadas. | Products, Customers, Documents. | Alto |
| Stock | `apps/api/src/stock/*` | Existencias, depósitos, movimientos. | Products, Documents, Purchases. | Muy alto |
| Documents | `apps/api/src/documents/*` | Comprobantes, totales, confirmación, anulación, pagos, stock, conversiones. | Cash, Stock, Products, Customers, CurrentAccount, Audit. | Muy alto |
| Cash | `apps/api/src/cash/*` | Caja, sesiones, movimientos, pagos de venta. | Documents, Audit. | Muy alto |
| CurrentAccount | `apps/api/src/current-account/*` | Cuenta corriente de clientes. | Customers, Documents, Payments. | Muy alto |
| Customers | `apps/api/src/customers/*` | Clientes, datos fiscales, import/export, cuenta. | PriceLists, CurrentAccount. | Alto |
| Suppliers | `apps/api/src/suppliers/*` | Proveedores, import/export. | Purchases. | Medio |
| Purchases | `apps/api/src/purchases/*` | Ordenes de compra, recepciones y stock. | Suppliers, Products, Stock. | Alto |
| SalesOrders | `apps/api/src/sales-orders/*` | Pedidos y conversión a comprobante. | Products, Customers, Documents. | Alto |
| Checks | `apps/api/src/checks/*` | Cheques y estados. | Payments/Documents cuando aplica. | Alto |
| Reports | `apps/api/src/reports/*` | Resúmenes y reportes. | Documents, Payments, Stock, Customers, Products. | Medio |
| Approvals | `apps/api/src/approvals/*` | Flujos y decisiones. | Permissions. | Medio/alto |
| Audit | `apps/api/src/audit/*` | Logs de auditoría. | Módulos críticos. | Medio |
| AFIP | `apps/api/src/afip/*` | Credenciales/test AFIP. | Tenant. | Medio; fuera de alcance comercial actual |

## Dependencias críticas por flujo

### Mostrador

No tocar sin revisar:
- Cálculo de items y totales.
- Lista de precio efectiva.
- Descuentos por rol.
- Caja abierta y pagos.
- Confirmación de documento.
- Descuento/restauración de stock.
- Datos fiscales/entrega sin crear cliente.

Archivos principales:
- `apps/web/app/(dashboard)/ventas/ventas-page.tsx`
- `apps/api/src/documents/documents.service.ts`
- `apps/api/src/products/products.service.ts`
- `apps/api/src/cash/cash.service.ts`
- `apps/api/src/stock/stock.service.ts`

### Comprobantes

No tocar sin revisar:
- `confirm`, `cancel`, `convert`.
- Movimientos de caja y stock.
- Cuenta corriente.
- Impresión A4.
- Deep links `?selected=`.

Archivos principales:
- `apps/web/app/(dashboard)/documentos/page.tsx`
- `apps/web/lib/print-document.ts`
- `apps/api/src/documents/documents.service.ts`

### Caja

No tocar sin revisar:
- Una sola caja abierta por tenant.
- `expectedAmount`.
- Movimientos vinculados a documento.
- Cierre con dinero contado.

Archivos principales:
- `apps/web/app/(dashboard)/caja/page.tsx`
- `apps/api/src/cash/cash.service.ts`

### Stock

No tocar sin revisar:
- Tipo y signo del movimiento.
- Depósito.
- Motivo/notas.
- Relación con compras y ventas.

Archivos principales:
- `apps/web/app/(dashboard)/stock/page.tsx`
- `apps/api/src/stock/stock.service.ts`
- `apps/api/src/documents/documents.service.ts`
- `apps/api/src/purchases/purchases.service.ts`

### Productos y precios

No tocar sin revisar:
- Importación Aguila/CSV.
- LP1-LP5/CR/CU.
- Costos `replacementCost`, `lastPurchaseCost`, `averageCost`.
- `products.search` usado por Mostrador.

Archivos principales:
- `apps/web/app/(dashboard)/productos/page.tsx`
- `apps/web/app/(dashboard)/listas-de-precio/page.tsx`
- `apps/web/lib/price-list-rules.ts`
- `apps/api/src/products/products.service.ts`
- `apps/api/src/price-lists/price-lists.service.ts`

### Usuarios y permisos

No tocar sin revisar:
- Rol `OWNER`.
- Permisos por categoría.
- Sidebar filtrado por permisos.
- Rutas duplicadas entre `/perfil` y `/empleados`.

Archivos principales:
- `apps/web/app/(dashboard)/empleados/page.tsx`
- `apps/web/app/(dashboard)/perfil/page.tsx`
- `apps/web/components/Sidebar.tsx`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/permissions/permissions.service.ts`

## Pantallas fuera del sidebar o con visibilidad especial

| Ruta | Motivo | Acción recomendada antes de venta |
|---|---|---|
| `/perfil` | Accesible desde footer de sidebar, no como grupo principal. | Decidir si convive con Empleados o queda solo para password/perfil propio. |
| `/configuracion/afip` | Existe pero AFIP no se incluye. | Mantener oculta o deshabilitar acceso comercial. |
| `/legacy/*` | Pantallas antiguas. | Auditar si siguen enlazadas; ocultar o marcar internas si no se venden. |
| `/dashboard` y `/` | Doble entrada al inicio. | Mantener si no genera confusión. |

## Estado de verificación conocido

Ultima verificación ejecutada:

```text
pnpm --filter web lint
pnpm --filter web build
pnpm --filter @erp/api build
pnpm --filter web exec playwright test e2e/tests/erp-smoke.spec.ts --reporter=line
```

Resultado conocido:

```text
28 passed
```

Cobertura funcional del smoke:
- Login.
- Rutas principales del sidebar.
- Listas de precio fijas y cálculo automático.
- Mostrador: presupuesto, factura B, impresión, cliente existente/datos de entrega.
- Cuenta corriente.
- Compra y recepción con stock.
- Anulación de factura pagada con reversa de caja/stock.
- Cheques: endoso y rechazo con datos.
- Caja: apertura, movimientos y cierre.
- Pedidos: estado facturable y conversión a documento.

## Auditoria legacy

Archivo relacionado: `LEGACY_GAP_ANALYSIS.md`.

Uso:
- Consultar antes de normalizar flujos de venta, caja, stock, cuenta corriente, compras, productos o comprobantes.
- No replicar pantallas legacy literalmente; usar sus controles como evidencia de reglas operativas y brechas.
- Priorizar bloques con impacto comercial: comprobantes, cuenta corriente/cobranza, caja/valores, stock/transferencias, productos y compras.
