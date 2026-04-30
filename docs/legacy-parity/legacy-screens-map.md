# Aguila Legacy Parity - mapa de pantallas

Ultima revision: 2026-04-29

Este mapa traduce las operaciones de Aguila Soft 3G al ERP nuevo sin duplicar la logica de negocio. Las rutas legacy deben consumir los mismos endpoints y servicios actuales de Next/Nest/Prisma.

## Estado de aplicacion del prompt

| Pedido del prompt | Estado actual | Decision |
| --- | --- | --- |
| Crear rama `feature/aguila-legacy-parity` | Aplicado | Rama creada sobre el estado local actual. |
| Documentar mapa de pantallas | Aplicado | Este documento queda como fuente de paridad funcional. |
| `NEXT_PUBLIC_UI_MODE=modern|legacy` | Aplicado | Variable documentada y usada en layout legacy como modo por defecto. |
| Componentes visuales legacy | Aplicado | `LegacyWindow`, `LegacyToolbar`, `LegacyPanel`, `LegacyGrid`, `LegacyOperationLauncher`, `LegacyTotalsBox`, `LegacyFieldset`, `LegacyShortcutButton`. |
| Menu legacy y cargar operaciones | Aplicado | Rutas `/legacy/menu` y `/legacy/operaciones/cargar`. |
| Factura Presupuesto legacy | Aplicado parcial funcional | Ruta `/legacy/ventas/factura-presupuesto`, conectada a clientes, productos, depositos, puntos de venta, caja y documentos actuales. |
| Consulta Productos legacy | Aplicado parcial funcional | Ruta `/legacy/productos/consulta`, busca productos reales, muestra stock/precio efectivo y permite export CSV desde endpoint existente. |
| Importador Excel Aguila A-M | Ya aplicado mayormente | `products/import` ya contempla columnas A-M, codigo alternativo, costos, IVA, unidad, coeficiente y reporte de errores. Falta UI legacy especifica de importacion. |
| Coeficientes de precio | Ya aplicado | Producto/categoria, vigencia y mayor coeficiente vigente ya se aplican en search y validacion de documentos. |
| Factura Proveedores | Aplicado como pantalla shell | Ruta `/legacy/compras/factura-proveedores` deja flujo y campos; falta endpoint de compra proveedor completo. |
| Caja | Ya aplicado | `CashSession` y `CashMovement`, bloqueo de contado sin caja abierta, cierre con esperado/diferencia. |
| Documentos | Ya aplicado parcial fuerte | Confirmados no se editan, anulacion exige motivo, reversa stock/CC, historial disponible via detalle. Falta reversa de caja al anular y preparar nota de credito desde UI. |
| Reset limpio de datos | Pendiente | No se aplico para no introducir borrado masivo sin cerrar reglas exactas de datos base. |
| Tests | Pendiente | No se agregaron E2E/API todavia; conviene cuando las rutas legacy queden completas. |

## Menu Aguila

| Seccion legacy | Ruta nueva | Modulos/API actuales |
| --- | --- | --- |
| Compras | `/legacy/compras/factura-proveedores` | `suppliers`, `documents`, `stock`, futuro flujo compra |
| Ventas | `/legacy/ventas/factura-presupuesto` | `customers`, `documents`, `products`, `stock`, `cash`, `price-lists` |
| Tesoreria | `/caja` y accesos legacy desde menu | `cash`, `current-account` |
| Contabilidad | `/cuenta-corriente`, `/reportes` | `current-account`, `reports`, `documents` |
| Stock | `/stock`, `/legacy/productos/consulta` | `stock`, `products` |
| Varios | `/clientes`, `/proveedores`, `/listas-de-precio` | maestros y configuracion |

## Operaciones clave

| Operacion Aguila | Ruta legacy | Ruta moderna relacionada | Estado |
| --- | --- | --- | --- |
| Factura Presupuesto | `/legacy/ventas/factura-presupuesto` | `/ventas` | Funcional sobre API actual. |
| Factura Proveedores | `/legacy/compras/factura-proveedores` | `/compras` | Pantalla preparada; falta endpoint especifico. |
| Consulta Productos | `/legacy/productos/consulta` | `/productos`, `/stock` | Funcional para busqueda/exportacion. |
| Ajustes/Transferencias | `/stock` | `/stock` | Reusar pantalla moderna hasta tener layout legacy propio. |
| Caja | `/caja` | `/caja` | Reusar pantalla moderna; reglas de API ya existen. |
| Documentos | `/documentos` | `/documentos` | Reusar historial moderno; detalle ya expone movimientos. |

## Principios de convivencia

- La UI legacy no debe reemplazar la UI moderna.
- Las rutas legacy deben usar `apps/web/lib/api.ts` y endpoints existentes.
- La paridad legacy prioriza velocidad de operador: grillas densas, atajos visibles, cabecera fiscal y totales siempre presentes.
- Las reglas duras quedan en API: stock, caja, cuenta corriente, permisos, anulacion y precios.
