---
name: PDAM Tracker Stack
description: Architecture and credential summary for the PDAM Tiara Material Tracking system
---

## Stack
- Frontend: `artifacts/pdam-tracker` (React + Vite), preview path `/`, port 23931
- API: `artifacts/api-server` (Express + TypeScript), preview path `/api`, port 8080
- DB: PostgreSQL via Drizzle ORM (`lib/db`)
- API client: orval-generated React Query hooks (`lib/api-client-react`)
- Zod validation: orval-generated server schemas (`lib/api-zod`)
- Auth: custom JWT (no Clerk/Replit auth). Tokens stored in localStorage, injected via `setAuthTokenGetter` in `lib/api-client-react/src/custom-fetch.ts`

## Roles
admin_gudang | petugas_lapangan | spi | direksi | superadmin

## Routing
Shared proxy at port 80 routes `/api/*` → 8080, everything else → 23931. No vite proxy needed.

## Seed credentials (password: password123)
- admin@pdam-tiara.id (superadmin)
- gudang@pdam-tiara.id (admin_gudang)
- lapangan1@pdam-tiara.id (petugas_lapangan, Cabang Praya)
- lapangan2@pdam-tiara.id (petugas_lapangan, Cabang Jonggat)
- spi@pdam-tiara.id (spi)
- direksi@pdam-tiara.id (direksi)

**Why:** Full custom RBAC was required per spec; Clerk/Replit auth were explicitly ruled out.
