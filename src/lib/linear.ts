import { LinearClient } from "@linear/sdk";

const linear = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY!,
});

// Status mappings
const STATUS_TO_LANE: Record<string, string> = {
  "In Progress": "now",
  Planned: "next",
  Backlog: "backlog",
  Completed: "done",
  Canceled: "done",
};

const LANE_TO_STATUS: Record<string, string> = {
  now: "In Progress",
  next: "Planned",
  backlog: "Backlog",
  done: "Completed",
};

const SIZE_THRESHOLDS = { S: 5, M: 15 } as const;

export function statusToLane(status: string): string {
  return STATUS_TO_LANE[status] ?? "backlog";
}

export function laneToStatus(lane: string): string {
  return LANE_TO_STATUS[lane] ?? "Backlog";
}

export function issueCountToSize(count: number): "S" | "M" | "L" {
  if (count < SIZE_THRESHOLDS.S) return "S";
  if (count <= SIZE_THRESHOLDS.M) return "M";
  return "L";
}

// --- Project operations ---

export interface LinearProjectSummary {
  id: string;
  name: string;
  description: string;
  status: string;
  url: string;
  leadName?: string;
  issueCountTotal: number;
  issueCountDone: number;
}

export async function fetchInitiativeProjects(
  initiativeName: string
): Promise<LinearProjectSummary[]> {
  if (!process.env.LINEAR_API_KEY) return [];

  const initiatives = await linear.initiatives({
    filter: { name: { eq: initiativeName } },
  });
  const initiative = initiatives.nodes[0];
  if (!initiative) return [];

  const projects = await initiative.projects();
  const results: LinearProjectSummary[] = [];

  for (const project of projects.nodes) {
    const status = (await project.status)?.name ?? "Backlog";
    const lead = await project.lead;
    const issues = await project.issues();

    let totalCount = 0;
    let doneCount = 0;
    for (const issue of issues.nodes) {
      totalCount++;
      const state = await issue.state;
      if (state?.type === "completed" || state?.type === "canceled") {
        doneCount++;
      }
    }

    results.push({
      id: project.id,
      name: project.name,
      description: project.description ?? "",
      status,
      url: project.url,
      leadName: lead?.name ?? undefined,
      issueCountTotal: totalCount,
      issueCountDone: doneCount,
    });
  }

  return results;
}

export async function updateProjectStatus(
  projectId: string,
  lane: string
): Promise<void> {
  if (!process.env.LINEAR_API_KEY) return;

  const targetStatusName = laneToStatus(lane);

  // Find the project status that matches the target name
  const project = await linear.project(projectId);
  const statuses = await linear.projectStatuses();
  const targetStatus = statuses.nodes.find(
    (s) => s.name === targetStatusName
  );

  if (targetStatus) {
    await linear.updateProject(projectId, {
      statusId: targetStatus.id,
    });
  }
}

// --- Issue operations ---

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  status: string;
  statusType: string;
  assigneeName?: string;
  assigneeId?: string;
  priority: number;
  priorityLabel: string;
  labels: string[];
  url: string;
}

export async function fetchProjectIssues(
  projectId: string
): Promise<LinearIssue[]> {
  if (!process.env.LINEAR_API_KEY) return [];

  const project = await linear.project(projectId);
  const issues = await project.issues();

  const results: LinearIssue[] = [];
  for (const issue of issues.nodes) {
    const state = await issue.state;
    const assignee = await issue.assignee;
    const labels = await issue.labels();

    results.push({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description ?? undefined,
      status: state?.name ?? "Unknown",
      statusType: state?.type ?? "unstarted",
      assigneeName: assignee?.name ?? undefined,
      assigneeId: assignee?.id ?? undefined,
      priority: issue.priority,
      priorityLabel: issue.priorityLabel,
      labels: labels.nodes.map((l) => l.name),
      url: issue.url,
    });
  }

  return results;
}

export async function createProjectIssue(
  projectId: string,
  title: string,
  teamId?: string
): Promise<{ id: string; identifier: string }> {
  // Get team from project if not provided
  if (!teamId) {
    const project = await linear.project(projectId);
    const teams = await project.teams();
    teamId = teams.nodes[0]?.id;
  }

  if (!teamId) throw new Error("No team found for project");

  const result = await linear.createIssue({
    title,
    teamId,
    projectId,
  });

  const issue = await result.issue;
  if (!issue) throw new Error("Failed to create issue");

  return { id: issue.id, identifier: issue.identifier };
}

export async function updateIssue(
  issueId: string,
  updates: { stateId?: string; assigneeId?: string | null }
): Promise<void> {
  await linear.updateIssue(issueId, updates);
}

// --- Team data (for dropdowns) ---

export interface TeamState {
  id: string;
  name: string;
  type: string;
}

export interface TeamMember {
  id: string;
  name: string;
}

let cachedStates: TeamState[] | null = null;
let cachedMembers: TeamMember[] | null = null;

export async function getTeamStates(teamKey = "PYR"): Promise<TeamState[]> {
  if (cachedStates) return cachedStates;

  const teams = await linear.teams({ filter: { key: { eq: teamKey } } });
  const team = teams.nodes[0];
  if (!team) return [];

  const states = await team.states();
  cachedStates = states.nodes.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
  }));
  return cachedStates;
}

export async function getTeamMembers(teamKey = "PYR"): Promise<TeamMember[]> {
  if (cachedMembers) return cachedMembers;

  const teams = await linear.teams({ filter: { key: { eq: teamKey } } });
  const team = teams.nodes[0];
  if (!team) return [];

  const members = await team.members();
  cachedMembers = members.nodes.map((m) => ({
    id: m.id,
    name: m.name,
  }));
  return cachedMembers;
}
