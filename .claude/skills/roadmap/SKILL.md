---
name: roadmap
description: View and manage the Pyrana roadmap — list pillars and initiatives, move items between lanes, manage ideas, vote, promote ideas to initiatives, and trigger Linear syncs. Also use when the user asks to explore a codebase for project ideas, wants to assess the expected value of potential work, or says things like "what should we build next", "find ideas in this repo", "analyze for roadmap opportunities". Use proactively when the user discusses potential projects, feature ideas, or technical debt that could become roadmap items.
---

# Pyrana Roadmap Skill

Manage the Pyrana product roadmap and discover new project ideas through codebase research.

## Configuration

- `ROADMAP_API_URL` — Base URL of the roadmap app. Default: `https://roadmap.pyrana.ai`
- `ROADMAP_API_TOKEN` — Personal access token for API authentication

If `ROADMAP_API_TOKEN` is not set, run the Setup flow before any API calls.

## Setup

If `ROADMAP_API_TOKEN` is not set:

1. Tell the user to open `$ROADMAP_API_URL/settings` in their browser, sign in, and click "Generate Token".
2. Add `ROADMAP_API_TOKEN=<the-token>` to `.env.local` in the project root.
3. Start a new Claude Code session so the env var loads.
4. **Stop here** — do not attempt API calls until configured.

## CLI

All API interactions use the bundled CLI. The script path is relative to this skill's directory:

```bash
SKILL_DIR="<path-to-this-skill-directory>"
python "$SKILL_DIR/scripts/roadmap_cli.py" <command> [args]
```

Replace `<path-to-this-skill-directory>` with the actual path where this skill is installed. The CLI reads `ROADMAP_API_URL` and `ROADMAP_API_TOKEN` from the environment.

### Commands

| Command | Description |
|---------|-------------|
| `board` | Show the full roadmap board grouped by pillar and lane |
| `pillars` | List all pillars with descriptions |
| `show "<name>"` | Show full details for an initiative (partial name match) |
| `move "<name>" <lane>` | Move initiative to lane: `now`, `next`, `backlog`, `done` |
| `sync` | Trigger a full Linear sync |
| `ideas [--status X] [--pillar "X"] [--sort X]` | List ideas with optional filters |
| `idea-create --title "X" --body "X" [--pillar "X"]` | Create a new idea |
| `vote "<name-or-id>"` | Toggle vote on an idea |
| `promote "<name-or-id>" --pillar "X" [--lane X]` | Promote idea to initiative |
| `attachments <idea\|initiative> "<name>"` | List attachments on an idea or initiative |
| `attach --idea\|--initiative "<name>" --file <path>` | Upload a file attachment to an idea or initiative |

### Name Matching

Commands accepting `<name>` use case-insensitive substring matching on titles. If multiple items match, the CLI shows a numbered list and exits — use a more specific query or the full UUID.

### Examples

```bash
# View the board
python "$SKILL_DIR/scripts/roadmap_cli.py" board

# Show details for an initiative
python "$SKILL_DIR/scripts/roadmap_cli.py" show "Harness"

# Move to done
python "$SKILL_DIR/scripts/roadmap_cli.py" move "Anthropic LLM" done

# Create an idea under Data & Compute
python "$SKILL_DIR/scripts/roadmap_cli.py" idea-create \
  --title "Native Snowflake Connector" \
  --body "Build a native Snowflake connector for direct integration." \
  --pillar "Data & Compute"

# Sync from Linear
python "$SKILL_DIR/scripts/roadmap_cli.py" sync
```

## Slash Commands

Parse the first argument to determine the action. Default to `board` if no argument.

| User says | Action |
|-----------|--------|
| `/roadmap` or `/roadmap board` | Run `board` command, format as markdown |
| `/roadmap show <name>` | Run `show` command |
| `/roadmap move <name> <lane>` | Run `move` command |
| `/roadmap sync` | Run `sync` command |
| `/roadmap ideas` | Run `ideas` command |
| `/roadmap idea create <title>` | Ask for body and pillar, then run `idea-create` |
| `/roadmap vote <name>` | Run `vote` command |
| `/roadmap promote <name>` | Ask for pillar/lane, then run `promote` |
| `/roadmap attachments <idea\|initiative> <name>` | Run `attachments` command |
| `/roadmap attach <idea\|initiative> <name> <file>` | Run `attach` command |
| `/roadmap token` | Show setup instructions (no API call) |

## Codebase Research Mode

When the user asks to explore a codebase for ideas, or discusses potential projects that could become roadmap items, read the full research guide:

**Read:** `references/codebase-research.md`

This guide covers:
- **How to explore** any codebase for project opportunities (TODOs, design docs, architectural signals, operational gaps)
- **Idea assessment framework** with structured component breakdown, size estimation, and expected value scoring
- **Expected value formula**: `EV = (Impact × Reach × Confidence) / (6 - Effort)` — each dimension scored 1-5
- **Cross-referencing** with existing roadmap to avoid duplicates and identify extensions

### When to activate research mode

- User says "what should we build next" or "find ideas"
- User asks to analyze a repo for roadmap opportunities
- User describes a vague idea and you want to help them structure it
- User points you at a codebase: "look at ~/projects/foo"

If no codebase is available, ask: "Want me to explore a specific repo for ideas, or are you describing something from scratch?"

### Structuring any idea

Even without codebase research, use the assessment framework from `references/codebase-research.md` to structure any idea the user describes. Break it into components, estimate size, and compute expected value. This helps the user think through whether an idea is worth pursuing before adding it to the roadmap.

## Error Handling

The CLI handles errors and prints clear messages to stderr:
- **Missing token**: Exits with setup instructions
- **401**: Token expired — regenerate at settings page
- **404**: Item not found — suggest `board` or `ideas` to find items
- **Connection error**: API unreachable — check network/service status

## Scope

Destructive operations (delete initiative, delete idea, revoke token) are intentionally not exposed. Use the web UI for those.
