# FreeColors ERP

ERP web para pintureria con frontend Next.js, API NestJS y PostgreSQL via Prisma. El proyecto esta organizado como monorepo pnpm y esta pensado para desplegar frontend, backend y base de datos por separado.

## Estado Actual

Validado localmente con build y smoke test Playwright:

- Login real por UI.
- Navegacion por Dashboard, Ventas, Compras, Documentos, Productos, Stock, Clientes, Proveedores, Cuenta Corriente, Caja, Listas de Precio, Reportes y Pedidos.
- Alta de cliente, proveedor y producto desde la UI.
- API health y conexion DB.

Estado recomendado: usable para beta interna/controlada. Antes de venderlo como ERP final conviene cerrar el flujo completo venta -> pago -> caja -> stock -> documento y la integracion fiscal AFIP/CAE.

## Arquitectura

- `apps/web`: frontend Next.js 16, React 19, Tailwind 4, TanStack Query, Axios y Playwright.
- `apps/api`: API REST NestJS 10 con Swagger, JWT, CORS, Helmet, throttling e idempotencia para mutaciones.
- `packages/db`: Prisma schema, Prisma Client y exports compartidos.
- `docs`: documentacion tecnica complementaria.
- `scripts`: utilidades operativas, incluido reset controlado de datos del tenant.

API local:

- Web: `http://localhost:3000`
- API: `http://localhost:3001/api/v1`
- Swagger dev: `http://localhost:3001/docs`

## Modulos Principales

- Autenticacion multi-tenant con roles.
- Productos, marcas, categorias, listas de precio y coeficientes.
- Stock por movimientos inmutables.
- Clientes, proveedores y cuenta corriente.
- Ventas, compras, pedidos, documentos, pagos y caja.
- Auditoria y reportes.
- Importacion/exportacion CSV para clientes, proveedores y productos.
- Atajos globales, soporte de lector de codigo de barras y focus trap en modales criticos.

## Cambios Contables y de Seguridad Ya Incluidos

- Bloqueo transaccional con `pg_advisory_xact_lock` para recalculo de costo promedio.
- Secuencia atomica `DocumentSequence` para numeracion de documentos.
- Idempotency-Key en mutaciones para evitar doble envio accidental.
- FKs de tenant en pagos y cuenta corriente.
- FKs de `createdById` en modelos de auditoria/historial.
- Soporte de campos AFIP/CAE/QR en documentos a nivel de modelo.
- Normalizacion de formularios para evitar FKs vacias y errores silenciosos.

## Pendientes Criticos Antes de Produccion Comercial

- Integracion AFIP real para CAE, QR y modo contingencia.
- Prueba E2E completa de venta: producto -> carrito -> pago -> documento -> caja -> stock.
- Backups y restore probado de PostgreSQL.
- Observabilidad: logs persistentes, alertas, errores frontend y monitoreo de API.
- Migraciones controladas para produccion en lugar de depender de `db:push`.
- Revision de accesibilidad en formularios: varios labels son visuales y no estan conectados con `htmlFor`.

## Requisitos

- Node.js `>=20`
- pnpm `10.33.2`
- PostgreSQL compatible con Prisma, recomendado Neon/Postgres administrado

Instalacion:

```bash
corepack enable
pnpm install
```

## Variables De Entorno

No commitear secretos reales. Usar `.env` local o variables del proveedor de deploy.

### API

```env
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"
JWT_SECRET="secreto-largo-y-unico"
FRONTEND_URL="http://localhost:3000"
PORT=3001
NODE_ENV=development
```

`FRONTEND_URL` acepta varios origenes separados por coma.

### Web

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
API_INTERNAL_URL="http://localhost:3001"
NEXT_PUBLIC_TENANT_SLUG="pintureria-demo"
NEXT_PUBLIC_UI_MODE="modern"
```

Las URLs van sin `/api/v1`.

## Comandos

```bash
pnpm dev:web       # Next.js en localhost:3000
pnpm dev:api       # API NestJS en localhost:3001
pnpm build         # Prisma generate + DB package + API + web
pnpm build:api     # Solo DB package + API
pnpm build:web     # Solo web
pnpm lint          # Typecheck/lint configurado
pnpm db:generate   # Regenera Prisma Client
pnpm db:seed       # Carga tenant, usuario admin y datos base
```

Comandos Prisma directos:

```bash
pnpm --filter @erp/db db:push
pnpm --filter @erp/db db:migrate
pnpm --filter @erp/db db:studio
```

## Setup Local Rapido

```bash
corepack enable
pnpm install
pnpm --filter @erp/db db:push
pnpm db:seed
pnpm dev:api
pnpm dev:web
```

Credenciales de seed para desarrollo:

```text
Tenant: pintureria-demo
Email: admin@pintureria.com
Password: Admin1234!
```

## Deploy Recomendado

- Vercel para `apps/web`.
- Render, Railway, Fly.io, VPS o Docker para `apps/api`.
- Neon/PostgreSQL administrado para base.

Costos orientativos al 2026-04-30:

- Vercel Hobby es gratis pero oficial para uso personal/no comercial.
- Vercel Pro: USD 20/mes + uso adicional.
- Render Web Service Starter: USD 7/mes.
- DB paga: depende del proveedor; evitar depender de planes gratis para produccion con clientes.

Ver detalles en `docs/deploy.md`.

## Verificacion Manual Recomendada

Antes de lanzar una version:

```bash
pnpm build
```

Checklist funcional:

- Login.
- Crear cliente.
- Crear proveedor.
- Crear producto.
- Crear venta con producto.
- Confirmar pago.
- Ver impacto en caja.
- Ver impacto en stock.
- Ver documento generado.
- Exportar/importar CSV basico.

## Documentacion Complementaria

- `docs/stack.md`: stack tecnico detallado.
- `docs/deploy.md`: deploy Vercel/API/Postgres.
- `docs/data-cost-control.md`: control de costos y datos.
- `docs/erp-advanced-audit.md`: auditoria avanzada.
- `docs/aguila-parity-roadmap.md`: roadmap de paridad/alcance.
- `docs/codex-brief-freecolors-erp.md`: brief operativo y criterios de calidad para evolucionar el ERP.
- `SETUP.md`: historial de bugs de setup/login ya corregidos.
