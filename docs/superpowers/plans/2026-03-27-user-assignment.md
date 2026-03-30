# User Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `users` table, capture Entra users on login, link to Linear identities, and enable single-owner assignment on initiatives and ideas.

**Architecture:** New `users` table with Entra OID + optional Linear user ID. Fire-and-forget upsert on every auth call. `assignee_id` FK on both `initiatives` and `ideas`. Linear sync matches users by name/email and writes `assignee_id` from project lead. Reusable `<AssigneeSelect>` component for all assignment UI. Filtering by assignee on both board and ideas pages.

**Tech Stack:** Drizzle ORM (Postgres), Next.js 16 API routes, Zod validation, React 19 client components, Vitest

---

## File Structure

### New files
- `src/db/schema.ts` — add `users` table + `assigneeId` columns (modify)
- `src/lib/user-utils.ts` — `upsertUser()` helper
- `src/app/api/users/route.ts` — `GET /api/users`
- `src/app/api/users/[id]/route.ts` — `PATCH /api/users/:id`
- `src/components/assignee-select.tsx` — reusable assignee picker
- `__tests__/lib/user-utils.test.ts` — upsert tests
- `__tests__/api/users.test.ts` — users API tests
- `__tests__/api/ideas-assignment.test.ts` — idea assignment tests
- `__tests__/lib/linear-sync-users.test.ts` — sync user matching tests

### Modified files
- `src/db/schema.ts` — add `users` table, `assigneeId` FK on `initiatives` and `ideas`
- `src/types/index.ts` — add `assigneeId` to Zod schemas
- `src/lib/auth-utils.ts` — call `upsertUser()` after auth resolution
- `src/lib/linear-sync.ts` — add user matching step + set `assigneeId` on initiatives
- `src/lib/linear.ts` — add `leadId` to `LinearProjectSummary` (for sync matching)
- `src/app/api/initiatives/route.ts` — join `users` for `assigneeName` in GET, accept `assigneeId` in POST
- `src/app/api/initiatives/[id]/route.ts` — accept `assigneeId` in PATCH
- `src/app/api/ideas/route.ts` — join `users` for `assigneeName` in GET, accept `assigneeId` in POST
- `src/app/api/ideas/[id]/route.ts` — accept `assigneeId` in PATCH, return `assigneeName`
- `src/app/api/ideas/[id]/promote/route.ts` — carry `assigneeId` to new initiative
- `src/components/board/initiative-card.tsx` — show assignee avatar
- `src/components/initiative-detail.tsx` — add `<AssigneeSelect>`
- `src/components/ideas/idea-card.tsx` — show assignee avatar
- `src/components/ideas/idea-detail.tsx` — add `<AssigneeSelect>`
- `src/app/page.tsx` — add `assigneeId`/`assigneeName` to Initiative interface, add assignee filter
- `src/app/ideas/page.tsx` — add assignee filter
- `src/components/board/board-view.tsx` — add `assigneeId`/`assigneeName` to Initiative interface

---

### Task 1: Database Schema — Users Table + AssigneeId Columns

**Files:**
- Modify: `src/db/schema.ts:1-135`
- Test: `pnpm db:generate` (verify migration SQL)

- [ ] **Step 1: Write the failing test — verify schema compiles**

Run: `npx tsc --noEmit src/db/schema.ts`
Expected: PASS (baseline — schema compiles before changes)

- [ ] **Step 2: Add users table and assigneeId columns to schema**

In `src/db/schema.ts`, add the `users` table after the `commentTargetEnum` (before `pillars`):

```typescript
export const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey(),
  entraOid: text("entra_oid").notNull().unique(),
  name: text().notNull(),
  email: text(),
  linearUserId: text("linear_user_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

Add `assigneeId` column to `initiatives` table (after `linearSyncedAt`):

```typescript
  assigneeId: uuid("assignee_id").references(() => users.id, {
    onDelete: "set null",
  }),
```

Add `assigneeId` column to `ideas` table (after `linearProjectId`):

```typescript
  assigneeId: uuid("assignee_id").references(() => users.id, {
    onDelete: "set null",
  }),
```

- [ ] **Step 3: Verify schema compiles**

Run: `npx tsc --noEmit src/db/schema.ts`
Expected: PASS

- [ ] **Step 4: Generate Drizzle migration**

Run: `pnpm db:generate`
Expected: New migration file in `drizzle/` containing `CREATE TABLE users`, `ALTER TABLE initiatives ADD COLUMN assignee_id`, `ALTER TABLE ideas ADD COLUMN assignee_id`

- [ ] **Step 5: Apply migration to local database**

Run: `pnpm db:push`
Expected: Schema pushed successfully

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat: add users table and assigneeId columns to initiatives and ideas"
```

