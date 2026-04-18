import { db } from "./index";
import { pillars, mcpPrompts } from "./schema";

const PILLARS = [
  {
    name: "Agent Intelligence",
    description:
      "Making individual agents smarter, more knowledgeable, and more capable across runs.",
    boundary:
      "If it's about a single agent being better at its job, it's here.",
    customerStory: "Our agents learn and get smarter over time.",
    sortOrder: 0,
  },
  {
    name: "Agent Collaboration",
    description: "Making agents work together effectively.",
    boundary:
      "If it involves more than one agent coordinating, it's here.",
    customerStory:
      "Complex problems get solved by specialized agents working together.",
    sortOrder: 1,
  },
  {
    name: "Data & Compute",
    description: "Expanding what agents can access and execute against.",
    boundary:
      "If it's about connecting to data or running computation, it's here.",
    customerStory: "Agents connect to your data and do real analysis.",
    sortOrder: 2,
  },
  {
    name: "Builder Experience",
    description: "Making it fast and intuitive to build on Pyrana.",
    boundary:
      "If the user is someone building an agentic workflow (the forward-deployed engineer), it's here.",
    customerStory:
      "Deploy a new agentic workflow in hours, not weeks.",
    sortOrder: 3,
  },
  {
    name: "Platform Foundation",
    description:
      "Making the platform reliable, secure, and performant.",
    boundary:
      "If it's not a feature but makes existing features better/safer/faster, it's here.",
    customerStory: "Enterprise-grade reliability and performance.",
    sortOrder: 4,
  },
];

const SEED_PROMPTS = [
  {
    name: "triage_ideas",
    title: "Triage Open Ideas",
    description:
      "Walk the model through open ideas and suggest promote/archive/keep-open with rationale.",
    template:
      "Use the list_ideas tool with status='open'{{pillar_filter}} to fetch open ideas.\n\n" +
      "For each idea, suggest exactly one action — promote (ready to become an initiative), archive (not pursuing), or keep open (needs more signal). Include a one-sentence rationale grounded in the idea body and vote score.\n\n" +
      "Return a markdown table with columns: Title, Action, Rationale. Sort by suggested action (promote first, then keep open, then archive).",
    arguments: [
      {
        name: "pillar_filter",
        description:
          "Optional pillarId filter appended as ' and pillarId=<uuid>'. Leave blank for all.",
        required: false,
      },
    ],
    enabled: true,
  },
  {
    name: "plan_next_lane",
    title: "Plan Next → Now Promotions",
    description:
      "Suggest which initiatives should move from the 'next' lane into 'now' based on current capacity.",
    template:
      "Fetch initiatives in lane='now' and lane='next' using list_initiatives.\n\n" +
      "Suggest {{capacity}} initiatives from 'next' to promote into 'now'. For each, justify based on: pillar balance, issue count / size, blockers. Call out anything in 'now' that should move back to 'next' if overloaded.\n\n" +
      "Return a brief summary then a markdown list of recommended moves with a one-sentence why for each.",
    arguments: [
      {
        name: "capacity",
        description: "How many initiatives to recommend promoting (e.g. '3')",
        required: true,
      },
    ],
    enabled: true,
  },
  {
    name: "weekly_digest",
    title: "Weekly Roadmap Digest",
    description:
      "Summarize roadmap activity over the last N days — new ideas, promotions, lane moves, active comments.",
    template:
      "Produce a weekly roadmap digest covering the last {{days}} days.\n\n" +
      "Steps:\n" +
      "1. Use list_ideas sorted by createdAt desc to find new ideas.\n" +
      "2. Use list_initiatives sorted by updatedAt desc to find recently-changed initiatives.\n" +
      "3. Filter to the last {{days}} days client-side (check createdAt/updatedAt).\n" +
      "4. For each pillar, sample recent comments via list_comments if useful.\n\n" +
      "Output sections: ## New Ideas, ## Promotions, ## Lane Moves, ## Active Discussions, ## What Matters.\n" +
      "Keep each section tight — 3-5 bullets max. End with a one-paragraph 'what to watch next week'.",
    arguments: [
      {
        name: "days",
        description: "Lookback window in days (default '7')",
        required: false,
      },
    ],
    enabled: true,
  },
];

async function seed() {
  console.log("Seeding pillars...");
  const existingPillars = await db.select().from(pillars);
  if (existingPillars.length === 0) {
    await db.insert(pillars).values(PILLARS);
    console.log("Seeded", PILLARS.length, "pillars");
  } else {
    console.log("Pillars already seeded, skipping");
  }

  console.log("Seeding MCP prompts...");
  const existingPrompts = await db.select().from(mcpPrompts);
  if (existingPrompts.length === 0) {
    await db.insert(mcpPrompts).values(
      SEED_PROMPTS.map((p) => ({
        ...p,
        createdBy: "system",
        createdByName: "System",
      }))
    );
    console.log("Seeded", SEED_PROMPTS.length, "MCP prompts");
  } else {
    console.log("MCP prompts already seeded, skipping");
  }

  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
