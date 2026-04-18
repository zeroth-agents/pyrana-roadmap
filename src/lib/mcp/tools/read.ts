import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { and, asc, desc, eq, ilike, or, SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  pillars,
  initiatives,
  ideas,
  comments,
  users,
  attachments,
} from "@/db/schema";
import type { AuthUser } from "@/lib/auth-utils";

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

const limitSchema = z
  .number()
  .int()
  .min(1)
  .max(200)
  .optional()
  .describe("Max rows to return (1-200, default 50)");
const offsetSchema = z
  .number()
  .int()
  .min(0)
  .optional()
  .describe("Rows to skip (default 0)");
const sortDirSchema = z
  .enum(["asc", "desc"])
  .optional()
  .describe("Sort direction (default depends on sortBy)");

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
      description:
        "List initiatives with optional filters, text search, sort, and pagination.",
      inputSchema: {
        pillarId: z.string().uuid().optional().describe("Filter by pillar UUID"),
        lane: z
          .enum(["now", "next", "backlog", "done"])
          .optional()
          .describe("Filter by lane"),
        assigneeId: z.string().uuid().optional().describe("Filter by assignee UUID"),
        q: z
          .string()
          .trim()
          .min(1)
          .optional()
          .describe("Case-insensitive search across title and why"),
        sortBy: z
          .enum(["sortOrder", "createdAt", "updatedAt", "title"])
          .optional()
          .describe("Sort column (default: sortOrder)"),
        sortDir: sortDirSchema,
        limit: limitSchema,
        offset: offsetSchema,
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const conditions: SQL[] = [];
      if (args.pillarId) conditions.push(eq(initiatives.pillarId, args.pillarId));
      if (args.lane) conditions.push(eq(initiatives.lane, args.lane));
      if (args.assigneeId) conditions.push(eq(initiatives.assigneeId, args.assigneeId));
      if (args.q) {
        const pat = `%${args.q}%`;
        conditions.push(or(ilike(initiatives.title, pat), ilike(initiatives.why, pat))!);
      }

      const sortBy = args.sortBy ?? "sortOrder";
      const sortDir = args.sortDir ?? (sortBy === "sortOrder" ? "asc" : "desc");
      const col =
        sortBy === "title"
          ? initiatives.title
          : sortBy === "createdAt"
            ? initiatives.createdAt
            : sortBy === "updatedAt"
              ? initiatives.updatedAt
              : initiatives.sortOrder;
      const orderBy = sortDir === "asc" ? asc(col) : desc(col);

      const limit = args.limit ?? 50;
      const offset = args.offset ?? 0;

      const base = db.select().from(initiatives);
      const withWhere = conditions.length ? base.where(and(...conditions)) : base;
      const rows = await withWhere.orderBy(orderBy).limit(limit).offset(offset);
      return textResult({ items: rows, limit, offset });
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
      description:
        "List ideas with optional filters, text search, sort, and pagination.",
      inputSchema: {
        status: z
          .enum(["open", "promoted", "archived"])
          .optional()
          .describe("Filter by status"),
        pillarId: z.string().uuid().optional().describe("Filter by pillar UUID"),
        assigneeId: z.string().uuid().optional().describe("Filter by assignee UUID"),
        q: z
          .string()
          .trim()
          .min(1)
          .optional()
          .describe("Case-insensitive search across title and body"),
        sortBy: z
          .enum(["createdAt", "updatedAt", "title", "priorityScore"])
          .optional()
          .describe("Sort column (default: createdAt)"),
        sortDir: sortDirSchema,
        limit: limitSchema,
        offset: offsetSchema,
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const conditions: SQL[] = [];
      if (args.status) conditions.push(eq(ideas.status, args.status));
      if (args.pillarId) conditions.push(eq(ideas.pillarId, args.pillarId));
      if (args.assigneeId) conditions.push(eq(ideas.assigneeId, args.assigneeId));
      if (args.q) {
        const pat = `%${args.q}%`;
        conditions.push(or(ilike(ideas.title, pat), ilike(ideas.body, pat))!);
      }

      const sortBy = args.sortBy ?? "createdAt";
      const sortDir = args.sortDir ?? "desc";
      const col =
        sortBy === "title"
          ? ideas.title
          : sortBy === "updatedAt"
            ? ideas.updatedAt
            : sortBy === "priorityScore"
              ? ideas.priorityScore
              : ideas.createdAt;
      const orderBy = sortDir === "asc" ? asc(col) : desc(col);

      const limit = args.limit ?? 50;
      const offset = args.offset ?? 0;

      const base = db.select().from(ideas);
      const withWhere = conditions.length ? base.where(and(...conditions)) : base;
      const rows = await withWhere.orderBy(orderBy).limit(limit).offset(offset);
      return textResult({ items: rows, limit, offset });
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
      description:
        "List comments for a pillar, initiative, or idea, with optional text search and pagination.",
      inputSchema: {
        targetType: z
          .enum(["pillar", "initiative", "idea"])
          .describe("Target entity type"),
        targetId: z.string().uuid().describe("Target entity UUID"),
        q: z
          .string()
          .trim()
          .min(1)
          .optional()
          .describe("Case-insensitive search across comment body"),
        sortDir: sortDirSchema.describe(
          "Chronological sort direction (default: asc — oldest first)"
        ),
        limit: limitSchema,
        offset: offsetSchema,
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const conditions: SQL[] = [
        eq(comments.targetType, args.targetType),
        eq(comments.targetId, args.targetId),
      ];
      if (args.q) conditions.push(ilike(comments.body, `%${args.q}%`));

      const sortDir = args.sortDir ?? "asc";
      const orderBy = sortDir === "asc" ? asc(comments.createdAt) : desc(comments.createdAt);
      const limit = args.limit ?? 50;
      const offset = args.offset ?? 0;

      const rows = await db
        .select()
        .from(comments)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);
      return textResult({ items: rows, limit, offset });
    }
  );

  server.registerTool(
    "list_users",
    {
      description: "List team members (for assignee lookups).",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () =>
      textResult(
        await db.select({ id: users.id, name: users.name, email: users.email }).from(users)
      )
  );

  server.registerTool(
    "list_attachments",
    {
      description: "List attachments on an idea or initiative.",
      inputSchema: {
        targetType: z
          .enum(["idea", "initiative"])
          .describe("Target entity type"),
        targetId: z.string().uuid().describe("Target entity UUID"),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      textResult(
        await db
          .select()
          .from(attachments)
          .where(
            and(
              eq(attachments.targetType, args.targetType),
              eq(attachments.targetId, args.targetId)
            )
          )
          .orderBy(asc(attachments.createdAt))
      )
  );

  server.registerTool(
    "list_linear_projects",
    {
      description:
        "Search open Linear projects to link to an initiative. Returns id, name, url, status.",
      inputSchema: {
        q: z.string().optional().describe("Search query (default: empty — returns all open)"),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const { searchOpenProjects } = await import("@/lib/linear");
      return textResult(await searchOpenProjects(args.q ?? ""));
    }
  );
}
