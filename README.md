# Pyrana Roadmap

A product roadmap management tool built with Next.js 16. Organize initiatives into strategic pillars, track progress across lanes (Now / Next / Backlog / Done), and sync with Linear for issue-level visibility.

## Features

- **Kanban board** — Drag-and-drop initiatives across lanes and pillars
- **Table view** — Sortable, filterable list of all initiatives
- **Linear integration** — Two-way sync with Linear projects, issues, and milestones
- **Ideas** — Team members submit ideas; vote, discuss, and promote them into the roadmap
- **Attachments** — Upload documents to Google Drive or link existing files to ideas and projects
- **Comments** — Threaded discussions on initiatives, pillars, and ideas
- **Auth** — Microsoft Entra ID (Azure AD) with session + bearer token support
- **Dark mode** — System-aware theme switching

## Tech Stack

- **Framework:** Next.js 16, React 19
- **Styling:** Tailwind CSS 4, shadcn/ui (base-nova)
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** NextAuth v5 + Microsoft Entra ID
- **Testing:** Vitest + Testing Library
- **Deployment:** Docker standalone → Coolify

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm
- Docker (for local Postgres)

### Setup

```bash
# Clone and install
git clone https://github.com/zeroth-agents/pyrana-roadmap.git
cd pyrana-roadmap
pnpm install

# Start local Postgres
docker compose up -d

# Configure environment
cp .env.example .env
# Edit .env with your values (DATABASE_URL works as-is for local dev)

# Push schema and seed
pnpm db:push
pnpm db:seed

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Without Entra ID credentials configured, auth is bypassed with a dev user.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | NextAuth secret (`openssl rand -base64 32`) |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | No* | Entra app client ID |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | No* | Entra app client secret |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | No* | Entra issuer URL |
| `LINEAR_API_KEY` | No | Enables Linear sync |
| `LINEAR_WEBHOOK_SECRET` | No | Validates inbound Linear webhooks |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | No | Base64-encoded GCP service account JSON key (enables attachments) |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | No | Google Drive folder ID for the `attachments/` root folder |

*Auth is bypassed in dev when Entra ID variables are not set.

## Scripts

```bash
pnpm dev           # Start dev server
pnpm build         # Production build
pnpm lint          # Run ESLint
pnpm test          # Run tests
pnpm test:watch    # Run tests in watch mode

pnpm db:generate   # Generate migration from schema changes
pnpm db:migrate    # Run migrations
pnpm db:push       # Push schema directly (dev)
pnpm db:studio     # Open Drizzle Studio

pnpm bump          # Bump patch version
pnpm bump:minor    # Bump minor version
pnpm bump:major    # Bump major version
```

## Project Structure

```
src/
├── app/
│   ├── api/          # REST API routes (initiatives, pillars, ideas, attachments, comments, etc.)
│   ├── login/        # Custom login page
│   ├── ideas/        # Ideas submission page
│   ├── settings/     # Personal access tokens
│   └── table/        # Table view page
├── components/
│   ├── board/        # Kanban board components
│   ├── attachments/  # File attachment UI (upload, link, list)
│   ├── ideas/        # Idea submission and review
│   ├── table/        # Table view components
│   └── ui/           # shadcn/ui primitives
├── db/
│   ├── schema.ts     # Drizzle schema (pillars, initiatives, ideas, comments, attachments)
│   └── seed.ts       # Database seeder
├── lib/
│   ├── auth-utils.ts # Session + bearer token auth
│   ├── linear.ts     # Linear SDK client
│   ├── linear-sync.ts# Full sync from Linear
│   ├── google-drive.ts# Google Drive v3 client (upload, move, delete)
│   ├── attachment-utils.ts # URL parser, MIME allowlist, cleanup
│   └── errors.ts     # API error helpers
└── types/
    └── index.ts      # Zod schemas for request validation
```

## Guides

### Database

The schema is managed with [Drizzle ORM](https://orm.drizzle.team/). The source of truth is `src/db/schema.ts` — core tables: `pillars`, `initiatives`, `ideas`, `comments`, and `attachments`.

For **local dev**, `docker compose up -d` gives you Postgres 16 on `localhost:5432`. Use `pnpm db:push` to apply the schema directly.

For **production**, point `DATABASE_URL` at any PostgreSQL 16+ instance (Neon, Supabase, Railway, AWS RDS, etc.). Use migrations instead of push:

```bash
pnpm db:generate   # Generate a migration from schema changes
pnpm db:migrate    # Apply pending migrations
```

Migrations live in `drizzle/` and are committed to the repo. Run `pnpm db:studio` to browse your data with Drizzle Studio.

### Authentication

Auth is handled by [NextAuth v5](https://authjs.dev/) in `auth.ts`. The app ships with Microsoft Entra ID (Azure AD), but NextAuth supports [dozens of providers](https://authjs.dev/getting-started/providers) — GitHub, Google, Okta, Auth0, credentials, etc.

**Using the default (Entra ID):**

1. Register an app in [Microsoft Entra ID](https://entra.microsoft.com/) → App registrations → New registration
2. Set the redirect URI to `https://your-domain/api/auth/callback/microsoft-entra-id`
3. Create a client secret under Certificates & secrets
4. Set the three env vars: `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ISSUER` (format: `https://login.microsoftonline.com/<tenant-id>/v2.0/`)

