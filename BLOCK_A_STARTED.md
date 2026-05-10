# BLOCK_A_STARTED.md - Inicio Bloque A Mostrador + Consulta Productos

Ultima actualizacion: 2026-05-10

Estado: iniciado con primer cambio productivo minimo aplicado. El modulo sigue siendo critico, asi que se avanzo solo sobre busqueda/consulta de productos sin tocar caja, totales, confirmacion ni stock movement.

## Modulo afectado

Critico:
- Mostrador / ventas.
- Consulta operativa de productos.
- Precios.
- Stock por deposito.
- Comprobantes.

## Archivos revisados

- `AI_RULES.md`
- `ERP_IMPLEMENTATION_BACKLOG.md`
- `ERP_WEB_WORKFLOW_RULES.md`
- `LEGACY_INTERNAL_BUTTON_MAP.md`
- `apps/web/app/(dashboard)/ventas/ventas-page.tsx`
- `apps/web/app/(dashboard)/productos/page.tsx`
- `apps/web/lib/api.ts`
- `apps/web/lib/price-list-rules.ts`
- `apps/api/src/products/products.service.ts`
- `apps/api/src/price-lists/price-lists.service.ts`

## Diagnostico corto

El backend ya tiene buena base:
- `products.search` busca por codigo, barcode, barcode alternativo, nombre, descripcion, notas, marca y categoria.
- `products.search` acepta `priceListId`, `depositId` y `limit`.
- Devuelve `price`, `basePrice`, `appliedCoefficientName`, `stock`, `stockTotal`, costos y datos de marca/categoria.
- Inicio aplicado: `products.search` ahora tambien devuelve `pricesByList` con LP1, LP2, LP3, LP4, LP5, CR y CU calculadas en orden operativo cuando existan listas activas.
- Las listas fijas `LP1`, `LP2`, `LP3`, `LP4`, `LP5`, `CR`, `CU` ya estan normalizadas en backend y frontend.

El frontend ya tiene base:
- `ventas-page.tsx` tiene `Documento`, `Fecha`, `Punto de venta`, `Deposito`, `Cliente`, `Lista`, `Pago`.
- Tiene busqueda de productos con Enter para agregar primera coincidencia.
- Tiene carrito/detalle de items con cantidad, precio, descuento, IVA y total.
- Tiene pago, descuento, IVA, impresion de ultimo documento y ultimos documentos.
- Tiene datos fiscales/entrega sin obligar siempre a crear cliente permanente.
- Inicio aplicado: los resultados de busqueda del mostrador muestran una tira compacta LP1-LP4 cuando el backend devuelve `pricesByList`.
- Aplicado 2026-05-10: en escritorio, la busqueda del mostrador muestra una grilla operativa con `Codigo`, `Origen`, `Producto`, `Stock`, `LP1`, `LP2`, `LP3`, `LP4` y accion `Agregar`.
- Aplicado 2026-05-10: en mobile se conserva card densa tocable, con precio principal, stock y tira LP1-LP4.
- Aplicado 2026-05-10: el backend expone `originCode` extrayendo `Codigo origen:` desde `notes` de import Aguila; si no existe, la UI usa `barcodeAlt` como referencia secundaria.
- Aplicado 2026-05-10: la busqueda del mostrador separa accion rapida `Agregar` de accion secundaria `Ver`, que abre un sheet minimalista con codigo, origen, barras, unidad, stock total, precio activo y LP1-LP4.

Brecha contra legacy:
- La busqueda actual de mostrador ya tiene grilla operativa web en PC con `Origen`.
- No hay un modo claro `Consulta Productos` embebido/minimalista dentro del mostrador.
- Acciones secundarias legacy aun no estan traducidas a `Mas acciones`/drawer.
- La barra sticky de totales puede quedar muy cerca de la tabla al final del viewport; revisar pulido visual cuando se trabaje el layout completo del mostrador.

## Primer cambio recomendado

Primer cambio implementado en `apps/web/app/(dashboard)/ventas/ventas-page.tsx`:

Visible en PC:
- Codigo.
- Nombre.
- Stock.
- LP1-LP4.
- Boton principal `Agregar`.

Siguiente paso recomendado:
- Convertir acciones secundarias de consulta de producto a `Mas acciones`/drawer, solo lectura primero.
- Evaluar si conviene crear columna real `originCode` en DB mas adelante; por ahora no se migro para evitar riesgo.

No hacer manana al inicio:
- No tocar confirmacion de venta.
- No tocar calculo de totales.
- No tocar caja.
- No tocar stock movement.
- No redisenar todo el mostrador.

## Plan minimo para manana

FASE 1 - Confirmar API:
- Hecho: `products.search` devuelve `pricesByList`.

FASE 2 - UI minimal:
- Hecho: tabla compacta PC.
- Hecho: cards mobile densas.
- Hecho: CTA `Agregar`.
- Hecho: Enter para agregar primera coincidencia se mantiene.

FASE 3 - Acciones secundarias:
- Hecho: primer sheet de lectura `Ver detalle de producto`.
- Siguiente: convertir el resto de acciones secundarias legacy a `Mas acciones`/drawer sin implementar acciones peligrosas.
- Solo incluir acciones de lectura: copiar codigo, ver stock/movimientos si ya hay ruta/datos.

FASE 4 - Verificacion:
- Hecho: `pnpm --filter web lint`.
- Hecho: `pnpm --filter web build`.
- Hecho: `pnpm --filter @erp/api build`.
- Hecho con agent-browser: login owner, abrir `/ventas`, buscar `producto`, confirmar grilla PC con LP1-LP4.
- Hecho con agent-browser mobile: viewport 390x844, buscar `producto`, confirmar cards densas con LP1-LP4.
- Hecho con agent-browser: confirmar encabezado PC `Codigo`, `Origen`, `Producto`, `Stock`, `LP1`, `LP2`, `LP3`, `LP4`, `Accion`.
- Hecho con agent-browser: `Agregar` desde grilla PC suma el producto al comprobante.
- Hecho con agent-browser: `Ver` abre detalle de producto y `Agregar al comprobante` suma al comprobante.
- Hecho con agent-browser mobile: `Ver` abre detalle como sheet sin romper la card compacta.

Evidencia visual:
- `docs/legacy-audit/mostrador-product-table-check.png`
- `docs/legacy-audit/mostrador-product-table-origin-check.png`
- `docs/legacy-audit/mostrador-product-mobile-check.png`
- `docs/legacy-audit/mostrador-product-detail-sheet-check.png`
- `docs/legacy-audit/mostrador-product-detail-mobile-open-check.png`

## Criterio UX

Minimalista:
- No copiar toolbar legacy.
- No mas de 3-5 acciones visibles.
- Secundarias agrupadas.
- Peligrosas protegidas.
- Mobile con buscador fijo, card densa y CTA claro.
