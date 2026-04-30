FreeColors ERP
==============

Monorepo pnpm con frontend Next.js, API NestJS y base Prisma/PostgreSQL.

Stack actualizado:

- Ver `docs/stack.md`.

Comandos principales:

- `pnpm dev:web`: levanta el frontend en localhost.
- `pnpm dev:api`: levanta la API NestJS.
- `pnpm build`: compila API y frontend.
- `pnpm db:generate`: regenera Prisma Client.
- `pnpm db:seed`: carga datos base.

Deploy recomendado:

- Vercel: solo frontend `apps/web`.
- API NestJS: servicio Node separado (Render, Railway, Fly.io, VPS o Docker).
- Base de datos: PostgreSQL/Neon con `DATABASE_URL`.
- Guia completa: `docs/deploy.md`.

Variables frontend:

- `NEXT_PUBLIC_API_URL`: URL publica de la API, sin `/api/v1`.
- `NEXT_PUBLIC_TENANT_SLUG`: slug del tenant.
- `NEXT_PUBLIC_UI_MODE`: `modern` o `legacy` para elegir modo visual por defecto.

Variables API:

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `PORT`
- `NODE_ENV`
