# Codebase Research Guide

When the roadmap skill is invoked inside a codebase (or the user points you at one), use this guide to explore the code, discover potential projects, and produce structured idea assessments.

## When to Research

Research mode activates when:
- The user says "what should we build next?" or "find ideas in this repo"
- The user says "analyze this codebase for roadmap ideas"
- The user points you at a repo: "look at ~/projects/foo for ideas"
- You're already in a repo and the user asks for ideas without specifying details

If there's no codebase context, ask: "Want me to explore a specific repo for ideas, or are you describing something from scratch?"

## How to Explore

Use the Agent tool with `subagent_type: "Explore"` or direct Grep/Glob/Read for targeted searches. Adapt to whatever the repo looks like — there's no fixed file structure.

### What to look for

**1. Documented intentions**
- TODO/FIXME/HACK comments in code — these are direct signals of known debt or planned work
- Design docs, ADRs, specs in `docs/`, `specs/`, `scripts/`, `design/` directories
- Issue trackers, changelogs, or roadmap files
- README sections about "Future Work" or "Known Limitations"

**2. Architectural signals**
- Large files (>500 lines) — candidates for decomposition
- Modules with many imports or dependents — coupling hotspots
- Dead code, unused exports, commented-out blocks
- Inconsistent patterns across similar modules (some use pattern A, others pattern B)

**3. Operational signals**
- Error handling gaps — bare try/except, swallowed errors, missing retries
- Missing tests for critical paths
- Hardcoded values that should be configurable
- Performance bottlenecks — N+1 queries, missing indexes, unbounded loops

**4. User-facing signals**
- UI components without loading states, error states, or empty states
- Missing accessibility attributes
- Inconsistent UX patterns across pages
- API endpoints without validation or rate limiting

**5. Integration opportunities**
- Services that could benefit from connecting to each other
- Manual processes that could be automated
- Data that's computed repeatedly instead of cached
- External APIs called without circuit breakers or fallbacks

### Research depth

- **Quick scan** (2-3 minutes): Grep for TODOs, read README, check directory structure, look at recent git commits
- **Standard** (5-10 minutes): Above + read key source files, check test coverage, look for patterns
- **Deep dive** (15+ minutes): Above + trace data flows, map dependencies, read design docs

Match depth to what the user asked for. Default to standard.

## Idea Assessment Framework

For each potential idea you discover, produce a structured assessment. This is the core analytical output — don't just list ideas, break them down.

### 1. Core Components

Decompose the idea into its constituent parts. Each component should be independently understandable.

```
Components:
  1. [Component name] — [one-line description]
     Files touched: [list key files/modules]
     Dependencies: [what it needs to exist first]

  2. [Component name] — ...
```

Think in layers: data model → service logic → API → frontend. Identify which components are new vs modifications to existing code.

### 2. Size Estimate

Use this calibration (based on a small team, 1-2 engineers):

| Size | Tickets | Duration | Characteristics |
|------|---------|----------|-----------------|
| **S** | 3-6 | 1-3 days | Single layer, one module, no migrations |
| **M** | 7-15 | 1-2 weeks | Multi-layer, 2-4 modules, may need migrations |
| **L** | 15-30 | 2-4 weeks | Cross-cutting, 5+ modules, architectural changes |
| **XL** | 30+ | 4+ weeks | Multiple epics, phased rollout, breaking changes |

To estimate, count the components and their complexity:
- **Simple component** (CRUD endpoint, UI widget, config change): 1-2 tickets
- **Medium component** (new service, data pipeline, stateful UI): 3-5 tickets
- **Complex component** (new subsystem, migration, protocol change): 5-10 tickets

State your estimate and the reasoning: "M — 4 components, 2 are medium complexity (new repository + API), 2 are simple (TypeScript types + React Query hooks). ~12 tickets."

### 3. Expected Value Assessment

This is the most important part. Every idea competes for attention — articulate why this one matters.

#### Value Dimensions

Score each dimension 1-5, then explain the score in one sentence.

