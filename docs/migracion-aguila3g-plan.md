# Plan de migracion Aguila3G -> FreeColors ERP

Fecha: 2026-05-16

## Objetivo

Migrar FreeColors desde Aguila3G hacia el ERP nuevo sin acceso directo al MySQL remoto del proveedor, sin modificar datos en Aguila y con validacion suficiente para que el sistema nuevo pueda operar ventas, stock, caja, cuenta corriente y compras con confianza.

El plan separa tres trabajos distintos:

1. Extraccion segura desde Aguila3G.
2. Normalizacion y mapeo hacia el modelo del ERP nuevo.
3. Carga validada en PostgreSQL con reconciliacion contra reportes del legacy.

## Contexto confirmado

- ERP legacy: `C:\aguila3g`.
- Ejecutable activo esperado: `4247Aguila3G.exe`.
- Base legacy: MySQL remoto del proveedor Aguila3G, sin credenciales disponibles.
- Acceso permitido: pantalla `Definicion de consultas` dentro de Aguila3G, que acepta `SELECT` y exporta CSV.
- ERP nuevo: `C:\Users\ten\Desktop\ERP`.
- Documentacion repo: `C:\Users\ten\Desktop\ERP\docs`.
- Obsidian: `C:\Users\ten\obsidian\proyectos\ERP`.
- Documento base de extraccion: `C:\Users\ten\Downloads\codex-master-prompt-datos-estaticos.md`.

## Principios

- No conectarse directo al MySQL remoto del proveedor.
- No ejecutar `INSERT`, `UPDATE`, `DELETE`, `SHOW` ni operaciones administrativas en Aguila.
- Extraer primero datos maestros, despues saldos/movimientos historicos.
- Toda carga al ERP nuevo debe ser repetible, auditable y reversible en entorno de prueba.
- No borrar datos transaccionales en el ERP nuevo; usar import batches, estados y trazabilidad.
- No copiar la UI de Aguila literalmente: Aguila es fuente de reglas y datos, no de diseno.

## Alcance por etapas

### Etapa 0 - Preparacion

Entregables:

- Carpeta local de migracion fuera del repo productivo, por ejemplo `C:\Users\ten\Desktop\aguila3g_migration`.
- Python Windows nativo verificado.
- Dependencias `pywinauto` y `pywin32` instaladas.
- Aguila3G abierto con usuario operativo.
- Smoke test de conexion UIA contra la ventana `Menu principal`.

Criterio de aceptacion:

- Un script minimo puede conectarse a Aguila y listar ventanas sin cerrar ni reiniciar la app.

### Etapa 1 - Extraccion de datos maestros estaticos

Prioridad: maxima.

Tablas iniciales:

- Productos y precios: `stproductos`, `stproductosmasdatos`, `stmarcas`, `stclasificaciones`, `stclasificacionsimple`, `stdefclasifproducto`, `stlistaprecios`, `stprecios`, `stprecioespecialcliente`, `stprecioxcantidad`, `stdeflp`, `stproductosproveedores`, `stproductoproveedorcosto`, `stdepositos`.
- Clientes/proveedores/geografia: `empresas`, `domicilios`, `localidades`, `regiones`, `paises`, `zonas`, `cc`.
- Configuracion operativa: `cajas`, `monedas`, `monedacotizacion`, `admdefcomprobante`, `admdefoperaciones`, `admtbbancos`, `admtbtarjetas`, `usuarios`, `ueusuarios`, `sucursales`, `admun`, `stmovimientotipo`, `parametrossistema`, `parametrosvarios`, `numeradores`.

Entregables:

- CSV crudo por tabla en `raw/`.
- CSV limpio por tabla en `output/`.
- `REPORTE_EXTRACCION.md` con filas, columnas, errores y timestamp.
- Log completo de automatizacion.

Criterio de aceptacion:

- Smoke test con `monedas`.
- Export completo de Grupo A productos/precios.
- Al menos 3 tablas validadas manualmente contra Aguila.
- Caracteres con acentos y enie preservados.
- Reejecucion sin duplicar definiciones de consulta o con limpieza controlada.

### Etapa 2 - Perfilado y diccionario de datos

