# LEGACY_BUTTON_FUNCTIONS.md - Inventario boton/control legacy

Ultima actualizacion: 2026-05-08

Generado desde dumps UIA en `docs/legacy-audit/raw/`. Este documento busca paridad funcional: entender que hace cada control legacy y donde debe vivir en la web.

Convencion: `Validar` no significa ignorar; significa que el dump no trae tooltip/efecto y hay que probarlo vivo sin grabar/borrar.

## Cobertura

| Pantalla/estado | Controles | Botones | Pestañas | Inputs | Combos | Checks/radios | Fuente |
|---|---:|---:|---:|---:|---:|---:|---|
| productos add form / 27 Seleccionar Operación a Cargar | 111 | 41 | 6 | 15 | 6 | 7 | `legacy-internal-productos-add-form--27-Seleccionar-Operación-a-Cargar.json` |
| productos consulta / 27 Seleccionar Operación a Cargar | 111 | 41 | 6 | 15 | 6 | 7 | `legacy-internal-productos-consulta--27-Seleccionar-Operación-a-Cargar.json` |
| ventas factura manual form / 27 Seleccionar Operación a Cargar | 111 | 41 | 6 | 15 | 6 | 7 | `legacy-internal-ventas-factura-manual-form--27-Seleccionar-Operación-a-Cargar.json` |
| ventas selector / 27 Seleccionar Operación a Cargar | 38 | 10 | 6 | 2 | 2 | 0 | `legacy-internal-ventas-selector--27-Seleccionar-Operación-a-Cargar.json` |
| consulta productos child | 147 | 72 | 0 | 10 | 2 | 1 | `legacy-live-consulta-productos-child.json` |
| factura presupuesto child | 73 | 31 | 0 | 13 | 4 | 7 | `legacy-live-factura-presupuesto-child.json` |
| 11 / Consulta Productos | 81 | 68 | 0 | 10 | 2 | 1 | `legacy-ui-dump--11--Consulta-Productos.json` |
| 202 / Tomar pedidos de la web | 5 | 5 | 0 | 0 | 0 | 0 | `legacy-ui-dump--202--Tomar-pedidos-de-la-web.json` |
| 27 / Seleccionar Operación a Cargar | 38 | 10 | 6 | 2 | 2 | 0 | `legacy-ui-dump--27--Seleccionar-Operación-a-Cargar.json` |
| 314 / Grabar pedido de Transferencia entre depósitos | 21 | 10 | 0 | 2 | 0 | 2 | `legacy-ui-dump--314--Grabar-pedido-de-Transferencia-entre-depósitos.json` |
| Caja Diaria / 86 Consulta Caja Diaria | 54 | 12 | 0 | 2 | 0 | 5 | `legacy-ui-dump-Caja-Diaria--86-Consulta-Caja-Diaria.json` |
| Confirmar Recepci n / 151 Verificar Recepción | 15 | 7 | 0 | 1 | 0 | 7 | `legacy-ui-dump-Confirmar-Recepci-n--151-Verificar-Recepción.json` |
| Consulta Cheques Propios Emitidos / 124 Consulta Cheques Propios | 16 | 7 | 0 | 5 | 0 | 4 | `legacy-ui-dump-Consulta-Cheques-Propios-Emitidos--124-Consulta-Cheques-Propios.json` |
| Consulta Comprobantes / 91 Buscar Operación Comprobante | 29 | 14 | 0 | 4 | 0 | 11 | `legacy-ui-dump-Consulta-Comprobantes--91-Buscar-Operación-Comprobante.json` |
| Consulta Movimientos de Valores / 176 Consulta Movimientos de Valores | 12 | 6 | 0 | 2 | 0 | 3 | `legacy-ui-dump-Consulta-Movimientos-de-Valores--176-Consulta-Movimientos-de-Valores.json` |
| Consulta Operaciones / 112 Buscar Operación Comprobante | 21 | 14 | 0 | 5 | 2 | 0 | `legacy-ui-dump-Consulta-Operaciones--112-Buscar-Operación-Comprobante.json` |
| Consulta Valores a Depositar / 123 Consulta cartera de valores | 42 | 9 | 0 | 7 | 1 | 9 | `legacy-ui-dump-Consulta-Valores-a-Depositar--123-Consulta-cartera-de-valores.json` |
| Definici n de Comprobantes / 29 Definición de comprobantes | 51 | 11 | 0 | 0 | 0 | 5 | `legacy-ui-dump-Definici-n-de-Comprobantes--29-Definición-de-comprobantes.json` |
| Definici n de Operaciones / 23 Definiciones de operaciones | 48 | 10 | 0 | 0 | 0 | 5 | `legacy-ui-dump-Definici-n-de-Operaciones--23-Definiciones-de-operaciones.json` |
| Informe de Vencimientos / 154 Informe de Vencimientos | 27 | 9 | 0 | 5 | 2 | 11 | `legacy-ui-dump-Informe-de-Vencimientos--154-Informe-de-Vencimientos.json` |
| Listas de Precios / 13 Listas de Precios | 16 | 9 | 0 | 0 | 0 | 0 | `legacy-ui-dump-Listas-de-Precios--13-Listas-de-Precios.json` |
| Numeradores / 24 Tabla de Numeradores | 49 | 13 | 0 | 0 | 0 | 0 | `legacy-ui-dump-Numeradores--24-Tabla-de-Numeradores.json` |
| Ordenes de Compra / 128 Ordenes de Compra | 49 | 19 | 0 | 1 | 0 | 13 | `legacy-ui-dump-Ordenes-de-Compra--128-Ordenes-de-Compra.json` |
| Puntos de Venta / 99 Puntos de Venta | 26 | 10 | 0 | 0 | 0 | 0 | `legacy-ui-dump-Puntos-de-Venta--99-Puntos-de-Venta.json` |
| Res men por Cuentas Corriente / 79 Resúmen por Cta Cte | 26 | 10 | 0 | 3 | 2 | 5 | `legacy-ui-dump-Res-men-por-Cuentas-Corriente--79-Resúmen-por-Cta-Cte-.json` |
| Una Cuenta Corriente / 46 Cuenta Corriente | 17 | 9 | 0 | 2 | 0 | 6 | `legacy-ui-dump-Una-Cuenta-Corriente--46-Cuenta-Corriente.json` |
| expanded menu | 24 | 20 | 0 | 1 | 0 | 0 | `legacy-ui-dump-expanded-menu.json` |
| full menu pass | 25 | 21 | 0 | 1 | 0 | 0 | `legacy-ui-dump-full-menu-pass.json` |
| main menu | 21 | 17 | 0 | 1 | 0 | 0 | `legacy-ui-dump-main-menu.json` |
| owner full menu | 28 | 21 | 0 | 1 | 0 | 0 | `legacy-ui-dump-owner-full-menu.json` |

## Detalle por pantalla

## productos add form / 27 Seleccionar Operación a Cargar

Fuente: `docs/legacy-audit/raw/legacy-internal-productos-add-form--27-Seleccionar-Operación-a-Cargar.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| Button | `Domicilio de Entrega` | `cmdSucursal` | Gestionar domicilio/datos de entrega. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Inferido por auto_id |
| Button | `Ver Cta. Cte.` | `cmdVerCC` | Abrir estado/ficha de cuenta corriente del cliente. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Caja Mostrador-Efectivo` | `cmdContadoValorPorDefecto` | Seleccionar o aplicar pago contado/caja mostrador. | Caja, pagos o cheques/valores. | Bajo | Inferido por auto_id |
| Button | `Contado ($0.00")` | `cmdContado` | Seleccionar o aplicar pago contado/caja mostrador. | Caja, pagos o cheques/valores. | Medio | Inferido por auto_id |
| RadioButton | `Contado` | `rbContado` | Elegir una opción excluyente. | Caja, pagos o cheques/valores. | Medio | Observado por tipo UIA |
| RadioButton | `Cta.Cte.` | `rbCC` | Elegir una opción excluyente. | Cliente ocasional, cliente registrado o cuenta corriente. | Medio | Observado por tipo UIA |
| Edit | `(sin texto)` | `tConceptoOperacion` | Concepto/descripcion de la operacion. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| Edit | `(sin texto)` | `tFechaOperacion` | Fecha de operacion. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| Edit | `(sin texto)` | `tProvincia` | Provincia fiscal/domicilio. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| RadioButton | `Texto único` | `rbImpTextoUnico` | Elegir una opción excluyente. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| RadioButton | `Detalle de Items` | `rbImpDetalleNormal` | Elegir una opción excluyente. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Que Percibe` | `cmbQuePercibe` | Ver o calcular percepciones/impuestos adicionales del comprobante. | Evaluar en módulo destino. | Bajo | Mapeado |
| CheckBox | `Redondear` | `cbRedondea` | Activar/desactivar opción. | Evaluar en módulo destino. | Medio | Observado por tipo UIA |
| CheckBox | `Imprime FAC` | `cbImpFC` | Activar/desactivar opción. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `Usuario ML` | `tOrdenDeCp` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `(sin texto)` | `cmdMail` | Enviar comprobante por mail. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| CheckBox | `Enviar por Mail` | `cbEnviarPorMail` | Activar/desactivar opción. | Mostrador/comprobantes. | Medio | Observado por tipo UIA |
| Button | `Cancelar` | `cmdCancelar` | Cancelar operación actual. | Evaluar en módulo destino. | Alto | Inferido por auto_id |
| Button | `Grabar` | `cmdGuardar` | Persistir/finalizar operación. | Mostrador/comprobantes. | Alto | Inferido por auto_id |
| HeaderItem | `Concepto` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Importe` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Mda.Ext.` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| ListItem | `SubTotal` | `-` | Fila resumen de subtotal calculado. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `TOTAL` | `-` | Fila resumen de total final calculado. | Evaluar en módulo destino. | Bajo | Mapeado |
| HeaderItem | `Tipo` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Código` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Descripción` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Cant.` | `HeaderItem 3` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Unitario` | `HeaderItem 4` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `% Desc.` | `HeaderItem 5` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `% IVA` | `HeaderItem 6` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Total` | `HeaderItem 7` | Fila resumen de total final calculado. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Mda` | `HeaderItem 8` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Mda.Ext.` | `HeaderItem 9` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Cambio` | `HeaderItem 10` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Total ME` | `HeaderItem 11` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Deposito` | `HeaderItem 12` | Elegir deposito para item/operacion. | Mostrador/productos/stock según contexto. | Alto | Observado por tipo UIA |
| Button | `Modificar` | `-` | Editar registro/item seleccionado. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Desc.Ampliada` | `-` | Editar/ver descripcion ampliada del item. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Eliminar` | `-` | Eliminar registro/item. | Evaluar en módulo destino. | Alto | Inferido por texto |
| Button | `%` | `-` | Aplicar porcentaje al item/documento segun contexto. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Descuento` | `-` | Aplicar descuento al item/documento. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Varios` | `-` | Abrir acciones varias de item/comprobante. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Varios 2` | `-` | Abrir segundo grupo de acciones varias de item/comprobante. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Stock` | `-` | Consultar stock/movimientos o aplicar operación de stock según pantalla. | Mostrador/productos/stock según contexto. | Medio | Inferido por texto |
| Button | `Importar Productos desde un Excel` | `-` | Importar productos/items desde Excel. | Filtro, búsqueda o exporte. | Medio | Inferido por texto |
| Button | `Observaciones` | `-` | Ver/editar notas u observaciones. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Carritos` | `-` | Abrir/recuperar carritos o selecciones guardadas. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Depósito` | `-` | Elegir deposito para item/operacion. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Presupuesto` | `-` | Relacionar, cargar o convertir presupuesto segun flujo activo. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Datos Remito` | `cmdDatosRemito` | Cargar datos de remito/entrega asociados al comprobante. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Cambiar` | `cmdCambiarDefComprobante` | Cambiar definicion/tipo de comprobante u operacion. | Evaluar en módulo destino. | Alto | Mapeado |
| Edit | `FAC` | `tPV` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `tFecha` | Fecha del comprobante. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| ComboBox | `Prov.IIBB:` | `cboProvincias` | Selector de opción/lista. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `Prov.IIBB:` | `1001` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Edit | `Sector:` | `tProvIIBB` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| ComboBox | `Partido:` | `cboSector` | Selector de opción/lista. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Edit | `CUIT/Doc.:` | `tPartido` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `Prov:` | `tDocumento` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| ComboBox | `Domicilio:` | `cboDocumento` | Selector de opción/lista. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| ComboBox | `Consumidor(Final)` | `cboCondIVA` | Selector de opción/lista. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Edit | `(sin texto)` | `tLocalidad` | Localidad del cliente/domicilio. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| Edit | `Razón social:` | `tDomicilio` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `tRazonSocial` | Razon social del cliente. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| Button | `Buscar empresa` | `CmdBuscarEmpresa` | Ejecutar búsqueda o abrir selector relacionado. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Inferido por auto_id |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Restaurar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| ComboBox | `Punto de venta:` | `cboPtoVta` | Selector de opción/lista. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `Punto de venta:` | `1001` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Button | `Buscar Comprobantes Pendientes` | `cmdBuscarPendientes` | Ejecutar búsqueda o abrir selector relacionado. | Mostrador/comprobantes. | Bajo | Inferido por auto_id |
| Button | `Buscar Operaciones` | `cmdBuscarOperaciones` | Ejecutar búsqueda o abrir selector relacionado. | Filtro, búsqueda o exporte. | Bajo | Inferido por auto_id |
| ComboBox | `Unidad de negocios:` | `cboUnidadNegocios` | Selector de opción/lista. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `Unidad de negocios:` | `1001` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Button | `Buscar Comprobantes` | `cmdBuscar` | Ejecutar búsqueda o abrir selector relacionado. | Mostrador/comprobantes. | Bajo | Inferido por auto_id |
| Button | `Cargar` | `cmdCargar` | Cargar selección en el flujo activo. | Evaluar en módulo destino. | Medio | Inferido por auto_id |
| TabItem | `Varios` | `-` | Abrir acciones varias de item/comprobante. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| ListItem | `Ajuste de Inventario Negativo` | `-` | Cargar ajuste de inventario negativo. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| ListItem | `Ajuste de Inventario Positivo` | `-` | Cargar ajuste de inventario positivo. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| ListItem | `Transferencia entre Depositos` | `-` | Cargar transferencia entre depositos. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| TabItem | `Stock` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Medio | Observado por tipo UIA |
| ListItem | `Aplicacion de Comprobantes Pres.` | `-` | Aplicar comprobantes presupuestarios. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `Asiento Contable` | `-` | Cargar asiento contable. | Evaluar en módulo destino. | Bajo | Mapeado |
| TabItem | `Contabilidad` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| ListItem | `Depositos Bancarios` | `-` | Cargar deposito bancario. | Caja, pagos o cheques/valores. | Alto | Mapeado |
| ListItem | `Pagos` | `-` | Cargar pago. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Recibos` | `-` | Cargar recibo/cobranza. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Transferencias de Valores` | `-` | Cargar transferencia de valores. | Caja, pagos o cheques/valores. | Alto | Mapeado |
| TabItem | `Tesorería` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| Button | `Seleccionar impresora por defecto (este usuario, esta máquina)` | `cmdSeleccionaImpresoraFacturacion` | Imprimir o configurar impresión. | Evaluar en módulo destino. | Bajo | Inferido por auto_id |
| ListItem | `(F4)-Factura Fiscal` | `-` | Seleccionar factura fiscal. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `(F5)-Factura manual` | `-` | Seleccionar factura manual. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `(F6)-NC Fiscal` | `-` | Seleccionar nota de credito fiscal. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `(F7)-NC Manual` | `-` | Seleccionar nota de credito manual. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `(F8)-ND Fiscal` | `-` | Seleccionar nota de debito fiscal. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `(F9)-ND Manual` | `-` | Seleccionar nota de debito manual. | Evaluar en módulo destino. | Bajo | Mapeado |
| TabItem | `Ventas` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| ListItem | `Factura Proveedores` | `-` | Seleccionar factura de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| ListItem | `NC Proveedores` | `-` | Seleccionar nota de credito de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| ListItem | `ND Proveedores` | `-` | Seleccionar nota de debito de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| TabItem | `Compras` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## productos consulta / 27 Seleccionar Operación a Cargar

