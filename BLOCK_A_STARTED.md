# BLOCK_A_STARTED.md - Inicio Bloque A Mostrador + Consulta Productos

Ultima actualizacion: 2026-05-08

Estado: iniciado en modo diagnostico. No se implemento cambio productivo grande para no dejar un modulo critico a medias.

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

Brecha contra legacy:
- La busqueda actual de mostrador muestra resultados tipo lista/card, no grilla operativa tipo Excel.
- Ya muestra LP1-LP4 en formato compacto, pero todavia falta grilla operativa con `Codigo`, `Cod.Origen`, `Nombre`, `Stock` y listas como columnas.
- No hay un modo claro `Consulta Productos` embebido/minimalista dentro del mostrador.
- Acciones secundarias legacy aun no estan traducidas a `Mas acciones`/drawer.

## Primer cambio recomendado

Implementar en `apps/web/app/(dashboard)/ventas/ventas-page.tsx` un modo de resultados minimalista tipo tabla:

Visible en PC:
- Codigo.
- Nombre.
- Stock.
- Precio lista activa.
- Boton principal `Agregar`.
- Menu `Mas` o acciones compactas despues.

Siguiente paso:
- Convertir la tira LP1-LP4 en columnas compactas de una tabla PC.

No hacer manana al inicio:
- No tocar confirmacion de venta.
- No tocar calculo de totales.
- No tocar caja.
- No tocar stock movement.
- No redisenar todo el mostrador.

## Plan minimo para manana

FASE 1 - Confirmar API:
- API base lista: `products.search` devuelve `pricesByList`.
- Verificar si la UI debe mostrar LP1-LP4 siempre o solo lista activa + expandible.

FASE 2 - UI minimal:
- Reemplazar resultados de busqueda por tabla compacta en PC.
- Mantener cards actuales o mejorarlas para mobile.
- Agregar CTA `Agregar`.
- Mantener Enter para agregar primera coincidencia.

FASE 3 - Acciones secundarias:
- Crear `Mas acciones` visual sin implementar acciones peligrosas.
- Solo incluir acciones de lectura: copiar codigo, ver stock/movimientos si ya hay ruta/datos.

FASE 4 - Verificacion:
- `pnpm --filter web lint`
- `pnpm --filter web build`
- `pnpm --filter @erp/api build` si se toca backend.
- Browser/Playwright: buscar producto, cambiar deposito/lista, agregar item, confirmar que carrito no se pierde.

## Criterio UX

Minimalista:
- No copiar toolbar legacy.
- No mas de 3-5 acciones visibles.
- Secundarias agrupadas.
- Peligrosas protegidas.
- Mobile con buscador fijo, card densa y CTA claro.
