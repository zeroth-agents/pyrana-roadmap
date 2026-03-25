# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev              # Start dev server (Next.js 16)
pnpm build            # Production build (standalone output)
pnpm lint             # ESLint (flat config)
pnpm test             # Vitest — run all tests once
pnpm test:watch       # Vitest — watch mode
npx vitest run __tests__/api/initiatives.test.ts  # Run a single test file

# Database (Drizzle + Postgres)
pnpm db:generate      # Generate migration from schema changes
pnpm db:migrate       # Run pending migrations
pnpm db:push          # Push schema directly (dev only)
pnpm db:studio        # Open Drizzle Studio GUI
pnpm db:seed          # Seed database (npx tsx src/db/seed.ts)

# Local Postgres via Docker
docker compose up -d  # Start Postgres 16 on localhost:5432 (user/pass: postgres/postgres, db: roadmap)
```

## Architecture

**Pyrana Roadmap** is an internal product roadmap tool. Next.js 16 app with React 19, Tailwind CSS 4, and a Postgres database via Drizzle ORM. Deployed as a Docker standalone build to Coolify — auto-deploys on push to `main`.

### Data Model

Four core tables in `src/db/schema.ts`:
- **pillars** — strategic categories (e.g. "Agent Intelligence", "Data & Compute")
- **initiatives** — roadmap items within pillars, organized by lane (now/next/backlog/done) and size (S/M/L). Linked to Linear projects via `linearProjectId`
- **proposals** — user-submitted initiative ideas, with pending/accepted/rejected workflow
- **comments** — threaded comments on initiatives or pillars

Plus `personalAccessTokens` for API bearer auth.

### API Routes (`src/app/api/`)

All API routes authenticate via `getUser()` from `src/lib/auth-utils.ts`, which supports both session auth (Microsoft Entra ID / NextAuth) and bearer token auth. In dev without Entra config, auth is bypassed with a "Dev User".

Request validation uses Zod schemas from `src/types/index.ts`. Error responses use helpers from `src/lib/errors.ts` (`unauthorized()`, `badRequest()`, `notFound()`).

### Linear Integration

- `src/lib/linear.ts` — Linear SDK client, project/issue CRUD, status↔lane mapping
- `src/lib/linear-sync.ts` — Full sync: matches Linear initiative projects to DB pillars by name, creates/updates initiatives
- `src/lib/linear-webhook.ts` — Webhook signature verification
- `src/app/api/webhooks/linear/` — Inbound webhook handler
- `src/app/api/sync/linear/` — Manual sync trigger

### Frontend

- **Board view** (`/`) — Kanban board with pillars as rows, lanes as columns. Uses `@dnd-kit` for drag-and-drop reordering. Main page is a client component that fetches from API routes.
- **Table view** (`/table`) — Tabular initiative list
- **Proposals** (`/proposals`) — Submit and review proposals
- **Settings** (`/settings`) — Personal access tokens
- **Login** (`/login`) — Custom login page with Microsoft Entra ID

Layout: sidebar nav (`src/components/sidebar.tsx`) + main content area. Theme support via `next-themes`.

UI components in `src/components/ui/` are shadcn (base-nova style, `@base-ui/react`). Use `cn()` from `src/lib/utils.ts` for class merging.

### Testing

Tests live in `__tests__/` (not colocated). Vitest with jsdom environment. Tests mock `@/db` and `@/lib/auth-utils`, then dynamically import route handlers to test API logic. The `@` alias resolves to `./src` in both app and test configs.

### Auth Flow

Microsoft Entra ID via NextAuth v5 (beta). `auth.ts` at project root configures the provider with token refresh. `middleware.ts` protects all pages (redirects to `/login`), while API routes handle their own auth. `proxy.ts` re-exports auth for middleware.

### Versioning & Deployment

Semver from `package.json`. Before opening a PR, run `pnpm bump` (patch, the default) or `pnpm bump:minor` / `pnpm bump:major` to increment the version. On push to `main`, the deploy workflow (`.github/workflows/deploy.yml`) creates a git tag from the current version and deploys to Coolify.

### Environment Variables

Required: `DATABASE_URL`, `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ISSUER`
Optional: `LINEAR_API_KEY`, `LINEAR_WEBHOOK_SECRET`
