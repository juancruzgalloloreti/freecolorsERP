# Deploy FreeColors ERP

El monorepo esta preparado para desplegar el frontend y la API por separado.

## Frontend en Vercel

Crear el proyecto de Vercel usando `apps/web` como Root Directory. El archivo `apps/web/vercel.json` ya instala desde la raiz del monorepo y compila solo el frontend.

Variables necesarias:

```env
NEXT_PUBLIC_API_URL=https://freecolors-erp-api.onrender.com
API_INTERNAL_URL=https://freecolors-erp-api.onrender.com
NEXT_PUBLIC_TENANT_SLUG=pintureria-demo
NEXT_PUBLIC_UI_MODE=modern
```

`NEXT_PUBLIC_API_URL` y `API_INTERNAL_URL` deben ir sin `/api/v1`.

Settings recomendados en Vercel:

- Framework Preset: Next.js
- Root Directory: `apps/web`
- Install Command: `cd ../.. && corepack enable && pnpm install --frozen-lockfile`
- Build Command: `cd ../.. && corepack enable && pnpm --filter web build`
- Output Directory: `.next`

## API NestJS en Render Free

La raiz del repo incluye `render.yaml` y `Dockerfile` para desplegar la API en Render como Web Service Docker.

Settings recomendados si lo creas manualmente:

- Service Type: Web Service
- Environment: Docker
- Plan: Free
- Root Directory: dejar vacio
- Dockerfile Path: `./Dockerfile`
- Docker Context: `.`
- Health Check Path: `/api/v1/health`

Variables necesarias:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=un-secreto-largo-y-unico
FRONTEND_URL=https://tu-frontend.vercel.app
PORT=3001
NODE_ENV=production
```

`FRONTEND_URL` acepta varias URLs separadas por coma si hace falta habilitar preview y produccion.

El Dockerfile hace este build desde la raiz:

```bash
pnpm install --frozen-lockfile
pnpm --filter @erp/db db:generate
pnpm --filter @erp/db build
pnpm --filter @erp/api build
```

Y arranca:

```bash
node apps/api/dist/main.js
```

## Base PostgreSQL

Para el primer deploy, aplicar el schema antes de usar el sistema:

```bash
pnpm --filter @erp/db db:push
pnpm --filter @erp/db db:seed
```

Despues del seed, si queres empezar limpio para cargar productos reales, ejecutar el reset controlado solo con la variable de confirmacion:

```bash
CONFIRM_RESET_FREECOLORS=RESET node scripts/reset-tenant-data.cjs
```

En produccion no ejecutes reset salvo que tambien declares `ALLOW_PRODUCTION_RESET=true`.
