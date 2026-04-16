import { z } from "zod";
import { db } from "@/db";
import { pillars, initiatives, ideas, comments, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { AuthUser } from "@/lib/auth-utils";

export const readTools = {
  whoami: {
    description: "Return the current authenticated user and granted scopes.",
    inputSchema: z.object({}),
    handler: async (user: AuthUser, _args: Record<string, never>) => {
      return { oid: user.oid, name: user.name, scopes: user.scopes };
    },
  },

  list_pillars: {
    description: "List all pillars with descriptions and customer stories.",
    inputSchema: z.object({}),
    handler: async (_user: AuthUser, _args: Record<string, never>) => {
      return await db.select().from(pillars).orderBy(pillars.sortOrder);
    },
  },

  list_initiatives: {
    description:
      "List initiatives, optionally filtered by pillar, lane, or assignee.",
    inputSchema: z.object({
      pillarId: z.string().uuid().optional(),
      lane: z.enum(["now", "next", "backlog", "done"]).optional(),
      assigneeId: z.string().uuid().optional(),
    }),
    handler: async (
      _user: AuthUser,
      args: {
        pillarId?: string;
        lane?: "now" | "next" | "backlog" | "done";
        assigneeId?: string;
      }
    ) => {
      const conditions = [];
      if (args.pillarId)
        conditions.push(eq(initiatives.pillarId, args.pillarId));
      if (args.lane) conditions.push(eq(initiatives.lane, args.lane));
      if (args.assigneeId)
        conditions.push(eq(initiatives.assigneeId, args.assigneeId));
      const q = conditions.length
        ? db.select().from(initiatives).where(and(...conditions))
        : db.select().from(initiatives);
      return await q;
    },
  },

  get_initiative: {
    description: "Get a single initiative by id.",
    inputSchema: z.object({ id: z.string().uuid() }),
    handler: async (_user: AuthUser, args: { id: string }) => {
      const rows = await db
        .select()
        .from(initiatives)
        .where(eq(initiatives.id, args.id));
      if (rows.length === 0) throw new Error("not_found");
      return rows[0];
    },
  },

  list_ideas: {
    description: "List ideas, optionally filtered by status or pillar.",
    inputSchema: z.object({
      status: z.enum(["open", "promoted", "archived"]).optional(),
      pillarId: z.string().uuid().optional(),
    }),
    handler: async (
      _user: AuthUser,
      args: {
        status?: "open" | "promoted" | "archived";
        pillarId?: string;
      }
    ) => {
      const conditions = [];
      if (args.status) conditions.push(eq(ideas.status, args.status));
      if (args.pillarId) conditions.push(eq(ideas.pillarId, args.pillarId));
      const q = conditions.length
        ? db.select().from(ideas).where(and(...conditions))
        : db.select().from(ideas);
      return await q;
    },
  },

  get_idea: {
    description: "Get a single idea by id.",
    inputSchema: z.object({ id: z.string().uuid() }),
    handler: async (_user: AuthUser, args: { id: string }) => {
      const rows = await db
        .select()
        .from(ideas)
        .where(eq(ideas.id, args.id));
      if (rows.length === 0) throw new Error("not_found");
      return rows[0];
    },
  },

  list_comments: {
    description: "List comments for a pillar, initiative, or idea.",
    inputSchema: z.object({
      targetType: z.enum(["pillar", "initiative", "idea"]),
      targetId: z.string().uuid(),
    }),
    handler: async (
      _user: AuthUser,
      args: {
        targetType: "pillar" | "initiative" | "idea";
        targetId: string;
      }
    ) => {
      return await db
        .select()
        .from(comments)
        .where(
          and(
            eq(comments.targetType, args.targetType),
            eq(comments.targetId, args.targetId)
          )
        );
    },
  },

  list_users: {
    description: "List team members (for assignee lookups).",
    inputSchema: z.object({}),
    handler: async (_user: AuthUser, _args: Record<string, never>) => {
      return await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users);
    },
  },
};
