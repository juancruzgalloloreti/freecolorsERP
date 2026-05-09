# LEGACY_INTERNAL_BUTTON_MAP.md - Botones internos legacy

Ultima actualizacion: 2026-05-08

Este archivo baja el analisis a nivel boton/control. Fuente principal: dumps UIA capturados con `pywinauto`.

Regla de lectura:
- `Observado`: texto/auto_id/posicion salen del dump.
- `Inferido`: funcion probable por etiqueta, posicion y modulo legacy. Requiere validacion si el boton ejecuta accion con efectos.
- `Riesgo`: Bajo = lectura/copia/busqueda; Medio = cambia pantalla, crea pedido o altera flujo; Alto = borra, graba, mueve stock/dinero/datos contables.

## Mostrador / Consulta Productos

Fuente: `docs/legacy-audit/raw/legacy-ui-dump--11--Consulta-Productos.json`.

Esta pantalla pertenece al flujo de mostrador. No es solo ABM. Es consola de consulta, venta, stock, pedido y cliente.

| Boton | Auto ID | Funcion legacy observada/inferida | Destino web sugerido | Riesgo |
|---|---|---|---|---|
| `Foto del Producto` | - | Ver imagen del producto seleccionado. | Tab/preview `Ficha`. | Bajo |
| `Pendientes` | - | Consultar pendientes relacionados al producto. | Tab `Pedidos/Pendientes`. | Bajo |
| `Stock` | - | Cambia/abre modo de consulta stock: grilla buscable con deposito, lista de precios, codigo, equivalencia, codigo origen, descripcion, stock y columnas de listas. | Vista principal `Consulta productos / Stock` embebida en mostrador. | Bajo |
| `Consulta Movimientos del Deposito seleccionado` | - | Ver movimientos de stock del deposito activo. | Tab `Movimientos`. | Bajo |
| `Rotacion` | - | Ver rotacion/dias sin movimiento. | Tab `Rotacion`. | Bajo |
| `Ventas` | - | Ver ventas historicas del producto. | Tab `Ventas`. | Bajo |
| `Compras` | - | Ver compras historicas del producto. | Tab `Compras`. | Bajo |
| `Informar Venta Perdida` | - | Registrar demanda no concretada. | Accion secundaria en drawer; no bloquear venta. | Medio |
| `Solicitar Compra` | - | Crear pedido/solicitud de compra por faltante. | Accion secundaria desde `Stock`. | Medio |
| `Armado de Kits/Conjuntos de Productos` | - | Gestionar kits/conjuntos. | Modulo futuro `Kits`; oculto si no hay soporte. | Medio |
| `ToolStripButton1` | - | Boton sin texto real; requiere captura visual/tooltip. | No implementar hasta validar. | Dudoso |
| `ToolStripButton2` | - | Boton sin texto real; requiere captura visual/tooltip. | No implementar hasta validar. | Dudoso |
| `Precio Especial` | - | Definir precio especial del producto/cliente. | Drawer `Precio especial`; requiere permisos. | Alto |
| `Exportar a TXT` | - | Exportar datos de consulta. | Menu `Exportar`. | Bajo |
| `Mas Etiquetas` | - | Opciones adicionales de etiquetas. | Menu `Etiquetas`. | Bajo |
| `Etiquetas` | - | Imprimir/generar etiquetas. | Accion `Etiquetas`. | Medio |
| `Copiar Codigo` | - | Copiar codigo al portapapeles. | Accion rapida copiar. | Bajo |
| `Copiar Descripcion` | - | Copiar descripcion al portapapeles. | Accion rapida copiar. | Bajo |
| `Copiar Precio` | - | Copiar precio actual al portapapeles. | Accion rapida copiar precio de lista seleccionada. | Bajo |
| `Avisarme Cuando Entre al Stock` | - | Crear alerta de reposicion. | Accion futura `Avisarme`. | Medio |
| `Copiar Equivalencia` | - | Copiar codigo equivalente. | Accion copiar en menu secundario. | Bajo |
| `Copiar Codigo en Origen` | - | Copiar codigo de origen/proveedor. | Accion copiar en menu secundario. | Bajo |
| `Copiar Cod/Nom/Precio` | - | Copiar resumen comercial. | Accion copiar resumen. | Bajo |
| `Consulta Series en Stock` | - | Ver series disponibles. | Tab `Series` si existe trazabilidad. | Bajo |
| `Contador de consultas de un producto` | - | Ver/aumentar contador de consultas. | Metrica interna; no visible en MVP salvo necesidad. | Dudoso |
| `Ver Clasificacion` | - | Ver clasificacion del producto. | Tab/campo `Clasificacion`. | Bajo |
| `Exportar a Excel` | - | Exportar grilla/consulta. | Menu `Exportar Excel`. | Bajo |
| `Notas` | - | Ver/editar notas del producto. | Tab `Notas`; editar con permiso. | Medio |
| `Inventario` | - | Entrar a operacion de inventario. | Accion protegida; modulo `Stock/Inventario`. | Alto |
| `Marcar Cual Producto con un mismo codigo es el que se vende` | - | Resolver duplicados/codigo vendible. | Accion admin protegida. | Alto |
| `Ficha Certificado` | - | Ver ficha/certificado del producto. | Tab/documento adjunto. | Bajo |
| `Etiqueta Bultos` | `cmdEtiquetaBultos` | Generar etiqueta de bultos. | Accion `Etiquetas`. | Medio |
| `Presupuestos` | `cmdPresupuestos` | Ver presupuestos relacionados al producto/cliente. | Tab `Presupuestos`. | Bajo |
| `Informacion Comercial` | `cmdAnalizarCliente` | Analizar cliente/comercial asociado al producto/pedido. | Drawer cliente/comercial. | Bajo |
| `Cta.Cte.BLOQUEADA` | `cmdImprimirPedidoActivo` | Estado/accion ligada a cuenta corriente bloqueada y pedido activo. Texto ambiguo. | Mostrar alerta de CC bloqueada; accion requiere validar. | Alto |
| `Consulta Pedidos de Venta` | `cmdCondPVta` | Consultar pedidos de venta. | Tab `Pedidos`. | Bajo |
| `(F9) Nuevo item` | `cmdNuevoItemPedido` | Agregar nuevo item a pedido activo. | CTA principal `Agregar al pedido/venta`. | Medio |
| `(F10) Pedidos` | `cmdPedidos` | Abrir lista de pedidos. | Acceso rapido a pedidos del cliente. | Bajo |
| `Cuenta Corriente` | `cmdEstadoDeCuenta` | Ver cuenta corriente del cliente. | Drawer/tab `Cuenta corriente`. | Bajo |
| `Domicilio:` | `btnBuscarCC` | Buscar/seleccionar cuenta corriente/cliente desde datos de domicilio. | Busqueda cliente/direccion. | Bajo |
| `Opciones de Busq.` | `cmdMasOpciones` | Mostrar filtros extra. | Filtros avanzados colapsables. | Bajo |
| `Buscar` | `cmdBuscar` | Ejecutar busqueda. | Buscador principal. | Bajo |
| `Buscar C/Equiv.` | `cmbBuscarConEquivalencia` | Buscar tambien por equivalencias. | Toggle/filtro `Equivalencias`. | Bajo |
| `Clasif.` | `cmdClasificacion` | Abrir selector de clasificacion. | Filtro `Clasificacion`. | Bajo |
| `Open` | - | Abrir combo asociado (`Lista de Precios`/deposito). | Combo nativo web. | Bajo |
| `Añadir` | - | Crear producto. | Accion admin; fuera de mostrador simple. | Medio |
| `Editar` | - | Editar producto seleccionado. | Drawer editar producto; permiso requerido. | Medio |
| `Copiar producto` | - | Duplicar producto. | Accion admin protegida. | Medio |
| `Eliminar` | - | Eliminar producto. | Confirmacion destructiva; permiso owner/admin. | Alto |
| `Movimientos a otro Producto` | - | Reasignar movimientos a otro producto. | Herramienta admin peligrosa; no en flujo mostrador. | Alto |
| `Ordenar Columnas` | - | Personalizar grilla. | Preferencias de tabla. | Bajo |
| `Minimizar` | - | Control ventana MDI. | No aplica web. | Bajo |
| `Maximizar` | - | Control ventana MDI. | No aplica web. | Bajo |
| `Cerrar` | - | Cerrar ventana. | Volver/cerrar drawer. | Bajo |
| `Subir` / `Bajar` | - | Spinners numeric up/down; no son acciones comerciales. | Inputs numericos web. | Bajo |

