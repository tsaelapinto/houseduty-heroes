# API Reference

Base URL (dev): `http://localhost:4000/api`  
All protected routes require: `Authorization: Bearer <JWT>`

---

## Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Create household + parent account |
| `POST` | `/auth/parent/login` | — | Parent email/password login |
| `POST` | `/auth/kid/login` | — | Kid PIN login |
| `GET` | `/auth/me` | ✅ | Get current user |

### POST `/auth/register`
```jsonc
// Request
{ "householdName": "The Smiths", "parentName": "Sarah", "email": "sarah@example.com", "password": "secret123" }
// Response 201
{ "token": "eyJ...", "user": { "id": "...", "name": "Sarah", "role": "PARENT" } }
```

### POST `/auth/parent/login`
```jsonc
// Request
{ "email": "sarah@example.com", "password": "secret123" }
// Response 200
{ "token": "eyJ...", "user": { "id": "...", "name": "Sarah", "role": "PARENT", "avatarSlug": "default" } }
```

### POST `/auth/kid/login`
```jsonc
// Request
{ "kidId": "uuid", "pin": "1234" }
// Response 200 — same shape as parent login, role = "KID"
```

---

## Household

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/household` | ✅ | Get household info + all members |
| `GET` | `/household/today` | ✅ | Today's duty instances + pending approval count |

---

## Kids

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/kids` | ✅ | List all kids in household |
| `POST` | `/kids` | ✅ Parent | Add a kid |
| `PATCH` | `/kids/:id/pin` | ✅ Parent | Reset kid's PIN |
| `GET` | `/kids/:id/points` | ✅ | Total approved points for a kid |
| `GET` | `/kids/:id/streak` | ✅ | Current consecutive-day completion streak |

### POST `/kids`
```jsonc
// Request
{ "name": "Daniel", "pin": "1234", "avatarSlug": "🦁" }
// Response 201
{ "id": "uuid", "name": "Daniel", "avatarSlug": "🦁" }
```

---

## Duties

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/duties/templates` | ✅ | All active templates for household |
| `POST` | `/duties/templates` | ✅ Parent | Create a duty template |
| `PATCH` | `/duties/templates/:id` | ✅ Parent | Update template |
| `GET` | `/duties/instances` | ✅ | Query instances (`?cycleId=&kidId=&date=`) |
| `POST` | `/duties/instances` | ✅ Parent | Create duty instances (bulk by dates) |

### POST `/duties/templates`
```jsonc
// Request
{ "name": "Make your bed", "defaultPoints": 10, "photoRequired": false, "allowedKidIds": ["uuid1", "uuid2"] }
// Response 201 — DutyTemplate object
```

### GET `/duties/instances?kidId=uuid&date=2026-02-26`
```jsonc
// Response 200 — array of DutyInstance with template, submission, approval included
```

---

## Cycles

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/cycles/active` | ✅ | Get current active cycle (or null) |
| `GET` | `/cycles` | ✅ | Last 10 cycles |
| `POST` | `/cycles/start` | ✅ Parent | Close current + start new cycle |
| `GET` | `/cycles/:id/summary` | ✅ | Per-kid stats for a cycle |

### POST `/cycles/start`
```jsonc
// Request (rotate mode)
{ "assignmentMode": "rotate" }

// Request (manual mode)
{ "assignmentMode": "manual", "manualAssignments": [
    { "templateId": "uuid-t1", "kidId": "uuid-k1" },
    { "templateId": "uuid-t2", "kidId": "uuid-k2" }
]}
// Response 201 — Cycle object
```

### GET `/cycles/:id/summary`
```jsonc
// Response 200
[
  { "kid": { "id": "...", "name": "Daniel", "avatarSlug": "🦁" }, "total": 14, "approved": 11, "points": 110 },
  { "kid": { "id": "...", "name": "Maya",   "avatarSlug": "🌸" }, "total": 14, "approved": 14, "points": 140 }
]
```

---

## Submissions

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/submissions/:dutyInstanceId` | ✅ | Submit a duty (multipart/form-data, `photo` field optional) |

### POST `/submissions/:id`
```
Content-Type: multipart/form-data
Fields:
  photo        (File, optional)
  syncPending  "true" | "false"  (optional, default false)
```

---

## Approvals

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/approvals/pending` | ✅ Parent | All SUBMITTED instances awaiting review |
| `POST` | `/approvals/:dutyInstanceId` | ✅ Parent | Approve single duty |
| `POST` | `/approvals/batch` | ✅ Parent | Approve multiple duties |

### POST `/approvals/:id`
```jsonc
// Request (optional point override)
{ "points": 15 }
// Response 201 — Approval object
```

### POST `/approvals/batch`
```jsonc
// Request
{ "dutyInstanceIds": ["uuid1", "uuid2", "uuid3"] }
// Response 200 — array of Approval objects
```

---

## Rewards

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/rewards` | ✅ | All unlockable items sorted by cost |
| `GET` | `/rewards/kid/:kidId` | ✅ | Kid's points summary + unlocks |
| `POST` | `/rewards/unlock` | ✅ | Spend points to unlock an item |

### GET `/rewards/kid/:kidId`
```jsonc
// Response 200
{
  "totalPoints": 250,
  "spentPoints": 50,
  "availablePoints": 200,
  "unlocks": [
    { "id": "...", "unlockedAt": "...", "item": { "id": "...", "name": "Lion", "type": "AVATAR", "slug": "🦁", "pointsCost": 50 } }
  ]
}
```

### POST `/rewards/unlock`
```jsonc
// Request
{ "itemId": "uuid" }
// Response 201 — UserUnlock object
```

---

## Error Responses

All errors follow:
```jsonc
{ "error": "Human-readable message" }
```

| Status | Meaning |
|---|---|
| `400` | Validation error (Zod) |
| `401` | Missing or invalid JWT |
| `403` | Insufficient role (e.g. kid accessing parent route) |
| `404` | Resource not found |
| `409` | Conflict (e.g. email already registered) |
| `500` | Internal server error |
