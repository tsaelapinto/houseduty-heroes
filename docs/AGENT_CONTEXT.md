# HouseDuty Heroes — Agent Context & Session Continuity File

> **Purpose:** Paste this file into any new AI session to restore full project context instantly.  
> **Last updated:** February 27, 2026  
> **Project root:** `C:\harelitops_standalone`

---

## 1. What This Project Is

**HouseDuty Heroes** is a family chore tracker Progressive Web App (PWA).  
- **Parents** manage duties, kids, weekly cycles, and approve submissions.  
- **Kids** log in with a PIN, see their assigned chores, submit photo proofs, and spend earned points in a rewards shop.  
- Stack: React 18 + Vite (client) / Node.js + Express 4 (server) / Prisma + PostgreSQL / Redis / TypeScript throughout.  
- Monorepo: `packages/server` + `packages/client` managed via npm workspaces.

---

## 2. Architecture (Summary)

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS 3 |
| State | Zustand (`authStore` + local per-screen state) |
| PWA | vite-plugin-pwa (service worker, offline NetworkFirst cache) |
| Routing | React Router v6 (role-protected: PARENT / KID) |
| Backend | Node.js + Express 4 + TypeScript (`tsx` dev, compiled prod) |
| ORM | Prisma 5 — migrations in `packages/server/prisma/` |
| Database | PostgreSQL 16 (Docker locally, managed PG in cloud) |
| Auth | JWT for parents · bcrypt PIN for kids |
| Validation | Zod on all request bodies |
| File upload | multer (v1; upgrade to v2 recommended) |
| Storage | Abstract provider: `STORAGE_PROVIDER=local\|s3\|supabase` |
| Cache | Redis 7 (Docker locally, Upstash in prod) |
| Infra (local) | `docker-compose.yml` at root |

Full C4 diagrams: [`docs/architecture.md`](architecture.md)

---

## 3. Domain / Data Model (Key Entities)

```
Household → Users (PARENT | KID)
         → DutyTemplates (name, defaultPoints, photoRequired, allowedKids[])
         → Cycles (PENDING → ACTIVE → CLOSED)
              → DutyInstances (per kid × per day × 7 days)
                   → Submission (optional photo)
                   → Approval (pointsAwarded)
UnlockableItem (AVATAR | STICKER | THEME | TITLE)
UserUnlock (kid unlocks item with points)
PhotoAsset (storageProvider, storagePath, deleteAt)
```

Full ERD: [`docs/data-model.md`](data-model.md)

---

## 4. Core Business Logic

### Cycle Lifecycle
`PENDING → ACTIVE → CLOSED`  
Starting a new cycle auto-closes the current one. 7 DutyInstances created per kid per template per day.

### Assignment Modes (POST `/cycles/start`)
- **same** — copy last cycle's kid→template mapping
- **rotate** — round-robin circular advance per template's `allowedKids` list
- **manual** — explicit `[{ templateId, kidId }]` array in request body

### Duty Instance States
`ASSIGNED → SUBMITTED → APPROVED` (reject → back to ASSIGNED, future feature)

### Points
Cumulative `SUM(Approval.pointsAwarded)` per kid. Used to unlock rewards.  
`availablePoints = totalPoints − spentPoints`

### Photo Retention
`PhotoAsset.deleteAt = upload time + PHOTO_RETENTION_DAYS` (default 30). Cron cleanup job is a future task.

Full flow diagrams: [`docs/cycle-logic.md`](cycle-logic.md)

---

## 5. API Surface (All Implemented Routes)

Base: `http://localhost:4000/api` | Auth header: `Authorization: Bearer <JWT>`

| Group | Routes |
|---|---|
| **Auth** | POST `/auth/register`, POST `/auth/parent/login`, POST `/auth/kid/login`, GET `/auth/me` |
| **Household** | GET `/household`, GET `/household/today` |
| **Kids** | GET/POST `/kids`, PATCH `/kids/:id/pin`, GET `/kids/:id/points`, GET `/kids/:id/streak` |
| **Duties** | GET/POST `/duties/templates`, PATCH/DELETE `/duties/templates/:id`, GET `/duties/instances`, POST `/duties/instances/:id/submit`, POST `/duties/instances/:id/approve`, POST `/duties/instances/batch-approve` |
| **Cycles** | GET `/cycles/active`, POST `/cycles/start` |
| **Rewards** | GET `/rewards/catalogue`, GET `/rewards/kid/:id`, POST `/rewards/unlock` |
| **Uploads** | POST `/uploads/photo`, DELETE `/uploads/photo/:id` |

