# LEGACY_GAP_ANALYSIS.md - Auditoria Aguila legacy vs ERP nuevo

Ultima actualizacion: 2026-05-08

Este documento registra lo observado en el programa legacy usando inspeccion segura de UI Windows (`pywinauto`). No se grabaron, confirmaron, borraron ni modificaron datos.

## Fuentes capturadas

Los archivos crudos estan en `docs/legacy-audit/raw/`.

Mapas boton por boton:
- `LEGACY_BUTTON_FUNCTIONS.md`: inventario completo generado desde dumps UIA.
- `LEGACY_INTERNAL_BUTTON_MAP.md`: analisis enriquecido de botones internos criticos.
- `LEGACY_VALIDATION_BACKLOG.md`: pendientes reales de tooltip/efecto vivo.

- `legacy-ui-dump-owner-full-menu.json`
- `legacy-ui-dump--27--Seleccionar-Operacion-a-Cargar.json`
- `legacy-ui-dump--11--Consulta-Productos.json`
- `legacy-ui-dump--314--Grabar-pedido-de-Transferencia-entre-depositos.json`
- `legacy-ui-dump--202--Tomar-pedidos-de-la-web.json`
- `legacy-ui-dump-Listas-de-Precios--13-Listas-de-Precios.json`
- `legacy-ui-dump-Definicion-de-Comprobantes--29-Definicion-de-comprobantes.json`
- `legacy-ui-dump-Puntos-de-Venta--99-Puntos-de-Venta.json`
- `legacy-ui-dump-Numeradores--24-Tabla-de-Numeradores.json`
- `legacy-ui-dump-Caja-Diaria--86-Consulta-Caja-Diaria.json`
- `legacy-ui-dump-Consulta-Comprobantes--91-Buscar-Operacion-Comprobante.json`
- `legacy-ui-dump-Consulta-Operaciones--112-Buscar-Operacion-Comprobante.json`
- `legacy-ui-dump-Consulta-Valores-a-Depositar--123-Consulta-cartera-de-valores.json`
- `legacy-ui-dump-Consulta-Cheques-Propios-Emitidos--124-Consulta-Cheques-Propios.json`
- `legacy-ui-dump-Consulta-Movimientos-de-Valores--176-Consulta-Movimientos-de-Valores.json`
- `legacy-ui-dump-Una-Cuenta-Corriente--46-Cuenta-Corriente.json`
- `legacy-ui-dump-Resumen-de-Saldos-Para-Reclamo--233-Reclamos-win32.json`
- `legacy-ui-dump-Res-men-por-Cuentas-Corriente--79-Resumen-por-Cta-Cte-.json`
- `legacy-ui-dump-Informe-de-Vencimientos--154-Informe-de-Vencimientos.json`
- `legacy-ui-dump-Ordenes-de-Compra--128-Ordenes-de-Compra.json`
- `legacy-ui-dump-Confirmar-Recepcion--151-Verificar-Recepcion.json`

## Hallazgos por modulo

