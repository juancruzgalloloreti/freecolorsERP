# ERP_IMPLEMENTATION_BACKLOG.md - Backlog vendible desde legacy

Ultima actualizacion: 2026-05-08

Este backlog traduce botones legacy a tareas concretas para que la ERP web quede seria, usable y vendible. No es para copiar la UI vieja literal.

Principio UX:
- La web nueva debe ser minimalista y mas comoda que el legacy.
- Cada bloque debe mostrar solo las acciones de trabajo diario.
- El resto se conserva como funcionalidad, pero vive en menu, drawer, tab o pantalla avanzada.

## Bloque A - Mostrador + Consulta Productos

Riesgo: muy alto. Prioridad: maxima.

Estado:
- Iniciado en `BLOCK_A_STARTED.md`.
- Diagnostico realizado; implementacion pendiente.

Objetivo:
- Unir venta, busqueda de producto, stock, listas de precio, cliente ocasional, pedido y comprobante en un flujo rapido.

Debe quedar visible en PC:
- Busqueda rapida por `Codigo`, `Descripcion`, `Equiv.`, `Codigo origen`.
- Toggle `Scanner`.
- Combo `Deposito`.
- Combo `Lista de precios`.
- Grilla densa con `Codigo`, `Cod.Origen`, `Nombre`, `Stock`, `LP1 C/IVA`, `LP2 C/IVA`, `LP3 C/IVA`, `LP4 C/IVA`, fecha actualizacion y dias sin venta si existe.
- Accion principal: agregar/facturar item.
- Totales y pago del comprobante siempre a mano.

No debe quedar visible todo el tiempo:
- Foto, pendientes, movimientos, rotacion, ventas, compras, venta perdida, solicitar compra, kits, etiquetas multiples, copias, avisos, series, clasificacion, exportes, notas.
- Estas acciones van en tabs, drawer o menu `Mas`.

Debe quedar accesible con tooltip o menu:
- Foto.
- Pendientes.
- Movimientos.
- Rotacion.
- Ventas.
- Compras.
- Venta perdida.
- Solicitar compra.
- Kits.
- Etiquetas.
- Copiar codigo/descripcion/precio.
- Aviso cuando entre stock.
- Series.
- Clasificacion.
- Exportar.
- Notas.

Debe quedar protegido por permisos/admin:
- Precio especial.
- Inventario.
- Eliminar producto.
- Copiar producto.
- Movimientos a otro producto.
- Marcar producto vendible por codigo repetido.

Mobile:
- Buscador fijo arriba.
- Cards densas: codigo, nombre, stock, precio lista activa.
- Expandible con LP1-LP5/CR/CU.
- CTA fijo `Agregar`.
- Acciones secundarias en bottom sheet.

Layout ideal:
- Arriba: buscador + filtros basicos.
- Centro: resultados.
- Derecha en PC: carrito/detalle compacto.
- Abajo: total + CTA.
- Menu `Mas` para acciones legacy raras.

## Bloque B - Factura Presupuesto / Comprobante

Riesgo: muy alto. Prioridad: maxima.

Debe existir en el nuevo mostrador:
- Tipo de comprobante/punto de venta.
- Fecha y numero automatico.
- Cliente fiscal: razon social, domicilio, localidad, provincia, CUIT/doc, condicion IVA.
- Cliente ocasional sin crear registro permanente.
- Entrega/remito en seccion/drawer.
- Pago contado/cuenta corriente.
- Caja mostrador/valor por defecto.
- Grilla de items editable: tipo, codigo, descripcion, cantidad, unitario, descuento, IVA, total, deposito.
- Opciones: descripcion ampliada, descuento, stock, observaciones, deposito, presupuesto, datos remito.
- Totales persistentes: subtotal, IVA/percepciones, total.
- Salida: imprimir detalle/texto unico, redondear, enviar mail, grabar, cancelar.

Reglas:
- `Grabar` valida antes: caja, pago, items, stock, cliente operativo y comprobante.
- `Cancelar` confirma si hay cambios.
- `Stock` abre consulta sin perder comprobante.
- `Imprimir` debe funcionar desde mostrador y comprobantes.

## Bloque C - Comprobantes

Riesgo: alto. Prioridad: alta.

Debe cubrir:
- Busqueda por fecha, cliente, numero, tipo, estado.
- Filtros legacy utiles: fecha modificacion/carga/contabilizacion/comprobante, concepto, razon social, definicion, modulo, imputacion.
- Lista + detalle al costado en PC.
- Acciones cerca del detalle: confirmar, anular, imprimir, CSV/Excel.
- Exportes: detalle productos, resumen clasificacion.

## Bloque D - Caja / Valores / Cheques

Riesgo: muy alto. Prioridad: alta.

Debe cubrir:
- Caja diaria por caja, valor y moneda.
- Entradas, salidas, saldo.
- Seleccion/tildado de movimientos.
- Exportar/imprimir/ampliar operacion.
- Valores a depositar.
- Cheques propios/recibidos/e-cheques.
- Movimientos de valores.

## Bloque E - Cuenta Corriente / Cobranza

Riesgo: muy alto. Prioridad: alta.

Debe cubrir:
- Ficha de una cuenta corriente.
- Saldos pendientes.
- Vencidos.
- Resumen por grupos.
- Reclamos.
- Informe de vencimientos por vendedor/cobrador cuando existan datos.

## Bloque F - Compras / Recepcion

Riesgo: alto. Prioridad: alta.

Debe cubrir:
- Ordenes de compra: nueva, consultar, autorizar, anular, cancelar pendiente, depurar.
- Estados: pendiente, autorizada, recibida, anulada, pendiente facturar/recibir.
- Recepcion/verificacion.
- Impresion OC.
- Filtros por proveedor, usuario, fecha y estado.

## Bloque G - Configuracion operativa OWNER

Riesgo: alto. Prioridad: media antes de vender.

Debe cubrir o decidir ocultar:
- Puntos de venta.
- Numeradores.
- Definicion de comprobantes.
- Definicion de operaciones.
- Usuarios habilitados.

Regla:
- Si no se entrega como configuracion al cliente final, debe quedar oculto para roles no owner.
