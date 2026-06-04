# Informe tecnico - migracion XLSX historico

Fecha: 2026-06-04

Archivo analizado: `/home/ten/Downloads/Freecolors - Completo al 04 de Junio.xlsx`

## Conclusiones ejecutivas

La migracion es viable, pero no debe cargarse como "movimientos operativos completos" sin una etapa de staging y normalizacion. El archivo no trae detalle de items/productos por comprobante: trae cabeceras o resumen financiero/operativo por comprobante. Por eso sirve bien para conservar historico de comprobantes, caja/cuenta corriente y ajustes, pero no alcanza por si solo para reconstruir stock por producto ni lineas de venta/compra.

El volumen de 56.104 filas es pequeno para PostgreSQL. Para la base actual representa un salto grande relativo, porque hoy esta casi vacia, pero no es grande en terminos tecnicos.

Nivel de confianza para produccion:

- Alto para cargar a staging y reportes historicos: 85%.
- Medio para convertir a documentos/caja/cuenta corriente operativa: 65%, condicionado a reglas de signo y mapeo de tipos.
- Bajo para reconstruir stock por producto desde este XLSX solamente: 25%, porque no hay `productId`, codigo de producto, cantidades ni deposito por item.

## Arquitectura observada

El ERP es un monorepo TypeScript con:

- Frontend Next.js.
- API NestJS.
- Prisma ORM.
- PostgreSQL como base.

Evidencia:

- `docs/stack.md` declara Next.js, NestJS, Prisma y PostgreSQL.
- `packages/db/prisma/schema.prisma` define `datasource db` con provider `postgresql`.
- El schema declara principios correctos para migracion historica: stock inmutable por movimientos, cuenta corriente derivada por `SUM(amount)`, multi-tenant y documentos con snapshots.

Modelos relevantes:

- `products`: catalogo, codigos unicos por tenant, costos y precios base.
- `stock_movements`: movimientos inmutables por producto/deposito.
- `documents`, `document_items`, `document_taxes`: comprobantes, items e impuestos.
- `payments`, `cash_movements`: pagos y caja.
- `current_account_entries`: cuenta corriente derivada.
- `customers` y `suppliers`: terceros.

## Estado real de la base

Consulta de solo lectura a PostgreSQL:

| Tabla | Filas actuales |
|---|---:|
| tenants | 1 |
| users | 2 |
| products | 63 |
| customers | 32 |
| suppliers | 8 |
| documents | 68 |
| document_items | 68 |
| stock_movements | 94 |
| current_account_entries | 8 |
| payments | 32 |
| cash_movements | 80 |
| price_lists | 7 |
| price_list_items | 47 |
| audit_logs | 178 |

Tamanos reales:

| Objeto | Tamano |
|---|---:|
| Base completa | 15 MB |
| stock_movements | 208 kB |
| documents | 200 kB |
| document_items | 88 kB |
| current_account_entries | 96 kB |

## Volumen esperado

56.104 registros es un volumen pequeno para PostgreSQL.

Estimacion de espacio:

- Si se carga 1 fila XLSX = 1 fila staging con JSON/raw + columnas normalizadas: 20 a 60 MB incluyendo indices.
- Si se convierte a `documents` + `payments`/`cash_movements`/`current_account_entries`: 60 a 180 MB, segun cuantas filas generen movimientos auxiliares.
- Si se agregan `document_taxes` y auditoria por fila: 100 a 250 MB.
- Aun en el peor caso razonable, la base seguiria en cientos de MB, no GB.

La base soporta comodamente este volumen. El riesgo principal no es almacenamiento; es calidad de datos, mapeo funcional y consultas/reportes que agregan en memoria.

## Indices y rendimiento

Los indices reales de PostgreSQL estan bien para las consultas principales:

- `documents`: indices por tenant/fecha, tenant/status/fecha, tenant/type/fecha, tenant/customer/status y unique por tenant/PV/tipo/numero.
- `stock_movements`: indices por tenant/product/deposit, tenant/product/createdAt, tenant/deposit/createdAt, tenant/type/createdAt.
- `current_account_entries`: indices por tenant/date, tenant/customer/date, tenant/type/date.
- `products`: unique tenant/code e indices por barcode, categoria y marca.
- `customers`: unique parcial por tenant/cuit cuando cuit no es null.

Riesgos detectados:

- `ReportsService.salesSummary()` trae documentos con includes y agrupa en TypeScript. Para 56k no deberia romper, pero para rangos historicos completos puede degradar.
- `ReportsService.management()` trae documentos, items, pagos, cuenta corriente y productos en memoria. Conviene mover agregaciones pesadas a SQL.
- `ReportsService.stock()` trae todos los productos y agrupa stock completo. Esta bien con pocos miles de productos, pero debe paginarse o agregarse en SQL si crece.
- Busquedas con `contains`/`insensitive` en productos/clientes no tienen indice trigram. Con decenas de miles de productos o clientes convendria `pg_trgm`.