---

### Task 2: Zod Schemas — Add assigneeId to Request Validation

**Files:**
- Modify: `src/types/index.ts:1-74`

- [ ] **Step 1: Add assigneeId to all relevant Zod schemas**

In `src/types/index.ts`, add `assigneeId` to these schemas:

`CreateInitiativeSchema` — add after `linearProjectUrl`:
```typescript
  assigneeId: z.string().uuid().optional(),
```

`UpdateInitiativeSchema` — add after `linearProjectUrl`:
```typescript
  assigneeId: z.string().uuid().nullable().optional(),
```

`CreateIdeaSchema` — add after `pillarId`:
```typescript
  assigneeId: z.string().uuid().optional(),
```

`UpdateIdeaSchema` — add after `status`:
```typescript
  assigneeId: z.string().uuid().nullable().optional(),
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit src/types/index.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add assigneeId to Zod request schemas"
```

---

### Task 3: User Upsert Helper + Auth Integration

**Files:**
- Create: `src/lib/user-utils.ts`
- Modify: `src/lib/auth-utils.ts:1-57`
- Test: `__tests__/lib/user-utils.test.ts`

- [ ] **Step 1: Write failing tests for upsertUser**

Create `__tests__/lib/user-utils.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
  },
}));

describe("upsertUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a new user when entraOid does not exist", async () => {
    const { db } = await import("@/db");

    // Mock: select returns empty (user doesn't exist)
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    // Mock: insert returns the new user
    const newUser = { id: "uuid-1", entraOid: "oid-1", name: "Sam", email: "sam@test.com" };
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newUser]),
        }),
      }),
    });

    const { upsertUser } = await import("@/lib/user-utils");
    const result = await upsertUser("oid-1", "Sam", "sam@test.com");

    expect(db.insert).toHaveBeenCalled();
    expect(result).toEqual(newUser);
  });

  it("updates name and email on conflict", async () => {
    const { db } = await import("@/db");

    const updatedUser = { id: "uuid-1", entraOid: "oid-1", name: "Sam K", email: "sam@new.com" };
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedUser]),
        }),
      }),
    });

    const { upsertUser } = await import("@/lib/user-utils");
    const result = await upsertUser("oid-1", "Sam K", "sam@new.com");

    expect(result.name).toBe("Sam K");
    expect(result.email).toBe("sam@new.com");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/user-utils.test.ts`
Expected: FAIL — `Cannot find module '@/lib/user-utils'`

- [ ] **Step 3: Implement upsertUser**

Create `src/lib/user-utils.ts`:

```typescript
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function upsertUser(
  entraOid: string,
  name: string,
  email?: string
) {
  const [user] = await db
    .insert(users)
    .values({
      entraOid,
      name,
      email: email ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.entraOid,
      set: {
        name,
        email: email ?? undefined,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/user-utils.test.ts`
Expected: PASS

- [ ] **Step 5: Integrate upsertUser into auth-utils.ts**

In `src/lib/auth-utils.ts`, add import at top:

```typescript
import { upsertUser } from "./user-utils";
```

After the PAT auth success block (after `return { oid: rows[0].userOid, name: rows[0].userName };` on line 45), add fire-and-forget upsert:

```typescript
      // Capture PAT user in users table (fire-and-forget)
      upsertUser(rows[0].userOid, rows[0].userName).catch(console.error);

      return { oid: rows[0].userOid, name: rows[0].userName };
```

After the session auth success block (after `if (session?.user?.id && session.user.name)` on line 51), add fire-and-forget upsert:

```typescript
  if (session?.user?.id && session.user.name) {
    // Capture Entra user in users table (fire-and-forget)
    upsertUser(session.user.id, session.user.name, session.user.email ?? undefined).catch(console.error);

    return { oid: session.user.id, name: session.user.name };
  }
```

- [ ] **Step 6: Run all existing tests to verify no regressions**

Run: `pnpm test`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/user-utils.ts src/lib/auth-utils.ts __tests__/lib/user-utils.test.ts
git commit -m "feat: add upsertUser helper and integrate with auth flow"
```

---

### Task 4: Users API Endpoints

**Files:**
- Create: `src/app/api/users/route.ts`
- Create: `src/app/api/users/[id]/route.ts`
- Test: `__tests__/api/users.test.ts`

- [ ] **Step 1: Write failing tests for GET /api/users**

Create `__tests__/api/users.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/auth-utils", () => ({
  getUser: vi.fn().mockResolvedValue({ oid: "123", name: "Sam" }),
}));

