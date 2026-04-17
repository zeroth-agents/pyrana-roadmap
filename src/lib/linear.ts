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

export interface LinearMilestone {
  name: string;
  description: string;
  progress: number;
  sortOrder: number;
}

export interface LinearProjectSummary {
  id: string;
  name: string;
  description: string;
  content: string;
  status: string;
  url: string;
  leadName?: string;
  leadId?: string;
  milestones: LinearMilestone[];
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
    const milestonesData = await project.projectMilestones();

    let totalCount = 0;
    let doneCount = 0;
    for (const issue of issues.nodes) {
      totalCount++;
      const state = await issue.state;
      if (state?.type === "completed" || state?.type === "canceled") {
        doneCount++;
      }
    }

    const milestones: LinearMilestone[] = milestonesData.nodes
      .map((m) => ({
        name: m.name,
        description: m.description ?? "",
        progress: m.progress,
        sortOrder: m.sortOrder,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    results.push({
      id: project.id,
      name: project.name,
      description: project.description ?? "",
      content: project.content ?? "",
      status,
      url: project.url,
      leadName: lead?.name ?? undefined,
      leadId: lead?.id ?? undefined,
      milestones,
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

// --- Project snapshot (for webhook refresh) ---

interface ProjectSnapshotResponse {
  project: {
    issues: {
      nodes: Array<{ state: { type: string } | null }>;
    };
    projectMilestones: {
      nodes: Array<{
        name: string;
        description: string | null;
        progress: number;
        sortOrder: number;
      }>;
    };
  };
}

const PROJECT_SNAPSHOT_QUERY = `
  query ProjectSnapshot($id: String!) {
    project(id: $id) {
      issues {
        nodes {
          state { type }
        }
      }
      projectMilestones {
        nodes {
          name
          description
          progress
          sortOrder
        }
      }
    }
  }
`;

export interface ProjectSnapshot {
  issueCountTotal: number;
  issueCountDone: number;
  milestones: LinearMilestone[];
}

export async function fetchProjectSnapshot(
  projectId: string
): Promise<ProjectSnapshot | null> {
  if (!process.env.LINEAR_API_KEY) return null;

  const data = await linear.client.request<ProjectSnapshotResponse, { id: string }>(
    PROJECT_SNAPSHOT_QUERY,
    { id: projectId }
  );

  const issues = data.project.issues.nodes;
  let doneCount = 0;
  for (const issue of issues) {
    if (issue.state?.type === "completed" || issue.state?.type === "canceled") {
      doneCount++;
    }
  }

  const milestones = data.project.projectMilestones.nodes
    .map((m) => ({
      name: m.name,
      description: m.description ?? "",
      progress: m.progress,
      sortOrder: m.sortOrder,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    issueCountTotal: issues.length,
    issueCountDone: doneCount,
    milestones,
  };
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

interface ProjectIssuesResponse {
  project: {
    issues: {
      nodes: Array<{
        id: string;
        identifier: string;
        title: string;
        description?: string;
        priority: number;
        priorityLabel: string;
        url: string;
        state: { name: string; type: string } | null;
        assignee: { id: string; name: string } | null;
        labels: { nodes: Array<{ name: string }> };
      }>;
    };
  };
}

const PROJECT_ISSUES_QUERY = `
  query ProjectIssues($id: String!) {
    project(id: $id) {
      issues {
        nodes {
          id
          identifier
          title
          description
          priority
          priorityLabel
          url
          state { name type }
          assignee { id name }
          labels { nodes { name } }
        }
      }
    }
  }
`;

export async function fetchProjectIssues(
  projectId: string
): Promise<LinearIssue[]> {
  if (!process.env.LINEAR_API_KEY) return [];

  const data = await linear.client.request<ProjectIssuesResponse, { id: string }>(
    PROJECT_ISSUES_QUERY,
    { id: projectId }
  );

  return data.project.issues.nodes.map((issue) => ({
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description ?? undefined,
    status: issue.state?.name ?? "Unknown",
    statusType: issue.state?.type ?? "unstarted",
    assigneeName: issue.assignee?.name ?? undefined,
    assigneeId: issue.assignee?.id ?? undefined,
    priority: issue.priority,
    priorityLabel: issue.priorityLabel,
    labels: issue.labels.nodes.map((l) => l.name),
    url: issue.url,
  }));
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

// --- Project creation (for idea promotion) ---

export async function createLinearProject(
  title: string,
  description: string,
  leadId?: string,
  teamKey = "PYR"
): Promise<{ id: string; url: string }> {
  if (!process.env.LINEAR_API_KEY) {
    throw new Error("LINEAR_API_KEY not configured");
  }

  // Get team
  const teams = await linear.teams({ filter: { key: { eq: teamKey } } });
  const team = teams.nodes[0];
  if (!team) throw new Error(`Team "${teamKey}" not found`);

  // Create project
  const result = await linear.createProject({
    name: title,
    description,
    teamIds: [team.id],
    ...(leadId ? { leadId } : {}),
  });

  const project = await result.project;
  if (!project) throw new Error("Failed to create Linear project");

  return { id: project.id, url: project.url };
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
  email?: string;
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
    email: m.email ?? undefined,
  }));
  return cachedMembers;
}

// --- Open project search ---

export interface LinearProjectSearchResult {
  id: string;
  name: string;
  status: string;
  url: string;
}

export async function searchOpenProjects(
  q: string
): Promise<LinearProjectSearchResult[]> {
  if (!process.env.LINEAR_API_KEY) return [];
  const trimmed = q.trim();
  if (!trimmed) return [];

  const projects = await linear.projects({
    filter: { name: { containsIgnoreCase: trimmed } },
    first: 20,
  });

  const results: LinearProjectSearchResult[] = [];
  for (const project of projects.nodes) {
    const status = await project.status;
    const statusType = status?.type ?? "unstarted";
    if (statusType === "completed" || statusType === "canceled") continue;
    results.push({
      id: project.id,
      name: project.name,
      status: status?.name ?? "Backlog",
      url: project.url,
    });
  }
  return results;
}

export async function getProjectById(
  id: string
): Promise<{ id: string; url: string } | null> {
  if (!process.env.LINEAR_API_KEY) return null;
  const project = await linear.project(id);
  if (!project) return null;
  return { id: project.id, url: project.url };
}