### Requerimientos EARS para web derivados

- Cuando el usuario busca producto en mostrador, el ERP web debe permitir buscar por codigo, descripcion, equivalencia y scanner sin perder el carrito.
- Cuando el usuario selecciona un producto, el ERP web debe mostrar precio por lista activa, stock por deposito activo y accion `Agregar`.
- Cuando el usuario toca `Stock`, el ERP web debe mostrar una consulta tipo planilla con filtros de `Deposito`, `Lista de precios`, `Codigo`, `Equiv.`, `C.Origen`, `Descrip.`, `Scanner` y `Clasif.`.
- Cuando el ERP web muestra la grilla de stock, debe mantener columnas visibles de codigo interno, codigo, codigo origen, nombre, stock y listas de precio en orden fijo.
- Cuando el producto no tiene stock suficiente, el ERP web debe ofrecer registrar venta perdida o solicitar compra sin interrumpir la venta actual.
- Cuando el usuario necesita contexto, el ERP web debe mostrar movimientos, ventas, compras, pedidos, cuenta corriente y notas en tabs/drawer, no en popups encadenados.
- Cuando una accion cambia datos criticos (`Eliminar`, `Inventario`, `Precio Especial`, `Movimientos a otro Producto`), el ERP web debe exigir permiso y confirmacion.