Full request/response shapes: [`docs/api-reference.md`](api-reference.md)

---

## 6. Implementation Status

### ✅ Done (server — `packages/server/src/`)
- `index.ts` — Express app bootstrap, middleware stack, static `/uploads` serving
- `db/prisma.ts` — Prisma client singleton
- `middleware/` — `auth.ts`, `upload.ts`, `errorHandler.ts`
- `routes/auth.ts` — register, parent login, kid login (name+PIN), add-kid, /me
- `routes/household.ts` — GET household, GET today
- `routes/kids.ts` — CRUD kids, PIN reset, points, streak (**now filters by `?householdId=`**)
- `routes/duties.ts` — templates CRUD, instances list, submit, approve, batch-approve
- `routes/cycles.ts` ✅ **NEW** — GET `/cycles/active` (with per-kid summary), POST `/cycles/start` (same/rotate/manual modes)
- `routes/rewards.ts` ✅ **NEW** — GET `/rewards/catalogue`, GET `/rewards/kid/:id`, POST `/rewards/unlock`
- `routes/uploads.ts` ✅ **NEW** — POST `/uploads/photo` (multer local), DELETE `/uploads/photo/:id`
- `prisma/schema.prisma` — full schema
- `prisma/seed.ts` — seed data

### ⚠️ Still Missing (server)
- Storage provider abstraction (`s3 | supabase`) — local disk only right now
- Redis caching integration — stub only
- Photo cleanup cron job — future
- Reject duty (SUBMITTED → ASSIGNED) — future

### ✅ Done (client — `packages/client/src/`)
- `vite.config.ts` ✅ **PWA enabled** — `vite-plugin-pwa` with manifest, service worker, offline NetworkFirst cache
- `public/icon.svg` ✅ **NEW** — PWA app icon (gradient house)
- `api/client.ts` ✅ **UPGRADED** — uses `VITE_API_BASE_URL` env, added `patch`, `delete`, `uploadPhoto`
- `main.tsx`, `App.tsx` ✅ **UPDATED** — routes: `/`, `/login`, `/kid-select`, `/rewards`
- `store/useAuthStore.ts` — Zustand auth store
- `screens/LoginScreen.tsx` ✅ **UPDATED** — Kid Hero tab now navigates to `/kid-select`
- `screens/ParentDashboard.tsx` ✅ **UPDATED** — passes `householdId` to `/kids` query
- `screens/KidHeroView.tsx` ✅ **UPDATED** — ⭐ Rewards button in header
- `screens/KidSelectorScreen.tsx` ✅ **NEW** — avatar grid + mobile PIN pad with auto-submit
- `screens/RewardsShopScreen.tsx` ✅ **NEW** — points banner + grouped catalogue + unlock flow

### ⚠️ Still Missing (client)
- Cycle Management screen (start cycle, mode selector) — NOT YET CREATED
- Duty Templates management screen — NOT YET CREATED
- Photo capture / upload UI — NOT YET CREATED
- Streak / gamification display — NOT YET CREATED

### ✅ Done (testing)
- `packages/server/src/__tests__/` — integration tests (Jest + supertest)
- `tests/` at root — Playwright e2e scaffold (`playwright.config.ts`)

---

## 7. Key Design Decisions (Record)

| Decision | Choice | Reason |
|---|---|---|
| Kids don't have email/password | 4–6 digit PIN only | UX for children; parent manages account |
| JWT for parents, PIN for kids | Separate login flows | Different security model per role |
| Cycle = 7 DutyInstances per template×kid | Pre-generate on cycle start | Simple query for "today's duties" |
| `photoRequired` is per-template, overridable per-instance | `photoRequiredOverride` on DutyInstance | Flexibility without schema changes |
| Points = SUM of approvals, never a stored total | Computed on fetch | Avoids sync bugs |
| Storage abstracted behind `STORAGE_PROVIDER` env | `local\|s3\|supabase` | Dev runs locally, prod plugs in S3 |
| Monorepo with npm workspaces | Two packages | Shared types possible in future `packages/shared` |

---

## 8. Environment Variables

