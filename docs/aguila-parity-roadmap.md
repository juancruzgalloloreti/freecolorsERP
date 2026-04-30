# Aguila 3G parity roadmap

Objetivo: que el ERP nuevo cubra la operatoria real de Aguila, pero con flujos mas simples, menos pantallas escondidas y trazabilidad moderna.

## Manuales importados

Los manuales accesibles quedaron guardados en `docs/aguila-manuales`.

## Brechas principales

### Catalogo, precios y stock
- Importar productos desde Excel con formato Aguila A-M.
- Codigo principal + codigo alternativo/sufijo de proveedor para evitar duplicados.
- Opcion de actualizar solamente codigos existentes.
- Unidad de medida y coeficiente de conversion para compras.
- Precio lista sin IVA, IVA y precio final.
- Costos: reposicion, promedio y ultima compra.
- Coeficientes de precio por producto y por clasificacion; gana el coeficiente mayor vigente.
- Productos vinculados a unidades de negocio.
- Ajustes de inventario positivos y negativos con auditoria.
- Stock valorizado a costo compra/reposicion y consultas historicas.

### Ventas y pedidos
- Pedido de venta con estados: pendiente, preparacion, facturable/facturado.
- Alta de pedido desde productos/cliente.
- Importar/exportar pedido a Excel.
- Enviar pedido por mail.
- Facturar pedido y controlar cambios de estado.
- Nota de credito desde factura, incluyendo series cuando correspondan.
- Factura con conceptos varios.

### Compras y proveedores
- Factura de compra separada en proveedor, datos fiscales, registro contable, impuestos/descuentos.
- Compra con o sin ingreso a stock.
- Descuentos proveedor por item.
- Cuenta corriente proveedor.

### Caja y contabilidad
- Plan de cuentas jerarquico.
- Asientos contables.
- Asiento de resultado, cierre y apertura de ejercicio.
- Devengamiento por cuotas hacia cuenta contable o cuenta corriente.

### Portal y permisos externos
- Usuarios web de clientes.
- Habilitar modulos: cuenta corriente y pedidos.
- Vincular usuario web a cuenta corriente.

### Integraciones especiales
- AFIP/CAE e impresion fiscal.
- GM unidades, ordenes de reparacion y archivos CSV.
- Producteca/Google Sheets/SAP si siguen vigentes.

## Prioridad de implementacion

1. Importacion Excel Aguila + costos/IVA/unidades. Avance: importador Excel/CSV conectado al catalogo; IVA, coeficiente de compra, costo reposicion, costo promedio y ultima compra ya quedan como campos del producto.
2. Coeficientes de precio y precios efectivos en mostrador. Avance: coeficientes por producto o categoria con vigencia; al vender se aplica el mayor coeficiente vigente sobre la lista seleccionada.
3. Pedidos de venta completos. Avance: modulo de pedidos con estados pendiente/preparacion/facturable/facturado/cancelado, carga desde productos/cliente, exportacion CSV y conversion a documento borrador.
4. Factura de compras completa y cuenta corriente proveedor.
5. Ajustes de inventario avanzados y stock valorizado.
6. Contabilidad basica: plan de cuentas, asientos, cierre/apertura.
7. Portal cliente para pedidos y cuenta corriente.
8. AFIP/CAE/impresion fiscal.
9. Integraciones especiales GM/Producteca/SAP.