### Modo Stock / busqueda rapida observado visualmente

Fuente adicional: captura enviada por usuario el 2026-05-08 a las 20:02.

Al activar `Stock`, la pantalla queda como consulta operativa de productos:
- Panel izquierdo `Busqueda rapida (F2)`:
  - `Deposito`: combo, ejemplo `Deposito 1`.
  - `L.Precios`: combo, ejemplo `Lista de Precios`.
  - `Scanner`: checkbox.
  - Campos `Codigo`, `Equiv.`, `C.Origen`, `Descrip.`.
  - Botones `Clasif.`, `Buscar C/Equiv.`, `Opciones de Busq.`, `Buscar`.
- Panel central `Opcionales`: reservado para filtros extra.
- Panel derecho `Cliente - Pedidos de Venta`:
  - Cuenta corriente, buscador, nombre, domicilio, telefono, pedido activo, vendedor.
  - Acciones `Consulta Pedidos de Venta`, `Informacion Comercial`, `Cuenta Corriente`, `Etiqueta Bultos`, confirmar/seleccionar pedido, imprimir, `(F10) Pedidos`, `(F9) Nuevo item`, `Presupuestos`.
- Toolbar inferior/superior de resultados:
  - Acciones rapidas por iconos y texto: facturar `(F6)-Facturar`, etiquetas, ver clasificacion, exportar Excel, notas/estado, copias/acciones rapidas.
- Grilla tipo Excel:
  - Columnas visibles: `Codigo` interno, `Codigo`, `Cod.Origen`, `Nombre`, `Stock`, `L1 C/IVA`, `L2 C/IVA`, `L3 C/IVA`, `L4 C/IVA`, fecha/rotacion/dias sin movimiento y otras columnas de control.
  - Permite navegar muchos productos sin abrir detalle.
  - Precios y stock viven juntos; esta es la forma correcta de venta rapida.

Implicancia fuerte para ERP nuevo:
- La consulta de productos para mostrador debe ser parecida a Excel: filas densas, busqueda inmediata, teclado/scanner, stock y listas juntos.
- Las listas deben respetar siempre orden fijo: `LP1`, `LP2`, `LP3`, `LP4`, `LP5`, `CR`, `CU`. Si la vista es compacta, mostrar minimo `LP1-LP4` y dejar el resto en detalle horizontal o columnas configurables.
- No debe requerir tocar un boton para recalcular listas al vender o buscar. El backend debe entregar precios calculados/listos y el frontend refrescar al cambiar producto, deposito o regla.
- En celular no copiar grilla gigante: resultado en cards densas con precio principal, stock, lista activa, y detalle desplegable para LP1-LP5/CR/CU.

### Consulta Productos - observacion viva de tooltip

Fuente adicional: captura enviada por usuario el 2026-05-08 a las 20:15.

Se observa tooltip `Etiquetas` sobre la barra de acciones de la consulta de productos. Esto confirma que varios iconos del legacy no son autoexplicativos por texto visible, sino por tooltip.

Implicancia para web:
- Las acciones frecuentes pueden ser icon buttons, pero deben tener tooltip y `aria-label`.
- Acciones visibles principales en mostrador: buscar, scanner, agregar/facturar, etiquetas, exportar, ver clasificacion.
- Acciones secundarias o peligrosas deben ir en menu contextual: precio especial, inventario, mover movimientos, duplicar/eliminar producto.
- En mobile, estos iconos deben compactarse en barra inferior o menu de acciones, no invadir la grilla.

## Mostrador / Factura Manual

Fuente: `docs/legacy-audit/raw/legacy-internal-ventas-factura-manual-form--27-Seleccionar-Operacion-a-Cargar.json`.