Fuente: `docs/legacy-audit/raw/legacy-internal-productos-consulta--27-Seleccionar-Operación-a-Cargar.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| Button | `Domicilio de Entrega` | `cmdSucursal` | Gestionar domicilio/datos de entrega. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Inferido por auto_id |
| Button | `Ver Cta. Cte.` | `cmdVerCC` | Abrir estado/ficha de cuenta corriente del cliente. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Caja Mostrador-Efectivo` | `cmdContadoValorPorDefecto` | Seleccionar o aplicar pago contado/caja mostrador. | Caja, pagos o cheques/valores. | Bajo | Inferido por auto_id |
| Button | `Contado ($0.00")` | `cmdContado` | Seleccionar o aplicar pago contado/caja mostrador. | Caja, pagos o cheques/valores. | Medio | Inferido por auto_id |
| RadioButton | `Contado` | `rbContado` | Elegir una opción excluyente. | Caja, pagos o cheques/valores. | Medio | Observado por tipo UIA |
| RadioButton | `Cta.Cte.` | `rbCC` | Elegir una opción excluyente. | Cliente ocasional, cliente registrado o cuenta corriente. | Medio | Observado por tipo UIA |
| Edit | `(sin texto)` | `tConceptoOperacion` | Concepto/descripcion de la operacion. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| Edit | `(sin texto)` | `tFechaOperacion` | Fecha de operacion. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| Edit | `(sin texto)` | `tProvincia` | Provincia fiscal/domicilio. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| RadioButton | `Texto único` | `rbImpTextoUnico` | Elegir una opción excluyente. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| RadioButton | `Detalle de Items` | `rbImpDetalleNormal` | Elegir una opción excluyente. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Que Percibe` | `cmbQuePercibe` | Ver o calcular percepciones/impuestos adicionales del comprobante. | Evaluar en módulo destino. | Bajo | Mapeado |
| CheckBox | `Redondear` | `cbRedondea` | Activar/desactivar opción. | Evaluar en módulo destino. | Medio | Observado por tipo UIA |
| CheckBox | `Imprime FAC` | `cbImpFC` | Activar/desactivar opción. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `Usuario ML` | `tOrdenDeCp` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `(sin texto)` | `cmdMail` | Enviar comprobante por mail. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| CheckBox | `Enviar por Mail` | `cbEnviarPorMail` | Activar/desactivar opción. | Mostrador/comprobantes. | Medio | Observado por tipo UIA |
| Button | `Cancelar` | `cmdCancelar` | Cancelar operación actual. | Evaluar en módulo destino. | Alto | Inferido por auto_id |
| Button | `Grabar` | `cmdGuardar` | Persistir/finalizar operación. | Mostrador/comprobantes. | Alto | Inferido por auto_id |
| HeaderItem | `Concepto` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Importe` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Mda.Ext.` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| ListItem | `SubTotal` | `-` | Fila resumen de subtotal calculado. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `TOTAL` | `-` | Fila resumen de total final calculado. | Evaluar en módulo destino. | Bajo | Mapeado |
| HeaderItem | `Tipo` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Código` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Descripción` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Cant.` | `HeaderItem 3` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Unitario` | `HeaderItem 4` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `% Desc.` | `HeaderItem 5` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `% IVA` | `HeaderItem 6` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Total` | `HeaderItem 7` | Fila resumen de total final calculado. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Mda` | `HeaderItem 8` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Mda.Ext.` | `HeaderItem 9` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Cambio` | `HeaderItem 10` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Total ME` | `HeaderItem 11` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Deposito` | `HeaderItem 12` | Elegir deposito para item/operacion. | Mostrador/productos/stock según contexto. | Alto | Observado por tipo UIA |
| Button | `Modificar` | `-` | Editar registro/item seleccionado. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Desc.Ampliada` | `-` | Editar/ver descripcion ampliada del item. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Eliminar` | `-` | Eliminar registro/item. | Evaluar en módulo destino. | Alto | Inferido por texto |
| Button | `%` | `-` | Aplicar porcentaje al item/documento segun contexto. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Descuento` | `-` | Aplicar descuento al item/documento. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Varios` | `-` | Abrir acciones varias de item/comprobante. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Varios 2` | `-` | Abrir segundo grupo de acciones varias de item/comprobante. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Stock` | `-` | Consultar stock/movimientos o aplicar operación de stock según pantalla. | Mostrador/productos/stock según contexto. | Medio | Inferido por texto |
| Button | `Importar Productos desde un Excel` | `-` | Importar productos/items desde Excel. | Filtro, búsqueda o exporte. | Medio | Inferido por texto |
| Button | `Observaciones` | `-` | Ver/editar notas u observaciones. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Carritos` | `-` | Abrir/recuperar carritos o selecciones guardadas. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Depósito` | `-` | Elegir deposito para item/operacion. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Presupuesto` | `-` | Relacionar, cargar o convertir presupuesto segun flujo activo. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Datos Remito` | `cmdDatosRemito` | Cargar datos de remito/entrega asociados al comprobante. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Cambiar` | `cmdCambiarDefComprobante` | Cambiar definicion/tipo de comprobante u operacion. | Evaluar en módulo destino. | Alto | Mapeado |
| Edit | `FAC` | `tPV` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `tFecha` | Fecha del comprobante. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| ComboBox | `Prov.IIBB:` | `cboProvincias` | Selector de opción/lista. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `Prov.IIBB:` | `1001` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Edit | `Sector:` | `tProvIIBB` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| ComboBox | `Partido:` | `cboSector` | Selector de opción/lista. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Edit | `CUIT/Doc.:` | `tPartido` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `Prov:` | `tDocumento` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| ComboBox | `Domicilio:` | `cboDocumento` | Selector de opción/lista. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| ComboBox | `Consumidor(Final)` | `cboCondIVA` | Selector de opción/lista. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Edit | `(sin texto)` | `tLocalidad` | Localidad del cliente/domicilio. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| Edit | `Razón social:` | `tDomicilio` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `tRazonSocial` | Razon social del cliente. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| Button | `Buscar empresa` | `CmdBuscarEmpresa` | Ejecutar búsqueda o abrir selector relacionado. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Inferido por auto_id |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Restaurar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| ComboBox | `Punto de venta:` | `cboPtoVta` | Selector de opción/lista. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `Punto de venta:` | `1001` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Button | `Buscar Comprobantes Pendientes` | `cmdBuscarPendientes` | Ejecutar búsqueda o abrir selector relacionado. | Mostrador/comprobantes. | Bajo | Inferido por auto_id |
| Button | `Buscar Operaciones` | `cmdBuscarOperaciones` | Ejecutar búsqueda o abrir selector relacionado. | Filtro, búsqueda o exporte. | Bajo | Inferido por auto_id |
| ComboBox | `Unidad de negocios:` | `cboUnidadNegocios` | Selector de opción/lista. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `Unidad de negocios:` | `1001` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Button | `Buscar Comprobantes` | `cmdBuscar` | Ejecutar búsqueda o abrir selector relacionado. | Mostrador/comprobantes. | Bajo | Inferido por auto_id |
| Button | `Cargar` | `cmdCargar` | Cargar selección en el flujo activo. | Evaluar en módulo destino. | Medio | Inferido por auto_id |
| TabItem | `Varios` | `-` | Abrir acciones varias de item/comprobante. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| ListItem | `Ajuste de Inventario Negativo` | `-` | Cargar ajuste de inventario negativo. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| ListItem | `Ajuste de Inventario Positivo` | `-` | Cargar ajuste de inventario positivo. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| ListItem | `Transferencia entre Depositos` | `-` | Cargar transferencia entre depositos. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| TabItem | `Stock` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Medio | Observado por tipo UIA |
| ListItem | `Aplicacion de Comprobantes Pres.` | `-` | Aplicar comprobantes presupuestarios. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `Asiento Contable` | `-` | Cargar asiento contable. | Evaluar en módulo destino. | Bajo | Mapeado |
| TabItem | `Contabilidad` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| ListItem | `Depositos Bancarios` | `-` | Cargar deposito bancario. | Caja, pagos o cheques/valores. | Alto | Mapeado |
| ListItem | `Pagos` | `-` | Cargar pago. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Recibos` | `-` | Cargar recibo/cobranza. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Transferencias de Valores` | `-` | Cargar transferencia de valores. | Caja, pagos o cheques/valores. | Alto | Mapeado |
| TabItem | `Tesorería` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| Button | `Seleccionar impresora por defecto (este usuario, esta máquina)` | `cmdSeleccionaImpresoraFacturacion` | Imprimir o configurar impresión. | Evaluar en módulo destino. | Bajo | Inferido por auto_id |
| ListItem | `(F4)-Factura Fiscal` | `-` | Seleccionar factura fiscal. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `(F5)-Factura manual` | `-` | Seleccionar factura manual. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `(F6)-NC Fiscal` | `-` | Seleccionar nota de credito fiscal. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `(F7)-NC Manual` | `-` | Seleccionar nota de credito manual. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `(F8)-ND Fiscal` | `-` | Seleccionar nota de debito fiscal. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `(F9)-ND Manual` | `-` | Seleccionar nota de debito manual. | Evaluar en módulo destino. | Bajo | Mapeado |
| TabItem | `Ventas` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| ListItem | `Factura Proveedores` | `-` | Seleccionar factura de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| ListItem | `NC Proveedores` | `-` | Seleccionar nota de credito de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| ListItem | `ND Proveedores` | `-` | Seleccionar nota de debito de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| TabItem | `Compras` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## ventas factura manual form / 27 Seleccionar Operación a Cargar

Fuente: `docs/legacy-audit/raw/legacy-internal-ventas-factura-manual-form--27-Seleccionar-Operación-a-Cargar.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| Button | `Domicilio de Entrega` | `cmdSucursal` | Gestionar domicilio/datos de entrega. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Inferido por auto_id |
| Button | `Ver Cta. Cte.` | `cmdVerCC` | Abrir estado/ficha de cuenta corriente del cliente. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Caja Mostrador-Efectivo` | `cmdContadoValorPorDefecto` | Seleccionar o aplicar pago contado/caja mostrador. | Caja, pagos o cheques/valores. | Bajo | Inferido por auto_id |
| Button | `Contado ($0.00")` | `cmdContado` | Seleccionar o aplicar pago contado/caja mostrador. | Caja, pagos o cheques/valores. | Medio | Inferido por auto_id |
| RadioButton | `Contado` | `rbContado` | Elegir una opción excluyente. | Caja, pagos o cheques/valores. | Medio | Observado por tipo UIA |
| RadioButton | `Cta.Cte.` | `rbCC` | Elegir una opción excluyente. | Cliente ocasional, cliente registrado o cuenta corriente. | Medio | Observado por tipo UIA |
| Edit | `(sin texto)` | `tConceptoOperacion` | Concepto/descripcion de la operacion. | Mostrador/comprobantes. | Bajo | Mapeado por auto_id |
| Edit | `(sin texto)` | `tFechaOperacion` | Fecha de operacion. | Mostrador/comprobantes. | Bajo | Mapeado por auto_id |
| Edit | `(sin texto)` | `tProvincia` | Provincia fiscal/domicilio. | Mostrador/comprobantes. | Bajo | Mapeado por auto_id |
| RadioButton | `Texto único` | `rbImpTextoUnico` | Elegir una opción excluyente. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| RadioButton | `Detalle de Items` | `rbImpDetalleNormal` | Elegir una opción excluyente. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Que Percibe` | `cmbQuePercibe` | Ver o calcular percepciones/impuestos adicionales del comprobante. | Mostrador/comprobantes. | Bajo | Mapeado |
| CheckBox | `Redondear` | `cbRedondea` | Activar/desactivar opción. | Mostrador/comprobantes. | Medio | Observado por tipo UIA |
| CheckBox | `Imprime FAC` | `cbImpFC` | Activar/desactivar opción. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `Usuario ML` | `tOrdenDeCp` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `(sin texto)` | `cmdMail` | Enviar comprobante por mail. | Mostrador/comprobantes. | Bajo | Mapeado por auto_id |
| CheckBox | `Enviar por Mail` | `cbEnviarPorMail` | Activar/desactivar opción. | Mostrador/comprobantes. | Medio | Observado por tipo UIA |
| Button | `Cancelar` | `cmdCancelar` | Cancelar operación actual. | Mostrador/comprobantes. | Alto | Inferido por auto_id |
| Button | `Grabar` | `cmdGuardar` | Persistir/finalizar operación. | Mostrador/comprobantes. | Alto | Inferido por auto_id |
| HeaderItem | `Concepto` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Importe` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Mda.Ext.` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| ListItem | `SubTotal` | `-` | Fila resumen de subtotal calculado. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `TOTAL` | `-` | Fila resumen de total final calculado. | Mostrador/comprobantes. | Bajo | Mapeado |
| HeaderItem | `Tipo` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Código` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Descripción` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Cant.` | `HeaderItem 3` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Unitario` | `HeaderItem 4` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `% Desc.` | `HeaderItem 5` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `% IVA` | `HeaderItem 6` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Total` | `HeaderItem 7` | Fila resumen de total final calculado. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Mda` | `HeaderItem 8` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Mda.Ext.` | `HeaderItem 9` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Cambio` | `HeaderItem 10` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Total ME` | `HeaderItem 11` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Deposito` | `HeaderItem 12` | Elegir deposito para item/operacion. | Mostrador/productos/stock según contexto. | Alto | Observado por tipo UIA |
| Button | `Modificar` | `-` | Editar registro/item seleccionado. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| Button | `Desc.Ampliada` | `-` | Editar/ver descripcion ampliada del item. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Eliminar` | `-` | Eliminar registro/item. | Mostrador/comprobantes. | Alto | Inferido por texto |
| Button | `%` | `-` | Aplicar porcentaje al item/documento segun contexto. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Descuento` | `-` | Aplicar descuento al item/documento. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Varios` | `-` | Abrir acciones varias de item/comprobante. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Varios 2` | `-` | Abrir segundo grupo de acciones varias de item/comprobante. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Stock` | `-` | Consultar stock/movimientos o aplicar operación de stock según pantalla. | Mostrador/productos/stock según contexto. | Medio | Inferido por texto |
| Button | `Importar Productos desde un Excel` | `-` | Importar productos/items desde Excel. | Mostrador/comprobantes. | Medio | Inferido por texto |
| Button | `Observaciones` | `-` | Ver/editar notas u observaciones. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| Button | `Carritos` | `-` | Abrir/recuperar carritos o selecciones guardadas. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Depósito` | `-` | Elegir deposito para item/operacion. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Presupuesto` | `-` | Relacionar, cargar o convertir presupuesto segun flujo activo. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Datos Remito` | `cmdDatosRemito` | Cargar datos de remito/entrega asociados al comprobante. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Cambiar` | `cmdCambiarDefComprobante` | Cambiar definicion/tipo de comprobante u operacion. | Mostrador/comprobantes. | Alto | Mapeado |
| Edit | `FAC` | `tPV` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `tFecha` | Fecha del comprobante. | Mostrador/comprobantes. | Bajo | Mapeado por auto_id |
| ComboBox | `Prov.IIBB:` | `cboProvincias` | Selector de opción/lista. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `Prov.IIBB:` | `1001` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Edit | `Sector:` | `tProvIIBB` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| ComboBox | `Partido:` | `cboSector` | Selector de opción/lista. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Edit | `CUIT/Doc.:` | `tPartido` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `Prov:` | `tDocumento` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| ComboBox | `Domicilio:` | `cboDocumento` | Selector de opción/lista. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| ComboBox | `Consumidor(Final)` | `cboCondIVA` | Selector de opción/lista. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Edit | `(sin texto)` | `tLocalidad` | Localidad del cliente/domicilio. | Mostrador/comprobantes. | Bajo | Mapeado por auto_id |
| Edit | `Razón social:` | `tDomicilio` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `tRazonSocial` | Razon social del cliente. | Mostrador/comprobantes. | Bajo | Mapeado por auto_id |
| Button | `Buscar empresa` | `CmdBuscarEmpresa` | Ejecutar búsqueda o abrir selector relacionado. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Inferido por auto_id |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Restaurar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| ComboBox | `Punto de venta:` | `cboPtoVta` | Selector de opción/lista. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `Punto de venta:` | `1001` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Button | `Buscar Comprobantes Pendientes` | `cmdBuscarPendientes` | Ejecutar búsqueda o abrir selector relacionado. | Mostrador/comprobantes. | Bajo | Inferido por auto_id |
| Button | `Buscar Operaciones` | `cmdBuscarOperaciones` | Ejecutar búsqueda o abrir selector relacionado. | Mostrador/comprobantes. | Bajo | Inferido por auto_id |
| ComboBox | `Unidad de negocios:` | `cboUnidadNegocios` | Selector de opción/lista. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `Unidad de negocios:` | `1001` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Button | `Buscar Comprobantes` | `cmdBuscar` | Ejecutar búsqueda o abrir selector relacionado. | Mostrador/comprobantes. | Bajo | Inferido por auto_id |
| Button | `Cargar` | `cmdCargar` | Cargar selección en el flujo activo. | Mostrador/comprobantes. | Medio | Inferido por auto_id |
| TabItem | `Varios` | `-` | Abrir acciones varias de item/comprobante. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| ListItem | `Ajuste de Inventario Negativo` | `-` | Cargar ajuste de inventario negativo. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| ListItem | `Ajuste de Inventario Positivo` | `-` | Cargar ajuste de inventario positivo. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| ListItem | `Transferencia entre Depositos` | `-` | Cargar transferencia entre depositos. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| TabItem | `Stock` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Medio | Observado por tipo UIA |
| ListItem | `Aplicacion de Comprobantes Pres.` | `-` | Aplicar comprobantes presupuestarios. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `Asiento Contable` | `-` | Cargar asiento contable. | Mostrador/comprobantes. | Bajo | Mapeado |
| TabItem | `Contabilidad` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| ListItem | `Depositos Bancarios` | `-` | Cargar deposito bancario. | Caja, pagos o cheques/valores. | Alto | Mapeado |
| ListItem | `Pagos` | `-` | Cargar pago. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `Recibos` | `-` | Cargar recibo/cobranza. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `Transferencias de Valores` | `-` | Cargar transferencia de valores. | Caja, pagos o cheques/valores. | Alto | Mapeado |
| TabItem | `Tesorería` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| Button | `Seleccionar impresora por defecto (este usuario, esta máquina)` | `cmdSeleccionaImpresoraFacturacion` | Imprimir o configurar impresión. | Mostrador/comprobantes. | Bajo | Inferido por auto_id |
| ListItem | `(F4)-Factura Fiscal` | `-` | Seleccionar factura fiscal. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `(F5)-Factura manual` | `-` | Seleccionar factura manual. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `(F6)-NC Fiscal` | `-` | Seleccionar nota de credito fiscal. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `(F7)-NC Manual` | `-` | Seleccionar nota de credito manual. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `(F8)-ND Fiscal` | `-` | Seleccionar nota de debito fiscal. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `(F9)-ND Manual` | `-` | Seleccionar nota de debito manual. | Mostrador/comprobantes. | Bajo | Mapeado |
| TabItem | `Ventas` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| ListItem | `Factura Proveedores` | `-` | Seleccionar factura de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| ListItem | `NC Proveedores` | `-` | Seleccionar nota de credito de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| ListItem | `ND Proveedores` | `-` | Seleccionar nota de debito de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| TabItem | `Compras` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## ventas selector / 27 Seleccionar Operación a Cargar

