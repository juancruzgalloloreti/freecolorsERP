# freecolorsERP — Setup & Fix Guide

## ⚠️ Por qué no podías loguearte

Se encontraron y corrigieron **6 bugs**:

| # | Archivo | Bug | Impacto |
|---|---------|-----|---------|
| 1 | `packages/db/prisma/schema.prisma` | Sin `output` ni `binaryTargets` → el cliente generado committeado era sólo para **Windows** (`.dll.node`). En Linux/Mac, Prisma no podía iniciar. | 🔴 Crítico — login roto |
| 2 | `packages/db/src/index.ts` | Exportaba de `@prisma/client` (output default) en vez de `./generated/client` (output configurado). Enums tampoco exportados. | 🔴 Crítico — `UserRole`, `Plan`, etc. no disponibles |
| 3 | `apps/api/src/auth/auth.service.ts` | `findUnique({ where: { slug, isActive: true } })` — campo no-unique en `findUnique` puede fallar en ciertas versiones de Prisma. | 🔴 Crítico — login roto |
| 4 | `apps/api/src/common/prisma.service.ts` | SQL injection en `withTenant` via template string interpolada. | 🟠 Seguridad |
| 5 | `seed.ts` | Importaba directo de `./packages/db/src/generated/client` (binario Windows). El seed fallaba en Linux/Mac. | 🔴 Crítico — sin datos de prueba |
| 6 | `pnpm-workspace.yaml` | `allowBuilds: '@prisma/client': false` bloqueaba el `postinstall` que corre `prisma generate`. | 🟡 Developer experience |

---

## Setup desde cero

```bash
# 1. Instalar dependencias (ahora el postinstall genera el cliente Prisma)
pnpm install

# 2. Copiar env y configurar tu DATABASE_URL
cp apps/api/env.example apps/api/.env
# Editar apps/api/.env con tu URL de Neon/Postgres

# 3. Aplicar migraciones (o db push para dev)
pnpm --filter @erp/db db:push

# 4. Seed (crea tenant, usuario admin, datos base)
pnpm --filter @erp/db db:seed

# 5. Correr la API
pnpm --filter @erp/api dev
```

## Login de prueba

```
POST http://localhost:3001/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@pintureria.com",
  "password": "Admin1234!",
  "tenantSlug": "pintureria-demo"
}
```

Swagger disponible en: `http://localhost:3001/docs`

---

## Si ya tenés node_modules y querés sólo regenerar el cliente

```bash
pnpm --filter @erp/db db:generate
```

---

## Variables de entorno requeridas (`apps/api/.env`)

```env
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"
JWT_SECRET="cambia-esto-por-openssl-rand-hex-64"
FRONTEND_URL="http://localhost:3000"
PORT=3001
NODE_ENV=development
```