Objetivo: entender forma, calidad y relaciones antes de transformar.

Entregables:

- `data-profile.md` con conteo de filas, columnas, nulos, duplicados y campos candidatos a clave.
- `legacy-data-dictionary.md` con descripcion de columnas por tabla.
- Lista de datos problematicos: CUIT invalido, codigos duplicados, productos sin precio, stock negativo, clientes/proveedores mezclados, listas sin nombre, monedas historicas.

Criterio de aceptacion:

- Cada tabla maestra tiene clave legacy identificada.
- Cada tabla maestra tiene decision: migrar, derivar, archivar o descartar.
- No se transforma nada sin saber cual es la clave de identidad.

### Etapa 3 - Mapeo hacia modelo nuevo

Mapeo inicial esperado:

| Aguila3G | ERP nuevo | Notas |
|---|---|---|
| `stproductos` | `products` | `code`, `name`, `description`, `unit`, `taxRate`, costos, estado activo. |
| `stproductosmasdatos` | `products` / extension futura | Solo migrar campos con uso operativo claro; archivar resto si no hay destino. |
| `stmarcas` | `brands` | Normalizar nombres y deduplicar por tenant. |
| `stclasificaciones`, `stclasificacionsimple` | `categories` | Definir si se usa arbol o categoria plana. |
| `stdepositos` | `deposits` | Marcar deposito principal. |
| `stlistaprecios`, `stdeflp` | `price_lists` | Respetar listas fijas LP1-LP5/CR/CU del ERP nuevo. |
| `stprecios` | `price_list_items` | Precio final operativo; confirmar si viene con o sin IVA por lista. |
| `stproductosproveedores`, `stproductoproveedorcosto` | `supplier_products` + costos en `products` | Conservar codigo/nombre proveedor y ultimo costo. |
| `empresas` | `customers` y `suppliers` | Separar por uso real o tipo si existe; puede duplicar entidad como cliente y proveedor. |
| `domicilios`, `localidades`, `regiones`, `paises`, `zonas` | campos de direccion en `customers`/`suppliers` | El ERP nuevo tiene direccion plana; guardar detalle no mapeado en `notes` o staging. |
| `cc` | `current_account_entries` o saldo inicial | No importar como saldo editable; generar asiento inicial reconciliable. |
| `numeradores` | `document_sequences` | Validar punto de venta, tipo y proximo numero antes de operar. |
| `admdefcomprobante` | `DocumentType` + configuracion owner | No copiar toda la flexibilidad legacy si no se entrega al cliente. |
| `admtbbancos`, `admtbtarjetas` | referencia para pagos/cheques | Puede requerir tablas nuevas si se vuelve operativo. |
| `usuarios`, `ueusuarios` | `users`, roles y permisos | Migrar solo usuarios vigentes; forzar cambio de password. |

Entregables:

- `mapping-aguila-to-erp.md`.
- Scripts de transformacion por dominio.
- CSV/JSON staging canonico por entidad del ERP nuevo.

Criterio de aceptacion:

- Cada campo obligatorio del ERP nuevo tiene fuente o valor por defecto justificado.
- Cada campo legacy sin destino queda documentado.
- Precios, costos y stock tienen regla de IVA/decimales explicita.

### Etapa 4 - Carga piloto en entorno de prueba

Orden recomendado:

1. Tenant, usuario owner y permisos.
2. Depositos.
3. Marcas y categorias.
4. Proveedores.
5. Clientes.
6. Productos.
7. Relaciones proveedor-producto.
8. Listas de precio e items.
9. Numeradores y puntos de venta.
10. Saldos iniciales de stock y cuenta corriente, si ya fueron extraidos y reconciliados.

Entregables:

- Script `import:aguila:pilot` o equivalente.
- `migration_batches` o registro equivalente de lote, origen, timestamp y resumen.
- Reporte de carga con insertados, actualizados, omitidos y errores.

Criterio de aceptacion:

- Reejecutar la carga piloto no duplica productos, clientes, proveedores ni precios.
- El ERP nuevo permite buscar productos y clientes migrados.
- Un subconjunto de ventas de prueba usa precios correctos y deposito correcto.

