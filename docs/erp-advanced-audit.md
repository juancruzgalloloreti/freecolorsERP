# Auditoria comparativa ERP FreeColors

Fecha: 2026-04-29

Objetivo: llevar el ERP de FreeColors desde "pantallas que funcionan" a una herramienta operativa real para pintureria: mostrador rapido, control de caja, stock confiable, permisos, auditoria y flujos que aguanten empleados, errores humanos y cierres diarios.

## Referencias usadas

- Odoo POS: sesiones de venta, cash in/out, cierre de caja, conteo esperado vs contado por metodo de pago.
- Odoo Inventory: codigos de barra, lotes/series, operaciones obligatorias u opcionales por tipo de movimiento.
- ERPNext: libro contable y stock ledger inmutables, anulaciones por reversa en vez de borrar o reescribir historia.
- Microsoft Business Central: usuarios por permisos/permission sets, grupos de seguridad y deshabilitacion de acceso conservando trazabilidad.
- Zoho Inventory: roles con aprobacion de transacciones y permisos especificos para aprobar, editar o eliminar.

## Estado actual del ERP FreeColors

Lo que ya esta encaminado:

- Modulos base: ventas/mostrador, documentos, productos, stock, clientes, proveedores, cuenta corriente, listas de precio, reportes y perfil.
- Modelo Prisma bastante sano para arrancar: stock por movimientos, documentos con estados, pagos, cuenta corriente derivada por entradas.
- Roles base: OWNER, ADMIN, EMPLOYEE, READONLY.
- Login por red local funcionando en celular mediante API route de Next y cookies seteadas por servidor.
- Usuarios owner con alta, edicion y desactivacion.
- Descuento global convertido a porcentaje.

Riesgos actuales:

- Hay duplicacion visible de rutas: `proveedores` y `proovedores`.
- Los roles son demasiado gruesos. Un empleado puede necesitar vender, pero no editar precios, anular documentos, tocar stock o aplicar descuentos altos.
- Falta cierre de caja diario: apertura, movimientos de caja, esperado, contado, diferencia, responsable y auditoria.
- Falta auditoria transversal: quien cambio precio, quien anulo, quien ajusto stock, quien aplico descuento.
- Falta flujo de aprobaciones para operaciones sensibles.
- En celular entra, pero el uso todavia no esta optimizado para pulgar, escaneo rapido y pantallas chicas.

## Comparacion por area

### 1. Seguridad y permisos

ERP avanzado:

- Business Central usa permission sets y grupos; el acceso se asigna por responsabilidad, no solo por rol general.
- ERPNext permite permisos por documento y accion: leer, crear, editar, cancelar, enviar.
- Zoho agrega permisos de aprobacion para transacciones.

FreeColors hoy:

- Tiene roles base pero no permisos finos.
- Owner ya administra usuarios, pero no hay matriz de capacidades.

Brecha:

- Crear permisos como acciones: `sales.create`, `sales.discount.apply`, `sales.discount.override`, `documents.cancel`, `stock.adjust`, `prices.update`, `cash.close`, `users.manage`.
- Agregar limites por rol: descuento maximo, monto maximo de venta sin aprobacion, anulacion con motivo obligatorio.

Prioridad: alta.

### 2. Mostrador y descuentos

ERP avanzado:

- Odoo POS permite cerrar sesion, contar caja, agrupar pagos y controlar diferencias.
- Modulos Odoo de descuento suelen separar porcentaje/fijo y limitar por usuario/rol.

FreeColors hoy:

- Mostrador tiene busqueda, cliente, documento, pago, descuento global y lineas.
- Descuento global ya paso a porcentaje.

Brecha:

- Falta permiso para descuento.
- Falta limite por usuario/rol.
- Falta motivo obligatorio para descuento alto.
- Falta vista de venta mobile tipo caja: buscador arriba, items editables simples, total fijo abajo, botones grandes de pago.

Prioridad: alta.

### 3. Caja diaria y cierres

ERP avanzado:

- Odoo POS abre sesion con saldo inicial, registra cash in/out, cuenta cierre, compara esperado vs contado y deja diferencia.