describe("GET /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock("@/lib/auth-utils", () => ({
      getUser: vi.fn().mockResolvedValue({ oid: "123", name: "Sam" }),
    }));
  });

  it("returns all users", async () => {
    const { db } = await import("@/db");
    const mockUsers = [
      { id: "u1", entraOid: "oid-1", name: "Sam", email: "sam@test.com", linearUserId: null },
      { id: "u2", entraOid: "oid-2", name: "Alex", email: "alex@test.com", linearUserId: "lin-1" },
    ];
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(mockUsers),
      }),
    });

    const { GET } = await import("@/app/api/users/route");
    const request = new Request("http://localhost/api/users");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("Sam");
  });

  it("returns 401 when not authenticated", async () => {
    vi.doMock("@/lib/auth-utils", () => ({
      getUser: vi.fn().mockResolvedValue(null),
    }));

    const { GET } = await import("@/app/api/users/route");
    const request = new Request("http://localhost/api/users");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});

describe("PATCH /api/users/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock("@/lib/auth-utils", () => ({
      getUser: vi.fn().mockResolvedValue({ oid: "123", name: "Sam" }),
    }));
  });

  it("updates linearUserId on a user", async () => {
    const { db } = await import("@/db");
    const updated = { id: "u1", entraOid: "oid-1", name: "Sam", linearUserId: "lin-123" };
    (db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    const { PATCH } = await import("@/app/api/users/[id]/route");
    const request = new Request("http://localhost/api/users/u1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linearUserId: "lin-123" }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: "u1" }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.linearUserId).toBe("lin-123");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/api/users.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement GET /api/users**

Create `src/app/api/users/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized } from "@/lib/errors";

export async function GET(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      linearUserId: users.linearUserId,
    })
    .from(users)
    .orderBy(asc(users.name));

  return NextResponse.json(rows);
}
```

- [ ] **Step 4: Implement PATCH /api/users/:id**

Create `src/app/api/users/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest, notFound } from "@/lib/errors";

const UpdateUserSchema = z.object({
  linearUserId: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  const [updated] = await db
    .update(users)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  if (!updated) return notFound("User not found");

  return NextResponse.json(updated);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run __tests__/api/users.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/users/ __tests__/api/users.test.ts
git commit -m "feat: add GET /api/users and PATCH /api/users/:id endpoints"
```

---

### Task 5: Initiative API — AssigneeId Support + Joined AssigneeName

**Files:**
- Modify: `src/app/api/initiatives/route.ts:1-51`
- Modify: `src/app/api/initiatives/[id]/route.ts:1-59`
- Test: `__tests__/api/initiatives.test.ts` (extend existing)

- [ ] **Step 1: Write failing test for GET /api/initiatives returning assigneeName**

Add to `__tests__/api/initiatives.test.ts`, a new describe block:

```typescript
describe("GET /api/initiatives — assignee join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock("@/lib/auth-utils", () => ({
      getUser: vi.fn().mockResolvedValue({ oid: "123", name: "Sam" }),
    }));
  });

  it("returns assigneeName joined from users table", async () => {
    const { db } = await import("@/db");
    const mockRows = [
      { id: "1", title: "Init 1", assigneeId: "u1", assigneeName: "Sam" },
    ];
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockRows),
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/initiatives/route");
    const request = new Request("http://localhost/api/initiatives");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data[0].assigneeName).toBe("Sam");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/api/initiatives.test.ts`
Expected: FAIL — current GET doesn't join users

- [ ] **Step 3: Update GET /api/initiatives to join users table**

In `src/app/api/initiatives/route.ts`, add imports:

```typescript
import { initiatives, users } from "@/db/schema";
```

Replace the current `db.select()...` query with:

```typescript
  const rows = await db
    .select({
      id: initiatives.id,
      pillarId: initiatives.pillarId,
      title: initiatives.title,
      lane: initiatives.lane,
      size: initiatives.size,
      why: initiatives.why,
      dependsOn: initiatives.dependsOn,
      linearProjectUrl: initiatives.linearProjectUrl,
      linearProjectId: initiatives.linearProjectId,
      linearId: initiatives.linearId,
      linearStatus: initiatives.linearStatus,
      description: initiatives.description,
      content: initiatives.content,
      milestones: initiatives.milestones,
      linearProjectLead: initiatives.linearProjectLead,
      linearAssignee: initiatives.linearAssignee,
      linearSyncedAt: initiatives.linearSyncedAt,
      issueCountTotal: initiatives.issueCountTotal,
      issueCountDone: initiatives.issueCountDone,
      sortOrder: initiatives.sortOrder,
      createdBy: initiatives.createdBy,
      createdByName: initiatives.createdByName,
      createdAt: initiatives.createdAt,
      updatedAt: initiatives.updatedAt,
      assigneeId: initiatives.assigneeId,
      assigneeName: users.name,
    })
    .from(initiatives)
    .leftJoin(users, eq(initiatives.assigneeId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(initiatives.sortOrder));
```

- [ ] **Step 4: Update POST /api/initiatives to accept assigneeId**

The POST handler already spreads `parsed.data`, so adding `assigneeId` to the Zod schema (Task 2) means it flows through automatically. No code change needed here — the spread `...parsed.data` will include `assigneeId` when present.

Verify by reading the code — `parsed.data` spreads into `.values()`.

- [ ] **Step 5: Update PATCH /api/initiatives/:id to accept assigneeId**

Similarly, the PATCH handler in `src/app/api/initiatives/[id]/route.ts` already spreads `parsed.data` into the `.set()` call. Since `assigneeId` was added to `UpdateInitiativeSchema` in Task 2, it flows through. No code change needed.

- [ ] **Step 6: Run tests**

Run: `npx vitest run __tests__/api/initiatives.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/api/initiatives/route.ts __tests__/api/initiatives.test.ts
git commit -m "feat: join assigneeName on GET /api/initiatives, accept assigneeId on create/update"
```

---

### Task 6: Ideas API — AssigneeId Support + Joined AssigneeName

**Files:**
- Modify: `src/app/api/ideas/route.ts:1-111`
- Modify: `src/app/api/ideas/[id]/route.ts:1-76`
- Modify: `src/app/api/ideas/[id]/promote/route.ts:1-93`
- Test: `__tests__/api/ideas-assignment.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/api/ideas-assignment.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/auth-utils", () => ({
  getUser: vi.fn().mockResolvedValue({ oid: "123", name: "Sam" }),
}));

vi.mock("@/lib/linear", () => ({
  createLinearProject: vi.fn().mockResolvedValue({ id: "lp-1", url: "https://linear.app/p/1" }),
  updateProjectStatus: vi.fn().mockResolvedValue(undefined),
}));

describe("POST /api/ideas/[id]/promote — assignee carry-over", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock("@/lib/auth-utils", () => ({
      getUser: vi.fn().mockResolvedValue({ oid: "123", name: "Sam" }),
    }));
  });

  it("carries assigneeId from idea to new initiative", async () => {
    const { db } = await import("@/db");

    // Mock: fetch the idea (has assigneeId)
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{
          id: "idea-1",
          title: "Great Idea",
          body: "Description",
          authorId: "123",
          status: "open",
          assigneeId: "user-42",
          pillarId: null,
        }]),
      }),
    });

    // Mock: insert initiative
    const initiative = { id: "init-1", title: "Great Idea", assigneeId: "user-42" };
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([initiative]),
      }),
    });

    // Mock: update idea status
    (db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "idea-1", status: "promoted" }]),
        }),
      }),
    });

    const { POST } = await import("@/app/api/ideas/[id]/promote/route");
    const request = new Request("http://localhost/api/ideas/idea-1/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pillarId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: "idea-1" }) });

    expect(response.status).toBe(200);
    // Verify insert was called with assigneeId from the idea
    const insertCall = (db.insert as any).mock.results[0].value.values.mock.calls[0][0];
    expect(insertCall.assigneeId).toBe("user-42");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/api/ideas-assignment.test.ts`
Expected: FAIL — promote route doesn't carry `assigneeId`

- [ ] **Step 3: Update GET /api/ideas to join assigneeName**

In `src/app/api/ideas/route.ts`, add import:

```typescript
import { ideas, ideaVotes, comments, users } from "@/db/schema";
```

In the `db.select()` call, add to the select object:

```typescript
      assigneeId: ideas.assigneeId,
      assigneeName: users.name,
```

Add a `.leftJoin()` for users after the existing `.leftJoin(userVoteSq, ...)`:

```typescript
    .leftJoin(users, eq(ideas.assigneeId, users.id))
```

- [ ] **Step 4: Update GET /api/ideas/:id to return assigneeName**

In `src/app/api/ideas/[id]/route.ts`, add import:

```typescript
import { ideas, ideaVotes, users } from "@/db/schema";
```

After fetching the idea, also fetch the assignee name. Replace the simple select with a join:

```typescript
  const [idea] = await db
    .select({
      id: ideas.id,
      title: ideas.title,
      body: ideas.body,
      authorId: ideas.authorId,
      authorName: ideas.authorName,
      pillarId: ideas.pillarId,
      status: ideas.status,
      priorityScore: ideas.priorityScore,
      promotedInitiativeId: ideas.promotedInitiativeId,
      linearProjectId: ideas.linearProjectId,
      assigneeId: ideas.assigneeId,
      assigneeName: users.name,
      createdAt: ideas.createdAt,
      updatedAt: ideas.updatedAt,
    })
    .from(ideas)
    .leftJoin(users, eq(ideas.assigneeId, users.id))
    .where(eq(ideas.id, id));
```

- [ ] **Step 5: Update promote route to carry assigneeId**

In `src/app/api/ideas/[id]/promote/route.ts`, in the `db.insert(initiatives).values()` call (line 60-72), add `assigneeId`:

```typescript
      assigneeId: idea.assigneeId ?? null,
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run __tests__/api/ideas-assignment.test.ts`
Expected: PASS

Run: `pnpm test`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/api/ideas/ __tests__/api/ideas-assignment.test.ts
git commit -m "feat: add assigneeId support to ideas API and carry-over on promote"
```

---

### Task 7: Linear Sync — User Matching + AssigneeId

**Files:**
- Modify: `src/lib/linear.ts:48-59` (add `leadId` to `LinearProjectSummary`)
- Modify: `src/lib/linear-sync.ts:1-128`
- Test: `__tests__/lib/linear-sync-users.test.ts`

- [ ] **Step 1: Write failing tests for user matching**

Create `__tests__/lib/linear-sync-users.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/linear", () => ({
  fetchInitiativeProjects: vi.fn(),
  getTeamMembers: vi.fn(),
  statusToLane: vi.fn().mockReturnValue("now"),
  issueCountToSize: vi.fn().mockReturnValue("M"),
}));

describe("syncLinearUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("matches Linear members to users by name (case-insensitive)", async () => {
    const { db } = await import("@/db");
    const { getTeamMembers } = await import("@/lib/linear");

    (getTeamMembers as any).mockResolvedValue([
      { id: "lin-1", name: "Sam Merkovitz" },
      { id: "lin-2", name: "Alex Johnson" },
    ]);

    // Mock: select users — Sam exists, Alex does not
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: "u1", entraOid: "oid-1", name: "Sam Merkovitz", linearUserId: null },
        ]),
      }),
    });

    // Mock: update to set linearUserId
    (db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const { syncLinearUsers } = await import("@/lib/linear-sync");
    const result = await syncLinearUsers();

    expect(result.linked).toBe(1);
    expect(result.unmatched).toContain("Alex Johnson");
    expect(db.update).toHaveBeenCalled();
  });

  it("skips already-linked users", async () => {
    const { db } = await import("@/db");
    const { getTeamMembers } = await import("@/lib/linear");

    (getTeamMembers as any).mockResolvedValue([
      { id: "lin-1", name: "Sam" },
    ]);

    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: "u1", entraOid: "oid-1", name: "Sam", linearUserId: "lin-1" },
        ]),
      }),
    });

    const { syncLinearUsers } = await import("@/lib/linear-sync");
    const result = await syncLinearUsers();

    expect(result.linked).toBe(0);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("logs warning on name collision (multiple users match same Linear member)", async () => {
    const { db } = await import("@/db");
    const { getTeamMembers } = await import("@/lib/linear");

    (getTeamMembers as any).mockResolvedValue([
      { id: "lin-1", name: "Sam" },
    ]);

    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: "u1", entraOid: "oid-1", name: "Sam", linearUserId: null },
          { id: "u2", entraOid: "oid-2", name: "Sam", linearUserId: null },
        ]),
      }),
    });

    const { syncLinearUsers } = await import("@/lib/linear-sync");
    const result = await syncLinearUsers();

    expect(result.linked).toBe(0);
    expect(result.collisions).toContain("Sam");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/linear-sync-users.test.ts`
Expected: FAIL — `syncLinearUsers` does not exist

- [ ] **Step 3: Add leadId to LinearProjectSummary**

In `src/lib/linear.ts`, update `LinearProjectSummary` interface (line 48-59) to add:

```typescript
  leadId?: string;
