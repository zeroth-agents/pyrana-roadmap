import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pillars, initiatives, ideas, comments, users } from "@/db/schema";
import type { AuthUser } from "@/lib/auth-utils";

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

export function registerReadTools(server: McpServer, user: AuthUser) {
  server.registerTool(
    "whoami",
    {
      description: "Return the current authenticated user and granted scopes.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => textResult({ oid: user.oid, name: user.name, scopes: user.scopes })
  );

  server.registerTool(
    "list_pillars",
    {
      description: "List all pillars with descriptions and customer stories.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => textResult(await db.select().from(pillars).orderBy(pillars.sortOrder))
  );

  server.registerTool(
    "list_initiatives",
    {
      description: "List initiatives, optionally filtered by pillar, lane, or assignee.",
      inputSchema: {
        pillarId: z.string().uuid().optional().describe("Filter by pillar UUID"),
        lane: z.enum(["now", "next", "backlog", "done"]).optional().describe("Filter by lane"),
        assigneeId: z.string().uuid().optional().describe("Filter by assignee UUID"),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const conditions = [];
      if (args.pillarId) conditions.push(eq(initiatives.pillarId, args.pillarId));
      if (args.lane) conditions.push(eq(initiatives.lane, args.lane));
      if (args.assigneeId) conditions.push(eq(initiatives.assigneeId, args.assigneeId));
      const q = conditions.length
        ? db.select().from(initiatives).where(and(...conditions))
        : db.select().from(initiatives);
      return textResult(await q);
    }
  );

  server.registerTool(
    "get_initiative",
    {
      description: "Get a single initiative by id.",
      inputSchema: { id: z.string().uuid().describe("Initiative UUID") },
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const rows = await db.select().from(initiatives).where(eq(initiatives.id, args.id));
      if (rows.length === 0) throw new Error("not_found");
      return textResult(rows[0]);
    }
  );

  server.registerTool(
    "list_ideas",
    {
      description: "List ideas, optionally filtered by status or pillar.",
      inputSchema: {
        status: z.enum(["open", "promoted", "archived"]).optional().describe("Filter by status"),
        pillarId: z.string().uuid().optional().describe("Filter by pillar UUID"),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const conditions = [];
      if (args.status) conditions.push(eq(ideas.status, args.status));
      if (args.pillarId) conditions.push(eq(ideas.pillarId, args.pillarId));
      const q = conditions.length
        ? db.select().from(ideas).where(and(...conditions))
        : db.select().from(ideas);
      return textResult(await q);
    }
  );

  server.registerTool(
    "get_idea",
    {
      description: "Get a single idea by id.",
      inputSchema: { id: z.string().uuid().describe("Idea UUID") },
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const rows = await db.select().from(ideas).where(eq(ideas.id, args.id));
      if (rows.length === 0) throw new Error("not_found");
      return textResult(rows[0]);
    }
  );

  server.registerTool(
    "list_comments",
    {
      description: "List comments for a pillar, initiative, or idea.",
      inputSchema: {
        targetType: z.enum(["pillar", "initiative", "idea"]).describe("Target entity type"),
        targetId: z.string().uuid().describe("Target entity UUID"),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      textResult(
        await db
          .select()
          .from(comments)
          .where(
            and(eq(comments.targetType, args.targetType), eq(comments.targetId, args.targetId))
          )
      )
  );

  server.registerTool(
    "list_users",
    {
      description: "List team members (for assignee lookups).",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () =>
      textResult(await db.select({ id: users.id, name: users.name, email: users.email }).from(users))
  );
}