| Modulo | Legacy observado | ERP nuevo hoy | Estado | Prioridad antes de venta |
|---|---|---|---|---|
| Navegacion principal | Menu por `Archivos`, `Operaciones`, `Consultas`, `Pedidos`, accesos anclados y buscador F3. | Sidebar moderno con rutas principales; legacy y AFIP aun existen fuera de flujo comercial. | Parcial | Alta |
| Mostrador / operaciones | Selector `Carga de Operaciones` con tabs Ventas, Compras, Tesoreria, Contabilidad, Stock y Varios; shortcuts F4-F9 para factura/NC/ND fiscal/manual. | `/ventas` cubre venta inmediata y comprobante base. | Parcial funcional | Alta |
| Comprobantes | Busqueda por fecha de modificacion/carga/contabilizacion/comprobante, concepto, razon social, definicion, modulo, imputacion, Excel detalle productos, resumen por clasificacion, link web ventas. | `/documentos` cubre historial, detalle, confirmar/anular/imprimir/CSV. | Parcial | Alta |
| Puntos de venta | Punto de venta con negocio, descripcion, impresion, domicilio/localidad, numeradores por FcA/FcB/NDA/NDB/NCA/NCB/Rm. | API/puntos existen; UI comercial limitada. | Parcial | Alta |
| Numeradores | Tabla separada por comprobante, punto de venta, proximo numero y vencimiento CAI. | Numeracion existe en backend/documentos, pero sin pantalla clara de control. | Parcial | Alta |
| Definicion de comprobantes | Comprobantes configurables por sector: contabilidad, valores, compras, facturacion, stock. | Tipos fijos en codigo/base. | Diferente por diseno | Media |
| Definicion de operaciones | Operaciones configurables por sector y unidad de negocio. | Flujos separados por modulo. | Diferente por diseno | Media |
| Productos | Consulta producto con stock, movimientos, rotacion, ventas, compras, venta perdida, solicitar compra, kits, etiquetas, copiar datos, series, clasificacion, notas, inventario, pedido activo y cuenta corriente del cliente. | `/productos` y `/stock` cubren ABM, importacion, precios y stock base. | Parcial | Alta |
| Listas de precio | Lista de Precios, Lista 2, Lista 3, Lista 4, Lista 5, actualizacion manual. | Normalizado a LP1-LP5/CR/CU con calculo automatico. | Mejorado en nuevo | Media |
| Stock | Ajustes, transferencia entre depositos, mercaderia en transito, confirmar transferencia, ubicaciones, comodato, consignacion, etiquetas, inventario, lecturas celular. | `/stock` cubre existencias, movimientos y ajustes; transferencias son movimiento simple. | Parcial | Alta |
| Transferencias | Pedido de transferencia entre depositos con estado, fecha, usuario, deposito origen/destino, comentarios e impresion por codigo/alfabetico/carga. | No hay flujo completo pedido -> transito -> confirmacion. | Faltante | Alta |
| Pedidos web | Bandeja `Tomar pedidos de la web` con Empresa, Usuario, Cod. CC, Cta. Cte., Telefono, Cantidad, Total, asignar cuenta corriente y ver detalle. | `/pedidos` cubre pedidos internos; no hay bandeja externa. | Faltante | Media/Alta |
| Compras | Ordenes de compra con autorizacion, pendientes, recibidas, anuladas, usuario, proveedor, observaciones, Excel, impresion, depurar, cancelar pendiente, pendiente facturar/recibir. | `/compras` cubre OC y recepcion base. | Parcial | Alta |
| Recepcion compras | `Verificar Recepcion`, ver verificaciones, imprimir OC, buscar pendientes por numero/proveedor/fecha estimada. | Recepcion directa en `/compras`. | Parcial | Alta |
| Caja diaria | Consulta por caja, valores habilitados, monedas, entradas/salidas/saldo, detalle por unidad de negocio, saldo inicial, orden por comprobante/tipo de valor, imprimir/exportar/ampliar. | `/caja` cubre apertura, movimiento, cierre y sesiones. | Parcial | Alta |
| Valores / cheques | Cartera de valores, e-cheques, cheques propios, banco, titular, fecha pago, importe, estado cartera, movimientos de valores por entradas/salidas. | `/cheques` cubre alta y cambios de estado base. | Parcial | Alta |
| Cuenta corriente | Ficha completa, solo saldos pendientes, vencidos hoy, resumen por grupos, vencimientos por vendedor/cobrador, saldos para reclamo. | `/cuenta-corriente` cubre movimientos/saldo/asiento manual. | Parcial | Alta |
| Reportes | Ventas por producto/mes, clasificacion, contabilidad, stock, detalle, concepto, objetivo mensual, IVA, compras, cobranza, mails, logs. | `/reportes` existe, alcance no equipara legacy. | Parcial | Media |
| Usuarios / permisos | `Usuarios`, cambio clave y permisos via menu Archivos. | `/empleados` reciente, `/perfil` solapado. | Parcial | Alta |

## Comportamiento interno observado

### Factura manual legacy

Fuente: `docs/legacy-audit/raw/legacy-internal-ventas-factura-manual-form--27-Seleccionar-Operacion-a-Cargar.json`.