```

In `fetchInitiativeProjects()`, update the result push (line 100-112) to include:

```typescript
      leadId: lead?.id ?? undefined,
```

- [ ] **Step 4: Implement syncLinearUsers in linear-sync.ts**

In `src/lib/linear-sync.ts`, add imports:

```typescript
import { users } from "@/db/schema";
import { getTeamMembers } from "./linear";
import { ilike } from "drizzle-orm";
```

Add the `syncLinearUsers` function and its result type:

```typescript
export interface UserSyncResult {
  linked: number;
  unmatched: string[];
  collisions: string[];
}

export async function syncLinearUsers(): Promise<UserSyncResult> {
  const result: UserSyncResult = { linked: 0, unmatched: [], collisions: [] };

  const members = await getTeamMembers();
  if (members.length === 0) return result;

  for (const member of members) {
    // Find matching users by name (case-insensitive)
    const matches = await db
      .select()
      .from(users)
      .where(ilike(users.name, member.name));

    // Filter to unlinked or already-linked-to-this-member
    const unlinked = matches.filter((u) => !u.linearUserId);
    const alreadyLinked = matches.some((u) => u.linearUserId === member.id);

    if (alreadyLinked) continue;

    if (unlinked.length === 1) {
      await db
        .update(users)
        .set({ linearUserId: member.id, updatedAt: new Date() })
        .where(eq(users.id, unlinked[0].id));
      result.linked++;
    } else if (unlinked.length > 1) {
      result.collisions.push(member.name);
      console.warn(`[linear-sync] Name collision for "${member.name}" — ${unlinked.length} matching users, skipping`);
    } else {
      result.unmatched.push(member.name);
    }
  }

  return result;
}
```

- [ ] **Step 5: Update runFullSync to set assigneeId from project lead**

In `src/lib/linear-sync.ts`, in the `runFullSync()` function, update the project processing loop. After the existing `linearProjectLead: project.leadName ?? null` line in both the update and insert blocks:

For the **update** block (after line 80):

```typescript
            // Resolve project lead to a user for assigneeId
            ...(project.leadId
              ? {
                  assigneeId: await db
                    .select({ id: users.id })
                    .from(users)
                    .where(eq(users.linearUserId, project.leadId))
                    .then((rows) => rows[0]?.id ?? undefined),
                }
              : {}),