**Swapping to a different provider (e.g., GitHub):**

1. Install the provider if needed (most are built into `next-auth`)
2. In `auth.ts`, replace the `MicrosoftEntraID` provider:
   ```ts
   import GitHub from "next-auth/providers/github";

   // In the providers array:
   GitHub({
     clientId: process.env.AUTH_GITHUB_ID!,
     clientSecret: process.env.AUTH_GITHUB_SECRET!,
   })
   ```
3. Update the `profile()` callback to map the provider's user fields to `{ id, name, email }`
4. Simplify or remove `refreshAccessToken()` if the new provider doesn't need token refresh
5. Update `AUTH_*` env vars in `.env` and production

The `jwt` and `session` callbacks in `auth.ts` expect `token.oid` as the user ID. If your provider uses a different field, update those callbacks and `src/lib/auth-utils.ts` accordingly.

**No auth (dev mode):** When no `AUTH_MICROSOFT_ENTRA_ID_ID` is set, `getUser()` in `src/lib/auth-utils.ts` returns a hardcoded dev user, so you can develop without any OAuth setup.

### Google Drive Attachments

The app supports attaching documents to ideas and projects via Google Drive. Files are uploaded to a shared folder managed by a GCP service account. When an idea is promoted to a project, its attachments transfer automatically.

**Setup:**

1. Create a GCP project and enable the Drive API
2. Create a service account and download the JSON key
3. Create a shared folder in Google Drive (e.g. `attachments/` inside a Shared Drive)
4. Add the service account email as an Editor on the Shared Drive
5. Base64-encode the key: `base64 -i key.json | tr -d '\n'`
6. Set `GOOGLE_SERVICE_ACCOUNT_KEY` (the base64 string) and `GOOGLE_DRIVE_ROOT_FOLDER_ID` (the folder ID from the URL)

**Folder structure** (created automatically):

```
attachments/
  ideas/
    My-Idea-550e8400/
      uploaded-doc.pdf
  projects/
    My-Project-a1b2c3d4/
      promoted-doc.pdf
      new-upload.md
```

**API endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/attachments` | Upload a file (multipart form data) |
| `POST` | `/api/attachments/link` | Link an existing Drive URL |
| `GET` | `/api/attachments?target_type=idea&target_id=<id>` | List attachments |
| `DELETE` | `/api/attachments/<id>` | Remove an attachment |

Supported file types: PDF, Word, Excel, PowerPoint, Markdown, plain text, CSV, PNG, JPEG, GIF, WebP. Max upload size: 25MB.

### Linear Integration

The app syncs with [Linear](https://linear.app/) to pull project status, issues, and milestones into the roadmap. This is optional — the app works fully without it.

**Setup:**

1. Create a Linear API key at Settings → API → Personal API keys
2. Set `LINEAR_API_KEY` in your environment

**How sync works:**

The sync (`src/lib/linear-sync.ts`) matches Linear initiatives to roadmap pillars by name. For each pillar, it fetches all projects under the matching Linear initiative, then creates or updates roadmap initiatives with:

- Project status → lane mapping (In Progress → now, Planned → next, Backlog → backlog, Completed/Canceled → done)
- Issue count → size mapping (< 5 issues → S, 5–15 → M, > 15 → L)
- Milestones, description, project lead, and issue counts

Trigger a sync manually via `POST /api/sync/linear` or set up a cron. For your own pillars, update the `PILLAR_NAMES` array in `src/lib/linear-sync.ts` to match your Linear initiative names.

**Webhooks (optional):**

For real-time updates, configure a Linear webhook pointing at `https://your-domain/api/webhooks/linear`. Set `LINEAR_WEBHOOK_SECRET` to the signing secret Linear provides. The webhook handler validates signatures via HMAC-SHA256.

## Deployment

The app builds as a standalone Docker image. On push to `main`, the CI workflow tags the release from `package.json` and deploys.

```bash
docker build -t pyrana-roadmap .
docker run -p 3000:3000 --env-file .env pyrana-roadmap
```

## Contributing

1. Create a branch from `main`
2. Make your changes
3. Run `pnpm bump` before opening a PR
4. Open a PR — direct pushes to `main` are blocked

## License

[MIT](LICENSE)