| Boton | Funcion legacy observada/inferida | Destino web sugerido | Riesgo |
|---|---|---|---|
| `Domicilio de Entrega` | Abrir/editar entrega. | Seccion/drawer `Entrega`; cliente ocasional permitido. | Medio |
| `Ver Cta. Cte.` | Ver cuenta corriente cliente. | Drawer `Cuenta corriente`. | Bajo |
| `Caja Mostrador-Efectivo` | Medio de pago por defecto. | Selector pago visible. | Medio |
| `Contado ($0.00")` | Confirmar/aplicar contado. | Accion pago contado. | Medio |
| `Que Percibe` | Ver/percepcion/impuestos asociados. | Panel fiscal solo si aplica. | Medio |
| `Cancelar` | Cancelar operacion actual. | Confirmacion si hay cambios. | Medio |
| `Grabar` | Guardar/finalizar comprobante. | CTA final con validaciones. | Alto |
| `Modificar` | Modificar item. | Edicion inline/drawer de item. | Medio |
| `Desc.Ampliada` | Descripcion extendida del item. | Campo expandible por item. | Bajo |
| `Eliminar` | Eliminar item. | Confirmacion ligera si item ya cargado. | Medio |
| `%` | Aplicar porcentaje/descuento. | Campo descuento por item. | Medio |
| `Descuento` | Aplicar descuento. | Campo descuento por item/documento. | Medio |
| `Varios` | Item/accion varios. | Menu secundario; validar uso real. | Dudoso |
| `Varios 2` | Item/accion varios secundaria. | Menu secundario; validar uso real. | Dudoso |
| `Stock` | Ver stock del item/producto. | Drawer stock desde linea. | Bajo |
| `Importar Productos desde un Excel` | Cargar items desde Excel. | Importador protegido. | Medio |
| `Observaciones` | Nota del comprobante/item. | Seccion notas persistente. | Bajo |
| `Carritos` | Recuperar/gestionar carritos. | Carritos guardados/presupuestos. | Medio |
| `Deposito` | Cambiar deposito del item. | Selector deposito por item. | Medio |
| `Presupuesto` | Relacionar/convertir presupuesto. | Flujo presupuesto -> factura. | Medio |
| `Datos Remito` | Datos de remito. | Seccion remito/entrega. | Medio |
| `Cambiar` | Cambiar definicion/comprobante. | Selector comprobante con permisos. | Alto |
| `Open` | Abrir combos. | Combo nativo web. | Bajo |
| `Buscar empresa` | Buscar cliente/empresa. | Buscador cliente, con modo ocasional. | Bajo |
| `Buscar Comprobantes Pendientes` | Buscar docs pendientes. | Drawer docs pendientes. | Bajo |
| `Buscar Operaciones` | Buscar operaciones. | Buscador contextual. | Bajo |
| `Buscar Comprobantes` | Buscar comprobantes. | Buscador contextual. | Bajo |
| `Cargar` | Cargar seleccion al comprobante. | Accion contextual. | Medio |
| `Seleccionar impresora por defecto (este usuario, esta maquina)` | Configurar impresora. | Preferencia de impresion. | Bajo |
| `Minimizar` / `Restaurar` / `Maximizar` / `Cerrar` | Controles MDI. | No aplica web. | Bajo |

### Requerimientos EARS para web derivados

- Cuando el usuario factura, el ERP web debe mantener visibles cliente, entrega, pago, items y totales.
- Cuando el cliente es ocasional, el ERP web debe permitir cargar datos fiscales/de entrega sin crear cliente permanente.
- Cuando el usuario agrega un item, el ERP web debe permitir cambiar cantidad, deposito, descuento y descripcion sin abrir popups encadenados.
- Cuando el usuario graba/factura, el ERP web debe validar cliente operativo, items, stock, pago y caja antes de confirmar.
- Cuando el usuario imprime, el ERP web debe imprimir el comprobante seleccionado desde mostrador y desde comprobantes con el mismo motor.

## Pendientes de validacion dinamica

Estos botones necesitan inspeccion viva del legacy porque el dump no muestra tooltip, icono o efecto:
- `ToolStripButton1`
- `ToolStripButton2`
- `Contador de consultas de un producto`
- `Cta.Cte.BLOQUEADA`
- `Varios`
- `Varios 2`
- `Que Percibe`

Para validarlos sin riesgo, abrir legacy nuevamente en usuario OWNER, entrar a `(11) Consulta Productos`, seleccionar producto de prueba y revisar tooltip/ventana resultante sin grabar, borrar ni confirmar.