```

For the **insert** block (after line 101):

```typescript
          // Resolve project lead to a user for assigneeId
          assigneeId: project.leadId
            ? await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.linearUserId, project.leadId))
                .then((rows) => rows[0]?.id ?? null)
            : null,
```

- [ ] **Step 6: Update runFullSync to call syncLinearUsers first**

At the top of `runFullSync()`, before the pillar loop, add:

```typescript
  // Step 1: Match Linear team members to Entra users
  await syncLinearUsers();
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run __tests__/lib/linear-sync-users.test.ts`
Expected: PASS

Run: `pnpm test`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/linear.ts src/lib/linear-sync.ts __tests__/lib/linear-sync-users.test.ts
git commit -m "feat: sync Linear team members to users table and set assigneeId on initiatives"
```

---

### Task 8: AssigneeSelect Component

**Files:**
- Create: `src/components/assignee-select.tsx`

- [ ] **Step 1: Create the AssigneeSelect component**

Create `src/components/assignee-select.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  name: string;
}

interface AssigneeSelectProps {
  value: string | null;
  onChange: (userId: string | null) => void;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AssigneeSelect({ value, onChange, className }: AssigneeSelectProps) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(console.error);
  }, []);

  const selectedName = users.find((u) => u.id === value)?.name;

  return (
    <Select
      value={value ?? "unassigned"}
      onValueChange={(v) => onChange(v === "unassigned" ? null : v)}
    >
      <SelectTrigger className={className ?? "h-7 w-auto gap-1 rounded-full bg-muted/50 border-0 px-3 text-xs"}>
        <SelectValue placeholder="Unassigned">
          {(val: string) => {
            if (val === "unassigned") return "Unassigned";
            const user = users.find((u) => u.id === val);
            if (!user) return "Unassigned";
            return (
              <span className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[7px] font-semibold text-primary-foreground">
                  {getInitials(user.name)}
                </span>
                {user.name}
              </span>
            );
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            <span className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[8px] font-semibold text-primary-foreground">
                {getInitials(u.name)}
              </span>
              {u.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/components/assignee-select.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/assignee-select.tsx
git commit -m "feat: add reusable AssigneeSelect component"
```

