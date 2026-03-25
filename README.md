# Pyrana Roadmap

A product roadmap management tool built with Next.js 16. Organize initiatives into strategic pillars, track progress across lanes (Now / Next / Backlog / Done), and sync with Linear for issue-level visibility.

## Features

- **Kanban board** — Drag-and-drop initiatives across lanes and pillars
- **Table view** — Sortable, filterable list of all initiatives
- **Linear integration** — Two-way sync with Linear projects, issues, and milestones
- **Proposals** — Team members submit ideas; reviewers accept or reject them into the roadmap
- **Comments** — Threaded discussions on initiatives and pillars
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
│   ├── api/          # REST API routes (initiatives, pillars, proposals, comments, etc.)
│   ├── login/        # Custom login page
│   ├── proposals/    # Proposal management page
│   ├── settings/     # Personal access tokens
│   └── table/        # Table view page
├── components/
│   ├── board/        # Kanban board components
│   ├── proposals/    # Proposal list and review
│   ├── table/        # Table view components
│   └── ui/           # shadcn/ui primitives
├── db/
│   ├── schema.ts     # Drizzle schema (pillars, initiatives, proposals, comments)
│   └── seed.ts       # Database seeder
├── lib/
│   ├── auth-utils.ts # Session + bearer token auth
│   ├── linear.ts     # Linear SDK client
│   ├── linear-sync.ts# Full sync from Linear
│   └── errors.ts     # API error helpers
└── types/
    └── index.ts      # Zod schemas for request validation
```

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