**Impact** — How much does this improve things for users or the system?
- 1: Nice-to-have, marginal improvement
- 2: Reduces friction for a subset of users
- 3: Meaningfully improves a common workflow
- 4: Removes a significant pain point or enables a new capability
- 5: Transformative — unlocks a class of use cases that weren't possible

**Reach** — How many users/workflows/agents does this affect?
- 1: One specific client or edge case
- 2: A few workflows or power users
- 3: Most users encounter this regularly
- 4: Every workflow or every user session
- 5: Every interaction with the platform

**Confidence** — How sure are we this will work and deliver value?
- 1: Speculative — unproven approach, unclear requirements
- 2: Reasonable hypothesis but untested
- 3: Similar approaches have worked, requirements are clear
- 4: Strong evidence from user feedback or prior work
- 5: Certain — fixing a known, well-understood problem

**Effort** — How hard is this? (inverse — lower effort = higher score)
- 1: XL project, architectural risk, many unknowns
- 2: L project, significant complexity
- 3: M project, well-understood scope
- 4: S project, straightforward implementation
- 5: Trivial — config change, small PR

#### Expected Value Score

Compute: `EV = (Impact × Reach × Confidence) / (6 - Effort)`

This gives a rough prioritization signal. Higher is better. The denominator penalizes high-effort projects but doesn't kill them — a 5×5×5 transformative project is still worth doing even at effort=1.

| EV Range | Interpretation |
|----------|---------------|
| 50+ | Strong candidate — high impact, good ROI |
| 25-50 | Solid idea — worth scheduling |
| 10-25 | Decent but evaluate against alternatives |
| <10 | Low priority unless strategically important |

#### Strategic Fit

Beyond the score, note:
- **Pillar alignment** — which roadmap pillar does this serve?
- **Unlocks** — does completing this enable other high-value work?
- **Risk if delayed** — what happens if we don't do this? (nothing? tech debt compounds? client churn?)
- **Client signal** — has a client or user asked for this specifically?

### 4. Output Format

When presenting ideas to the user, use this template:

```
## [Idea Title]

**TL;DR:** [One sentence — what and why]

**Components:**
1. [Component] — [description]
2. [Component] — [description]
...

**Size:** [S/M/L/XL] — [reasoning]

**Expected Value:**
  Impact:     [1-5] — [why]
  Reach:      [1-5] — [why]
  Confidence: [1-5] — [why]
  Effort:     [1-5] — [why]
  **EV Score: [number]**

**Strategic fit:** [pillar], [unlocks], [risk if delayed]

**Suggested pillar:** [which roadmap pillar]
**Suggested lane:** [now/next/backlog] — [why]
```

### 5. Batch Assessment

When presenting multiple ideas, rank them by EV score and show a summary table:

```
| # | Idea | Size | EV | Pillar | Lane |
|---|------|------|----|--------|------|
| 1 | ...  | M    | 62 | ...    | now  |
| 2 | ...  | S    | 45 | ...    | next |
```

After the table, give a brief narrative: "The top 3 ideas cluster around [theme]. I'd recommend starting with #1 because it unlocks #3, and #2 is a quick win you could ship in parallel."

## Creating Ideas from Research

After presenting assessments, offer to create them on the roadmap:

```bash
python <skill-path>/scripts/roadmap_cli.py idea-create \
  --title "Idea Title" \
  --body "Description from assessment" \
  --pillar "Pillar Name"
```

Or if the user wants to promote directly to an initiative, discuss sizing and lane placement first, then create and promote.

## Cross-Referencing with Existing Roadmap

Before presenting new ideas, always check what's already on the board:

```bash
python <skill-path>/scripts/roadmap_cli.py board
python <skill-path>/scripts/roadmap_cli.py ideas
```

Flag overlaps: "This looks similar to '[existing initiative]' which is already in [lane]. Should this extend that initiative or be separate?"

Also check for completed work that might inform new ideas — patterns established in done initiatives often suggest natural follow-ups.