El flujo legacy no abre un popup pequeño. Abre una ventana hija persistente dentro del selector de carga, con:
- Cabecera de comprobante: punto de venta, tipo, letra, numero automatico, fecha y cambio de definicion de comprobante.
- Cliente fiscal: razon social, domicilio, localidad, provincia, CUIT/documento, condicion IVA, provincia IIBB, partido y busqueda de empresa.
- Entrega: boton `Domicilio de Entrega`.
- Condicion de cobro: radio `Contado` / `Cta.Cte.`, boton `Ver Cta. Cte.`, boton de valor por defecto `Caja Mostrador-Efectivo`, boton de contado.
- Detalle de items: tipo, codigo, descripcion, cantidad, unitario, descuento, IVA, total, moneda, cambio, deposito.
- Acciones de linea: modificar, descripcion ampliada, eliminar, porcentaje, descuento, varios, stock, importar productos desde Excel, observaciones, carritos, deposito, presupuesto, datos remito.
- Totales persistentes: subtotal y total.
- Opciones de salida: imprimir detalle/texto unico, redondear, enviar por mail, grabar, cancelar.

Implicancia para el ERP nuevo:
- Mostrador y comprobantes deben comportarse como superficie de trabajo persistente, no como cadena de popups.
- Datos fiscales, entrega, pago, items y totales tienen que convivir sin taparse.
- Confirmaciones deben reservarse para grabar/anular/confirmar; las ediciones de detalle convienen como panel lateral o inline.
- En mobile, este flujo debe volverse bottom sheet por seccion, con estado conservado.

### Consulta Productos legacy como parte del Mostrador

Fuente: `docs/legacy-audit/raw/legacy-ui-dump--11--Consulta-Productos.json`.

La pantalla `(11) Consulta Productos` no es solo un ABM de productos. En el legacy funciona como consola de mostrador para buscar, decidir, vender, pedir y consultar contexto comercial del producto. Elementos observados:
- Busqueda rapida por F2, busqueda normal, busqueda con equivalencia, scanner, opciones de busqueda, clasificacion, lista de precios y deposito/lista.
- Acciones de producto: foto, pendientes, stock, movimientos del deposito seleccionado, rotacion, ventas, compras, venta perdida, solicitar compra, armado de kits/conjuntos, precio especial, exportar, etiquetas, copiar codigo/descripcion/precio/equivalencias/origen, series en stock, contador de consultas, clasificacion, notas, inventario, ficha certificado y marcar producto vendible cuando hay codigos repetidos.
- Bloque cliente/pedido: datos de telefono, cuenta corriente bloqueada, consulta pedidos de venta, pedido activo, nuevo item F9, pedidos F10, cuenta corriente, vendedor, domicilio y nombre.
- ABM lateral: añadir, editar, copiar producto, eliminar, mover movimientos a otro producto y ordenar columnas.

Implicancia para el ERP nuevo:
- `/productos` no debe ser solo una tabla administrativa; debe tener una vista de consulta operativa.
- Mostrador necesita una consulta de productos embebida o accesible sin perder el carrito, con scanner, lista de precio, deposito, stock y ultimos movimientos.
- Las muchas acciones del legacy no deben aparecer como una botonera gigante. Deben agruparse por tabs o paneles: `Stock`, `Ventas`, `Compras`, `Pedidos`, `Precios`, `Notas/etiquetas`, `Cuenta corriente`.
- Las acciones frecuentes deben estar visibles: buscar, scanner, stock, agregar al pedido/venta, ver precio/lista, ver movimientos.
- Las acciones de riesgo deben ir a menu contextual o drawer con confirmacion: eliminar, mover movimientos, inventario, precio especial.
- En mobile, la consulta debe sentirse como app: buscador fijo, resultado compacto, tabs horizontales, CTA fijo para agregar al pedido y bottom sheet para detalle.

### Estado de inspeccion interna

Durante la exploracion de ventanas hijas, el legacy quedo con `Menu principal` visible pero deshabilitado, sin modal visible por UI Automation. Para evitar riesgo operativo, se detuvo la inspeccion profunda y no se forzo cierre de proceso ni acciones destructivas.

