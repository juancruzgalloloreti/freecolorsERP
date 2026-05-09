# ERP_WEB_WORKFLOW_RULES.md - Traduccion legacy a web app

Ultima actualizacion: 2026-05-08

Objetivo: que el ERP nuevo conserve el comportamiento operativo valioso del legacy, pero con una experiencia web vendible, comoda en PC y celular.

## Regla central

El legacy usa muchas ventanas, botones y popups porque era una app de escritorio. El ERP web debe traducir eso a superficies persistentes:

- Lista + detalle cuando se consulta informacion.
- Drawer lateral para detalle, edicion y acciones secundarias.
- Bottom sheet en celular.
- Modal solo para confirmaciones criticas, errores bloqueantes o seleccion puntual.
- Toast no bloqueante para avisos menores.
- Estado conservado al cambiar entre cliente, producto, pago, entrega, comprobante y stock.

## Minimalismo funcional

La ERP nueva debe ser mucho mas minimalista que el legacy. Paridad funcional no significa replicar todas las botoneras visibles.

Regla:
- Legacy define que funciones existen.
- Web decide cuando mostrarlas.
- Solo 3 a 5 acciones primarias visibles por pantalla.
- Acciones secundarias van a menu `Mas`, tabs, drawer o comando contextual.
- Acciones peligrosas van ocultas detras de permisos y confirmacion.
- Iconos sin texto solo si tienen tooltip y `aria-label`.
- En mobile, una accion principal fija y el resto en bottom sheet.

Jerarquia de acciones:
- Primarias: buscar, agregar/facturar, guardar, imprimir, cobrar.
- Secundarias: exportar, etiquetas, ver movimientos, ver cuenta corriente, observaciones.
- Avanzadas: precio especial, inventario, numeradores, definiciones, mover movimientos, eliminar.

No hacer:
- No mostrar una barra horizontal gigante copiando todos los iconos legacy.
- No poner 20 botones juntos arriba de una grilla.
- No usar popups para cada dato secundario.
- No hacer que el usuario tenga que saber de memoria todos los iconos.
- No mezclar acciones admin con acciones de venta diaria.

## Popups sostenibles

Permitidos:
- Confirmar anulacion, cierre de caja, eliminacion, cambio de stock o grabacion definitiva.
- Seleccionar una opcion corta cuando no conviene navegar.
- Error critico que impide continuar.

Evitar:
- Popups para ver datos que pueden vivir en drawer.
- Popups encadenados.
- Popups que hacen perder el carrito, filtro, producto seleccionado o scroll.
- Formularios largos en modal chica.

## Patron por modulo

### Mostrador

Debe ser una mesa de trabajo:
- Carrito siempre visible o accesible.
- Busqueda de producto rapida con scanner.
- Cliente fiscal opcional: permitir consumidor final / cliente ocasional sin crear cliente permanente.
- Datos de entrega como seccion o drawer, no bloqueo inicial.
- Lista de precio y deposito visibles antes de agregar item.
- Totales y pago persistentes.
- Acciones finales claras: guardar presupuesto, facturar, imprimir, cancelar.

### Consulta Productos

Debe ser consola operativa, no solo ABM:
- Buscador fijo.
- Filtros por lista de precio, deposito, clasificacion y equivalencia.
- Resultado compacto tipo planilla en PC, con stock y listas de precio visibles.
- Orden fijo de listas: `LP1`, `LP2`, `LP3`, `LP4`, `LP5`, `CR`, `CU`. Nunca depender de tocar un boton manual para recalcular en consulta/venta.
- Detalle con tabs: ficha, stock, movimientos, ventas, compras, pedidos, precios, notas/etiquetas.
- CTA rapido: agregar al mostrador/pedido.
- Acciones peligrosas escondidas bajo menu con confirmacion.

Acciones visibles recomendadas:
- Buscar.
- Agregar/facturar.
- Stock/lista activa.
- Etiquetas solo si la operacion la usa mucho.
- `Mas acciones`.

Acciones en `Mas acciones`:
- Foto.
- Pendientes.
- Movimientos.
- Rotacion.
- Ventas.
- Compras.
- Venta perdida.
- Solicitar compra.
- Copiar.
- Exportar.
- Notas.

Columnas minimas PC para modo stock:
- Codigo interno.
- Codigo.
- Codigo origen.
- Nombre.
- Stock.
- `LP1 C/IVA`.
- `LP2 C/IVA`.
- `LP3 C/IVA`.
- `LP4 C/IVA`.
- Fecha/rotacion/dias sin movimiento cuando aplique.

Columnas mobile:
- Codigo, nombre, stock, precio de lista activa.
- Expandible: LP1-LP5, CR, CU, origen, rotacion.

### Comprobantes

Debe ser busqueda operativa:
- Filtros arriba y persistentes.
- Lista con seleccion.
- Detalle al costado en PC.
- En mobile, lista primero y detalle en bottom sheet/pagina.
- Acciones cerca del detalle, no debajo de toda la lista.
- Exportes separados: resumen, detalle productos, CSV/Excel.

### Cuenta corriente y cobranza

Debe responder rapido:
- Ficha del cliente.
- Pendientes.
- Vencidos.
- Reclamos.
- Resumen por grupo/vendedor/cobrador cuando existan datos.
- Acciones de cobro con confirmacion.

### Caja, valores y cheques

Debe priorizar control:
- Caja diaria por valor/moneda.
- Entradas, salidas y saldo.
- Cartera de valores.
- Cheques propios y recibidos.
- Movimientos con trazabilidad.
- Cierre con validaciones fuertes.

### Stock

Debe separar operaciones:
- Consulta de existencias.
- Movimientos.
- Ajuste.
- Transferencia entre depositos.
- Transferencia en transito.
- Confirmacion de transferencia.
- Inventario.

### Compras y recepcion

Debe parecer flujo de trabajo:
- Orden de compra.
- Autorizacion.
- Pendiente de recibir.
- Recepcion/verificacion.
- Pendiente de facturar.
- Historial.

## Normalizacion de pantallas

Toda pantalla vendible debe tener:
- Titulo claro y accion principal.
- Busqueda si lista datos.
- Filtros persistentes si hay mas de 20 registros.
- Estado vacio real.
- Estado de carga.
- Error en espanol.
- Acciones primarias visibles y secundarias agrupadas.
- Confirmacion en acciones destructivas.
- Comportamiento usable en 1366px y celular.

## Reglas de riesgo

Critico:
- Mostrador, ventas, comprobantes, caja, stock, pagos, permisos.
- Cambios minimos, pruebas funcionales, nada de refactor grande.

Importante:
- Productos, clientes, compras, proveedores, listas de precio.
- Se puede normalizar UI, sin romper contratos ni calculos.

Secundario:
- Dashboard, reportes visuales, configuracion informativa.
- Mas libertad visual, sin tocar negocio critico.