Fuente: `docs/legacy-audit/raw/legacy-internal-ventas-selector--27-Seleccionar-Operación-a-Cargar.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| ComboBox | `Punto de venta:` | `cboPtoVta` | Selector de opción/lista. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `Punto de venta:` | `1001` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Button | `Buscar Comprobantes Pendientes` | `cmdBuscarPendientes` | Ejecutar búsqueda o abrir selector relacionado. | Mostrador/comprobantes. | Bajo | Inferido por auto_id |
| Button | `Buscar Operaciones` | `cmdBuscarOperaciones` | Ejecutar búsqueda o abrir selector relacionado. | Filtro, búsqueda o exporte. | Bajo | Inferido por auto_id |
| ComboBox | `Unidad de negocios:` | `cboUnidadNegocios` | Selector de opción/lista. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `Unidad de negocios:` | `1001` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Button | `Buscar Comprobantes` | `cmdBuscar` | Ejecutar búsqueda o abrir selector relacionado. | Mostrador/comprobantes. | Bajo | Inferido por auto_id |
| Button | `Cargar` | `cmdCargar` | Cargar selección en el flujo activo. | Evaluar en módulo destino. | Medio | Inferido por auto_id |
| TabItem | `Varios` | `-` | Abrir acciones varias de item/comprobante. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| ListItem | `Ajuste de Inventario Negativo` | `-` | Cargar ajuste de inventario negativo. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| ListItem | `Ajuste de Inventario Positivo` | `-` | Cargar ajuste de inventario positivo. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| ListItem | `Transferencia entre Depositos` | `-` | Cargar transferencia entre depositos. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| TabItem | `Stock` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Medio | Observado por tipo UIA |
| ListItem | `Aplicacion de Comprobantes Pres.` | `-` | Aplicar comprobantes presupuestarios. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `Asiento Contable` | `-` | Cargar asiento contable. | Evaluar en módulo destino. | Bajo | Mapeado |
| TabItem | `Contabilidad` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| ListItem | `Depositos Bancarios` | `-` | Cargar deposito bancario. | Caja, pagos o cheques/valores. | Alto | Mapeado |
| ListItem | `Pagos` | `-` | Cargar pago. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Recibos` | `-` | Cargar recibo/cobranza. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Transferencias de Valores` | `-` | Cargar transferencia de valores. | Caja, pagos o cheques/valores. | Alto | Mapeado |
| TabItem | `Tesorería` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| Button | `Seleccionar impresora por defecto (este usuario, esta máquina)` | `cmdSeleccionaImpresoraFacturacion` | Imprimir o configurar impresión. | Evaluar en módulo destino. | Bajo | Inferido por auto_id |
| ListItem | `(F4)-Factura Fiscal` | `-` | Seleccionar factura fiscal. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `(F5)-Factura manual` | `-` | Seleccionar factura manual. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `(F6)-NC Fiscal` | `-` | Seleccionar nota de credito fiscal. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `(F7)-NC Manual` | `-` | Seleccionar nota de credito manual. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `(F8)-ND Fiscal` | `-` | Seleccionar nota de debito fiscal. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `(F9)-ND Manual` | `-` | Seleccionar nota de debito manual. | Evaluar en módulo destino. | Bajo | Mapeado |
| TabItem | `Ventas` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| ListItem | `Factura Proveedores` | `-` | Seleccionar factura de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| ListItem | `NC Proveedores` | `-` | Seleccionar nota de credito de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| ListItem | `ND Proveedores` | `-` | Seleccionar nota de debito de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| TabItem | `Compras` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## consulta productos child

Fuente: `docs/legacy-audit/raw/legacy-live-consulta-productos-child.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| Button | `Subir` | `-` | Aumentar valor en control numerico. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Bajar` | `-` | Disminuir valor en control numerico. | Evaluar en módulo destino. | Bajo | Mapeado |
| Edit | `Indicador giratorio` | `1574686` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Subir` | `-` | Aumentar valor en control numerico. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Bajar` | `-` | Disminuir valor en control numerico. | Evaluar en módulo destino. | Bajo | Mapeado |
| Edit | `Indicador giratorio` | `2754078` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `(sin texto)` | `cmdPaginaSiguiente` | Ir a pagina siguiente de resultados. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| Button | `(sin texto)` | `cmdPaginaAnterior` | Ir a pagina anterior de resultados. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| Button | `Foto del Producto` | `-` | Abrir/ver foto del producto seleccionado. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Pendientes` | `-` | Consultar pendientes del producto/cliente segun contexto. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Stock` | `-` | Consultar stock/movimientos o aplicar operación de stock según pantalla. | Mostrador/productos/stock según contexto. | Medio | Inferido por texto |
| Button | `Consulta Movimientos del Deposito seleccionado` | `-` | Consultar movimientos del deposito activo para el producto seleccionado. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| Button | `Rotación` | `-` | Consultar rotación del producto. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Ventas` | `-` | Consultar ventas o módulo de ventas. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Compras` | `-` | Consultar/completar flujo de compras. | Compras/recepción/proveedores. | Bajo | Inferido por texto |
| Button | `Informar Venta Perdida` | `-` | Registrar demanda no concretada. | Evaluar en módulo destino. | Medio | Inferido por texto |
| Button | `Solicitar Compra` | `-` | Crear solicitud de compra por faltante. | Compras/recepción/proveedores. | Medio | Inferido por texto |
| Button | `Armado de Kits/Conjuntos de Productos` | `-` | Abrir armado de kits/conjuntos de productos. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `ToolStripButton1` | `-` | Botón sin texto funcional en UIA; requiere validar tooltip/icono. | Evaluar en módulo destino. | Validar | Validar tooltip/icono |
| Button | `ToolStripButton2` | `-` | Botón sin texto funcional en UIA; requiere validar tooltip/icono. | Evaluar en módulo destino. | Validar | Validar tooltip/icono |
| Button | `Precio Especial` | `-` | Gestionar precio especial. | Consulta productos/listas de precio. | Alto | Inferido por texto |
| Button | `(sin texto)` | `-` | Accion propia de la pantalla; requiere validacion viva si se va a implementar exacta. | Evaluar en módulo destino. | Bajo | Validar tooltip/icono |
| Button | `Exportar a TXT` | `-` | Exportar datos a TXT. | Filtro, búsqueda o exporte. | Bajo | Inferido por texto |
| Button | `(F6)-Facturar` | `-` | Facturar producto/seleccion desde consulta de productos. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Mas Etiquetas` | `-` | Generar/imprimir etiquetas. | Evaluar en módulo destino. | Medio | Inferido por texto |
| Button | `Etiquetas` | `-` | Generar/imprimir etiquetas. | Evaluar en módulo destino. | Medio | Inferido por texto |
| Button | `Copiar Codigo` | `-` | Copiar dato al portapapeles o duplicar entidad. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Copiar Descripcion` | `-` | Copiar dato al portapapeles o duplicar entidad. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Copiar Precio` | `-` | Copiar dato al portapapeles o duplicar entidad. | Consulta productos/listas de precio. | Bajo | Inferido por texto |
| Button | `Avisarme Cuando Entre al Stock` | `-` | Consultar stock/movimientos o aplicar operación de stock según pantalla. | Mostrador/productos/stock según contexto. | Medio | Inferido por texto |
| Button | `Copiar Equivalencia` | `-` | Buscar incluyendo equivalencias/códigos alternativos. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Copiar Código en Origen` | `-` | Copiar dato al portapapeles o duplicar entidad. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Copiar Cód/Nom/Precio` | `-` | Copiar dato al portapapeles o duplicar entidad. | Consulta productos/listas de precio. | Bajo | Inferido por texto |
| Button | `Consulta Series en Stock` | `-` | Consultar stock/movimientos o aplicar operación de stock según pantalla. | Mostrador/productos/stock según contexto. | Medio | Inferido por texto |
| Button | `Contador de consultas de un producto` | `-` | Seleccionar o aplicar pago contado/caja mostrador. | Caja, pagos o cheques/valores. | Medio | Inferido por texto |
| Button | `Ver Clasificacion` | `-` | Ver/elegir clasificación. | Filtro, búsqueda o exporte. | Bajo | Inferido por texto |
| Button | `Exportar a Excel` | `-` | Exportar datos a Excel. | Filtro, búsqueda o exporte. | Bajo | Inferido por texto |
| Button | `No` | `-` | Indicador/accion corta de notas o estado; validar etiqueta visual si se replica exacta. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Inventario` | `-` | Abrir/ejecutar operación de inventario. | Mostrador/productos/stock según contexto. | Alto | Inferido por texto |
| HeaderItem | `Código` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Código` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Cod.Origen` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Nombre` | `HeaderItem 3` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Stock` | `HeaderItem 4` | Columna de grilla; define dato visible/ordenable. | Mostrador/productos/stock según contexto. | Medio | Observado por tipo UIA |
| HeaderItem | `L1 C/IVA` | `HeaderItem 5` | Columna de grilla; define dato visible/ordenable. | Consulta productos/listas de precio. | Bajo | Observado por tipo UIA |
| HeaderItem | `L2 C/IVA` | `HeaderItem 6` | Columna de grilla; define dato visible/ordenable. | Consulta productos/listas de precio. | Bajo | Observado por tipo UIA |
| HeaderItem | `L3 C/IVA` | `HeaderItem 7` | Columna de grilla; define dato visible/ordenable. | Consulta productos/listas de precio. | Bajo | Observado por tipo UIA |
| HeaderItem | `L4 C/IVA` | `HeaderItem 8` | Columna de grilla; define dato visible/ordenable. | Consulta productos/listas de precio. | Bajo | Observado por tipo UIA |
| HeaderItem | `Fecha Actualizacion Precio` | `HeaderItem 9` | Columna de grilla; define dato visible/ordenable. | Consulta productos/listas de precio. | Bajo | Observado por tipo UIA |
| HeaderItem | `Días sin Venta` | `HeaderItem 10` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Fecha Inventario` | `HeaderItem 11` | Columna de grilla; define dato visible/ordenable. | Mostrador/productos/stock según contexto. | Alto | Observado por tipo UIA |
| Button | `Línea arriba` | `UpButton` | Desplazar grilla una linea arriba. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Av Pág` | `DownPageButton` | Avanzar pagina en grilla/lista. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Línea abajo` | `DownButton` | Desplazar grilla una linea abajo. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Columna a la izquierda` | `UpButton` | Mover grilla una columna a la izquierda. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Página a la derecha` | `DownPageButton` | Mover grilla una pagina a la derecha. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Columna a la derecha` | `DownButton` | Mover grilla una columna a la derecha. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `11111` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `A` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `A41/2850WL` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AA4010` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AAAM400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AAC400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AAM400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AAO400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AAP400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AAPCP400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AAR400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AARE450` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AATA400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AATB400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AATN400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AAVF42400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AB400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AB80100` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AB80210` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AB80400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ABB400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ABCB0.9` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ABM400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ABN5` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ABS400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AC` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AC1` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AC450` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AC900` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACA400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACCF1` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACCF250` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACCF4` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACCF500` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACCV1` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACCV250` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACCV4` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACCV500` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACE3600` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACE900` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACN400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACR400` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACSB440` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACSG440` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACSN440` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACSNE440` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACSR440` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ACSVC440` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AD1` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `AD18` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Etiqueta Bultos` | `cmdEtiquetaBultos` | Generar/imprimir etiquetas. | Evaluar en módulo destino. | Medio | Inferido por auto_id |
| Button | `(sin texto)` | `cmdConfirmarPedidoActivo` | Confirmar/seleccionar pedido activo. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| Button | `Presupuestos` | `cmdPresupuestos` | Abrir presupuestos relacionados. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Información Comercial` | `cmdAnalizarCliente` | Abrir informacion comercial del cliente/producto. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Cta.Cte.BLOQUEADA` | `cmdImprimirPedidoActivo` | Mostrar/gestionar estado de cuenta corriente bloqueada. | Cliente ocasional, cliente registrado o cuenta corriente. | Medio | Mapeado |
| Button | `Consulta Pedidos de Venta` | `cmdCondPVta` | Abrir consulta de pedidos de venta. | Evaluar en módulo destino. | Medio | Mapeado |
| Button | `(F9) Nuevo ítem` | `cmdNuevoItemPedido` | Agregar nuevo item al pedido activo. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `(F10) Pedidos` | `cmdPedidos` | Abrir pedidos del cliente/pedido activo. | Evaluar en módulo destino. | Medio | Mapeado |
| Button | `Cuenta Corriente` | `cmdEstadoDeCuenta` | Ver/usar cuenta corriente del cliente. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Inferido por auto_id |
| Button | `Domicilio:` | `btnBuscarCC` | Ejecutar búsqueda o abrir selector relacionado. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Inferido por auto_id |
| Button | `Subir` | `-` | Aumentar valor en control numerico. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Bajar` | `-` | Disminuir valor en control numerico. | Evaluar en módulo destino. | Bajo | Mapeado |
| Edit | `Indicador giratorio` | `330788` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Subir` | `-` | Aumentar valor en control numerico. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Bajar` | `-` | Disminuir valor en control numerico. | Evaluar en módulo destino. | Bajo | Mapeado |
| Edit | `Cuenta Corriente` | `134196` | Campo de entrada/filtro/dato editable. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Observado por tipo UIA |
| Button | `Opciones de Busq.` | `cmdMasOpciones` | Mostrar filtros avanzados de busqueda. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Buscar` | `cmdBuscar` | Ejecutar búsqueda o abrir selector relacionado. | Filtro, búsqueda o exporte. | Bajo | Inferido por auto_id |
| Button | `Buscar C/Equiv.` | `cmbBuscarConEquivalencia` | Buscar incluyendo equivalencias/códigos alternativos. | Filtro, búsqueda o exporte. | Bajo | Inferido por auto_id |
| CheckBox | `Scanner` | `cbScaner` | Activar/desactivar opción. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Clasif.` | `cmdClasificacion` | Ver/elegir clasificación. | Filtro, búsqueda o exporte. | Bajo | Inferido por auto_id |
| ComboBox | `Lista de Precios` | `cboListaPrecios` | Selector de opción/lista. | Consulta productos/listas de precio. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `1001` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| ComboBox | `L.Precios` | `cboDeposito` | Selector de opción/lista. | Consulta productos/listas de precio. | Bajo | Observado por tipo UIA |
| Edit | `L.Precios` | `1001` | Campo de entrada/filtro/dato editable. | Consulta productos/listas de precio. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Edit | `(sin texto)` | `txtNombre` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtCodigoOrigen` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtEquivalencia` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtCodigo` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Añadir` | `-` | Crear nuevo registro/item. | Evaluar en módulo destino. | Medio | Inferido por texto |
| Button | `Editar` | `-` | Editar registro/item seleccionado. | Evaluar en módulo destino. | Medio | Inferido por texto |
| Button | `Copiar producto` | `-` | Copiar dato al portapapeles o duplicar entidad. | Evaluar en módulo destino. | Medio | Inferido por texto |
| Button | `Eliminar` | `-` | Eliminar registro/item. | Evaluar en módulo destino. | Alto | Inferido por texto |
| Button | `Movimientos a otro Producto` | `-` | Mover/reasignar movimientos de stock a otro producto. | Evaluar en módulo destino. | Alto | Mapeado |
| Button | `Ordenar Columnas` | `-` | Configurar orden/visibilidad de columnas. | Compras/recepción/proveedores. | Bajo | Mapeado |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## factura presupuesto child

Fuente: `docs/legacy-audit/raw/legacy-live-factura-presupuesto-child.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| Button | `Domicilio de Entrega` | `cmdSucursal` | Gestionar domicilio/datos de entrega. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Inferido por auto_id |
| Button | `Ver Cta. Cte.` | `cmdVerCC` | Abrir estado/ficha de cuenta corriente del cliente. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Caja Mostrador-Efectivo` | `cmdContadoValorPorDefecto` | Seleccionar o aplicar pago contado/caja mostrador. | Caja, pagos o cheques/valores. | Bajo | Inferido por auto_id |
| Button | `Contado ($0.00")` | `cmdContado` | Seleccionar o aplicar pago contado/caja mostrador. | Caja, pagos o cheques/valores. | Medio | Inferido por auto_id |
| RadioButton | `Contado` | `rbContado` | Elegir una opción excluyente. | Caja, pagos o cheques/valores. | Medio | Observado por tipo UIA |
| RadioButton | `Cta.Cte.` | `rbCC` | Elegir una opción excluyente. | Cliente ocasional, cliente registrado o cuenta corriente. | Medio | Observado por tipo UIA |
| Edit | `(sin texto)` | `tConceptoOperacion` | Concepto/descripcion de la operacion. | Mostrador/comprobantes. | Bajo | Mapeado por auto_id |
| Edit | `(sin texto)` | `tFechaOperacion` | Fecha de operacion. | Mostrador/comprobantes. | Bajo | Mapeado por auto_id |
| Edit | `(sin texto)` | `tProvincia` | Provincia fiscal/domicilio. | Mostrador/comprobantes. | Bajo | Mapeado por auto_id |
| RadioButton | `Texto único` | `rbImpTextoUnico` | Elegir una opción excluyente. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| RadioButton | `Detalle de Items` | `rbImpDetalleNormal` | Elegir una opción excluyente. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Que Percibe` | `cmbQuePercibe` | Ver o calcular percepciones/impuestos adicionales del comprobante. | Mostrador/comprobantes. | Bajo | Mapeado |
| CheckBox | `Redondear` | `cbRedondea` | Activar/desactivar opción. | Mostrador/comprobantes. | Medio | Observado por tipo UIA |
| CheckBox | `Imprime V-P` | `cbImpFC` | Activar/desactivar opción. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `Usuario ML` | `tOrdenDeCp` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `(sin texto)` | `cmdMail` | Enviar comprobante por mail. | Mostrador/comprobantes. | Bajo | Mapeado por auto_id |
| CheckBox | `Enviar por Mail` | `cbEnviarPorMail` | Activar/desactivar opción. | Mostrador/comprobantes. | Medio | Observado por tipo UIA |
| Button | `Cancelar` | `cmdCancelar` | Cancelar operación actual. | Mostrador/comprobantes. | Alto | Inferido por auto_id |
| Button | `Grabar` | `cmdGuardar` | Persistir/finalizar operación. | Mostrador/comprobantes. | Alto | Inferido por auto_id |
| HeaderItem | `Concepto` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Importe` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Mda.Ext.` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| ListItem | `SubTotal` | `-` | Fila resumen de subtotal calculado. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `TOTAL` | `-` | Fila resumen de total final calculado. | Mostrador/comprobantes. | Bajo | Mapeado |
| HeaderItem | `Tipo` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Código` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Descripción` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Cant.` | `HeaderItem 3` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Unitario` | `HeaderItem 4` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `% Desc.` | `HeaderItem 5` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `% IVA` | `HeaderItem 6` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Total` | `HeaderItem 7` | Fila resumen de total final calculado. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Mda` | `HeaderItem 8` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Mda.Ext.` | `HeaderItem 9` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Cambio` | `HeaderItem 10` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Total ME` | `HeaderItem 11` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Deposito` | `HeaderItem 12` | Elegir deposito para item/operacion. | Mostrador/productos/stock según contexto. | Alto | Observado por tipo UIA |
| Button | `Modificar` | `-` | Editar registro/item seleccionado. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| Button | `Desc.Ampliada` | `-` | Editar/ver descripcion ampliada del item. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Eliminar` | `-` | Eliminar registro/item. | Mostrador/comprobantes. | Alto | Inferido por texto |
| Button | `%` | `-` | Aplicar porcentaje al item/documento segun contexto. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Descuento` | `-` | Aplicar descuento al item/documento. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Varios` | `-` | Abrir acciones varias de item/comprobante. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Varios 2` | `-` | Abrir segundo grupo de acciones varias de item/comprobante. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Stock` | `-` | Consultar stock/movimientos o aplicar operación de stock según pantalla. | Mostrador/productos/stock según contexto. | Medio | Inferido por texto |
| Button | `Importar Productos desde un Excel` | `-` | Importar productos/items desde Excel. | Mostrador/comprobantes. | Medio | Inferido por texto |
| Button | `Observaciones` | `-` | Ver/editar notas u observaciones. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| Button | `Carritos` | `-` | Abrir/recuperar carritos o selecciones guardadas. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Depósito` | `-` | Elegir deposito para item/operacion. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Presupuesto` | `-` | Relacionar, cargar o convertir presupuesto segun flujo activo. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Datos Remito` | `cmdDatosRemito` | Cargar datos de remito/entrega asociados al comprobante. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Cambiar` | `cmdCambiarDefComprobante` | Cambiar definicion/tipo de comprobante u operacion. | Mostrador/comprobantes. | Alto | Mapeado |
| Edit | `V-P` | `tPV` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `tFecha` | Fecha del comprobante. | Mostrador/comprobantes. | Bajo | Mapeado por auto_id |
| ComboBox | `Prov.IIBB:` | `cboProvincias` | Selector de opción/lista. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `Prov.IIBB:` | `1001` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Edit | `Sector:` | `tProvIIBB` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| ComboBox | `Partido:` | `cboSector` | Selector de opción/lista. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Edit | `CUIT/Doc.:` | `tPartido` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `Prov:` | `tDocumento` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| ComboBox | `Domicilio:` | `cboDocumento` | Selector de opción/lista. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| ComboBox | `Consumidor(Final)` | `cboCondIVA` | Selector de opción/lista. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Edit | `(sin texto)` | `tLocalidad` | Localidad del cliente/domicilio. | Mostrador/comprobantes. | Bajo | Mapeado por auto_id |
| Edit | `Razón social:` | `tDomicilio` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `tRazonSocial` | Razon social del cliente. | Mostrador/comprobantes. | Bajo | Mapeado por auto_id |
| Button | `Buscar empresa` | `CmdBuscarEmpresa` | Ejecutar búsqueda o abrir selector relacionado. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Inferido por auto_id |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Restaurar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## 11 / Consulta Productos

Fuente: `docs/legacy-audit/raw/legacy-ui-dump--11--Consulta-Productos.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| Button | `Subir` | `-` | Aumentar valor en control numerico. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Bajar` | `-` | Disminuir valor en control numerico. | Evaluar en módulo destino. | Bajo | Mapeado |
| Edit | `Indicador giratorio` | `525128` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Subir` | `-` | Aumentar valor en control numerico. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Bajar` | `-` | Disminuir valor en control numerico. | Evaluar en módulo destino. | Bajo | Mapeado |
| Edit | `Indicador giratorio` | `787278` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `(sin texto)` | `cmdPaginaSiguiente` | Ir a pagina siguiente de resultados. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| Button | `(sin texto)` | `cmdPaginaAnterior` | Ir a pagina anterior de resultados. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| Button | `Foto del Producto` | `-` | Abrir/ver foto del producto seleccionado. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Pendientes` | `-` | Consultar pendientes del producto/cliente segun contexto. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Stock` | `-` | Consultar stock/movimientos o aplicar operación de stock según pantalla. | Mostrador/productos/stock según contexto. | Medio | Inferido por texto |
| Button | `Consulta Movimientos del Deposito seleccionado` | `-` | Consultar movimientos del deposito activo para el producto seleccionado. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| Button | `Rotación` | `-` | Consultar rotación del producto. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Ventas` | `-` | Consultar ventas o módulo de ventas. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Compras` | `-` | Consultar/completar flujo de compras. | Compras/recepción/proveedores. | Bajo | Inferido por texto |
| Button | `Informar Venta Perdida` | `-` | Registrar demanda no concretada. | Evaluar en módulo destino. | Medio | Inferido por texto |
| Button | `Solicitar Compra` | `-` | Crear solicitud de compra por faltante. | Compras/recepción/proveedores. | Medio | Inferido por texto |
| Button | `Armado de Kits/Conjuntos de Productos` | `-` | Abrir armado de kits/conjuntos de productos. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `ToolStripButton1` | `-` | Botón sin texto funcional en UIA; requiere validar tooltip/icono. | Evaluar en módulo destino. | Validar | Validar tooltip/icono |
| Button | `ToolStripButton2` | `-` | Botón sin texto funcional en UIA; requiere validar tooltip/icono. | Evaluar en módulo destino. | Validar | Validar tooltip/icono |
| Button | `Precio Especial` | `-` | Gestionar precio especial. | Consulta productos/listas de precio. | Alto | Inferido por texto |
| Button | `(sin texto)` | `-` | Accion propia de la pantalla; requiere validacion viva si se va a implementar exacta. | Evaluar en módulo destino. | Bajo | Validar tooltip/icono |
| Button | `Exportar a TXT` | `-` | Exportar datos a TXT. | Filtro, búsqueda o exporte. | Bajo | Inferido por texto |
| Button | `Mas Etiquetas` | `-` | Generar/imprimir etiquetas. | Evaluar en módulo destino. | Medio | Inferido por texto |
| Button | `Etiquetas` | `-` | Generar/imprimir etiquetas. | Evaluar en módulo destino. | Medio | Inferido por texto |
| Button | `Copiar Codigo` | `-` | Copiar dato al portapapeles o duplicar entidad. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Copiar Descripcion` | `-` | Copiar dato al portapapeles o duplicar entidad. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Copiar Precio` | `-` | Copiar dato al portapapeles o duplicar entidad. | Consulta productos/listas de precio. | Bajo | Inferido por texto |
| Button | `Avisarme Cuando Entre al Stock` | `-` | Consultar stock/movimientos o aplicar operación de stock según pantalla. | Mostrador/productos/stock según contexto. | Medio | Inferido por texto |
| Button | `Copiar Equivalencia` | `-` | Buscar incluyendo equivalencias/códigos alternativos. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Copiar Código en Origen` | `-` | Copiar dato al portapapeles o duplicar entidad. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Copiar Cód/Nom/Precio` | `-` | Copiar dato al portapapeles o duplicar entidad. | Consulta productos/listas de precio. | Bajo | Inferido por texto |
| Button | `Consulta Series en Stock` | `-` | Consultar stock/movimientos o aplicar operación de stock según pantalla. | Mostrador/productos/stock según contexto. | Medio | Inferido por texto |
| Button | `Contador de consultas de un producto` | `-` | Seleccionar o aplicar pago contado/caja mostrador. | Caja, pagos o cheques/valores. | Medio | Inferido por texto |
| Button | `Ver Clasificacion` | `-` | Ver/elegir clasificación. | Filtro, búsqueda o exporte. | Bajo | Inferido por texto |
| Button | `Exportar a Excel` | `-` | Exportar datos a Excel. | Filtro, búsqueda o exporte. | Bajo | Inferido por texto |
| Button | `Notas` | `-` | Ver/editar notas u observaciones. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Inventario` | `-` | Abrir/ejecutar operación de inventario. | Mostrador/productos/stock según contexto. | Alto | Inferido por texto |
| Button | `Marcar Cual Producto con un mismo código es el que se vende` | `-` | Marcar producto vendible cuando existen codigos repetidos. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `(sin texto)` | `-` | Accion propia de la pantalla; requiere validacion viva si se va a implementar exacta. | Evaluar en módulo destino. | Bajo | Validar tooltip/icono |
| Button | `Ficha Certificado` | `-` | Abrir ficha/certificado del producto. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Etiqueta Bultos` | `cmdEtiquetaBultos` | Generar/imprimir etiquetas. | Evaluar en módulo destino. | Medio | Inferido por auto_id |
| Button | `(sin texto)` | `cmdConfirmarPedidoActivo` | Confirmar/seleccionar pedido activo. | Evaluar en módulo destino. | Bajo | Mapeado por auto_id |
| Button | `Presupuestos` | `cmdPresupuestos` | Abrir presupuestos relacionados. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Información Comercial` | `cmdAnalizarCliente` | Abrir informacion comercial del cliente/producto. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Cta.Cte.BLOQUEADA` | `cmdImprimirPedidoActivo` | Mostrar/gestionar estado de cuenta corriente bloqueada. | Cliente ocasional, cliente registrado o cuenta corriente. | Medio | Mapeado |
| Button | `Consulta Pedidos de Venta` | `cmdCondPVta` | Abrir consulta de pedidos de venta. | Evaluar en módulo destino. | Medio | Mapeado |
| Button | `(F9) Nuevo ítem` | `cmdNuevoItemPedido` | Agregar nuevo item al pedido activo. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `(F10) Pedidos` | `cmdPedidos` | Abrir pedidos del cliente/pedido activo. | Evaluar en módulo destino. | Medio | Mapeado |
| Button | `Cuenta Corriente` | `cmdEstadoDeCuenta` | Ver/usar cuenta corriente del cliente. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Inferido por auto_id |
| Button | `Domicilio:` | `btnBuscarCC` | Ejecutar búsqueda o abrir selector relacionado. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Inferido por auto_id |
| Button | `Subir` | `-` | Aumentar valor en control numerico. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Bajar` | `-` | Disminuir valor en control numerico. | Evaluar en módulo destino. | Bajo | Mapeado |
| Edit | `Indicador giratorio` | `1247152` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Subir` | `-` | Aumentar valor en control numerico. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Bajar` | `-` | Disminuir valor en control numerico. | Evaluar en módulo destino. | Bajo | Mapeado |
| Edit | `Cuenta Corriente` | `788272` | Campo de entrada/filtro/dato editable. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Observado por tipo UIA |
| Button | `Opciones de Busq.` | `cmdMasOpciones` | Mostrar filtros avanzados de busqueda. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Buscar` | `cmdBuscar` | Ejecutar búsqueda o abrir selector relacionado. | Filtro, búsqueda o exporte. | Bajo | Inferido por auto_id |
| Button | `Buscar C/Equiv.` | `cmbBuscarConEquivalencia` | Buscar incluyendo equivalencias/códigos alternativos. | Filtro, búsqueda o exporte. | Bajo | Inferido por auto_id |
| CheckBox | `Scanner` | `cbScaner` | Activar/desactivar opción. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Clasif.` | `cmdClasificacion` | Ver/elegir clasificación. | Filtro, búsqueda o exporte. | Bajo | Inferido por auto_id |
| ComboBox | `Lista de Precios` | `cboListaPrecios` | Selector de opción/lista. | Consulta productos/listas de precio. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `1001` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| ComboBox | `L.Precios` | `cboDeposito` | Selector de opción/lista. | Consulta productos/listas de precio. | Bajo | Observado por tipo UIA |
| Edit | `L.Precios` | `1001` | Campo de entrada/filtro/dato editable. | Consulta productos/listas de precio. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Edit | `(sin texto)` | `txtNombre` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtCodigoOrigen` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtEquivalencia` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtCodigo` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Añadir` | `-` | Crear nuevo registro/item. | Evaluar en módulo destino. | Medio | Inferido por texto |
| Button | `Editar` | `-` | Editar registro/item seleccionado. | Evaluar en módulo destino. | Medio | Inferido por texto |
| Button | `Copiar producto` | `-` | Copiar dato al portapapeles o duplicar entidad. | Evaluar en módulo destino. | Medio | Inferido por texto |
| Button | `Eliminar` | `-` | Eliminar registro/item. | Evaluar en módulo destino. | Alto | Inferido por texto |
| Button | `Movimientos a otro Producto` | `-` | Mover/reasignar movimientos de stock a otro producto. | Evaluar en módulo destino. | Alto | Mapeado |
| Button | `Ordenar Columnas` | `-` | Configurar orden/visibilidad de columnas. | Compras/recepción/proveedores. | Bajo | Mapeado |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## 202 / Tomar pedidos de la web

Fuente: `docs/legacy-audit/raw/legacy-ui-dump--202--Tomar-pedidos-de-la-web.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| Button | `Asignar Cta. Cte. (F1)` | `-` | Asignar cuenta corriente al pedido web. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Ver Detalle (F2)` | `-` | Abrir detalle del pedido web. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## 27 / Seleccionar Operación a Cargar

Fuente: `docs/legacy-audit/raw/legacy-ui-dump--27--Seleccionar-Operación-a-Cargar.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| ComboBox | `Punto de venta:` | `cboPtoVta` | Selector de opción/lista. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `Punto de venta:` | `1001` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Button | `Buscar Comprobantes Pendientes` | `cmdBuscarPendientes` | Ejecutar búsqueda o abrir selector relacionado. | Mostrador/comprobantes. | Bajo | Inferido por auto_id |
| Button | `Buscar Operaciones` | `cmdBuscarOperaciones` | Ejecutar búsqueda o abrir selector relacionado. | Filtro, búsqueda o exporte. | Bajo | Inferido por auto_id |
| ComboBox | `Unidad de negocios:` | `cboUnidadNegocios` | Selector de opción/lista. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `Unidad de negocios:` | `1001` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Button | `Buscar Comprobantes` | `cmdBuscar` | Ejecutar búsqueda o abrir selector relacionado. | Mostrador/comprobantes. | Bajo | Inferido por auto_id |
| Button | `Cargar` | `cmdCargar` | Cargar selección en el flujo activo. | Evaluar en módulo destino. | Medio | Inferido por auto_id |
| TabItem | `Varios` | `-` | Abrir acciones varias de item/comprobante. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| ListItem | `Ajuste de Inventario Negativo` | `-` | Cargar ajuste de inventario negativo. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| ListItem | `Ajuste de Inventario Positivo` | `-` | Cargar ajuste de inventario positivo. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| ListItem | `Transferencia entre Depositos` | `-` | Cargar transferencia entre depositos. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| TabItem | `Stock` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Medio | Observado por tipo UIA |
| ListItem | `Aplicacion de Comprobantes Pres.` | `-` | Aplicar comprobantes presupuestarios. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `Asiento Contable` | `-` | Cargar asiento contable. | Evaluar en módulo destino. | Bajo | Mapeado |
| TabItem | `Contabilidad` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| ListItem | `Depositos Bancarios` | `-` | Cargar deposito bancario. | Caja, pagos o cheques/valores. | Alto | Mapeado |
| ListItem | `Pagos` | `-` | Cargar pago. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Recibos` | `-` | Cargar recibo/cobranza. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Transferencias de Valores` | `-` | Cargar transferencia de valores. | Caja, pagos o cheques/valores. | Alto | Mapeado |
| TabItem | `Tesorería` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| Button | `Seleccionar impresora por defecto (este usuario, esta máquina)` | `cmdSeleccionaImpresoraFacturacion` | Imprimir o configurar impresión. | Evaluar en módulo destino. | Bajo | Inferido por auto_id |
| ListItem | `(F4)-Factura Fiscal` | `-` | Seleccionar factura fiscal. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `(F5)-Factura manual` | `-` | Seleccionar factura manual. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `(F6)-NC Fiscal` | `-` | Seleccionar nota de credito fiscal. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `(F7)-NC Manual` | `-` | Seleccionar nota de credito manual. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `(F8)-ND Fiscal` | `-` | Seleccionar nota de debito fiscal. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `(F9)-ND Manual` | `-` | Seleccionar nota de debito manual. | Evaluar en módulo destino. | Bajo | Mapeado |
| TabItem | `Ventas` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| ListItem | `Factura Proveedores` | `-` | Seleccionar factura de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| ListItem | `NC Proveedores` | `-` | Seleccionar nota de credito de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| ListItem | `ND Proveedores` | `-` | Seleccionar nota de debito de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| TabItem | `Compras` | `-` | Cambiar pestaña/sección operativa. | Tab/sección web equivalente. | Bajo | Observado por tipo UIA |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## 314 / Grabar pedido de Transferencia entre depósitos

Fuente: `docs/legacy-audit/raw/legacy-ui-dump--314--Grabar-pedido-de-Transferencia-entre-depósitos.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| Button | `Buscar` | `Button1` | Ejecutar búsqueda o abrir selector relacionado. | Mostrador/productos/stock según contexto. | Bajo | Inferido por auto_id |
| Edit | `(sin texto)` | `txtFechaH` | Campo de entrada/filtro/dato editable. | Mostrador/productos/stock según contexto. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtFechaD` | Campo de entrada/filtro/dato editable. | Mostrador/productos/stock según contexto. | Bajo | Observado por tipo UIA |
| RadioButton | `Todos` | `rbTodos` | Elegir una opción excluyente. | Mostrador/productos/stock según contexto. | Bajo | Observado por tipo UIA |
| RadioButton | `Pendientes` | `rbPendientes` | Consultar pendientes del producto/cliente segun contexto. | Mostrador/productos/stock según contexto. | Bajo | Observado por tipo UIA |
| Button | `Nuevo` | `-` | Crear nuevo registro/item. | Mostrador/productos/stock según contexto. | Bajo | Inferido por texto |
| Button | `Editar` | `-` | Editar registro/item seleccionado. | Mostrador/productos/stock según contexto. | Medio | Inferido por texto |
| Button | `Eliminar` | `-` | Eliminar registro/item. | Mostrador/productos/stock según contexto. | Alto | Inferido por texto |
| Button | `Imprimir (x Código)` | `-` | Imprimir o configurar impresión. | Mostrador/productos/stock según contexto. | Bajo | Inferido por texto |
| Button | `Imprimir (Alfabético)` | `-` | Imprimir o configurar impresión. | Mostrador/productos/stock según contexto. | Bajo | Inferido por texto |
| Button | `Imprimir (x Carga)` | `-` | Imprimir o configurar impresión. | Mostrador/productos/stock según contexto. | Bajo | Inferido por texto |
| HeaderItem | `Nro` | `HeaderItem 6` | Columna de grilla; define dato visible/ordenable. | Mostrador/productos/stock según contexto. | Bajo | Observado por tipo UIA |
| HeaderItem | `Fecha` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Mostrador/productos/stock según contexto. | Bajo | Observado por tipo UIA |
| HeaderItem | `Usuario` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Mostrador/productos/stock según contexto. | Bajo | Observado por tipo UIA |
| HeaderItem | `Depósito Origen` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Mostrador/productos/stock según contexto. | Bajo | Observado por tipo UIA |
| HeaderItem | `Depósito Destino` | `HeaderItem 3` | Columna de grilla; define dato visible/ordenable. | Mostrador/productos/stock según contexto. | Bajo | Observado por tipo UIA |
| HeaderItem | `Estado` | `HeaderItem 4` | Columna de grilla; define dato visible/ordenable. | Mostrador/productos/stock según contexto. | Bajo | Observado por tipo UIA |
| HeaderItem | `Comentarios` | `HeaderItem 5` | Columna de grilla; define dato visible/ordenable. | Mostrador/productos/stock según contexto. | Bajo | Observado por tipo UIA |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## Caja Diaria / 86 Consulta Caja Diaria

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-Caja-Diaria--86-Consulta-Caja-Diaria.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| HeaderItem | `Sigla` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Inicial` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Entradas` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Salidas` | `HeaderItem 3` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Saldo` | `HeaderItem 4` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Button | `Invertir Tildes` | `cmdInvertirTildes` | Invertir seleccion de registros. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| Button | `Tildar Todo` | `cmdTildarTodo` | Marcar todos los registros visibles. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| CheckBox | `Tildar toda la Caja` | `cbTodaLaCaja` | Activar/desactivar opción. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| CheckBox | `Incluye Detalle x Unid. de Negocios` | `cbIncluyeUN` | Activar/desactivar opción. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| CheckBox | `Acumula Saldo Inicial` | `cbAcumulaSI` | Activar/desactivar opción. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Button | `Exportar` | `cmdExportar` | Exportar datos de la pantalla actual. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| RadioButton | `Ordenar x Comprobante` | `rbXComprobante` | Elegir una opción excluyente. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| RadioButton | `Ordenar x Tipo de Valor` | `rbXValor` | Elegir una opción excluyente. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Button | `Ampliar Operacion` | `cmdAmpliar` | Abrir detalle ampliado de la operacion. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| Button | `Imprimir` | `cmdImprimir` | Imprimir o configurar impresión. | Caja, pagos o cheques/valores. | Bajo | Inferido por auto_id |
| Button | `Buscar` | `cmdBuscar` | Ejecutar búsqueda o abrir selector relacionado. | Caja, pagos o cheques/valores. | Bajo | Inferido por auto_id |
| HeaderItem | `Comprobante` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Número` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `F.Contable` | `HeaderItem 13` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `F.Comprobante` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Razón Social` | `HeaderItem 3` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Concepto` | `HeaderItem 4` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Entradas` | `HeaderItem 5` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Salidas` | `HeaderItem 6` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Cambio` | `HeaderItem 15` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Tipo` | `HeaderItem 7` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Mda` | `HeaderItem 14` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Valor` | `HeaderItem 8` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Banco` | `HeaderItem 10` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Número` | `HeaderItem 11` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Pago` | `HeaderItem 12` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Unidad de Negocios` | `HeaderItem 9` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtFechaHasta` | Campo de entrada/filtro/dato editable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Edit | `Valores habilitados al usuario:` | `txtFechaDesde` | Campo de entrada/filtro/dato editable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Caja` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Valor` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Tipo` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Moneda` | `HeaderItem 3` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Sigla` | `HeaderItem 4` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Código` | `HeaderItem 5` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Button | `Línea arriba` | `UpButton` | Desplazar grilla una linea arriba. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| Button | `Av Pág` | `DownPageButton` | Avanzar pagina en grilla/lista. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| Button | `Línea abajo` | `DownButton` | Desplazar grilla una linea abajo. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| ListItem | `Caja Mostrador` | `-` | Caja seleccionable para consulta/mostrador. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| ListItem | `Caja Mostrador` | `-` | Caja seleccionable para consulta/mostrador. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| ListItem | `Caja Mostrador` | `-` | Caja seleccionable para consulta/mostrador. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| ListItem | `Caja Mostrador` | `-` | Caja seleccionable para consulta/mostrador. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| ListItem | `Caja Central` | `-` | Caja seleccionable para consulta. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| ListItem | `Caja Central` | `-` | Caja seleccionable para consulta. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| ListItem | `Caja Central` | `-` | Caja seleccionable para consulta. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| ListItem | `Caja Central` | `-` | Caja seleccionable para consulta. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## Confirmar Recepci n / 151 Verificar Recepción

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-Confirmar-Recepci-n--151-Verificar-Recepción.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| Button | `Verificar Recepción` | `-` | Abrir/verificar recepcion de compra. | Evaluar en módulo destino. | Alto | Mapeado |
| Button | `Ver Verificaciones` | `-` | Ver verificaciones de recepcion existentes. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Imprimir Orden de Compras` | `-` | Imprimir orden de compra. | Compras/recepción/proveedores. | Bajo | Mapeado |
| RadioButton | `x Nro.O.Cp.` | `rbXNumero` | Elegir una opción excluyente. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| RadioButton | `x Proveedor` | `rbXProveedor` | Elegir una opción excluyente. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| RadioButton | `x Fecha Estimada` | `rbXFecha` | Elegir una opción excluyente. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Buscar Pendientes` | `cmdBuscarPendientes` | Ejecutar búsqueda o abrir selector relacionado. | Filtro, búsqueda o exporte. | Bajo | Inferido por auto_id |
| Edit | `Número de Orden de Compras:` | `tNumero` | Campo de entrada/filtro/dato editable. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| RadioButton | `Todos` | `rbTodos` | Elegir una opción excluyente. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| RadioButton | `Una Cta.Contable` | `rbCuenta` | Elegir una opción excluyente. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| RadioButton | `Una Obra` | `rbObra` | Elegir una opción excluyente. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| RadioButton | `Un Proveedor` | `rbProveedor` | Elegir una opción excluyente. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## Consulta Cheques Propios Emitidos / 124 Consulta Cheques Propios

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-Consulta-Cheques-Propios-Emitidos--124-Consulta-Cheques-Propios.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| Button | `Ampliar Comprobante` | `-` | Abrir detalle ampliado del comprobante. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| Button | `Exportar a Excel` | `-` | Exportar datos a Excel. | Caja, pagos o cheques/valores. | Bajo | Inferido por texto |
| Button | `Imprimir` | `-` | Imprimir o configurar impresión. | Caja, pagos o cheques/valores. | Bajo | Inferido por texto |
| Edit | `(sin texto)` | `txtImporte2` | Campo de entrada/filtro/dato editable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtImporte1` | Campo de entrada/filtro/dato editable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtNumero` | Campo de entrada/filtro/dato editable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| CheckBox | `Numero de cheque` | `ckbNumero` | Activar/desactivar opción. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| CheckBox | `Importe` | `ckbImportes` | Activar/desactivar opción. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Button | `Buscar` | `btnBuscar` | Ejecutar búsqueda o abrir selector relacionado. | Caja, pagos o cheques/valores. | Bajo | Inferido por auto_id |
| RadioButton | `Fecha de Pago` | `rbFechaPago` | Elegir una opción excluyente. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| RadioButton | `Fecha de Emision` | `rbFechaEmision` | Elegir una opción excluyente. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtFechaHasta` | Campo de entrada/filtro/dato editable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtFechaDesde` | Campo de entrada/filtro/dato editable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## Consulta Comprobantes / 91 Buscar Operación Comprobante

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-Consulta-Comprobantes--91-Buscar-Operación-Comprobante.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| Button | `Ordenar Columnas` | `btnOrdenarColumnas` | Configurar orden/visibilidad de columnas. | Compras/recepción/proveedores. | Bajo | Mapeado |
| RadioButton | `Modificacion` | `rbFechaModificacion` | Elegir una opción excluyente. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| RadioButton | `Carga` | `rbFCarga` | Elegir una opción excluyente. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| RadioButton | `Contabilización` | `rbFContab` | Elegir una opción excluyente. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| RadioButton | `Comprobante` | `rbFComp` | Elegir una opción excluyente. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `Fecha:` | `txtdesde1` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txthasta1` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `Concepto:` | `txtConcepto` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Mas Opciones de búsqueda` | `cmdMasOpciones` | Mostrar filtros avanzados de busqueda. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Comprobantes sin Imputación` | `frmCompSinImp` | Abrir consulta de comprobantes sin imputacion. | Mostrador/comprobantes. | Bajo | Mapeado |
| RadioButton | `Un Comprobante por Número` | `rbUnComprobante` | Elegir una opción excluyente. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| RadioButton | `Asientos` | `rbAsientos` | Elegir una opción excluyente. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| RadioButton | `Comprobantes de Stock` | `rbStock` | Elegir una opción excluyente. | Mostrador/productos/stock según contexto. | Medio | Observado por tipo UIA |
| RadioButton | `Comprobantes de Valores` | `rbValores` | Elegir una opción excluyente. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| RadioButton | `Compras` | `rbCompras` | Elegir una opción excluyente. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| RadioButton | `Facturación` | `rbVentas` | Elegir una opción excluyente. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| RadioButton | `Una Def.de Comprob.` | `rbUnaDefinicion` | Elegir una opción excluyente. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Buscar` | `CmdBuscar1` | Ejecutar búsqueda o abrir selector relacionado. | Mostrador/comprobantes. | Bajo | Inferido por auto_id |
| Edit | `Razón social:` | `TxtRazonSocial` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Ampliar` | `-` | Abrir detalle ampliado del registro seleccionado. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Imprimir` | `-` | Imprimir o configurar impresión. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| Button | `Imprimir listado` | `-` | Imprimir listado actual. | Consulta productos/listas de precio. | Bajo | Mapeado |
| Button | `Exportar a Excel` | `-` | Exportar datos a Excel. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| Button | `Resumen x Clasificación` | `-` | Emitir resumen agrupado por clasificacion. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Excel con detalle de productos` | `-` | Exportar Excel con detalle de productos. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Link Web Ventas` | `-` | Abrir vinculo/consulta de ventas web. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## Consulta Movimientos de Valores / 176 Consulta Movimientos de Valores

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-Consulta-Movimientos-de-Valores--176-Consulta-Movimientos-de-Valores.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| HeaderItem | `Talleres` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Button | `Ampliar Comprobante` | `-` | Abrir detalle ampliado del comprobante. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| Button | `Exportar Excel` | `-` | Exportar datos a Excel. | Caja, pagos o cheques/valores. | Bajo | Inferido por texto |
| RadioButton | `Solo Entradas` | `rbEntradas` | Elegir una opción excluyente. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| RadioButton | `Solo Salidas` | `rbSalidas` | Elegir una opción excluyente. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| RadioButton | `Todos` | `rbTodos` | Elegir una opción excluyente. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtFechaHasta` | Campo de entrada/filtro/dato editable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtFechaDesde` | Campo de entrada/filtro/dato editable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Button | `Buscar` | `btnBuscar` | Ejecutar búsqueda o abrir selector relacionado. | Caja, pagos o cheques/valores. | Bajo | Inferido por auto_id |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Restaurar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## Consulta Operaciones / 112 Buscar Operación Comprobante

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-Consulta-Operaciones--112-Buscar-Operación-Comprobante.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| Edit | `(sin texto)` | `txtNumero` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Buscar` | `CmdBuscar` | Ejecutar búsqueda o abrir selector relacionado. | Mostrador/comprobantes. | Bajo | Inferido por auto_id |
| Edit | `(sin texto)` | `txtfechahasta` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `TxtFechadesde` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| ComboBox | `Todos` | `cmbusuario` | Selector de opción/lista. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `1001` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| ComboBox | `Usuario (último):` | `cmbOperaciones` | Selector de opción/lista. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Edit | `Usuario (último):` | `1001` | Campo de entrada/filtro/dato editable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Button | `Ordenar Columnas` | `btnOrdenarColumnas` | Configurar orden/visibilidad de columnas. | Compras/recepción/proveedores. | Bajo | Mapeado |
| Button | `Ampliar` | `-` | Abrir detalle ampliado del registro seleccionado. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Imprimir` | `-` | Imprimir o configurar impresión. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| Button | `Imprimir listado` | `-` | Imprimir listado actual. | Consulta productos/listas de precio. | Bajo | Mapeado |
| Button | `Exportar a Excel` | `-` | Exportar datos a Excel. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| Button | `Resumen x Clasificación` | `-` | Emitir resumen agrupado por clasificacion. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Excel con detalle de productos` | `-` | Exportar Excel con detalle de productos. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Link Web Ventas` | `-` | Abrir vinculo/consulta de ventas web. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## Consulta Valores a Depositar / 123 Consulta cartera de valores

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-Consulta-Valores-a-Depositar--123-Consulta-cartera-de-valores.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| CheckBox | `Incluir Cheques Electronicos (99)` | `cbIncluir99` | Activar/desactivar opción. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| CheckBox | `Seleccionar Cajas` | `chkCajas` | Activar/desactivar opción. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Button | `Excel` | `cmdExcel` | Exportar datos a Excel. | Caja, pagos o cheques/valores. | Bajo | Inferido por auto_id |
| RadioButton | `Contabilización de la entrada` | `rbcontabilizacion` | Elegir una opción excluyente. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| RadioButton | `Fecha de pago de valor` | `rbFechadePago` | Elegir una opción excluyente. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtFechaDesde` | Campo de entrada/filtro/dato editable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtFechaHasta` | Campo de entrada/filtro/dato editable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Button | `Amplia Cheque` | `cmdAmpliaImputacion` | Abrir detalle ampliado del cheque. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| Button | `Ampliar Comprobante` | `cmdAmpliarComprobante` | Abrir detalle ampliado del comprobante. | Caja, pagos o cheques/valores. | Bajo | Mapeado |
| HeaderItem | `F. Cont.` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `F. Pago` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Razón social` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Número` | `HeaderItem 3` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Importe` | `HeaderItem 4` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Acumulado` | `HeaderItem 14` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Titular` | `HeaderItem 5` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Banco` | `HeaderItem 6` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Nº interno` | `HeaderItem 7` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Cartera` | `HeaderItem 8` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `No a la orden` | `HeaderItem 9` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Titular 1` | `HeaderItem 10` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Titular 2` | `HeaderItem 11` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Titular 3` | `HeaderItem 12` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `F.Aplicación` | `HeaderItem 13` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Nombre Valor` | `HeaderItem 15` | Columna de grilla; define dato visible/ordenable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Button | `Imprimir` | `Button1` | Imprimir o configurar impresión. | Caja, pagos o cheques/valores. | Bajo | Inferido por auto_id |
| RadioButton | `Todos` | `rbTodos` | Elegir una opción excluyente. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| RadioButton | `Sólo en cartera` | `rbSolocartera` | Elegir una opción excluyente. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Button | `Buscar` | `cmdBuscar` | Ejecutar búsqueda o abrir selector relacionado. | Caja, pagos o cheques/valores. | Bajo | Inferido por auto_id |
| CheckBox | `Rango de importes` | `rbRangoImportes` | Activar/desactivar opción. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `TxtRazonSocial` | Campo de entrada/filtro/dato editable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| CheckBox | `Un nro de Cheque` | `rbNroValor` | Activar/desactivar opción. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| ComboBox | `Empresas` | `cboBancos` | Selector de opción/lista. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Edit | `Empresas` | `1001` | Campo de entrada/filtro/dato editable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| CheckBox | `Un banco` | `chkBanco` | Activar/desactivar opción. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Edit | `Razón social:` | `txtImporteHasta` | Campo de entrada/filtro/dato editable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtImporteDesde` | Campo de entrada/filtro/dato editable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtNroValor` | Campo de entrada/filtro/dato editable. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## Definici n de Comprobantes / 29 Definición de comprobantes

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-Definici-n-de-Comprobantes--29-Definición-de-comprobantes.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| CheckBox | `Contabilidad` | `chkContabilidad` | Activar/desactivar opción. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| CheckBox | `Valores` | `chkValores` | Activar/desactivar opción. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| CheckBox | `Compras` | `chkCompras` | Activar/desactivar opción. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| CheckBox | `Facturacion` | `chkFacturacion` | Activar/desactivar opción. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| CheckBox | `Stock` | `chkStock` | Activar/desactivar opción. | Mostrador/productos/stock según contexto. | Medio | Observado por tipo UIA |
| HeaderItem | `id` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Nombre comprobante` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Tipo` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Pantalla de carga` | `HeaderItem 3` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Unidad de Negocios` | `HeaderItem 4` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Línea arriba` | `UpButton` | Desplazar grilla una linea arriba. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Av Pág` | `DownPageButton` | Avanzar pagina en grilla/lista. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Línea abajo` | `DownButton` | Desplazar grilla una linea abajo. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `1` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `26` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `6` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `7` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `8` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `31` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `28` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `32` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `29` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `33` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `30` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `13` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `12` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `14` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `5` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `2` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `3` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `4` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `15` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `27` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `20` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `21` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `22` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `23` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `25` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `24` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `19` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `16` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `17` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `18` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| Button | `Añadir` | `-` | Crear nuevo registro/item. | Mostrador/comprobantes. | Medio | Inferido por texto |
| Button | `Editar` | `-` | Editar registro/item seleccionado. | Mostrador/comprobantes. | Medio | Inferido por texto |
| Button | `Eliminar` | `-` | Eliminar registro/item. | Mostrador/comprobantes. | Alto | Inferido por texto |
| Button | `Parámetros Pantalla de Carga` | `-` | Configurar parametros de la pantalla de carga. | Mostrador/comprobantes. | Bajo | Mapeado |
| Button | `Copiar Comprobante` | `-` | Copiar dato al portapapeles o duplicar entidad. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## Definici n de Operaciones / 23 Definiciones de operaciones

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-Definici-n-de-Operaciones--23-Definiciones-de-operaciones.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| CheckBox | `Contabilidad` | `chkContabilidad` | Activar/desactivar opción. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| CheckBox | `Valores` | `chkValores` | Activar/desactivar opción. | Caja, pagos o cheques/valores. | Bajo | Observado por tipo UIA |
| CheckBox | `Compras` | `chkCompras` | Activar/desactivar opción. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| CheckBox | `Facturacion` | `chkFacturacion` | Activar/desactivar opción. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| CheckBox | `Stock` | `chkStock` | Activar/desactivar opción. | Mostrador/productos/stock según contexto. | Medio | Observado por tipo UIA |
| HeaderItem | `Nombre` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Sector` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Unidad de Negocios` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Línea arriba` | `UpButton` | Desplazar grilla una linea arriba. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Av Pág` | `DownPageButton` | Avanzar pagina en grilla/lista. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Línea abajo` | `DownButton` | Desplazar grilla una linea abajo. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Factura Proveedores` | `-` | Seleccionar factura de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| ListItem | `NC Proveedores` | `-` | Seleccionar nota de credito de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| ListItem | `ND Proveedores` | `-` | Seleccionar nota de debito de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| ListItem | `Factura Fiscal` | `-` | Seleccionar factura fiscal. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `Factura manual` | `-` | Seleccionar factura manual. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `NC Fiscal` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `NC Manual` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ND Fiscal` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `ND Manual` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `Depositos Bancarios` | `-` | Cargar deposito bancario. | Caja, pagos o cheques/valores. | Alto | Mapeado |
| ListItem | `Pagos` | `-` | Cargar pago. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Recibos` | `-` | Cargar recibo/cobranza. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Transferencias de Valores` | `-` | Cargar transferencia de valores. | Caja, pagos o cheques/valores. | Alto | Mapeado |
| ListItem | `Aplicacion de Comprobantes Pres.` | `-` | Aplicar comprobantes presupuestarios. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `Asiento Contable` | `-` | Cargar asiento contable. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Ajuste de Inventario Negativo` | `-` | Cargar ajuste de inventario negativo. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| ListItem | `Ajuste de Inventario Positivo` | `-` | Cargar ajuste de inventario positivo. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| ListItem | `Transferencia entre Depositos` | `-` | Cargar transferencia entre depositos. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| ListItem | `Factura Proveedores Pres.` | `-` | Seleccionar factura de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| ListItem | `NC Proveedores Pres.` | `-` | Seleccionar nota de credito de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| ListItem | `ND Proveedores Pres.` | `-` | Seleccionar nota de debito de proveedor. | Compras/recepción/proveedores. | Bajo | Mapeado |
| ListItem | `Factura Presupuestos` | `-` | Seleccionar factura/presupuesto. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `NC Presupuestos` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `ND Presupuestos` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `Deposito Bancario Pres.` | `-` | Cargar deposito bancario. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| ListItem | `Pagos Presupuestos` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `Recibos Presupuestos` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `Transferencias Presupuestos` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/productos/stock según contexto. | Alto | Inferido por texto |
| ListItem | `Aplicacion de Comprobantes Pres.` | `-` | Aplicar comprobantes presupuestarios. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `Asiento Contable Pres.` | `-` | Cargar asiento contable. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Añadir` | `-` | Crear nuevo registro/item. | Evaluar en módulo destino. | Medio | Inferido por texto |
| Button | `Editar` | `-` | Editar registro/item seleccionado. | Evaluar en módulo destino. | Medio | Inferido por texto |
| Button | `Eliminar` | `-` | Eliminar registro/item. | Evaluar en módulo destino. | Alto | Inferido por texto |
| Button | `Usuarios Habilitados` | `-` | Definir usuarios habilitados para la operacion. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## Informe de Vencimientos / 154 Informe de Vencimientos

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-Informe-de-Vencimientos--154-Informe-de-Vencimientos.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| CheckBox | `Varios Grupos de Cta.Cte.` | `cbDefCCVarias` | Activar/desactivar opción. | Cliente ocasional, cliente registrado o cuenta corriente. | Medio | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtFechaHasta` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| RadioButton | `F.Comprob.` | `rbFComp` | Elegir una opción excluyente. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| RadioButton | `F.Vto.` | `rbFVto` | Elegir una opción excluyente. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| RadioButton | `Vto.+Días` | `rbFDias` | Elegir una opción excluyente. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| RadioButton | `x Fecha Comprobante` | `rbFechaComp` | Elegir una opción excluyente. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| RadioButton | `x Fecha Vencimiento` | `rbFechaVto` | Elegir una opción excluyente. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| CheckBox | `Solo Sin Cobrador` | `chkSinCobrador` | Activar/desactivar opción. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| ComboBox | `ORIANA` | `cboCobrador` | Selector de opción/lista. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `1001` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| CheckBox | `Un Cobrador` | `chkCobrador` | Activar/desactivar opción. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| CheckBox | `Un Vendedor` | `chkUnVendedor` | Activar/desactivar opción. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| CheckBox | `Seleccionar Comprobantes` | `chkDefComp` | Activar/desactivar opción. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Subir` | `-` | Aumentar valor en control numerico. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Bajar` | `-` | Disminuir valor en control numerico. | Evaluar en módulo destino. | Bajo | Mapeado |
| Edit | `Indicador giratorio` | `1967872` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `(sin texto)` | `cmdCtaCte` | Ver/usar cuenta corriente del cliente. | Evaluar en módulo destino. | Bajo | Inferido por auto_id |
| CheckBox | `Una Cta.Cte` | `chkCtaCte` | Activar/desactivar opción. | Cliente ocasional, cliente registrado o cuenta corriente. | Medio | Observado por tipo UIA |
| Button | `Buscar` | `cmdBuscar` | Ejecutar búsqueda o abrir selector relacionado. | Filtro, búsqueda o exporte. | Bajo | Inferido por auto_id |
| Edit | `(sin texto)` | `txtFecha` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| ComboBox | `Clientes` | `cboDefCtaCte` | Selector de opción/lista. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `1001` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## Listas de Precios / 13 Listas de Precios

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-Listas-de-Precios--13-Listas-de-Precios.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| HeaderItem | `Nombre` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Consulta productos/listas de precio. | Bajo | Observado por tipo UIA |
| HeaderItem | `Tipo de Actualización` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Consulta productos/listas de precio. | Bajo | Observado por tipo UIA |
| Button | `Columna a la izquierda` | `UpButton` | Mover grilla una columna a la izquierda. | Consulta productos/listas de precio. | Bajo | Mapeado |
| Button | `Página a la derecha` | `DownPageButton` | Mover grilla una pagina a la derecha. | Consulta productos/listas de precio. | Bajo | Mapeado |
| Button | `Columna a la derecha` | `DownButton` | Mover grilla una columna a la derecha. | Consulta productos/listas de precio. | Bajo | Mapeado |
| ListItem | `Lista de Precios` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Consulta productos/listas de precio. | Bajo | Inferido por texto |
| ListItem | `Lista 2` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Consulta productos/listas de precio. | Bajo | Inferido por texto |
| ListItem | `Lista 3` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Consulta productos/listas de precio. | Bajo | Inferido por texto |
| ListItem | `Lista 4` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Consulta productos/listas de precio. | Bajo | Inferido por texto |
| ListItem | `Lista 5` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Consulta productos/listas de precio. | Bajo | Inferido por texto |
| Button | `Añadir` | `-` | Crear nuevo registro/item. | Consulta productos/listas de precio. | Medio | Inferido por texto |
| Button | `Editar` | `-` | Editar registro/item seleccionado. | Consulta productos/listas de precio. | Medio | Inferido por texto |
| Button | `Eliminar` | `-` | Eliminar registro/item. | Consulta productos/listas de precio. | Alto | Inferido por texto |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## Numeradores / 24 Tabla de Numeradores

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-Numeradores--24-Tabla-de-Numeradores.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| HeaderItem | `Nombre` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Pto.vta.` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Próximo` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Vencimiento CAI` | `HeaderItem 3` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Línea arriba` | `UpButton` | Desplazar grilla una linea arriba. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Av Pág` | `DownPageButton` | Avanzar pagina en grilla/lista. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Línea abajo` | `DownButton` | Desplazar grilla una linea abajo. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Columna a la izquierda` | `UpButton` | Mover grilla una columna a la izquierda. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Página a la derecha` | `DownPageButton` | Mover grilla una pagina a la derecha. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Columna a la derecha` | `DownButton` | Mover grilla una columna a la derecha. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Ajuste por Inventario` | `-` | Cargar ajuste por inventario. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| ListItem | `Aplicacion de Comprobantes` | `-` | Aplicar comprobantes. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `Armado de Conjuntos` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `Asiento Contable` | `-` | Cargar asiento contable. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Asiento por cheque Diferido` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Caja, pagos o cheques/valores. | Bajo | Inferido por texto |
| ListItem | `Cheque Rechazado Recibido` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Caja, pagos o cheques/valores. | Bajo | Inferido por texto |
| ListItem | `Cheque Rechazados` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Caja, pagos o cheques/valores. | Bajo | Inferido por texto |
| ListItem | `Compras` | `-` | Consultar/completar flujo de compras. | Compras/recepción/proveedores. | Bajo | Inferido por texto |
| ListItem | `Consumos de Repuestos` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `Deposito bancario` | `-` | Cargar deposito bancario. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| ListItem | `Deposito de Cheques` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Caja, pagos o cheques/valores. | Alto | Inferido por texto |
| ListItem | `Inventario Fisico` | `-` | Abrir inventario fisico. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| ListItem | `Nota de Credito` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `Orden de Pago` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Compras/recepción/proveedores. | Bajo | Inferido por texto |
| ListItem | `Pagos` | `-` | Cargar pago. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Recibos` | `-` | Cargar recibo/cobranza. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Recibos - Cobros 2` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `Recibos - Cobros 3` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `Retenciones Ganancias` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `Retenciones IIBB` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `Tranferencias` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `Ajuste de inventario presupuesto` | `-` | Abrir/ejecutar operación de inventario. | Mostrador/productos/stock según contexto. | Alto | Inferido por texto |
| ListItem | `Aplicacion de comprobantes presupuesto` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `Asiento Contable Presupuestos` | `-` | Cargar asiento contable. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `Deposito Bancario Presupuesto` | `-` | Cargar deposito bancario. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| ListItem | `Deposito de Clientes Presupuesto` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/productos/stock según contexto. | Alto | Inferido por texto |
| ListItem | `Orden de Pago Presupuesto` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Compras/recepción/proveedores. | Bajo | Inferido por texto |
| ListItem | `Pagos Presupuesto` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `Recibo Presupuestos` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `Recibos Presupuestos` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Mostrador/comprobantes. | Bajo | Inferido por texto |
| ListItem | `Transferencia de Valores Presupuesto` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Caja, pagos o cheques/valores. | Alto | Inferido por texto |
| Button | `Añadir` | `-` | Crear nuevo registro/item. | Evaluar en módulo destino. | Medio | Inferido por texto |
| Button | `Editar` | `-` | Editar registro/item seleccionado. | Evaluar en módulo destino. | Medio | Inferido por texto |
| Button | `Eliminar` | `-` | Eliminar registro/item. | Evaluar en módulo destino. | Alto | Inferido por texto |
| Button | `Tomar Numerador` | `-` | Tomar/asignar numerador al comprobante/punto de venta. | Evaluar en módulo destino. | Bajo | Mapeado |
| HeaderItem | `Nombre de definición de comprobante` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## Ordenes de Compra / 128 Ordenes de Compra

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-Ordenes-de-Compra--128-Ordenes-de-Compra.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| Button | `Corrige OCp/Sin/Rm` | `cmdBuscaSinMov` | Corregir relacion OC/siniestro/remito segun legacy. | Compras/recepción/proveedores. | Bajo | Mapeado |
| Button | `Recalcula Estados` | `cmdRecalculaEstados` | Recalcular estados de ordenes/registros. | Compras/recepción/proveedores. | Bajo | Mapeado |
| RadioButton | `Todas` | `rbRecTodas` | Elegir una opción excluyente. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| RadioButton | `Pendientes` | `rbRecNO` | Consultar pendientes del producto/cliente segun contexto. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| RadioButton | `Recibidas / Verificadas` | `rbRecSI` | Elegir una opción excluyente. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| RadioButton | `Anuladas` | `rbAnuladas` | Elegir una opción excluyente. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| RadioButton | `Recibidas` | `rbRecibidas` | Elegir una opción excluyente. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| RadioButton | `Todas` | `rbAutTodas` | Elegir una opción excluyente. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| RadioButton | `Pendientes` | `rbAutNO` | Consultar pendientes del producto/cliente segun contexto. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| RadioButton | `Autorizadas` | `rbAutSi` | Elegir una opción excluyente. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| Button | `Usuarios` | `cmdFiltrarXUsuario` | Filtrar/seleccionar usuarios. | Compras/recepción/proveedores. | Bajo | Mapeado |
| Button | `(sin texto)` | `cmdBuscarProveedor` | Ejecutar búsqueda o abrir selector relacionado. | Compras/recepción/proveedores. | Bajo | Inferido por auto_id |
| CheckBox | `Un Proveedor` | `cbUnProveedor` | Activar/desactivar opción. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| Edit | `Número:` | `tNumero` | Campo de entrada/filtro/dato editable. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| Button | `Nueva` | `-` | Crear nueva orden/operacion en la pantalla actual. | Compras/recepción/proveedores. | Bajo | Mapeado |
| Button | `Modificar` | `-` | Editar registro/item seleccionado. | Compras/recepción/proveedores. | Bajo | Inferido por texto |
| Button | `Anular` | `-` | Anular registro/orden/operacion seleccionada. | Compras/recepción/proveedores. | Alto | Mapeado |
| Button | `Consultar` | `-` | Consultar registro/orden/operacion seleccionada. | Compras/recepción/proveedores. | Bajo | Mapeado |
| Button | `Autorizar` | `-` | Autorizar orden/operacion. | Compras/recepción/proveedores. | Alto | Mapeado |
| Button | `Observaciones` | `-` | Ver/editar notas u observaciones. | Compras/recepción/proveedores. | Bajo | Inferido por texto |
| Button | `Excel` | `-` | Exportar datos a Excel. | Compras/recepción/proveedores. | Bajo | Inferido por texto |
| Button | `Imprimir` | `-` | Imprimir o configurar impresión. | Compras/recepción/proveedores. | Bajo | Inferido por texto |
| Button | `Depurar` | `-` | Depurar registros antiguos/pendientes segun filtro. | Compras/recepción/proveedores. | Bajo | Mapeado |
| Button | `Cancelar Pendiente` | `-` | Cancelar saldo/estado pendiente. | Compras/recepción/proveedores. | Alto | Mapeado |
| HeaderItem | `Número` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Revision` | `HeaderItem 3` | Columna de grilla; define dato visible/ordenable. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Fecha` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Estado` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Proveedor` | `HeaderItem 4` | Columna de grilla; define dato visible/ordenable. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Descripción` | `HeaderItem 5` | Columna de grilla; define dato visible/ordenable. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Unidad de Negocios` | `HeaderItem 6` | Columna de grilla; define dato visible/ordenable. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Mda` | `HeaderItem 7` | Columna de grilla; define dato visible/ordenable. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Total` | `HeaderItem 8` | Fila resumen de total final calculado. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Pend.Fact.` | `HeaderItem 9` | Columna de grilla; define dato visible/ordenable. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Pend.Recibir` | `HeaderItem 10` | Columna de grilla; define dato visible/ordenable. | Compras/recepción/proveedores. | Alto | Observado por tipo UIA |
| HeaderItem | `Genero` | `HeaderItem 11` | Columna de grilla; define dato visible/ordenable. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Autorizo` | `HeaderItem 12` | Columna de grilla; define dato visible/ordenable. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Numero OT` | `HeaderItem 13` | Columna de grilla; define dato visible/ordenable. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Cod Gasto` | `HeaderItem 14` | Columna de grilla; define dato visible/ordenable. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| HeaderItem | `Descripción Gasto` | `HeaderItem 15` | Columna de grilla; define dato visible/ordenable. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| Button | `Unid.De Neg.` | `cmdVerUN` | Abrir/seleccionar unidad de negocio. | Compras/recepción/proveedores. | Bajo | Mapeado |
| Button | `Buscar` | `cmdBuscar` | Ejecutar búsqueda o abrir selector relacionado. | Compras/recepción/proveedores. | Bajo | Inferido por auto_id |
| RadioButton | `Ninguno` | `rbNinguno` | Elegir una opción excluyente. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| RadioButton | `Una Cta.Contable` | `rbCuenta` | Elegir una opción excluyente. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| RadioButton | `Una Obra` | `rbObra` | Elegir una opción excluyente. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| CheckBox | `Rango de Fechas` | `cbRangoFechas` | Activar/desactivar opción. | Compras/recepción/proveedores. | Bajo | Observado por tipo UIA |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Restaurar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## Puntos de Venta / 99 Puntos de Venta

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-Puntos-de-Venta--99-Puntos-de-Venta.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| Button | `Agregar` | `-` | Crear nuevo registro/item. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Editar` | `-` | Editar registro/item seleccionado. | Evaluar en módulo destino. | Medio | Inferido por texto |
| Button | `Eliminar` | `-` | Eliminar registro/item. | Evaluar en módulo destino. | Alto | Inferido por texto |
| Button | `Múltiples formatos de impresión` | `-` | Elegir formato de impresion. | Evaluar en módulo destino. | Bajo | Mapeado |
| HeaderItem | `Número` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Negocio` | `HeaderItem 12` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Descripción` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Impresión` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Dom. Facturación` | `HeaderItem 3` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Loc. Facturación` | `HeaderItem 4` | Columna de grilla; define dato visible/ordenable. | Mostrador/comprobantes. | Bajo | Observado por tipo UIA |
| HeaderItem | `Num FcA` | `HeaderItem 5` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Num FcB` | `HeaderItem 6` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Num NDA` | `HeaderItem 7` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Num NDB` | `HeaderItem 8` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Num NCA` | `HeaderItem 9` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Num NCB` | `HeaderItem 10` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Num Rm` | `HeaderItem 11` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Columna a la izquierda` | `UpButton` | Mover grilla una columna a la izquierda. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Página a la derecha` | `DownPageButton` | Mover grilla una pagina a la derecha. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Columna a la derecha` | `DownButton` | Mover grilla una columna a la derecha. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `1` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `6` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| ListItem | `9` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Evaluar en módulo destino. | Bajo | Inferido por texto |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## Res men por Cuentas Corriente / 79 Resúmen por Cta Cte

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-Res-men-por-Cuentas-Corriente--79-Resúmen-por-Cta-Cte-.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| CheckBox | `Mostrar Solo las Cuentas con Saldo` | `cbSoloConSaldo` | Activar/desactivar opción. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Migracion` | `cmdMigracion` | Ejecutar o revisar utilidad de migracion legacy. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Imprimir` | `cmdImprimir` | Imprimir o configurar impresión. | Evaluar en módulo destino. | Bajo | Inferido por auto_id |
| Button | `Seleccionar cuales` | `cmdSeleccionarDefCC` | Seleccionar subconjunto de registros. | Evaluar en módulo destino. | Bajo | Mapeado |
| RadioButton | `Varios Grupos de Cuenta Corriente por Empresa` | `rbVariosDefCC` | Elegir una opción excluyente. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Observado por tipo UIA |
| Button | `Buscar Resumen` | `cmdBuscar` | Ejecutar búsqueda o abrir selector relacionado. | Filtro, búsqueda o exporte. | Bajo | Inferido por auto_id |
| HeaderItem | `Código` | `HeaderItem 0` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Nombre` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Saldo` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Nombre` | `HeaderItem 1` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `Saldo` | `HeaderItem 2` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| HeaderItem | `CUIT` | `HeaderItem 3` | Columna de grilla; define dato visible/ordenable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Exportar a Excel` | `cmdExportarAExcel` | Exportar datos a Excel. | Filtro, búsqueda o exporte. | Bajo | Inferido por auto_id |
| RadioButton | `Saldos por cuenta contable (Una Definicion de CC)` | `rbCuentaContableUna` | Elegir una opción excluyente. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| RadioButton | `Saldos por cuenta contable (Todas las cuentas)` | `rbCuentaContableTodas` | Elegir una opción excluyente. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| RadioButton | `Saldos por Definicion de Cta. Cte.` | `rbDefCtaCte` | Elegir una opción excluyente. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `txtFecha` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| ComboBox | `Saldos al:` | `cboCC` | Selector de opción/lista. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Edit | `Saldos al:` | `1001` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| ComboBox | `Clientes` | `cboDefCtaCte` | Selector de opción/lista. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Observado por tipo UIA |
| Edit | `(sin texto)` | `1001` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Open` | `-` | Abrir lista desplegable. | Combo/select nativo. | Bajo | Control UI |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## Una Cuenta Corriente / 46 Cuenta Corriente

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-Una-Cuenta-Corriente--46-Cuenta-Corriente.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| RadioButton | `x Fecha Contable` | `rbOrdenaFCont` | Elegir una opción excluyente. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Observado por tipo UIA |
| RadioButton | `x Fecha Vencimiento` | `rbOrdenaFVto` | Elegir una opción excluyente. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Observado por tipo UIA |
| RadioButton | `x Fecha Comprobante` | `rbOrdenaFComp` | Elegir una opción excluyente. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Observado por tipo UIA |
| RadioButton | `Saldos Vencidos a Hoy` | `optVencidosHoy` | Elegir una opción excluyente. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Observado por tipo UIA |
| Button | `Migración` | `cmdMigracion` | Ejecutar o revisar utilidad de migracion legacy. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Mapeado |
| RadioButton | `Ficha completa` | `optFichaCompleta` | Elegir una opción excluyente. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Observado por tipo UIA |
| RadioButton | `Solo saldos pendientes` | `optSoloSaldosPendientes` | Elegir una opción excluyente. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Observado por tipo UIA |
| Button | `Buscar` | `cmdBuscar` | Ejecutar búsqueda o abrir selector relacionado. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Inferido por auto_id |
| Button | `UN` | `cmdVerUN` | Abrir/seleccionar unidad de negocio. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Mapeado |
| Edit | `(sin texto)` | `tCodCC` | Campo de entrada/filtro/dato editable. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Observado por tipo UIA |
| Button | `(sin texto)` | `cmdBuscarCC` | Ejecutar búsqueda o abrir selector relacionado. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Inferido por auto_id |
| Button | `Subir` | `-` | Aumentar valor en control numerico. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Mapeado |
| Button | `Bajar` | `-` | Disminuir valor en control numerico. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Mapeado |
| Edit | `Indicador giratorio` | `1639976` | Campo de entrada/filtro/dato editable. | Cliente ocasional, cliente registrado o cuenta corriente. | Bajo | Observado por tipo UIA |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Restaurar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## expanded menu

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-expanded-menu.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| Button | `Registrar Llamada` | `cmdRegistroDeLlamados` | Registrar llamada/soporte comercial. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Soporte` | `Button1` | Abrir soporte. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `TICKETS Soporte` | `cmdTickets` | Abrir tickets de soporte. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Agenda` | `cmdAgenda` | Abrir agenda. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `(sin texto)` | `cmdBorrarBuscador` | Eliminar registro/item. | Evaluar en módulo destino. | Bajo | Inferido por auto_id |
| Button | `Unid.De Neg.` | `cmdVerUN` | Abrir/seleccionar unidad de negocio. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Obtener CAE / Imp.Fiscal` | `cmdAvisos` | Abrir avisos/operacion fiscal CAE o impresion fiscal. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `Carga de Operaciones` | `-` | Abrir selector de operaciones. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Consultar Productos` | `-` | Abrir consulta operativa de productos. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Preparar Transferencia entre depósitos` | `-` | Abrir preparacion de transferencia entre depositos. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| Edit | `(sin texto)` | `txtBuscar` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Línea arriba` | `UpButton` | Desplazar grilla una linea arriba. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Re Pág` | `UpPageButton` | Retroceder pagina en grilla/lista. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Línea abajo` | `DownButton` | Desplazar grilla una linea abajo. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Cambiar Clave Usuario` | `-` | Cambiar clave del usuario. | Evaluar en módulo destino. | Alto | Mapeado |
| Button | `Email` | `-` | Enviar por email. | Mostrador/comprobantes. | Medio | Inferido por texto |
| Button | `Colores` | `-` | Configurar colores/tema legacy. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Versiones Instaladas` | `-` | Ver versiones instaladas. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Manual del sistema` | `-` | Abrir manual del sistema. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Terminos y Condiciones` | `-` | Abrir terminos y condiciones. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Ver Mensajes` | `-` | Abrir mensajes del sistema. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## full menu pass

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-full-menu-pass.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| Button | `Registrar Llamada` | `cmdRegistroDeLlamados` | Registrar llamada/soporte comercial. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Soporte` | `Button1` | Abrir soporte. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `TICKETS Soporte` | `cmdTickets` | Abrir tickets de soporte. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Agenda` | `cmdAgenda` | Abrir agenda. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `(sin texto)` | `cmdBorrarBuscador` | Eliminar registro/item. | Evaluar en módulo destino. | Bajo | Inferido por auto_id |
| Button | `Unid.De Neg.` | `cmdVerUN` | Abrir/seleccionar unidad de negocio. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Obtener CAE / Imp.Fiscal` | `cmdAvisos` | Abrir avisos/operacion fiscal CAE o impresion fiscal. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `Carga de Operaciones` | `-` | Abrir selector de operaciones. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Consultar Productos` | `-` | Abrir consulta operativa de productos. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Preparar Transferencia entre depósitos` | `-` | Abrir preparacion de transferencia entre depositos. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| Edit | `(sin texto)` | `txtBuscar` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Línea arriba` | `UpButton` | Desplazar grilla una linea arriba. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Re Pág` | `UpPageButton` | Retroceder pagina en grilla/lista. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Av Pág` | `DownPageButton` | Avanzar pagina en grilla/lista. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Línea abajo` | `DownButton` | Desplazar grilla una linea abajo. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Cambiar Clave Usuario` | `-` | Cambiar clave del usuario. | Evaluar en módulo destino. | Alto | Mapeado |
| Button | `Email` | `-` | Enviar por email. | Mostrador/comprobantes. | Medio | Inferido por texto |
| Button | `Colores` | `-` | Configurar colores/tema legacy. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Versiones Instaladas` | `-` | Ver versiones instaladas. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Manual del sistema` | `-` | Abrir manual del sistema. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Terminos y Condiciones` | `-` | Abrir terminos y condiciones. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Ver Mensajes` | `-` | Abrir mensajes del sistema. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## main menu

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-main-menu.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| Button | `Registrar Llamada` | `cmdRegistroDeLlamados` | Registrar llamada/soporte comercial. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Soporte` | `Button1` | Abrir soporte. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `TICKETS Soporte` | `cmdTickets` | Abrir tickets de soporte. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Agenda` | `cmdAgenda` | Abrir agenda. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `(sin texto)` | `cmdBorrarBuscador` | Eliminar registro/item. | Evaluar en módulo destino. | Bajo | Inferido por auto_id |
| Button | `Unid.De Neg.` | `cmdVerUN` | Abrir/seleccionar unidad de negocio. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Obtener CAE / Imp.Fiscal` | `cmdAvisos` | Abrir avisos/operacion fiscal CAE o impresion fiscal. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `Carga de Operaciones` | `-` | Abrir selector de operaciones. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Consultar Productos` | `-` | Abrir consulta operativa de productos. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Preparar Transferencia entre depósitos` | `-` | Abrir preparacion de transferencia entre depositos. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| Edit | `(sin texto)` | `txtBuscar` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Cambiar Clave Usuario` | `-` | Cambiar clave del usuario. | Evaluar en módulo destino. | Alto | Mapeado |
| Button | `Email` | `-` | Enviar por email. | Mostrador/comprobantes. | Medio | Inferido por texto |
| Button | `Colores` | `-` | Configurar colores/tema legacy. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Versiones Instaladas` | `-` | Ver versiones instaladas. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Manual del sistema` | `-` | Abrir manual del sistema. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Terminos y Condiciones` | `-` | Abrir terminos y condiciones. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Ver Mensajes` | `-` | Abrir mensajes del sistema. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

## owner full menu

Fuente: `docs/legacy-audit/raw/legacy-ui-dump-owner-full-menu.json`.

| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |
|---|---|---|---|---|---|---|
| Button | `Registrar Llamada` | `cmdRegistroDeLlamados` | Registrar llamada/soporte comercial. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Soporte` | `Button1` | Abrir soporte. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `TICKETS Soporte` | `cmdTickets` | Abrir tickets de soporte. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Agenda` | `cmdAgenda` | Abrir agenda. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `(sin texto)` | `cmdBorrarBuscador` | Eliminar registro/item. | Evaluar en módulo destino. | Bajo | Inferido por auto_id |
| Button | `Unid.De Neg.` | `cmdVerUN` | Abrir/seleccionar unidad de negocio. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Obtener CAE / Imp.Fiscal` | `cmdAvisos` | Abrir avisos/operacion fiscal CAE o impresion fiscal. | Mostrador/comprobantes. | Bajo | Mapeado |
| ListItem | `Consultar Productos` | `-` | Abrir consulta operativa de productos. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Carga de Operaciones` | `-` | Abrir selector de operaciones. | Evaluar en módulo destino. | Bajo | Mapeado |
| ListItem | `Actualiza Precios Por Porcentaje` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Consulta productos/listas de precio. | Bajo | Inferido por texto |
| ListItem | `Actualizar Lista (2,3 o 4) x Coef. Sobre L 1` | `-` | Opcion seleccionable de la lista/grilla de esta pantalla. | Consulta productos/listas de precio. | Medio | Inferido por texto |
| ListItem | `Actualizar productos desde Excel` | `-` | Exportar datos a Excel. | Filtro, búsqueda o exporte. | Medio | Inferido por texto |
| ListItem | `Preparar Transferencia entre depósitos` | `-` | Abrir preparacion de transferencia entre depositos. | Mostrador/productos/stock según contexto. | Alto | Mapeado |
| Edit | `(sin texto)` | `txtBuscar` | Campo de entrada/filtro/dato editable. | Evaluar en módulo destino. | Bajo | Observado por tipo UIA |
| Button | `Línea arriba` | `UpButton` | Desplazar grilla una linea arriba. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Re Pág` | `UpPageButton` | Retroceder pagina en grilla/lista. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Av Pág` | `DownPageButton` | Avanzar pagina en grilla/lista. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Línea abajo` | `DownButton` | Desplazar grilla una linea abajo. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Cambiar Clave Usuario` | `-` | Cambiar clave del usuario. | Evaluar en módulo destino. | Alto | Mapeado |
| Button | `Email` | `-` | Enviar por email. | Mostrador/comprobantes. | Medio | Inferido por texto |
| Button | `Colores` | `-` | Configurar colores/tema legacy. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Versiones Instaladas` | `-` | Ver versiones instaladas. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Manual del sistema` | `-` | Abrir manual del sistema. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Terminos y Condiciones` | `-` | Abrir terminos y condiciones. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Ver Mensajes` | `-` | Abrir mensajes del sistema. | Evaluar en módulo destino. | Bajo | Mapeado |
| Button | `Minimizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Maximizar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |
| Button | `Cerrar` | `-` | Control de ventana legacy; no aplica como función de negocio web. | No aplica; usar navegación/drawer web. | Bajo | Control UI |

