# ERP_PERMISSION_MATRIX.md

## Objetivo

Los permisos de FreeColors ERP deben proteger datos sensibles de caja, deuda, cheques, reportes, costos y configuracion. La UI puede ocultar acciones, pero la seguridad real debe vivir en el backend.

## Regla tecnica actual

`PermissionsService.getUserPermissions()` devuelve:

- permisos explicitos del usuario;
- mas permisos default del rol.

Por eso un permiso heredado por rol no se puede quitar desde la UI de Empleados. Para que un empleado comun no vea informacion sensible, el rol `EMPLOYEE` debe tener defaults minimos y los permisos extra se agregan manualmente por usuario.

## Matriz aprobada

| Perfil | Puede | No puede |
| --- | --- | --- |
| Empleado mostrador | Mostrador, presupuestos, facturas permitidas, busqueda de productos, stock disponible, cliente basico | Ventas totales, deuda global, cheques, caja completa, costos, reportes, listas CR/CU, compras, proveedores, aprobaciones, usuarios |
| Encargado | Todo lo anterior mas permisos extra asignados manualmente sobre `EMPLOYEE`: caja operativa, compras, proveedores, stock y cuenta corriente operativa | Configuracion, usuarios, reportes financieros completos, permisos owner |
| Admin/Contador | Reportes, caja, cheques, cuenta corriente, documentos y compras | Gestion de usuarios owner y configuracion critica |
| Owner | Todo | Sin restricciones |
| READONLY | Ver pantallas de lectura seguras disponibles hoy: ventas, stock, compras y reportes | Operar, crear, editar, confirmar, anular o borrar cualquier cosa; ver caja, cuenta corriente, cheques, auditoria o costos |

## Defaults de EMPLOYEE

El rol base `EMPLOYEE` debe quedar limitado a:

- `sale.create`
- `sale.view`
- `stock.view`
- `customer.create`
- `document.create`

Permisos como `cash.*`, `check.*`, `supplier.*`, `purchase.*`, `approval.*`, `report.*`, `price.update`, `document.confirm`, `document.cancel`, descuentos y usuarios no deben venir por default.

## Notas operativas

- Un encargado se crea como `EMPLOYEE` y se le agregan permisos finos desde Empleados.
- Los permisos explicitos ya guardados en usuarios existentes siguen aplicando.
- Despues de cambiar defaults, los usuarios con sesion abierta deben volver a iniciar sesion o refrescar permisos.
- La UI de sidebar/dashboard debe ocultar accesos segun permisos, pero los endpoints sensibles tambien necesitan guards.
- `POST /documents/confirm-sale` representa venta directa desde Mostrador y requiere `sale.create`.
- Confirmar documentos existentes desde Comprobantes sigue requiriendo `document.confirm`; anular sigue requiriendo `document.cancel`.
- `GET /priceLists` puede usarse con `stock.view` para Mostrador/Productos, pero empleados no reciben CR/CU desde backend.
- Cuenta corriente global usa temporalmente `customer.credit_limit` como permiso de acceso. Es una decision consciente por falta de un permiso separado `currentAccount.view`; si el negocio necesita ver saldos sin editar limites, crear ese permiso antes de ampliar accesos.

## Defaults de READONLY

`READONLY` es una cuenta demo/interna para mostrar el sistema sin riesgo operativo. No es todavia un auditor contable completo.

El rol base `READONLY` queda limitado a permisos de lectura existentes y seguros:

- `sale.view`
- `stock.view`
- `purchase.view`
- `report.view`

No recibe `cash.*`, `check.*`, `approval.*`, `audit.read`, `customer.credit_limit`, `document.create`, `document.confirm`, `document.cancel`, `price.update` ni permisos de usuarios.

Quedan fuera por deuda tecnica consciente las vistas que requieren permisos nuevos de solo lectura: `document.view`, `customer.view`, `supplier.view`, `cash.view`, `currentAccount.view`, `check.view` separado para demo y `product.view`.