### Server (`packages/server/.env`)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/houseduty
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
STORAGE_PROVIDER=local          # local | s3 | supabase
UPLOAD_DIR=./uploads            # local only
PHOTO_RETENTION_DAYS=30
PORT=4000
```

### Client (`packages/client/.env`)
```
VITE_API_BASE_URL=http://localhost:4000/api
```

Template: `.env.example` at root.

---

## 9. Running the Project

```bash
# Start DB + Redis
docker-compose up -d

# Install deps
npm install

# Run migrations + seed
npm run db:migrate
npm run db:seed

# Start dev (both client + server with hot reload)
npm run dev

# Tests
npm run test:integration   # Jest (server)
npm run test:e2e           # Playwright
```

Client: http://localhost:5173  
Server: http://localhost:4000/api  
Prisma Studio: `npm run db:studio`

---

## 10. Immediate Next Steps (Backlog)

1. **Create `routes/cycles.ts`** — GET `/cycles/active`, POST `/cycles/start` (all 3 assignment modes)
2. **Create `routes/rewards.ts`** — catalogue, kid summary, POST unlock
3. **Create `routes/uploads.ts`** + storage provider abstraction (`local|s3|supabase`)
4. **Client: Kid Selector screen** — list kids, then redirect to PIN pad
5. **Client: Approvals screen** — list pending, single approve + batch approve
6. **Client: Cycle Management screen** — mode selector, start cycle button
7. **Client: Rewards Shop screen** — browse catalogue, unlock button
8. **Client: Duty Templates screen** — CRUD for parent
9. **Integrate Redis caching** — cache household/today response
10. **PWA offline test** — verify service worker NetworkFirst works

---

## 11. File Map (Quick Reference)

```
harelitops_standalone/
├── docs/
│   ├── AGENT_CONTEXT.md       ← YOU ARE HERE
│   ├── architecture.md        ← C4 diagrams, tech stack table
│   ├── data-model.md          ← Full ERD + Prisma schema narrative
│   ├── cycle-logic.md         ← State machines, assignment modes, points flow
│   ├── user-flows.md          ← Parent journey, Kid journey flowcharts
│   └── api-reference.md       ← All endpoints with request/response examples
├── packages/
│   ├── server/
│   │   ├── prisma/schema.prisma
│   │   ├── prisma/seed.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── db/prisma.ts
│   │       ├── middleware/auth.ts, upload.ts, errorHandler.ts
│   │       ├── routes/auth.ts, household.ts, kids.ts, duties.ts
│   │       └── __tests__/
│   └── client/
│       └── src/
│           ├── main.tsx, App.tsx, index.css
│           ├── api/
│           ├── store/authStore.ts
│           └── screens/LoginScreen.tsx, ParentDashboard.tsx, KidHeroView.tsx
├── docker-compose.yml
├── playwright.config.ts
└── package.json               ← npm workspaces root
```

---

## 11. Testing Policy  Playwright Against Production

### Rule: every new feature ships with a production E2E test

| What | How |
|---|---|
| Config | `playwright.prod.config.ts`  `baseURL: https://app.harelitos.com` |
| Run | `npm run test:prod` (or `npm run test:prod -- --grep "<suite>"`) |
| Household isolation | Each test run self-provisions throwaway households via the register API using `Date.now()` emails. No shared test data files. |
| Assertions | Use `data-testid` attributes wherever possible. Avoid asserting on translated strings. |
| Files | One spec file per feature area in `tests/e2e/*.spec.ts`. |

### Dedicated test-data pattern
```typescript
const ts = Date.now();
const regResp = await request.post('https://api.harelitos.com/api/auth/register', {
  data: { name: 'Test Parent', email: `test-${ts}@test.com`, password: 'testpass1' },
});
const { user } = await regResp.json();
// scope all further data to user.householdId
```

### Pre-load localStorage before page load
```typescript
await page.addInitScript((hid) => {
  localStorage.setItem('knownHouseholdId', hid);
}, user.householdId);
await page.goto('/kid-select');
```

### Key data-testid catalogue
| Element | testid |
|---|---|
| Login screen root | `login-screen` |
| Parent dashboard root | `parent-dashboard` |
| Kid hero view root | `kid-hero-view` |
| Assignment screen root | `assignment-screen` |
| Logout button | `btn-logout` |
| Invite partner button | `btn-invite-partner` |
| Assignments nav | `btn-assign-screen` |