## Brechas criticas

1. Superficie vendible: rutas legacy y AFIP existen, pero el producto nuevo debe presentar un flujo claro sin pantallas viejas ni modulos fuera de alcance.
2. Cuenta corriente/cobranza: faltan vistas operativas de vencimientos, saldos para reclamo, cobrador/vendedor y resumen por grupos.
3. Caja/valores: falta lectura tipo legacy por caja, moneda, valor, cartera, cheques propios y movimientos de valores.
4. Stock/transferencias: falta flujo de transferencia entre depositos con pedido, estado, transito, confirmacion e impresion.
5. Productos: falta consola operativa por producto: rotacion, ventas/compras del producto, venta perdida, solicitar compra, etiquetas, series, notas.
6. Compras: falta autorizacion/verificacion completa y control de pendientes de facturar/recibir.
7. Comprobantes: faltan filtros avanzados y exportes utiles: detalle de productos, resumen por clasificacion, busqueda por concepto/definicion/modulo/imputacion.
8. Puntos/numeradores: falta pantalla clara para controlar numeradores y punto de venta antes de vender.

## Recomendacion de bloques

### Bloque 1 - Superficie vendible y navegacion

Riesgo: medio.

Objetivo:
- Ocultar o separar legacy y AFIP de la experiencia comercial.
- Resolver `/perfil` vs `/empleados`.
- Mejorar navegacion movil y rutas fuera del sidebar.
- Actualizar `ERP_MAP.md`.

### Bloque 2 - Comprobantes y busqueda operativa

Riesgo: alto.

Objetivo:
- Mejorar `/documentos` con filtros legacy utiles sin tocar confirmacion/anulacion.
- Agregar exporte con detalle de productos si backend ya lo permite o planificar endpoint minimo.
- Mantener drawer actual si no rompe comodidad.

### Bloque 3 - Cuenta corriente y cobranza

Riesgo: alto.

Objetivo:
- Agregar vistas: ficha completa, pendientes, vencidos, resumen de saldos, reclamo.
- Filtros por cliente, fecha, vendedor/cobrador si existen datos.
- No tocar calculo contable sin pruebas.

### Bloque 4 - Caja, valores y cheques

Riesgo: alto.

Objetivo:
- Convertir `/caja` y `/cheques` en una vista mas operativa: caja diaria, valores a depositar, cheques propios/recibidos, movimientos de valores.
- Mantener acciones destructivas con confirmacion.

### Bloque 5 - Stock y transferencias

Riesgo: muy alto.

Objetivo:
- Separar ajuste manual de transferencia entre depositos.
- Crear flujo pedido -> transito -> confirmacion.
- Validar stock y deposito origen/destino.

### Bloque 6 - Productos como consola operativa

Riesgo: alto.

Objetivo:
- Desde producto: stock por deposito, movimientos, ventas, compras, rotacion, etiquetas/notas/series si aplica.
- No mezclar con cambio masivo de precios.

### Bloque 7 - Compras y recepcion

Riesgo: alto.

Objetivo:
- Mejorar OC: estados, autorizacion, pendientes, observaciones, recepcion/verificacion.
- Evitar duplicar recepciones y movimientos de stock.

### Bloque 8 - Pedidos web / freecolors.shop

Riesgo: medio/alto.

Objetivo futuro:
- Bandeja externa compatible con Supabase/freecolors.shop.
- Importar/sincronizar pedido, asignar cliente/cuenta corriente, preparar, facturar.
- No implementarlo hasta mapear schema real de Supabase.

## Decisiones de producto sugeridas

- No replicar todo el legacy. Usar legacy como lista de reglas y flujos, no como UI a copiar.
- Mantener AFIP fuera de alcance si no se vende con AFIP.
- Priorizar comodidad diaria: mostrador, comprobantes, cuenta corriente, caja, stock, compras.
- Las pantallas de administracion profunda (`Definicion de comprobantes`, `Definicion de operaciones`) pueden quedar ocultas o como configuracion OWNER mas adelante.
