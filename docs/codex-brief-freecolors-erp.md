# FreeColors ERP — Contexto y directivas para Codex

## 0. Rol esperado de Codex

Actuá como **arquitecto senior + desarrollador full-stack** sobre este repositorio.

No hagas cambios superficiales. No agregues pantallas o endpoints "a medias". Cada cambio debe cerrar un flujo real de negocio, respetar datos históricos, transacciones, auditoría, multi-tenant y usabilidad de mostrador.

El objetivo no es que el ERP se vea perfecto. El objetivo es que sea **muy funcional, rápido, confiable, mantenible y usable por empleados con conocimientos básicos de venta**, sin limitar al usuario avanzado.

---

## 1. Contexto del negocio

FreeColors ERP es una ERP para una pinturería/local de venta de mostrador.

El negocio vende principalmente de forma presencial, con posible venta por WhatsApp o pedidos, pero el corazón operativo es:

1. abrir caja;
2. buscar productos rápido;
3. vender;
4. cobrar;
5. generar documento/comprobante;
6. descontar stock;
7. registrar movimiento de caja;
8. registrar cuenta corriente si el cliente queda debiendo;
9. permitir revisar stock, ventas, deuda, caja y reportes.

El sistema debe poder guardar datos de muchos años sin degradarse ni volverse inmantenible.

No se necesita una suite gigante tipo Odoo completa. Se necesita una **ERP de mostrador extremadamente funcional**.

---

## 2. Stack actual

Repo: `freecolorsERP`

Stack esperado:

- Monorepo `pnpm`.
- Frontend: `apps/web`
  - Next.js
  - React
  - Tailwind
  - TanStack Query
  - Axios
  - Playwright
- Backend: `apps/api`
  - NestJS
  - API REST
  - Swagger
  - JWT
  - CORS
  - Helmet
  - throttling
  - idempotencia en mutaciones
- DB compartida: `packages/db`
  - Prisma
  - PostgreSQL
- Deploy sugerido:
  - Vercel para frontend.
  - Render/Railway/Fly.io/VPS/Docker para API.
  - PostgreSQL administrado/Neon/Supabase/etc. para DB.

Antes de cambiar arquitectura, inspeccioná el repo real y respetá las convenciones existentes.

---

## 3. Estado funcional actual conocido

La ERP ya tiene o apunta a tener:

- Autenticación multi-tenant con roles.
- Productos.
- Marcas.
- Categorías.
- Listas de precio.
- Coeficientes.
- Stock por movimientos inmutables.
- Clientes.
- Proveedores.
- Cuenta corriente.
- Ventas.
- Compras.
- Pedidos.
- Documentos.
- Pagos.
- Caja.
- Auditoría.
- Reportes.
- Import/export CSV para clientes, proveedores y productos.
- Atajos globales.
- Lector de código de barras.
- Focus trap en modales críticos.
- Secuencia atómica de documentos.
- `Idempotency-Key` en mutaciones.
- Campos modelo para AFIP/CAE/QR.

Pendientes críticos:

- Cerrar flujo completo: venta -> pago -> caja -> stock -> documento.
- Integración AFIP/ARCA real para CAE, QR y contingencia.
- Backups y restore probados.
- Observabilidad: logs persistentes, alertas, errores frontend, monitoreo API.
- Migraciones controladas para producción.
- Accesibilidad real en formularios.
- Mejor UX de mostrador para usuarios básicos.

---

## 4. Objetivo principal

Convertir FreeColors ERP en una herramienta robusta para:

### Usuario básico de mostrador

Debe poder operar sin entender contabilidad ni arquitectura del sistema:

1. abrir caja;
2. buscar producto por nombre, alias, marca, código o código de barras;
3. agregar producto al carrito;
4. cambiar cantidad;
5. seleccionar cliente o consumidor final;
6. elegir forma de pago;
7. confirmar venta;
8. imprimir/enviar comprobante;
9. consultar stock.

### Usuario avanzado / dueño / encargado

Debe poder:

1. auditar ventas;
2. ver caja esperada vs caja contada;
3. revisar stock y movimientos;
4. corregir errores con reversas, no con edición destructiva;
5. ver cuenta corriente;
6. gestionar listas de precios;
7. analizar margen;
8. ver deuda;
9. ver productos sin rotación;
10. ver productos con stock crítico;
11. exportar datos;
12. consultar documentos viejos;
13. facturar distintos tipos de comprobantes/conceptos.

