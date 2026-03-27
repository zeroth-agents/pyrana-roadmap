# User Assignment for Ideas & Initiatives

**Date:** 2026-03-27
**Status:** Approved

## Summary

Add a `users` table to capture Entra ID users on login, link them to Linear identities via sync, and enable single-owner assignment on both initiatives and ideas. Assignment is purely informational (no permission implications). Linear project lead overwrites local assignee on sync. Idea assignees carry over when promoted to initiatives.

## Data Model

### New `users` table

| Column          | Type                      | Notes                                              |
|-----------------|---------------------------|----------------------------------------------------|
| `id`            | uuid (PK)                 | `defaultRandom()`                                  |
| `entra_oid`     | text, unique, not null    | Microsoft Entra object ID — stable user identifier |
| `name`          | text, not null            | Display name from Entra                            |
| `email`         | text, nullable            | From session; PAT users may not have it            |
| `linear_user_id`| text, nullable, unique    | Links to their Linear identity                     |
| `created_at`    | timestamptz, not null     | First login                                        |
| `updated_at`    | timestamptz, not null     | Last login / name change                           |

**Upsert on login:** After resolving an Entra session in `getUser()`, call a new `upsertUser(oid, name, email?)` helper that inserts or updates the users row. Fire-and-forget (same pattern as existing `lastUsedAt` update on PATs). Also upsert for PAT-authenticated users (they have `userOid` and `userName` in the tokens table). This ensures all authenticated users end up in the `users` table regardless of auth method.

### New columns on existing tables

- `initiatives.assignee_id` — uuid FK to `users.id`, nullable, `onDelete: 'set null'`
- `ideas.assignee_id` — uuid FK to `users.id`, nullable, `onDelete: 'set null'`

Existing text fields (`createdBy`, `createdByName`, `authorId`, `authorName`, `linearProjectLead`, `linearAssignee`) remain untouched as denormalized audit data.

## API Changes

### New endpoints

| Method  | Route              | Purpose                                                        |
|---------|--------------------|----------------------------------------------------------------|
| `GET`   | `/api/users`       | List all users (for assignee picker). Returns `id`, `name`, `email`, `linearUserId` |
| `PATCH` | `/api/users/[id]`  | Update a user's `linear_user_id` (manual linking from settings)|

### Modified endpoints

- `POST /api/initiatives` — `CreateInitiativeSchema` gains `assigneeId: z.string().uuid().optional()`
- `PATCH /api/initiatives/[id]` — `UpdateInitiativeSchema` gains `assigneeId: z.string().uuid().nullable().optional()`
- `POST /api/ideas` — `CreateIdeaSchema` gains `assigneeId: z.string().uuid().optional()`
- `PATCH /api/ideas/[id]` — `UpdateIdeaSchema` gains `assigneeId: z.string().uuid().nullable().optional()`
- `POST /api/ideas/[id]/promote` — carries `assigneeId` from the idea to the new initiative
- `GET /api/ideas` and `GET /api/initiatives` — response includes `assigneeId` + joined `assigneeName` from the users table

### User capture

New `upsertUser(oid, name, email?)` helper in `src/lib/user-utils.ts`, called from `getUser()` after successful Entra session resolution. Fire-and-forget.

## Linear Sync

### User matching (new step in sync flow)

1. Fetch Linear team members via existing `getTeamMembers()`
2. For each Linear member, query `users` where `name ILIKE linear_member.name` OR `email = linear_member.email`
3. On match, set `linear_user_id` on the users row
4. Skip already-linked users. Log unmatched members.

### Initiative assignment (addition to existing sync)

When processing each Linear project:
- Existing: write `linear_project_lead` as text
- New: look up `users` by `linear_user_id` matching the project lead's Linear ID. If found, set `assignee_id`. If not found, leave `assignee_id` unchanged.

### Edge cases

- **Name collision** — two Entra users match the same Linear member name. Log a warning, skip auto-linking. User can manually link in settings.
- **User renames** — Entra name updates on next login (upsert). Linear name updates on next sync. The `linear_user_id` link is ID-based, so it persists through renames.
- **Linear member leaves** — `linear_user_id` stays on the users row. Initiatives they owned keep `assignee_id`. No automatic unassignment.
- **Manual override** — if someone manually assigns an initiative to a different user, the next Linear sync will overwrite it. Linear is the source of truth for initiative assignment.

## UI Changes

### Reusable `<AssigneeSelect>` component

- Fetches from `GET /api/users`
- Select dropdown (same pattern as existing Linear issue assignee picker in `initiative-detail.tsx`)
- Shows initials avatar + name for each option, plus "Unassigned"
- On change, PATCHes the item

### Placement

1. **Initiative cards** (`initiative-card.tsx`) — small initials avatar in the corner showing assignee (if set)
2. **Initiative detail panel** (`initiative-detail.tsx`) — `<AssigneeSelect>` in metadata section alongside lane/size/pillar. Replaces read-only "Project Lead" badge when assignee is set.
3. **Idea cards** (`idea-card.tsx`) — small assignee initials badge next to author badge (visually distinct)
4. **Idea detail/edit** — `<AssigneeSelect>` dropdown

### Filtering

Both board view and ideas page gain assignee filtering:
- "My items" quick filter
- Full assignee dropdown filter

## Migration & Rollout

**Single Drizzle migration:**
1. Create `users` table
2. Add `assignee_id` column (nullable FK) to `initiatives`
3. Add `assignee_id` column (nullable FK) to `ideas`

**No backfill:** Users populate organically on login. A manual Linear sync after deploy links Linear identities and sets assignees on existing initiatives.

**No breaking changes:** All new fields are nullable/additive. Old text fields stay untouched.

## Testing

- Unit tests for `upsertUser` helper
- Unit tests for Linear user matching logic (exact match, name collision, no match)
- API tests for assignment CRUD on initiatives and ideas
- API test for promote-with-assignee carry-over
- Integration test for Linear sync setting `assignee_id`