## Perfil del XLSX

Archivo: 4.436.942 bytes.

Hojas:

- 1 hoja: `Hoja 1`.
- Rango: `A1:X56105`.
- Filas de datos: 56.104.
- Columnas: 24.
- Duplicados de fila completa: 0.
- Duplicado por clave compuesta de comprobante: 1 caso.
- Encabezado duplicado: `wPercGcias` aparece 2 veces.

Columnas:

1. `NombreDefComprobante`
2. `FechaComprobante`
3. `TipoComprobante`
4. `LetraComprobante`
5. `PVComprobante`
6. `NumeroComprobante`
7. `RazonSocialComprobante`
8. `DomicilioComprobante`
9. `LocalidadComprobante`
10. `CondIVAComprobante`
11. `CuitComprobante`
12. `ProvinciaComprobante`
13. `wCaja`
14. `wCtaCte`
15. `wNeto`
16. `wIVA`
17. `wPercIIBB`
18. `wRetIIBB`
19. `wPercGcias`
20. `wRetRecibidas`
21. `wPercIVA`
22. `wImpuestoInterno`
23. `wPercGcias`
24. `wOtros`

Rango de fechas:

- Minima: 2022-05-06.
- Maxima: 2026-06-04.
- Fechas invalidas: 0.

Distribucion por ano:

| Ano | Filas |
|---|---:|
| 2022 | 11.903 |
| 2023 | 17.420 |
| 2024 | 13.102 |
| 2025 | 10.243 |
| 2026 | 3.436 |

Tipos principales:

| NombreDefComprobante | Filas |
|---|---:|
| Factura Presupuesto | 41.236 |
| Ajuste de Inventario Negativo | 3.513 |
| Ajuste de Inventario Positivo | 2.662 |
| Transferencias Presupuesto | 1.995 |
| Recibos Presupuestos | 1.967 |
| Pagos Presupuesto | 926 |
| NC Presupuestos | 901 |
| Factura Proveedores Pres, | 891 |
| Transferencia de Valores | 715 |
| Factura Proveedores | 649 |
| Pagos | 481 |
| Factura Manual | 76 |
| Transferencia entre Depositos | 60 |

Datos faltantes relevantes:

| Columna | Faltantes |
|---|---:|
| TipoComprobante | 6.235 |
| LetraComprobante | 1.569 |
| RazonSocialComprobante | 9.115 |
| DomicilioComprobante | 45.181 |
| LocalidadComprobante | 12.622 |
| CondIVAComprobante | 60 |
| CuitComprobante | 6.236 |
| ProvinciaComprobante | 9.770 |

CUIT:

- En blanco: 6.236.
- Placeholder: 39.151, principalmente `11111111` / `1111111`.
- Forma valida o usable: 10.652.
- Forma invalida no placeholder: 65.

Importes:

- `wCaja`: 566.140.353,09.
- `wCtaCte`: -51.385.661,63.
- `wNeto`: -631.443.889,48.
- `wIVA`: 103.794.245,77.
- `wPercIIBB`: 13.240.618,55.
- Filas con algun importe negativo: 47.094.
- Filas con todos los importes principales en cero: 8.997.

Observacion critica: los signos no son intuitivos. En muchas filas `wCaja`/`wCtaCte` tienen signo opuesto a `wNeto`/`wIVA`. No se debe importar sin definir por tipo de comprobante si el signo legacy debe invertirse.

## Mapeo recomendado

No recomiendo importar directo a las tablas finales. Primero crear staging.

Tabla nueva recomendada:

`legacy_movement_imports`

Campos minimos:

- `id`
- `tenantId`
- `batchId`
- `sourceFile`
- `sourceSheet`
- `sourceRow`
- `legacyDocumentName`
- `legacyDocumentType`
- `legacyLetter`
- `legacyPos`
- `legacyNumber`
- `documentDate`
- `customerNameRaw`
- `customerCuitRaw`
- `customerCuitNormalized`
- `ivaConditionRaw`
- `addressRaw`
- `cityRaw`
- `provinceRaw`
- `cashAmountRaw`
- `accountAmountRaw`
- `netAmountRaw`
- `vatAmountRaw`
- `perceptionIibbRaw`
- `perceptionIvaRaw`
- `otherAmountRaw`
- `rawJson`
- `mappedEntityType`
- `mappedEntityId`
- `status`
- `error`
- `createdAt`

Mapeo hacia tablas finales:

| XLSX | ERP nuevo | Comentario |
|---|---|---|
| FechaComprobante | documents.date / entries.date | Parsear `YYYYMMDD`. |
| NombreDefComprobante + TipoComprobante + LetraComprobante | documents.type / tipo historico | Requiere tabla de mapeo. |
| PVComprobante | puntos_de_venta.number | Crear PV legacy o mapear a PV interno. |
| NumeroComprobante | documents.number | Cuidado con unique tenant/PV/type/number. |
| RazonSocialComprobante | customers/suppliers.name o snapshot | Deducir cliente/proveedor por tipo. |
| CuitComprobante | cuit normalizado | `11111111` debe tratarse como null. |
| CondIVAComprobante | IvaCondition | RI, CF, MO, EXE. |
| wCaja | payments/cash_movements | Solo despues de validar signo por tipo. |
| wCtaCte | current_account_entries | Solo despues de validar signo por tipo. |
| wNeto, wIVA, percepciones | documents totals / document_taxes | No hay items. |

## Cambios recomendados antes de importar

1. Crear tablas de staging e import batches.
2. Agregar una tabla o enum de mapeo legacy de comprobantes para no hardcodear reglas.
3. Agregar campos de trazabilidad legacy a documentos o una tabla puente:
   - `legacySource`
   - `legacyDocumentName`
   - `legacyDocumentType`
   - `legacyLetter`
   - `legacyPos`
   - `legacyNumber`
   - `legacyRow`
4. Agregar indice unico defensivo para staging: tenant/batch/sourceSheet/sourceRow.
5. Agregar indice unico opcional para documentos historicos legacy, separado del numerador operativo.
6. Optimizar reportes que agregan en memoria si se van a consultar rangos completos de anos.
7. No mezclar estos datos con stock operativo por producto: faltan productos/items/cantidades.

## Proceso ETL recomendado

1. Importar XLSX a staging, conservando raw JSON por fila.
2. Validar:
   - encabezados esperados;
   - encabezado duplicado `wPercGcias`;
   - fechas;
   - CUIT normalizado;
   - reglas de signo por tipo;
   - duplicados por clave legacy;
   - filas con importes en cero;
   - tipos sin mapeo.
3. Generar reporte de errores y no insertar finales si hay errores bloqueantes.
4. Crear/actualizar terceros:
   - CUIT real como clave fuerte;
   - razon social normalizada como clave debil;
   - placeholders `11111111` como consumidor final/null.
5. Insertar documentos historicos sin items detallados o con un item sintetico "Historico legacy" solo si el negocio acepta esa representacion.
6. Insertar impuestos/percepciones en `document_taxes`.
7. Insertar pagos/caja y cuenta corriente segun reglas aprobadas.
8. Reconciliar totales por ano, tipo, PV y condicion IVA.
9. Marcar batch como aprobado.
10. Ejecutar import final en una transaccion por lotes, no una unica transaccion de 56k filas.

## Dificultad y tiempo

Dificultad estimada: media.

Motivos:

- El volumen es bajo.
- La base soporta bien el volumen.
- El modelo ERP tiene tablas adecuadas.
- El archivo no tiene detalle de items/productos.
- Hay reglas contables/de signo que deben validarse manualmente.

Tiempo aproximado:

- Perfilado y reglas finales: 0,5 a 1 dia.
- Staging + parser + validaciones: 1 a 2 dias.
- Mapeo a documentos/pagos/CC: 2 a 4 dias.
- Reconciliacion y ajustes: 1 a 3 dias.
- Total realista: 4 a 8 dias habiles para una migracion confiable.

## Riesgos

| Riesgo | Severidad | Mitigacion |
|---|---|---|
| Signos de importes mal interpretados | Alta | Reconciliar por tipo y ano antes de importar finales. |
| Falta detalle de items/productos | Alta | Importar como historico financiero, no como reconstruccion de stock. |
| CUIT placeholder masivo | Media | Normalizar `11111111` como null/consumidor final. |
| Encabezado duplicado `wPercGcias` | Media | Renombrar internamente a `wPercGcias_1` y `wPercGcias_2`. |
| Duplicado de comprobante | Baja | Resolver 1 caso detectado antes de final. |
| Reportes en memoria | Media | Agregaciones SQL para rangos historicos. |
| Unique de documentos por PV/tipo/numero | Media | Usar tipo historico separado o campo legacy si hay colisiones. |

## Veredicto

La migracion es viable.

Antes de importar haria estos cambios:

1. Staging obligatorio con batch y raw JSON.
2. Tabla de mapeo legacy de tipos/comprobantes.
3. Trazabilidad legacy en documentos o tabla puente.
4. Reglas de signo aprobadas con muestras reales.
5. Optimizacion de reportes historicos pesados.

Confianza para produccion: 70% hoy. Subiria a 85-90% despues de cargar staging, validar reglas de signo y reconciliar totales contra reportes del sistema anterior.
