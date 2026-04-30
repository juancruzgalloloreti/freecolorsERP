# Stack actualizado del proyecto

Ultima revision: 2026-04-29

## Resumen

FreeColors ERP es un monorepo TypeScript con frontend Next.js, API NestJS y capa de datos Prisma/PostgreSQL. El workspace se maneja con pnpm y Turbo.

## Monorepo y runtime

- Package manager: pnpm 10.33.2
- Runtime: Node.js >= 20
- Orquestacion: Turbo
- Lenguaje principal: TypeScript
- Workspaces:
  - `apps/web`: frontend web
  - `apps/api`: API REST
  - `packages/db`: Prisma schema, Prisma Client y utilidades de base

## Frontend

- Framework: Next.js 16.2.4 con App Router
- UI runtime: React 19.2.4 y React DOM 19.2.4
- Estilos: Tailwind CSS 4, `@tailwindcss/postcss`, `tailwind-merge`, `tw-animate-css`
- Componentes: shadcn/ui sobre Radix UI
- Iconos: lucide-react
- Estado y datos:
  - TanStack Query 5
  - Axios para llamadas HTTP
  - TanStack Table 8 para tablas
  - js-cookie para cookies en cliente
- Utilidades de importacion/exportacion: xlsx
- Testing E2E: Playwright
- Linting: ESLint 9 con `eslint-config-next`

## Backend

- Framework: NestJS 10
- API: REST versionada con prefijo `/api/v1`
- Documentacion: Swagger/OpenAPI habilitado fuera de produccion en `/docs`
- Configuracion: `@nestjs/config` con variables de entorno
- Validacion: `class-validator`, `class-transformer` y `ValidationPipe` global
- Seguridad:
  - Helmet
  - CORS con `FRONTEND_URL`
  - Rate limiting con `@nestjs/throttler`
  - JWT con `@nestjs/jwt`
  - Passport local y Passport JWT
  - Hashing con bcrypt/bcryptjs
- Compresion HTTP: compression
- Jobs/colas disponibles: pg-boss
- Modulos de negocio actuales:
  - auth
  - audit
  - cash
  - common
  - current-account
  - customers
  - documents
  - price-lists
  - products
  - reports
  - sales-orders
  - stock
  - suppliers

## Base de datos

- Motor: PostgreSQL
- ORM: Prisma 5.20
- Cliente Prisma generado desde `packages/db/prisma/schema.prisma`
- Deploy recomendado: Neon u otro PostgreSQL administrado
- Modelo de datos:
  - Multi-tenant con `Tenant`
  - Usuarios y roles por tenant
  - Catalogo de productos, categorias y marcas
  - Stock basado en movimientos inmutables
  - Documentos comerciales, items y pagos
  - Pedidos de venta
  - Clientes, proveedores y cuenta corriente derivada por movimientos
  - Caja diaria
  - Auditoria
  - Listas de precio y coeficientes
- Prisma Client incluye targets para desarrollo local, Debian/Ubuntu y Alpine Docker.

## Infraestructura y deploy

- Frontend:
  - Deploy recomendado: Vercel apuntando a `apps/web`
  - Usa rewrites de Next para enviar `/api/*` al backend mediante `API_INTERNAL_URL`
- Backend:
  - Deploy recomendado: servicio Node separado en Render, Railway, Fly.io, VPS o Docker
  - Dockerfile actual compila y ejecuta solo `apps/api`
  - Puerto por defecto: 3001
- Base:
  - PostgreSQL remoto via `DATABASE_URL`

## Variables de entorno

Frontend (`apps/web/env.example`):

- `NEXT_PUBLIC_API_URL`: URL publica de la API. Puede quedar vacia para usar `/api` relativo.
- `API_INTERNAL_URL`: URL interna que Next usa para el rewrite hacia la API.
- `NEXT_PUBLIC_TENANT_SLUG`: slug del tenant activo.

Backend (`apps/api/env.example`):

- `DATABASE_URL`: conexion PostgreSQL.
- `JWT_SECRET`: secreto para firmar JWT.
- `FRONTEND_URL`: origenes permitidos para CORS, separados por coma si hay mas de uno.
- `PORT`: puerto HTTP de la API.
- `NODE_ENV`: entorno de ejecucion.

## Comandos principales

- `pnpm dev:web`: levanta el frontend.
- `pnpm dev:api`: genera/compila `@erp/db` y levanta Nest en watch mode.
- `pnpm build`: genera Prisma Client, compila DB, API y frontend.
- `pnpm build:api`: compila DB y API.
- `pnpm build:web`: compila frontend.
- `pnpm lint`: ejecuta lint/typecheck de web y API.
- `pnpm db:generate`: regenera Prisma Client.
- `pnpm db:seed`: carga datos base.

## Puertos locales

- Web: `http://localhost:3000`
- API: `http://localhost:3001/api/v1`
- Swagger: `http://localhost:3001/docs`

## Notas tecnicas

- El frontend y la API estan desacoplados para deploy independiente.
- El backend usa validacion estricta con `whitelist` y `forbidNonWhitelisted`.
- La cuenta corriente se calcula desde movimientos, no desde un saldo editable.
- El stock se calcula desde movimientos inmutables, lo que favorece auditoria y trazabilidad.
- El Dockerfile esta orientado al backend; el frontend tiene camino propio para Vercel.
