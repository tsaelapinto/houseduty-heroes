# HouseDuty Heroes — Changelog & Feature Specifications

## Session 4 — Cycle Date Pickers, Inline Edit, `once_per_cycle`, Assignment Fix

### Date: 2025-01
### Git base: `948447a`

---

### Feature: Cycle start/end date pickers (replaces duration dropdown)

**Request:** "cycles - have to add specific dates from, to"

**Changes:**
- `packages/client/src/screens/ParentDashboard.tsx`
  - Removed `cycleStartDays: number` state
  - Added `cycleStartDate: string` (default = today, ISO format) and `cycleEndDate: string` (default = today + 7)
  - "No active cycle" panel now shows two `<input type="date">` fields (From / To) instead of a days dropdown
  - `handleStartCycle` passes `{ startAt: cycleStartDate, endAt: cycleEndDate }` instead of `durationDays`
- `packages/server/src/routes/cycles.ts` — `POST /cycles/start`
  - Now accepts optional `startAt` and `endAt` body fields (ISO date strings)
  - When provided, explicit dates override the `durationDays` / household frequency default
  - `finalDuration` computed from date diff when explicit dates are given

---

### Feature: Inline edit active cycle dates

**Request:** "🔄 Current Cycle 3/1/2026 → 3/8/2026 - should be editable. should be able to edit the dates of a cycle, using date picker"

**Changes:**
- `packages/client/src/screens/ParentDashboard.tsx`
  - Added state: `editingCycleDates`, `cycleEditStart`, `cycleEditEnd`, `savingCycleDates`
  - Active cycle date row shows `✏️ Edit dates` button; clicking pre-fills date pickers and shows Save/Cancel
  - `handleSaveCycleDates` calls new `PATCH /cycles/active/dates` endpoint
- `packages/server/src/routes/cycles.ts` — new `PATCH /cycles/active/dates`
  - Body: `{ householdId, startAt, endAt }`
  - Deletes ASSIGNED instances outside the new [startAt, endAt) window
  - If endAt extended → generates new DutyInstances for added tail days (reuses existing template+kid pairs with correct recurrence)
  - Updates `cycle.startAt` and `cycle.endAt` in DB

---

### Feature: `once_per_cycle` frequency option

**Request:** "add the frequency of once in a cycle"

**Changes:**
- `packages/client/src/screens/ParentDashboard.tsx` line ~45
  - Added `'once_per_cycle'` to `RECURRENCE_OPTIONS` array
- `packages/client/src/i18n/en.ts` — added `once_per_cycle: 'Once / cycle'`
- `packages/client/src/i18n/he.ts` — added `once_per_cycle: 'פעם במחזור'`
- Backend `recurrenceDays()` already handled `once_per_cycle` (same as `weekly`: first day of cycle only)

---

### Bug Fix: Assignment screen shows stale assignments after unassign

**Request:** "there is a bug - when editing the duty assignment - leaving the screen and coming back - it wasnt saved"

**Root Cause:**
`GET /cycles/assignments` fetched ALL `DutyInstance` rows in the cycle, including past `MISSED` ones. When a user unassigns a template+kid pair (which deletes only future ASSIGNED instances), the past MISSED instances still existed, so the endpoint reported the pair as "still assigned" on the next load.

**Fix:**
- `packages/server/src/routes/cycles.ts` — `GET /cycles/assignments`
  - Changed `where: { cycleId: cycle.id }` → `where: { cycleId: cycle.id, status: { not: 'MISSED' } }`
  - Only non-MISSED instances count toward the current assignment matrix

**Note on AssignmentScreen auto-save:** The AssignmentScreen (`packages/client/src/screens/AssignmentScreen.tsx`) already auto-saves on every toggle (calls `POST /cycles/assign-template` or `DELETE /cycles/unassign-template` immediately). No explicit Save button is needed — the apparent "not saved" experience was entirely caused by the stale data bug above.

---

## Session 3 — MISSED Status

### Date: 2025-01
### Commit: `948447a`

**Features:**
- `sweepMissed()` helper marks past ASSIGNED duty instances as MISSED (lazy, called on reads)
- `GET /cycles/active`, `GET /cycles/timeline`, `GET /kids/:id/cycle-detail` all call `sweepMissed` before returning
- `kidSummaries` now includes `missed` count
- UI: red `❌ N missed` badge on kid cards in ParentDashboard
- Timeline: MISSED rows show strikethrough + red text + `❌ Missed` badge

---

## Session 2 — Cycle Timeline

### Date: 2025-01
### Commit: `67c88c9`

**Features:**
- New `GET /cycles/timeline?householdId=X` endpoint: all days in active cycle × all kids × duty instances per day
- Full-screen timeline modal in ParentDashboard: day-by-day accordion, inline Approve button, progress bar
- Deployed to both prod services

---

## Session 1 — Foundation & Prod Stabilisation

### Commit: `83903ac`

- All 5 E2E tests passing against production
- Mobile layout fixed, logout pinned bottom
- SPA rewrite rule applied on Render for client routing
- Test hero `Hero1772...` cleanup (prod contamination fixed in `a62f3e1`)

---

## Architecture Notes

- **Production Client:** https://app.harelitos.com (Render Static)
- **Production API:** https://api.harelitos.com (Render Web)
- **Prod credentials:** `tsaela@gmail.com / 123456`
- **Household:** `581ee99c-6a53-4fe6-9d4d-267ef9bd23dd`
- **Stack:** React + Vite + TailwindCSS (client) · Express + Prisma + PostgreSQL (server)
- **Auth:** JWT in localStorage, `Authorization: Bearer <token>` header

## Recurrence Options

| Key | En label | He label | Behaviour |
|---|---|---|---|
| `daily` | Every day | כל יום | Every day of cycle |
| `weekdays` | Mon–Fri | א׳–ה׳ | Mon–Fri only |
| `weekends` | Sat–Sun | ו׳–שב׳ | Sat–Sun only |
| `3x` | Mon·Wed·Fri | א׳·ג׳·ה׳ | mon/wed/fri |
| `2x` | Tue·Thu | ב׳·ד׳ | tue/thu |
| `weekly` | Once / week | פעם בשבוע | First day of cycle only |
| `once_per_cycle` | Once / cycle | פעם במחזור | First day of cycle only |