### Etapa 5 - Movimientos historicos y saldos

No iniciar hasta cerrar Etapas 1 a 4.

Bloques:

- Stock: movimientos o saldo inicial por deposito.
- Cuenta corriente: saldos pendientes, vencidos, pagos y ajustes.
- Caja/valores/cheques: cartera vigente primero; historico despues.
- Documentos: ventas/compras historicas por rango de fecha.

Decision pendiente:

- Para arranque operativo, puede convenir migrar maestros + saldos iniciales + documentos pendientes, y dejar historico completo como archivo consultable o carga posterior.

Criterio de aceptacion:

- Stock por deposito reconciliado contra Aguila.
- Cuenta corriente por cliente reconciliada contra Aguila.
- Caja/cheques vigentes reconciliados antes del corte.

### Etapa 6 - Corte operativo

Checklist:

- Backup del ERP nuevo antes de importar.
- Ultima extraccion Aguila con hora de corte.
- Congelar carga de datos en Aguila o definir ventana sin operaciones.
- Import final.
- Reconciliacion de totales criticos.
- Prueba de venta real controlada.
- Plan de rollback: volver a operar en Aguila si falla el corte.

## Validaciones clave

Productos:

- Codigos unicos por tenant.
- Productos sin nombre o codigo se bloquean.
- IVA detectado y documentado.
- LP1-LP5/CR/CU respetan regla del ERP nuevo.
- Costos con 4 decimales.

Clientes/proveedores:

- CUIT normalizado cuando exista.
- Duplicados por CUIT y por razon social revisados.
- Condicion IVA mapeada a `IvaCondition`.
- Direccion y localidad conservadas.

Stock:

- No cargar stock por update directo en producto.
- Usar movimientos de ajuste inicial por deposito.
- Registrar motivo y lote de migracion.

Cuenta corriente:

- No cargar saldo editable.
- Generar asientos iniciales o movimientos historicos.
- Reconciliar por cliente antes de operar.

Documentos/numeradores:

- No emitir documentos reales hasta validar `document_sequences`.
- Proximo numero por tipo y punto de venta debe coincidir con Aguila o con decision de corte.

## Riesgos

| Riesgo | Mitigacion |
|---|---|
| Automatizacion UI fragil | Smoke test con tabla chica, logs, reintentos y pausa entre acciones. |
| CSV exportado con formato irregular | Cleaner con tests y conservacion de `raw/`. |
| Precios con/sin IVA mezclados | Perfilado por lista y validacion con productos conocidos. |
| Empresas mezclan clientes y proveedores | Separar por flags/uso; si no, crear ambos con misma fuente legacy. |
| Codigos duplicados | Reportar y resolver antes de import final. |
| Stock historico muy grande | Arrancar con saldo inicial reconciliado; historico despues. |
| Numeradores incorrectos | Validacion manual antes de primera venta real. |
| Corte sin rollback | Mantener Aguila operativo hasta prueba real exitosa en ERP nuevo. |

## Primera semana recomendada

Dia 1:

- Preparar entorno Python Windows.
- Crear extractor incremental.
- Smoke test `monedas`.

Dia 2:

- Exportar Grupo A productos/precios.
- Limpiar CSVs.
- Perfilar columnas y conteos.

Dia 3:

- Exportar clientes/proveedores/geografia.
- Detectar duplicados y calidad de CUIT/direcciones.

Dia 4:

- Exportar configuracion operativa: depositos, numeradores, comprobantes, usuarios.
- Escribir primer `mapping-aguila-to-erp.md`.

Dia 5:

- Construir staging canonico de productos, marcas, categorias, depositos y listas.
- Carga piloto en base de prueba.
- Validacion manual en UI del ERP nuevo.

## Proxima accion concreta

Crear el extractor fuera del repo productivo con esta estructura:

```text
C:\Users\ten\Desktop\aguila3g_migration
  config.py
  extractor.py
  cleaner.py
  profiler.py
  requirements.txt
  run-smoke.bat
  raw\
  output\
  logs\
```

El primer objetivo no es exportar todo: es demostrar de punta a punta `monedas -> CSV crudo -> CSV limpio -> reporte`.
