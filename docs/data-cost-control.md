# Politica de datos para bajar costo futuro

Fecha: 2026-04-29

Objetivo: que FreeColors ERP pueda durar años con muchos movimientos sin que la base, los reportes o las pantallas se vuelvan lentas/caras.

## Reglas obligatorias

1. Ningun endpoint historico debe traer todo por defecto.
   - Usar `page` y `limit` en documentos, stock, cuenta corriente, productos, clientes y proveedores.
   - Si una pantalla vieja necesita array, el backend mantiene compatibilidad pero con tope duro.

2. Todo historico debe filtrar por tenant.
   - Todas las consultas deben incluir `tenantId`.
   - Los indices historicos deben empezar por `tenantId`.

3. Movimientos nunca se editan para corregir saldos.
   - Stock se corrige con otro movimiento.
   - Cuenta corriente se corrige con otro entry.
   - Caja se corrige con cash in/out o diferencia de cierre.
   - Documentos confirmados se anulan con reversa y motivo.

4. Reportes pesados no deben recalcular toda la historia cada vez.
   - Corto plazo: filtros por fecha y paginacion.
   - Mediano plazo: snapshots diarios.
   - Largo plazo: resumen mensual/materializado para reportes owner.

5. Busquedas grandes no deben usar `%texto%` sin limite.
   - Siempre con `limit`.
   - Para catalogo grande, agregar busqueda dedicada por codigo/marca/nombre.

## Topes actuales

- Productos/clientes/proveedores sin `page`: maximo 500 filas.
- Documentos sin `page`: maximo 200 filas.
- Cuenta corriente sin `page`: maximo 200 filas.
- Stock actual sin `page`: maximo 1000 filas.
- Movimientos de stock sin `page`: maximo 100 filas.
- Con `page`, los endpoints devuelven `{ data, meta }`.

## Indices agregados

- `stock_movements`: tenant/producto/deposito, tenant/producto/fecha, tenant/deposito/fecha, tenant/tipo/fecha.
- `documents`: tenant/fecha, tenant/estado/fecha, tenant/tipo/fecha, tenant/usuario/fecha.
- `current_account_entries`: tenant/fecha, tenant/cliente/fecha, tenant/tipo/fecha.
- `payments`: tenant/metodo/fecha, tenant/usuario/fecha.
- `audit_logs`: tenant/accion, tenant/entidad/id, tenant/fecha.
- `cash_sessions`: tenant/estado, tenant/apertura.
- `cash_movements`: tenant/sesion, tenant/documento.

## Proximos pasos

1. Pantallas con paginacion real: Documentos, Stock, Cuenta corriente.
2. Reportes owner por rango de fecha obligatorio.
3. Crear snapshots diarios:
   - ventas por dia
   - caja por dia
   - deuda por cliente
   - stock valorizado
4. Backups automaticos y prueba de restauracion.
5. Logs de queries lentas cuando se defina hosting.