---

### Task 9: Initiative UI — Assignee on Cards + Detail Panel

**Files:**
- Modify: `src/components/board/initiative-card.tsx:14-25` (add `assigneeName` to interface)
- Modify: `src/components/initiative-detail.tsx:26-43` (add `assigneeId`/`assigneeName` to interface, add `AssigneeSelect`)
- Modify: `src/app/page.tsx:7-26` (add `assigneeId`/`assigneeName` to interface)
- Modify: `src/components/board/board-view.tsx:25-42` (add to interface)

- [ ] **Step 1: Update Initiative interface in page.tsx**

In `src/app/page.tsx`, add to the `Initiative` interface (after `issueCountDone`):

```typescript
  assigneeId?: string | null;
  assigneeName?: string | null;
```

- [ ] **Step 2: Update Initiative interface in board-view.tsx**

In `src/components/board/board-view.tsx`, add to the `Initiative` interface (after `issueCountDone`):

```typescript
  assigneeId?: string | null;
  assigneeName?: string | null;
```

- [ ] **Step 3: Update initiative-card.tsx to show assignee avatar**

In `src/components/board/initiative-card.tsx`, add to the `Initiative` interface (after `issueCountDone`):

```typescript
  assigneeId?: string | null;
  assigneeName?: string | null;
```

