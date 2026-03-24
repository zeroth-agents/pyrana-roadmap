import { db } from "./index";
import { pillars } from "./schema";

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

async function seed() {
  console.log("Seeding pillars...");
  const existing = await db.select().from(pillars);
  if (existing.length > 0) {
    console.log("Pillars already seeded, skipping");
    process.exit(0);
  }
  await db.insert(pillars).values(PILLARS);
  console.log("Seeded", PILLARS.length, "pillars");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
