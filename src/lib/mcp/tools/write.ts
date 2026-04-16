import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { ideas, ideaVotes, initiatives, comments } from "@/db/schema";
import { requireScope } from "@/lib/mcp/require-scope";
import type { AuthUser } from "@/lib/auth-utils";

export const writeTools = {
  create_idea: {
    description: "Create a new idea.",
    inputSchema: z.object({
      title: z.string().min(1).max(500),
      body: z.string().default(""),
      pillarId: z.string().uuid().optional(),
    }),
    handler: async (
      user: AuthUser,
      args: { title: string; body: string; pillarId?: string }
    ) => {
      requireScope(user, "write");
      const [row] = await db
        .insert(ideas)
        .values({
          title: args.title,
          body: args.body,
          pillarId: args.pillarId ?? null,
          authorId: user.oid,
          authorName: user.name,
        })
        .returning();
      return row;
    },
  },

  update_idea: {
    description: "Update an existing idea.",
    inputSchema: z.object({
      id: z.string().uuid(),
      title: z.string().optional(),
      body: z.string().optional(),
      pillarId: z.string().uuid().nullable().optional(),
      status: z.enum(["open", "promoted", "archived"]).optional(),
    }),
    handler: async (
      user: AuthUser,
      args: {
        id: string;
        title?: string;
        body?: string;
        pillarId?: string | null;
        status?: "open" | "promoted" | "archived";
      }
    ) => {
      requireScope(user, "write");
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (args.title !== undefined) updates.title = args.title;
      if (args.body !== undefined) updates.body = args.body;
      if (args.pillarId !== undefined) updates.pillarId = args.pillarId;
      if (args.status !== undefined) updates.status = args.status;
      const [row] = await db
        .update(ideas)
        .set(updates)
        .where(eq(ideas.id, args.id))
        .returning();
      if (!row) throw new Error("not_found");
      return row;
    },
  },

  vote_idea: {
    description: "Cast your vote on an idea (idempotent).",
    inputSchema: z.object({ id: z.string().uuid() }),
    handler: async (user: AuthUser, args: { id: string }) => {
      requireScope(user, "write");
      await db
        .insert(ideaVotes)
        .values({ ideaId: args.id, userId: user.oid, userName: user.name })
        .onConflictDoNothing();
      return { ok: true };
    },
  },

  unvote_idea: {
    description: "Remove your vote from an idea.",
    inputSchema: z.object({ id: z.string().uuid() }),
    handler: async (user: AuthUser, args: { id: string }) => {
      requireScope(user, "write");
      await db
        .delete(ideaVotes)
        .where(
          and(eq(ideaVotes.ideaId, args.id), eq(ideaVotes.userId, user.oid))
        );
      return { ok: true };
    },
  },

  promote_idea: {
    description: "Promote an idea into an initiative.",
    inputSchema: z.object({
      id: z.string().uuid(),
      pillarId: z.string().uuid(),
      lane: z.enum(["now", "next", "backlog", "done"]).default("backlog"),
      size: z.enum(["S", "M", "L"]).default("M"),
    }),
    handler: async (
      user: AuthUser,
      args: {
        id: string;
        pillarId: string;
        lane: "now" | "next" | "backlog" | "done";
        size: "S" | "M" | "L";
      }
    ) => {
      requireScope(user, "write");
      const existing = await db
        .select()
        .from(ideas)
        .where(eq(ideas.id, args.id));
      if (existing.length === 0) throw new Error("not_found");
      const idea = existing[0];

      return await db.transaction(async (tx) => {
        const [init] = await tx
          .insert(initiatives)
          .values({
            pillarId: args.pillarId,
            title: idea.title,
            lane: args.lane,
            size: args.size,
            why: idea.body,
            createdBy: user.oid,
            createdByName: user.name,
          })
          .returning();
        await tx
          .update(ideas)
          .set({
            status: "promoted",
            promotedInitiativeId: init.id,
            updatedAt: new Date(),
          })
          .where(eq(ideas.id, args.id));
        return init;
      });
    },
  },

  create_initiative: {
    description: "Create a new initiative under a pillar.",
    inputSchema: z.object({
      pillarId: z.string().uuid(),
      title: z.string().min(1).max(500),
      why: z.string().default(""),
      lane: z.enum(["now", "next", "backlog", "done"]).default("backlog"),
      size: z.enum(["S", "M", "L"]).default("M"),
      assigneeId: z.string().uuid().optional(),
    }),
    handler: async (
      user: AuthUser,
      args: {
        pillarId: string;
        title: string;
        why: string;
        lane: "now" | "next" | "backlog" | "done";
        size: "S" | "M" | "L";
        assigneeId?: string;
      }
    ) => {
      requireScope(user, "write");
      const [row] = await db
        .insert(initiatives)
        .values({
          pillarId: args.pillarId,
          title: args.title,
          why: args.why,
          lane: args.lane,
          size: args.size,
          assigneeId: args.assigneeId ?? null,
          createdBy: user.oid,
          createdByName: user.name,
        })
        .returning();
      return row;
    },
  },

  update_initiative: {
    description: "Update fields on an initiative (including moving lanes).",
    inputSchema: z.object({
      id: z.string().uuid(),
      title: z.string().optional(),
      why: z.string().optional(),
      lane: z.enum(["now", "next", "backlog", "done"]).optional(),
      size: z.enum(["S", "M", "L"]).optional(),
      assigneeId: z.string().uuid().nullable().optional(),
      dependsOn: z.array(z.string().uuid()).optional(),
    }),
    handler: async (
      user: AuthUser,
      args: {
        id: string;
        title?: string;
        why?: string;
        lane?: "now" | "next" | "backlog" | "done";
        size?: "S" | "M" | "L";
        assigneeId?: string | null;
        dependsOn?: string[];
      }
    ) => {
      requireScope(user, "write");
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (args.title !== undefined) updates.title = args.title;
      if (args.why !== undefined) updates.why = args.why;
      if (args.lane !== undefined) updates.lane = args.lane;
      if (args.size !== undefined) updates.size = args.size;
      if (args.assigneeId !== undefined) updates.assigneeId = args.assigneeId;
      if (args.dependsOn !== undefined) updates.dependsOn = args.dependsOn;
      const [row] = await db
        .update(initiatives)
        .set(updates)
        .where(eq(initiatives.id, args.id))
        .returning();
      if (!row) throw new Error("not_found");
      return row;
    },
  },

  post_comment: {
    description: "Post a comment on a pillar, initiative, or idea.",
    inputSchema: z.object({
      targetType: z.enum(["pillar", "initiative", "idea"]),
      targetId: z.string().uuid(),
      body: z.string().min(1),
    }),
    handler: async (
      user: AuthUser,
      args: {
        targetType: "pillar" | "initiative" | "idea";
        targetId: string;
        body: string;
      }
    ) => {
      requireScope(user, "write");
      const [row] = await db
        .insert(comments)
        .values({
          targetType: args.targetType,
          targetId: args.targetId,
          body: args.body,
          author: user.oid,
          authorName: user.name,
        })
        .returning();
      return row;
    },
  },
};