Add `getInitials` helper at the top of the file (after `SIZE_COLORS`):

```typescript
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
```

In the card body section (after the dependency indicator `div`, before the closing `</div>` of the card body), add:

```tsx
          {/* Assignee avatar */}
          {initiative.assigneeName && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[7px] font-semibold text-primary-foreground">
                {getInitials(initiative.assigneeName)}
              </div>
              <span className="text-[10px] text-muted-foreground truncate">
                {initiative.assigneeName}
              </span>
            </div>
          )}
```

- [ ] **Step 4: Update initiative-detail.tsx to show AssigneeSelect**

In `src/components/initiative-detail.tsx`, add to the `Initiative` interface (after `dependsOn`):

```typescript
  assigneeId?: string | null;
  assigneeName?: string | null;
```

Add import at top:

```typescript
import { AssigneeSelect } from "./assignee-select";
```

In the status badges section (after the `linearProjectLead` badge, around line 228-232), replace the project lead badge with an AssigneeSelect:

Replace:
```tsx
            {initiative.linearProjectLead && (
              <Badge variant="outline" className="bg-muted border-0">
                Lead: {initiative.linearProjectLead}
              </Badge>
            )}
```

With:
```tsx
            <AssigneeSelect
              value={initiative.assigneeId ?? null}
              onChange={async (userId) => {
                await fetch(`/api/initiatives/${initiative.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ assigneeId: userId }),
                });
                onUpdate();
              }}
            />
```

- [ ] **Step 5: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: PASS (or check for any type errors)

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/components/board/board-view.tsx src/components/board/initiative-card.tsx src/components/initiative-detail.tsx
git commit -m "feat: show assignee on initiative cards and add AssigneeSelect to detail panel"
```

---

### Task 10: Idea UI — Assignee on Cards + Detail Panel

**Files:**
- Modify: `src/components/ideas/idea-card.tsx:13-24` (add `assigneeName`)
- Modify: `src/components/ideas/idea-detail.tsx:30-45` (add `assigneeId`/`assigneeName`, add `AssigneeSelect`)
- Modify: `src/app/ideas/page.tsx:24-36` (add to interface)

- [ ] **Step 1: Update IdeaData interface in ideas page**

In `src/app/ideas/page.tsx`, add to the `IdeaData` interface (after `createdAt`):

```typescript
  assigneeId?: string | null;
  assigneeName?: string | null;
```

- [ ] **Step 2: Update idea-card.tsx to show assignee avatar**

In `src/components/ideas/idea-card.tsx`, add to the `IdeaCardData` interface (after `createdAt`):

```typescript
  assigneeId?: string | null;
  assigneeName?: string | null;
```

In the footer section (after the author initials `div`, inside the `flex items-center gap-2` at line 110), add an assignee badge after the author:

```tsx
          {idea.assigneeName && (
            <div className="flex items-center gap-1 ml-1 pl-1 border-l border-border">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[7px] font-semibold text-secondary-foreground">
                {getInitials(idea.assigneeName)}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {idea.assigneeName}
              </span>
            </div>
          )}
```

Insert this after the closing `</span>` of the author name line (after line 116, before the closing `</div>` of the left flex group).

- [ ] **Step 3: Update idea-detail.tsx to show AssigneeSelect**

In `src/components/ideas/idea-detail.tsx`, add to `IdeaDetailData` interface (after `userVoted`):

```typescript
  assigneeId?: string | null;
  assigneeName?: string | null;
```

Add import:

```typescript
import { AssigneeSelect } from "@/components/assignee-select";
```

After the vote + priority row section (after the closing `</div>` of the `flex items-center gap-3` block around line 220), add an assignee row:

```tsx
              {/* Assignee */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Assignee:</span>
                <AssigneeSelect
                  value={idea.assigneeId ?? null}
                  onChange={async (userId) => {
                    await fetch(`/api/ideas/${idea.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ assigneeId: userId }),
                    });
                    setIdea((prev) => prev ? { ...prev, assigneeId: userId } : prev);
                    onUpdate();
                  }}
                />
              </div>
```

- [ ] **Step 4: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ideas/idea-card.tsx src/components/ideas/idea-detail.tsx src/app/ideas/page.tsx
git commit -m "feat: show assignee on idea cards and add AssigneeSelect to idea detail"
```

---

### Task 11: Assignee Filtering — Board + Ideas Pages

**Files:**
- Modify: `src/app/page.tsx:34-96` (add filter state + UI)
- Modify: `src/app/ideas/page.tsx:55-210` (add filter state + UI)
- Modify: `src/app/api/initiatives/route.ts` (accept `assigneeId` filter param)
- Modify: `src/app/api/ideas/route.ts` (accept `assigneeId` filter param)

- [ ] **Step 1: Add assigneeId filter to GET /api/initiatives**

In `src/app/api/initiatives/route.ts`, after the existing `lane` filter param (line 16-19), add:

```typescript
  const assigneeId = url.searchParams.get("assigneeId");
```

In the conditions block, add:

```typescript
  if (assigneeId) conditions.push(eq(initiatives.assigneeId, assigneeId));
```

- [ ] **Step 2: Add assigneeId filter to GET /api/ideas**

In `src/app/api/ideas/route.ts`, after the existing `pillarId` filter param, add:

```typescript
  const assigneeId = url.searchParams.get("assigneeId");
```

In the conditions block, add:

```typescript
  if (assigneeId) conditions.push(eq(ideas.assigneeId, assigneeId));
```

- [ ] **Step 3: Add assignee filter UI to board page**

In `src/app/page.tsx`, add imports:

```typescript
import { AssigneeSelect } from "@/components/assignee-select";
```

Add filter state (after `selectedInitiative` state):

```typescript
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
```

Update the `load()` function to include assigneeId param:

```typescript
    async function load() {
      const params = new URLSearchParams();
      if (assigneeFilter) params.set("assigneeId", assigneeFilter);

      const [pillarsRes, initiativesRes] = await Promise.all([
        fetch("/api/pillars"),
        fetch(`/api/initiatives?${params}`),
      ]);
```

Add `assigneeFilter` to the dependency array of the useEffect.

Add a filter bar above `<BoardView>`:

```tsx
      <div className="mb-4 flex items-center gap-2 px-4">
        <span className="text-xs text-muted-foreground">Assignee:</span>
        <AssigneeSelect
          value={assigneeFilter}
          onChange={setAssigneeFilter}
          className="h-7 w-[180px] text-xs"
        />
      </div>
```

- [ ] **Step 4: Add assignee filter UI to ideas page**

In `src/app/ideas/page.tsx`, add import:

```typescript
import { AssigneeSelect } from "@/components/assignee-select";
```

Add filter state (after `createOpen` state):

```typescript
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
```

Update `fetchIdeas` to include assigneeId:

```typescript
  const fetchIdeas = useCallback(() => {
    const params = new URLSearchParams({ sort });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (pillarFilter !== "all") params.set("pillarId", pillarFilter);
    if (assigneeFilter) params.set("assigneeId", assigneeFilter);

    fetch(`/api/ideas?${params}`)
      .then((r) => r.json())
      .then(setIdeas);
  }, [sort, statusFilter, pillarFilter, assigneeFilter]);
```

In the toolbar section, add an AssigneeSelect after the status filter (before the sort `div`):

```tsx
        <AssigneeSelect
          value={assigneeFilter}
          onChange={setAssigneeFilter}
          className="h-8 w-[160px] text-xs"
        />
```

- [ ] **Step 5: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/ideas/page.tsx src/app/api/initiatives/route.ts src/app/api/ideas/route.ts
git commit -m "feat: add assignee filtering to board and ideas pages"
```

---

### Task 12: Final Integration Test + Cleanup

**Files:**
- All test files
- Verify: full app build

- [ ] **Step 1: Run all tests**

Run: `pnpm test`
Expected: All tests PASS

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: No lint errors (fix any that appear)

- [ ] **Step 4: Commit any lint fixes**

```bash
git add -A
git commit -m "fix: lint cleanup for user assignment feature"
```

(Skip if no lint fixes needed.)