FreeColors hoy:

- Hay pagos en documentos, pero no hay entidad de caja/sesion.

Brecha:

- Crear `CashSession`: apertura, cierre, usuario, estado.
- Crear `CashMovement`: venta, ingreso manual, egreso manual, retiro, diferencia.
- Al confirmar venta contado, asociar pago a sesion abierta.
- Bloquear ventas contado si no hay caja abierta.

Prioridad: muy alta.

### 4. Stock y trazabilidad

ERP avanzado:

- ERPNext hace ledger inmutable: cancelar genera reversas, no borra historia.
- Odoo Inventory usa codigos de barra, lotes/series y reglas por tipo de operacion.

FreeColors hoy:

- Buen principio: stock basado en movimientos.
- Documentos confirmados generan stock.

Brecha:

- Falta impedir ajustes sin motivo y sin permiso.
- Falta auditoria de stock por usuario.
- Falta conteo fisico/ciclo.
- Falta flujo mobile para escanear producto y ajustar/consultar stock.
- Para pintureria, lotes pueden importar para productos vencibles, partidas, aerosoles o tintas.

Prioridad: alta.

### 5. Documentos, anulaciones y aprobaciones

ERP avanzado:

- ERPNext no elimina entradas contables/stock al cancelar: crea reversas.
- Zoho permite roles de aprobador y permisos especificos para aprobar, editar y borrar transacciones.

FreeColors hoy:

- Documentos tienen DRAFT, CONFIRMED, CANCELLED.
- Hay cancelacion en API, pero falta revisar si exige motivo, permiso y reversa completa auditable.

Brecha:

- Anular siempre con motivo.
- No borrar documentos confirmados.
- Crear `ApprovalRequest` para descuento alto, anulacion, ajuste de stock, cambio de precio y venta bajo costo.
- Historial visible dentro del documento.

Prioridad: alta.

### 6. Experiencia mobile

ERP avanzado:

- POS reales priorizan 3 cosas en mobile: velocidad, pocos campos por paso, acciones grandes.

FreeColors hoy:

- Entra por celular, pero varias pantallas nacieron desktop-first.

Brecha:

- Mostrador mobile deberia ser casi una app de caja:
  - Buscar/escanear.
  - Lista de items.
  - Total fijo.
  - Cobrar.
  - Cliente opcional.
- Perfil/usuarios/reportes pueden quedar secundarios.
- Tablas grandes deben transformarse en cards accionables.

Prioridad: media-alta.

## Roadmap recomendado

### Fase 1 - Control operativo minimo serio

1. Permisos finos y matriz por rol.
2. Caja diaria: abrir, cerrar, cash in/out, diferencias.
3. Auditoria base: tabla de eventos para cambios sensibles.
4. Anulaciones con motivo y reversa.
5. Playwright: login mobile, venta contado, descuento, cierre de caja.

### Fase 2 - Mostrador profesional

1. Rediseño mobile del mostrador.
2. Descuento con limites por rol.
3. Pago mixto: efectivo + transferencia + cuenta corriente.
4. Tickets/recibos imprimibles.
5. Busqueda por codigo de barra.

### Fase 3 - Stock confiable

1. Conteo fisico y ajustes con aprobacion.
2. Transferencias entre depositos.
3. Alertas de bajo stock.
4. Historial por producto con origen de cada movimiento.
5. Lotes/partidas donde aplique.

### Fase 4 - Administracion avanzada

1. Compras y recepcion de proveedores.
2. Costos y margen por lista de precio.
3. Reportes de rentabilidad.
4. Importacion/exportacion con validaciones.
5. Tablero owner: caja, ventas, margen, stock critico, deuda clientes.

## Primeras implementaciones sugeridas

Orden recomendado:

1. Crear permisos finos sin romper roles actuales.
2. Crear auditoria central `AuditLog`.
3. Crear caja diaria `CashSession` y `CashMovement`.
4. Conectar ventas contado a caja abierta.
5. Agregar pruebas Playwright mobile.

Este orden baja riesgo y cambia la sensacion del sistema: de "pantallas CRUD" a "operacion controlada".