---

## 5. Principios no negociables

### 5.1 Multi-tenant siempre

Toda entidad operativa debe pertenecer a un `tenantId`.

Nunca consultar, crear, modificar o borrar datos sin filtrar por `tenantId`.

Revisar especialmente:

- documentos;
- ventas;
- pagos;
- caja;
- stock;
- productos;
- clientes;
- proveedores;
- cuenta corriente;
- reportes;
- secuencias;
- auditoría.

### 5.2 No borrar datos transaccionales

En una ERP, borrar registros críticos rompe auditoría.

No borrar físicamente:

- ventas;
- documentos;
- pagos;
- movimientos de caja;
- movimientos de stock;
- cuenta corriente;
- compras;
- comprobantes fiscales;
- auditoría.

Usar estados:

- `DRAFT`
- `CONFIRMED`
- `CANCELLED`
- `VOIDED`
- `PENDING_FISCAL`
- `AUTHORIZED`
- `REJECTED`
- `CONTINGENCY`

Para catálogos se permite baja lógica:

- `isActive = false`
- `deletedAt`
- `deletedById`

### 5.3 Documentos congelados

Un documento emitido debe poder verse igual dentro de 10 años.

Guardar snapshots en el documento/item:

- nombre del cliente al momento de emitir;
- CUIT/DNI al momento de emitir;
- condición IVA;
- dirección fiscal si aplica;
- nombre del producto;
- SKU/código;
- descripción;
- unidad;
- precio unitario;
- descuento;
- IVA;
- subtotal;
- total;
- costo estimado;
- vendedor;
- caja;
- punto de venta;
- tipo de comprobante;
- CAE/CAEA si aplica;
- QR fiscal si aplica;
- fecha de emisión;
- moneda;
- lista de precio usada.

No reconstruir facturas viejas leyendo el producto o cliente actual.

### 5.4 Stock por movimientos, no por magia

El stock debe derivarse de movimientos inmutables:

- compra;
- venta;
- ajuste positivo;
- ajuste negativo;
- devolución;
- transferencia;
- anulación/reversa.

Puede existir una tabla `CurrentStock` o equivalente para performance, pero debe ser una proyección actualizada transaccionalmente o reconstruible desde `StockMovement`.

### 5.5 Caja por movimientos

La caja no debe ser un campo que se pisa.

Debe haber:

- sesión de caja;
- apertura;
- ingresos;
- egresos;
- ventas contado;
- retiros;
- cierre;
- diferencia;
- usuario responsable;
- auditoría.

No permitir venta contado sin caja abierta, salvo permiso explícito.

### 5.6 Cuenta corriente por ledger

La cuenta corriente debe ser un ledger:

- venta a cuenta;
- pago;
- ajuste;
- nota de crédito;
- nota de débito;
- reversa.

El saldo puede estar cacheado, pero debe poder reconstruirse.

### 5.7 Idempotencia real

Toda mutación crítica debe aceptar o generar una clave de idempotencia:

- confirmar venta;
- registrar pago;
- emitir documento;
- autorizar comprobante fiscal;
- cerrar caja;
- ajustar stock;
- importar CSV;
- confirmar compra.

Reintentar una request no debe duplicar ventas, pagos, documentos, movimientos ni comprobantes.

### 5.8 Transacciones de base de datos

Todo flujo crítico debe ejecutarse dentro de transacción DB:

- confirmar venta;
- confirmar compra;
- cierre de caja;
- anulación de documento;
- nota de crédito;
- ajuste de stock;
- pago de cuenta corriente.

No dejar estados intermedios rotos.

### 5.9 Auditoría obligatoria

Cada acción crítica debe registrar:

- tenant;
- usuario;
- timestamp;
- entidad;
- ID entidad;
- acción;
- valores relevantes antes/después si aplica;
- motivo si es corrección;
- IP/user-agent si ya existe infraestructura;
- idempotency key si aplica.

### 5.10 Performance sobre datos históricos

El sistema debe soportar muchos años de datos.

No hacer reportes pesados recalculando todo cada vez.

Usar:

- índices correctos;
- paginación obligatoria;
- filtros por fecha;
- snapshots diarios/mensuales;
- proyecciones;
- vistas/materialized views si corresponde;
- jobs de resumen.

---

## 6. Diseño recomendado de capas de datos

Separar mentalmente cuatro capas.

### 6.1 Datos maestros / catálogo

Tablas editables con baja lógica:

- Product
- Brand
- Category
- Supplier
- Customer
- PriceList
- PaymentMethod
- Warehouse
- User
- Role
- Permission

### 6.2 Estado actual / proyecciones

Tablas rápidas para operar hoy:

- CurrentStock
- CurrentPrice
- CustomerBalance
- SupplierBalance
- OpenCashSession
- ProductSearchIndex si aplica

Estas tablas pueden recalcularse desde movimientos si hay problemas.

### 6.3 Ledger transaccional inmutable

Tablas que crecen durante años:

- Document
- DocumentItem
- Payment
- StockMovement
- CashMovement
- AccountMovement
- Purchase
- PurchaseLine
- FiscalAuthorization
- AuditLog

No editar ni borrar destructivamente.

### 6.4 Histórico analítico / snapshots

Tablas para reportes rápidos:

- DailySalesSummary
- MonthlySalesSummary
- MonthlyStockSnapshot
- MonthlyCustomerBalanceSnapshot
- MonthlySupplierBalanceSnapshot
- MonthlyMarginSummary
- ProductCostHistory
- PriceHistory

---

## 7. Motor de documentos

No hardcodear reglas fiscales y contables en mil lugares.

Crear o mejorar un motor de configuración de tipos de documento.

Ejemplo conceptual:

```ts
type DocumentDirection = "SALE" | "PURCHASE" | "INTERNAL";

type DocumentTypeConfig = {
  type: DocumentType;
  label: string;
  direction: DocumentDirection;
  affectsStock: boolean;
  stockSign: 1 | -1 | 0;
  affectsCash: boolean;
  affectsCustomerAccount: boolean;
  affectsSupplierAccount: boolean;
  requiresFiscalAuthorization: boolean;
  canBePrinted: boolean;
  canBeCancelled: boolean;
  reversibleWith?: DocumentType;
  fiscalCode?: number;
};
```

El objetivo es soportar:

- Factura A
- Factura B
- Factura C
- Factura M si aplica
- Nota de crédito A/B/C/M
- Nota de débito A/B/C/M
- Remito
- Presupuesto
- Ticket interno/no fiscal
- Documento de compra
- Factura de proveedor
- Ajustes internos
- Conceptos manuales

El sistema debe permitir líneas con `productId` y líneas sin `productId`.

Línea sin producto sirve para:

- flete;
- mano de obra;
- recargo;
- descuento general;
- servicio;
- concepto manual;
- ajuste;
- otros.

---

## 8. Flujo crítico: Confirmar venta

Implementar o revisar un único caso de uso backend: `ConfirmSale`.

No distribuir la lógica en frontend.

El frontend envía intención de venta; el backend valida y confirma.

### Input mínimo

- tenant
- usuario
- cliente o consumidor final
- ítems
- cantidades
- precios
- descuentos
- impuestos
- medios de pago
- caja/sesión
- tipo de documento
- punto de venta
- observaciones
- idempotency key

### Validaciones

- tenant válido;
- usuario con permiso;
- caja abierta si corresponde;
- productos activos;
- stock suficiente o permiso para stock negativo;
- precios válidos;
- descuentos dentro del límite permitido;
- cliente requerido si es cuenta corriente;
- medio de pago válido;
- tipo de documento compatible;
- total consistente;
- idempotency key no usada o repetición segura.

### Efectos en una transacción

1. bloquear secuencia de numeración;
2. congelar datos de cliente/productos/precios;
3. crear documento;
4. crear items;
5. crear pagos;
6. crear movimientos de caja;
7. crear movimientos de stock;
8. crear cuenta corriente si queda deuda;
9. crear auditoría;
10. actualizar proyecciones actuales;
11. solicitar autorización fiscal si corresponde o dejar `PENDING_FISCAL`/`CONTINGENCY`.

### Output

- documento confirmado;
- número;
- estado fiscal;
- total;
- pagos;
- stock afectado;
- caja afectada;
- warnings si hubo contingencia.

---

## 9. Flujo crítico: Anular / corregir venta

No editar ventas viejas.

Crear una operación de reversa:

- nota de crédito;
- documento de anulación;
- stock movement inverso;
- cash movement inverso si hubo devolución;
- account movement inverso si impactó cuenta corriente;
- audit log con motivo obligatorio.

Debe validar permisos.

Un empleado común no debería poder anular sin permiso.

---

## 10. Flujo crítico: Compra y recepción

La compra debe poder:

1. crear orden de compra;
2. recibir mercadería total o parcial;
3. actualizar stock;
4. registrar costo;
5. actualizar costo promedio si corresponde;
6. registrar proveedor;
7. registrar factura de proveedor;
8. impactar cuenta corriente proveedor si queda deuda;
9. auditar.

Separar conceptualmente:

- pedido a proveedor;
- recepción física;
- factura de proveedor;
- pago al proveedor.

Aunque al principio la UI lo simplifique, el backend debe poder soportarlo.

---

## 11. Flujo crítico: Caja

Debe existir una pantalla simple de caja.

### Apertura

- monto inicial;
- usuario;
- fecha/hora;
- caja/sucursal;
- observación opcional.

### Durante el día

- ventas contado;
- ingresos manuales;
- egresos manuales;
- retiros;
- pagos por transferencia/MP;
- movimientos auditados.

### Cierre

- monto esperado;
- monto contado;
- diferencia;
- detalle por medio de pago;
- usuario responsable;
- observación obligatoria si hay diferencia.

No permitir modificar un cierre sin rol avanzado. Usar ajuste/reapertura auditada si es necesario.

---

## 12. UX de mostrador

La UX de mostrador manda sobre la estética.

Debe ser rápida, clara y tolerante a errores.

### Pantalla básica

Debe mostrar solo:

- buscador grande;
- resultados rápidos;
- carrito;
- cliente;
- total;
- forma de pago;
- botón cobrar;
- botón imprimir/enviar;
- estado de caja;
- stock visible.

### Atajos recomendados

- `F2`: buscar producto
- `F3`: cambiar cantidad
- `F4`: cobrar
- `F5`: elegir cliente
- `F6`: descuento, con permiso
- `F8`: abrir/ver caja
- `F9`: guardar presupuesto
- `F10`: confirmar venta
- `Esc`: cerrar modal
- `Enter`: seleccionar/agregar/confirmar según contexto
- `Ctrl+P`: imprimir último comprobante

### Regla de UX

Un empleado básico debe poder vender sin tocar:

- configuración fiscal;
- listas complejas;
- reportes;
- permisos;
- documentos avanzados;
- compras;
- ajustes de stock.

---

## 13. UX para usuario avanzado

El usuario avanzado necesita profundidad sin arruinar la pantalla básica.

Crear/validar vistas para:

- movimientos de stock;
- kardex por producto;
- ventas por período;
- margen por producto/marca/categoría;
- productos sin costo;
- productos sin stock;
- stock crítico;
- productos sin rotación;
- caja por día;
- cuenta corriente de cliente;
- cuenta corriente de proveedor;
- auditoría;
- documentos fiscales pendientes/rechazados;
- exportación.

---

## 14. Búsqueda de productos

La búsqueda de productos en mostrador debe ser excelente.

Debe buscar por:

- nombre;
- alias;
- marca;
- categoría;
- SKU;
- código de barras;
- proveedor;
- presentación;
- color;
- uso común;
- palabras parciales.

Ejemplos reales:

- "latex interior 20"
- "sinteplast 10"
- "rodillo antigota"
- "membrana liquida"
- "enduit"
- "cinta papel"
- código de barras escaneado

Si el volumen crece, evaluar índice dedicado con PostgreSQL trigram/full text, Meilisearch o Typesense. No hacerlo si no hace falta todavía.

---

## 15. Permisos

No alcanza con roles genéricos.

Crear o consolidar permisos granulares:

- `sale.create`
- `sale.discount`
- `sale.cancel`
- `sale.view_margin`
- `sale.change_price`
- `cash.open`
- `cash.close`
- `cash.adjust`
- `stock.view`
- `stock.adjust`
- `stock.view_cost`
- `product.create`
- `product.edit`
- `price.edit`
- `document.create`
- `document.cancel`
- `document.fiscal_retry`
- `customer.create`
- `customer.edit`
- `customer.balance.view`
- `supplier.create`
- `supplier.edit`
- `purchase.create`
- `purchase.confirm`
- `report.view_basic`
- `report.view_margin`
- `admin.users`
- `admin.settings`

El frontend puede ocultar opciones, pero el backend siempre debe validar permisos.

---

## 16. Reportes mínimos

Priorizar reportes que generan dinero o control:

1. ventas del día;
2. ticket promedio;
3. margen bruto;
4. ventas por marca;
5. ventas por categoría;
6. productos más vendidos;
7. productos sin rotación;
8. stock crítico;
9. stock valorizado;
10. cuenta corriente clientes;
11. deuda proveedores;
12. caja esperada vs contada;
13. anulaciones y descuentos por usuario;
14. productos sin costo;
15. productos con precio inconsistente.

No crear reportes lindos que no ayuden a vender, comprar o controlar.

---

## 17. Datos históricos

Objetivo: consultar años de datos sin romper performance.

### Reglas

- Toda lista debe tener paginación.
- Toda consulta histórica debe tener filtros de fecha.
- No cargar miles de filas al frontend.
- No recalcular años de ventas en cada request.
- Usar índices por `tenantId` + fecha + entidad.
- Guardar snapshots diarios/mensuales para reportes.
- Mantener documentos congelados.
- Mantener movimientos inmutables.

### Índices recomendados

Revisar y agregar si faltan:

```sql
(tenantId, createdAt)
(tenantId, date)
(tenantId, productId, createdAt)
(tenantId, customerId, createdAt)
(tenantId, supplierId, createdAt)
(tenantId, documentId)
(tenantId, status, createdAt)
(tenantId, type, createdAt)
(tenantId, cashSessionId)
(tenantId, barcode)
(tenantId, sku)
```

---

## 18. API y servicios internos

Cada servicio interno crítico debe cumplir:

- tipado fuerte;
- DTOs validados;
- transacción DB;
- control de permisos;
- control de tenant;
- idempotencia;
- auditoría;
- errores claros;
- tests de éxito y falla;
- sin duplicación de lógica de negocio en frontend;
- sin side effects escondidos.

### Formato recomendado de casos de uso

```ts
@Injectable()
export class ConfirmSaleUseCase {
  async execute(command: ConfirmSaleCommand, context: RequestContext): Promise<ConfirmSaleResult> {
    // 1. validar tenant y permisos
    // 2. validar input
    // 3. idempotencia
    // 4. transacción
    // 5. crear documento/movimientos/pagos
    // 6. auditoría
    // 7. autorización fiscal si aplica
    // 8. devolver resultado estable
  }
}
```

Evitar controladores con lógica de negocio pesada.

---

## 19. Frontend

Reglas:

- No duplicar reglas de negocio críticas en UI.
- UI valida para comodidad, backend valida para seguridad.
- Usar TanStack Query correctamente:
  - query keys consistentes;
  - invalidación después de mutaciones;
  - optimistic update solo donde sea seguro;
  - manejo visible de errores.
- Formularios con estados claros:
  - cargando;
  - guardando;
  - error;
  - éxito.
- No usar `alert()` para flujos críticos.
- Modales críticos con confirmación clara.
- Labels accesibles con `htmlFor`.
- Inputs de dinero/cantidad con parseo robusto.
- No perder carrito si se cierra un modal accidentalmente.

---

## 20. Testing mínimo obligatorio

Antes de considerar completado un flujo, agregar o actualizar tests.

### E2E prioritarios

1. login;
2. abrir caja;
3. crear cliente;
4. crear producto;
5. vender producto contado;
6. verificar documento;
7. verificar caja;
8. verificar stock;
9. vender a cuenta corriente;
10. registrar pago de cliente;
11. cerrar caja;
12. anular venta con permiso;
13. intentar anular venta sin permiso;
14. compra/recepción de stock;
15. reporte básico de ventas.

### Tests backend

- confirm sale success;
- duplicate idempotency key;
- insufficient stock;
- no open cash session;
- invalid customer for credit sale;
- document sequence atomicity;
- concurrent sale of same stock;
- cancellation/reversal;
- fiscal pending/retry behavior.

---

## 21. Integración fiscal AFIP/ARCA

No implementar de forma improvisada dentro de ventas.

Crear módulo separado:

- `FiscalAuthorizationService`
- `AfipClient` / `ArcaClient`
- `FiscalCertificateService`
- `FiscalRetryJob`
- `FiscalQrService`

Estados sugeridos:

- `NOT_REQUIRED`
- `PENDING`
- `AUTHORIZED`
- `REJECTED`
- `CONTINGENCY`
- `FAILED_RETRYABLE`
- `FAILED_FINAL`

Guardar:

- request enviado;
- response recibido;
- CAE/CAEA;
- vencimiento CAE;
- QR payload;
- errores;
- intentos;
- timestamps;
- usuario;
- certificado usado;
- ambiente homologación/producción.

La venta puede quedar confirmada internamente y fiscalmente pendiente si el negocio decide permitir contingencia, pero el estado debe ser explícito.

