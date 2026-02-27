# Architecture

## System Context

```mermaid
C4Context
  title HouseDuty Heroes — System Context
  Person(parent, "Parent", "Manages duties, kids, review submissions")
  Person(kid, "Kid", "PIN login, submits completed duties, spends reward points")
  System(app, "HouseDuty Heroes", "Family chore tracker PWA")
  System_Ext(db, "PostgreSQL", "Persistent data store")
  System_Ext(storage, "File Storage", "local disk / S3 / Supabase — photo proofs")
  System_Ext(redis, "Redis", "Cache / future job queue")

  Rel(parent, app, "Uses (browser / installed PWA)")
  Rel(kid, app, "Uses (browser / installed PWA)")
  Rel(app, db, "Prisma ORM")
  Rel(app, storage, "Photo upload / delete")
  Rel(app, redis, "Cache reads")
```

## Container Diagram

```mermaid
C4Container
  title HouseDuty Heroes — Containers
  Person(parent, "Parent")
  Person(kid, "Kid")

  Container(client, "React PWA", "Vite · React 18 · TypeScript · Tailwind", "SPA served on :5173 (dev) or static CDN (prod)")
  Container(server, "Express API", "Node.js · TypeScript · Express 4", "REST API on :4000")
  ContainerDb(db, "PostgreSQL 16", "Relational DB", "All domain data")
  ContainerDb(redis, "Redis 7", "In-memory store", "Cache / queues")
  Container(storage_local, "Local Disk / uploads/", "File system", "Dev only")
  Container(storage_cloud, "S3 or Supabase Storage", "Object store", "Production")

  Rel(parent, client, "HTTPS")
  Rel(kid, client, "HTTPS")
  Rel(client, server, "REST/JSON · /api/*")
  Rel(client, storage_local, "Static files · /uploads/*")
  Rel(server, db, "Prisma")
  Rel(server, redis, "ioredis")
  Rel(server, storage_local, "multer · fs")
  Rel(server, storage_cloud, "AWS SDK / Supabase JS (prod)")
```

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | |
| Styling | Tailwind CSS 3 | Custom brand palette in `tailwind.config.js` |
| State | Zustand | `authStore` + per-screen local state |
| PWA | vite-plugin-pwa | Service worker, offline NetworkFirst cache |
| Routing | React Router v6 | Protected routes for PARENT / KID roles |
| Backend | Node.js + Express 4 + TypeScript | `tsx` for dev, compiled for prod |
| ORM | Prisma 5 | Migrations in `packages/server/prisma/` |
| Database | PostgreSQL 16 | Docker locally, any managed PG in cloud |
| Auth | JWT (parents) + bcrypt PIN (kids) | `jsonwebtoken` + `bcryptjs` |
| Validation | Zod | Request body parsing on all routes |
| File upload | multer (v1 → upgrade to v2 recommended) | |
| Storage | Abstract provider pattern | `STORAGE_PROVIDER=local|s3|supabase` |
| Cache | Redis 7 | Docker locally, Redis Cloud / Upstash in prod |
| Monorepo | npm workspaces | `packages/server` + `packages/client` |
| Infra (local) | Docker Compose | `docker-compose.yml` |

## Deployment Topology (Cloud-ready)

```mermaid
graph TD
    subgraph Cloud
      CDN[CDN / Vercel / Netlify\nReact static build]
      API[API Server\nRailway / Fly.io / Render\nNode + Express]
      PG[(Managed PostgreSQL\nNeon / Supabase / Railway)]
      RD[(Redis\nUpstash / Redis Cloud)]
      S3[(Object Storage\nS3 / Supabase Storage)]
    end
    Browser -->|HTTPS| CDN
    CDN -->|API calls /api/*| API
    API --> PG
    API --> RD
    API --> S3
```

### Environment variables to swap for production

```
DATABASE_URL=postgresql://...       # managed PG connection string
JWT_SECRET=<strong-random>
STORAGE_PROVIDER=s3                 # or supabase
S3_BUCKET=houseduty-photos
S3_REGION=us-east-1
REDIS_URL=redis://...
CLIENT_URL=https://yourapp.com
PHOTO_RETENTION_DAYS=30
```
