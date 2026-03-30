import { eq, or, ilike } from "drizzle-orm";
import { db } from "@/db";
import { initiatives, pillars, users } from "@/db/schema";
import {
  fetchInitiativeProjects,
  getTeamMembers,
  statusToLane,
  issueCountToSize,
  type LinearProjectSummary,
} from "./linear";

// Pillar names must match exactly between Linear initiatives and roadmap pillars
const PILLAR_NAMES = [
  "Agent Intelligence",
  "Agent Collaboration",
  "Data & Compute",
  "Builder Experience",
  "Platform Foundation",
];

export interface SyncResult {
  created: number;
  updated: number;
  orphaned: number;
  errors: string[];
}

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
    // Find matching users by name (case-insensitive) or email
    const conditions = [ilike(users.name, member.name)];
    if (member.email) conditions.push(eq(users.email, member.email));
    const matches = await db
      .select()
      .from(users)
      .where(or(...conditions));

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

export async function runFullSync(): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, orphaned: 0, errors: [] };

  // Step 1: Match Linear team members to Entra users
  await syncLinearUsers();

  // Fetch all pillars from DB
  const dbPillars = await db.select().from(pillars);
  const pillarByName = new Map(dbPillars.map((p) => [p.name, p]));

  // Track which linearProjectIds we see during this sync
  const seenProjectIds = new Set<string>();

  for (const pillarName of PILLAR_NAMES) {
    const pillar = pillarByName.get(pillarName);
    if (!pillar) {
      result.errors.push(`Pillar "${pillarName}" not found in DB`);
      continue;
    }

    let projects: LinearProjectSummary[];
    try {
      projects = await fetchInitiativeProjects(pillarName);
    } catch (err) {
      result.errors.push(`Failed to fetch projects for "${pillarName}": ${err}`);
      continue;
    }

    for (const project of projects) {
      seenProjectIds.add(project.id);

      const lane = statusToLane(project.status);
      const size = issueCountToSize(project.issueCountTotal);

      // Check if initiative already exists
      const existing = await db
        .select()
        .from(initiatives)
        .where(eq(initiatives.linearProjectId, project.id))
        .limit(1);

      if (existing.length > 0) {
        // Update — preserve `why`
        await db
          .update(initiatives)
          .set({
            title: project.name,
            description: project.description,
            content: project.content,
            milestones: JSON.stringify(project.milestones),
            pillarId: pillar.id,
            lane: lane as any,
            size: size as any,
            issueCountTotal: project.issueCountTotal,
            issueCountDone: project.issueCountDone,
            linearProjectUrl: project.url,
            linearProjectLead: project.leadName ?? null,
            assigneeId: project.leadId
              ? (await db
                  .select({ id: users.id })
                  .from(users)
                  .where(eq(users.linearUserId, project.leadId))
                  .then((rows) => rows[0]?.id ?? undefined))
              : undefined,
            linearSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(initiatives.linearProjectId, project.id));
        result.updated++;
      } else {
        // Create new
        await db.insert(initiatives).values({
          title: project.name,
          description: project.description,
          content: project.content,
          milestones: JSON.stringify(project.milestones),
          pillarId: pillar.id,
          lane: lane as any,
          size: size as any,
          why: "",
          issueCountTotal: project.issueCountTotal,
          issueCountDone: project.issueCountDone,
          linearProjectId: project.id,
          linearProjectUrl: project.url,
          linearProjectLead: project.leadName ?? null,
          assigneeId: project.leadId
            ? (await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.linearUserId, project.leadId))
                .then((rows) => rows[0]?.id ?? null))
            : null,
          linearSyncedAt: new Date(),
          createdBy: "sync",
          createdByName: "Linear Sync",
        });
        result.created++;
      }
    }
  }

  // Handle orphaned initiatives (in DB but no longer in any Linear initiative)
  const allWithProjectId = await db
    .select({ id: initiatives.id, linearProjectId: initiatives.linearProjectId, lane: initiatives.lane })
    .from(initiatives);

  for (const init of allWithProjectId) {
    if (init.linearProjectId && !seenProjectIds.has(init.linearProjectId) && init.lane !== "backlog") {
      await db
        .update(initiatives)
        .set({ lane: "backlog" as any, updatedAt: new Date() })
        .where(eq(initiatives.id, init.id));
      result.orphaned++;
    }
  }

  return result;
}