---

## 22. Migraciones y producción

No usar `db:push` para producción.

Usar migraciones Prisma controladas.

Antes de cambios en schema:

1. revisar impacto;
2. escribir migración;
3. probar con copia de datos;
4. tener rollback lógico;
5. backup antes de aplicar.

---

## 23. Backups y restore

No basta con hacer backup. Hay que probar restore.

Implementar o documentar:

- backup automático diario;
- retención 30/90/365;
- backup antes de migraciones;
- restore probado;
- export de datos críticos;
- verificación de integridad.

---

## 24. Observabilidad

Agregar o mejorar:

- logs estructurados backend;
- request id;
- tenant id en logs;
- usuario en logs cuando aplique;
- errores frontend;
- monitoreo de API;
- healthcheck;
- métricas básicas;
- alertas por:
  - API caida;
  - DB inaccesible;
  - errores fiscales;
  - jobs fallidos;
  - backups fallidos.

---

## 25. Qué NO hacer

No hacer:

- rehacer todo desde cero;
- agregar módulos decorativos;
- construir e-commerce antes de cerrar mostrador;
- construir IA antes de tener datos limpios;
- hardcodear reglas fiscales en frontend;
- permitir edición destructiva de ventas;
- recalcular años de datos en cada reporte;
- aceptar stock/caja/documentos inconsistentes;
- meter lógica crítica solo en React;
- hacer pantallas bonitas pero lentas;
- esconder errores críticos;
- crear endpoints sin tests;
- ignorar multi-tenant;
- ignorar permisos backend;
- dejar TODOs en flujos críticos.

---

## 26. Prioridad exacta de trabajo

Trabajar en este orden:

### Prioridad 1: flujo de venta real

Cerrar de punta a punta:

venta -> pago -> caja -> stock -> documento -> auditoría

### Prioridad 2: caja robusta

Apertura, movimientos, cierre, diferencia, permisos.

### Prioridad 3: documentos congelados y tipos de comprobante

Motor de documentos configurable, líneas con o sin producto, snapshots.

### Prioridad 4: stock histórico y actual

StockMovement + CurrentStock + kardex + stock crítico.

### Prioridad 5: cuenta corriente

Ledger cliente/proveedor, saldo actual, pagos, ajustes, reportes.

### Prioridad 6: reportes útiles

Ventas, margen, stock, deuda, caja, productos muertos.

### Prioridad 7: fiscal

AFIP/ARCA real, CAE, QR, contingencia, reintentos.

### Prioridad 8: UX básica/avanzada

Modo mostrador simple y modo avanzado.

---

## 27. Definition of Done para cualquier función interna

Una función interna se considera bien hecha solo si cumple:

- tiene nombre claro;
- recibe input tipado;
- valida datos;
- valida tenant;
- valida permisos si aplica;
- corre en transacción si modifica estado crítico;
- es idempotente si puede repetirse por error de red;
- registra auditoría si modifica algo importante;
- no rompe datos históricos;
- no mezcla responsabilidades;
- maneja errores esperables;
- tiene tests;
- no depende de estado global invisible;
- no genera duplicados;
- no deja entidades huérfanas;
- no recalcula innecesariamente;
- es fácil de leer y mantener.

Si no cumple esto, no está terminada.

---

## 28. Cómo responder al trabajar en el repo

Antes de modificar:

1. inspeccionar archivos relevantes;
2. explicar brevemente el plan;
3. tocar la menor cantidad de archivos necesaria;
4. mantener convenciones existentes;
5. agregar pruebas o explicar por qué no se puede;
6. correr build/test/lint si está disponible;
7. reportar qué cambió y qué falta.

Cuando encuentres una decisión ambigua, elegir la opción más segura para ERP:

- integridad de datos > velocidad de desarrollo;
- backend como fuente de verdad > frontend inteligente;
- reversa/auditoría > edición destructiva;
- simple y rápido > perfecto visualmente;
- mostrador funcional > suite gigante.

---

## 29. Objetivo final

FreeColors ERP debe convertirse en:

> una ERP de mostrador para pinturería, barata de operar, rápida para vender, confiable para caja/stock/documentos, capaz de guardar años de historial, usable por empleados básicos y suficientemente profunda para usuarios avanzados.

No optimizar para parecer una startup. Optimizar para que el local venda más, pierda menos stock, controle mejor la caja y tome mejores decisiones de compra.
