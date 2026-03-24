import { LinearClient } from "@linear/sdk";

const linear = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY!,
});

interface InitiativeRecord {
  id: string;
  title: string;
  why: string;
  lane: string;
  linearId?: string | null;
  pillarId: string;
}

/**
 * Push an initiative to Linear as an issue.
 * Called fire-and-forget after initiative creation/update.
 */
export async function syncInitiativeToLinear(
  initiative: InitiativeRecord
): Promise<void> {
  if (!process.env.LINEAR_API_KEY) return;

  try {
    if (initiative.linearId) {
      // Update existing
      await linear.updateIssue(initiative.linearId, {
        title: initiative.title,
        description: initiative.why,
      });
    }
    // Creation and project mapping will be added when Linear projects
    // are configured per pillar
  } catch (error) {
    console.error("Linear sync failed:", error);
  }
}

/**
 * Search Linear for issues/projects to link.
 */
export async function searchLinear(query: string) {
  if (!process.env.LINEAR_API_KEY) return [];

  const result = await linear.searchIssues(query);
  return Promise.all(
    result.nodes.map(async (issue) => ({
      id: issue.id,
      title: issue.title,
      status: (await issue.state)?.name ?? null,
      url: issue.url,
    }))
  );
}
