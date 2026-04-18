import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  attachments,
  comments,
  ideas,
  ideaVotes,
  initiatives,
} from "@/db/schema";
import { requireScope } from "@/lib/mcp/require-scope";
import type { AuthUser } from "@/lib/auth-utils";
import { parseDriveFileId } from "@/lib/attachment-utils";

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

export function registerWriteTools(server: McpServer, user: AuthUser) {
  server.registerTool(
    "create_idea",
    {
      description: "Create a new idea.",
      inputSchema: {
        title: z.string().min(1).max(500).describe("Idea title"),
        body: z.string().optional().describe("Idea body/description"),
        pillarId: z.string().uuid().optional().describe("Optional pillar to attach to"),
      },
    },
    async (args) => {
      requireScope(user, "write");
      const [row] = await db
        .insert(ideas)
        .values({
          title: args.title,
          body: args.body ?? "",
          pillarId: args.pillarId ?? null,
          authorId: user.oid,
          authorName: user.name,
        })
        .returning();
      return textResult(row);
    }
  );

  server.registerTool(
    "update_idea",
    {
      description: "Update an existing idea.",
      inputSchema: {
        id: z.string().uuid().describe("Idea UUID"),
        title: z.string().optional(),
        body: z.string().optional(),
        pillarId: z.string().uuid().nullable().optional(),
        status: z.enum(["open", "promoted", "archived"]).optional(),
      },
    },
    async (args) => {
      requireScope(user, "write");
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (args.title !== undefined) updates.title = args.title;
      if (args.body !== undefined) updates.body = args.body;
      if (args.pillarId !== undefined) updates.pillarId = args.pillarId;
      if (args.status !== undefined) updates.status = args.status;
      const [row] = await db.update(ideas).set(updates).where(eq(ideas.id, args.id)).returning();
      if (!row) throw new Error("not_found");
      return textResult(row);
    }
  );

  server.registerTool(
    "archive_idea",
    {
      description: "Archive an idea (soft-hide; preserves history). Idempotent.",
      inputSchema: { id: z.string().uuid().describe("Idea UUID") },
    },
    async (args) => {
      requireScope(user, "write");
      const [row] = await db
        .update(ideas)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(ideas.id, args.id))
        .returning();
      if (!row) throw new Error("not_found");
      return textResult(row);
    }
  );

  server.registerTool(
    "unarchive_idea",
    {
      description: "Restore an archived idea back to open status. Idempotent.",
      inputSchema: { id: z.string().uuid().describe("Idea UUID") },
    },
    async (args) => {
      requireScope(user, "write");
      const [row] = await db
        .update(ideas)
        .set({ status: "open", updatedAt: new Date() })
        .where(eq(ideas.id, args.id))
        .returning();
      if (!row) throw new Error("not_found");
      return textResult(row);
    }
  );

  server.registerTool(
    "vote_idea",
    {
      description: "Cast your vote on an idea (idempotent).",
      inputSchema: { id: z.string().uuid().describe("Idea UUID") },
    },
    async (args) => {
      requireScope(user, "write");
      await db
        .insert(ideaVotes)
        .values({ ideaId: args.id, userId: user.oid, userName: user.name })
        .onConflictDoNothing();
      return textResult({ ok: true });
    }
  );

  server.registerTool(
    "unvote_idea",
    {
      description: "Remove your vote from an idea.",
      inputSchema: { id: z.string().uuid().describe("Idea UUID") },
    },
    async (args) => {
      requireScope(user, "write");
      await db
        .delete(ideaVotes)
        .where(and(eq(ideaVotes.ideaId, args.id), eq(ideaVotes.userId, user.oid)));
      return textResult({ ok: true });
    }
  );

  server.registerTool(
    "promote_idea",
    {
      description: "Promote an idea into an initiative.",
      inputSchema: {
        id: z.string().uuid().describe("Idea UUID"),
        pillarId: z.string().uuid().describe("Pillar to create initiative under"),
        lane: z.enum(["now", "next", "backlog", "done"]).optional().describe("Lane (default: backlog)"),
        size: z.enum(["S", "M", "L"]).optional().describe("Size (default: M)"),
      },
    },
    async (args) => {
      requireScope(user, "write");
      const existing = await db.select().from(ideas).where(eq(ideas.id, args.id));
      if (existing.length === 0) throw new Error("not_found");
      const idea = existing[0];
      const result = await db.transaction(async (tx) => {
        const [init] = await tx
          .insert(initiatives)
          .values({
            pillarId: args.pillarId,
            title: idea.title,
            lane: args.lane ?? "backlog",
            size: args.size ?? "M",
            why: idea.body,
            createdBy: user.oid,
            createdByName: user.name,
          })
          .returning();
        await tx
          .update(ideas)
          .set({ status: "promoted", promotedInitiativeId: init.id, updatedAt: new Date() })
          .where(eq(ideas.id, args.id));
        return init;
      });
      return textResult(result);
    }
  );

  server.registerTool(
    "create_initiative",
    {
      description: "Create a new initiative under a pillar.",
      inputSchema: {
        pillarId: z.string().uuid().describe("Pillar UUID"),
        title: z.string().min(1).max(500).describe("Initiative title"),
        why: z.string().optional().describe("Why this initiative matters"),
        lane: z.enum(["now", "next", "backlog", "done"]).optional().describe("Lane (default: backlog)"),
        size: z.enum(["S", "M", "L"]).optional().describe("Size (default: M)"),
        assigneeId: z.string().uuid().optional().describe("Assignee user UUID"),
      },
    },
    async (args) => {
      requireScope(user, "write");
      const [row] = await db
        .insert(initiatives)
        .values({
          pillarId: args.pillarId,
          title: args.title,
          why: args.why ?? "",
          lane: args.lane ?? "backlog",
          size: args.size ?? "M",
          assigneeId: args.assigneeId ?? null,
          createdBy: user.oid,
          createdByName: user.name,
        })
        .returning();
      return textResult(row);
    }
  );

  server.registerTool(
    "update_initiative",
    {
      description: "Update fields on an initiative (including moving lanes).",
      inputSchema: {
        id: z.string().uuid().describe("Initiative UUID"),
        title: z.string().optional(),
        why: z.string().optional(),
        lane: z.enum(["now", "next", "backlog", "done"]).optional(),
        size: z.enum(["S", "M", "L"]).optional(),
        assigneeId: z.string().uuid().nullable().optional(),
      },
    },
    async (args) => {
      requireScope(user, "write");
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (args.title !== undefined) updates.title = args.title;
      if (args.why !== undefined) updates.why = args.why;
      if (args.lane !== undefined) updates.lane = args.lane;
      if (args.size !== undefined) updates.size = args.size;
      if (args.assigneeId !== undefined) updates.assigneeId = args.assigneeId;
      const [row] = await db
        .update(initiatives)
        .set(updates)
        .where(eq(initiatives.id, args.id))
        .returning();
      if (!row) throw new Error("not_found");
      return textResult(row);
    }
  );

  server.registerTool(
    "reorder_initiatives",
    {
      description:
        "Bulk reorder initiatives within or across lanes/pillars. Applies sortOrder and optional lane/pillar moves.",
      inputSchema: {
        items: z
          .array(
            z.object({
              id: z.string().uuid(),
              sortOrder: z.number().int(),
              lane: z.enum(["now", "next", "backlog", "done"]).optional(),
              pillarId: z.string().uuid().optional(),
            })
          )
          .min(1)
          .describe("Items to reorder; each with new sortOrder and optional lane/pillar"),
      },
    },
    async (args) => {
      requireScope(user, "write");
      await Promise.all(
        args.items.map((item) =>
          db
            .update(initiatives)
            .set({
              sortOrder: item.sortOrder,
              ...(item.lane && { lane: item.lane }),
              ...(item.pillarId && { pillarId: item.pillarId }),
              updatedAt: new Date(),
            })
            .where(eq(initiatives.id, item.id))
        )
      );
      return textResult({ ok: true, count: args.items.length });
    }
  );

  server.registerTool(
    "post_comment",
    {
      description: "Post a comment on a pillar, initiative, or idea.",
      inputSchema: {
        targetType: z.enum(["pillar", "initiative", "idea"]).describe("Target entity type"),
        targetId: z.string().uuid().describe("Target entity UUID"),
        body: z.string().min(1).describe("Comment body"),
      },
    },
    async (args) => {
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
      return textResult(row);
    }
  );

  server.registerTool(
    "sync_linear",
    {
      description:
        "Run a full Linear → roadmap sync. Matches Linear initiative projects to DB pillars by name and upserts initiatives.",
      inputSchema: {},
    },
    async () => {
      requireScope(user, "write");
      const { runFullSync } = await import("@/lib/linear-sync");
      const result = await runFullSync();
      return textResult(result);
    }
  );

  server.registerTool(
    "link_attachment",
    {
      description:
        "Attach an existing Google Drive file to an idea or initiative by URL. (File upload is not supported over MCP — link only.)",
      inputSchema: {
        targetType: z.enum(["idea", "initiative"]).describe("Target entity type"),
        targetId: z.string().uuid().describe("Target entity UUID"),
        driveUrl: z.string().url().describe("Google Drive file URL"),
      },
    },
    async (args) => {
      requireScope(user, "write");

      const driveFileId = parseDriveFileId(args.driveUrl);
      if (!driveFileId) throw new Error("Unrecognized Google Drive URL format");

      const { getFileMetadata } = await import("@/lib/google-drive");
      const metadata = await getFileMetadata(driveFileId);
      if (!metadata) {
        throw new Error(
          "Unable to access this Drive file — ensure it is shared with the service account"
        );
      }

      if (args.targetType === "idea") {
        const [idea] = await db.select().from(ideas).where(eq(ideas.id, args.targetId));
        if (!idea) throw new Error("not_found");
        if (idea.status !== "open") {
          throw new Error("Cannot attach files to a promoted/archived idea");
        }
      } else {
        const [init] = await db
          .select()
          .from(initiatives)
          .where(eq(initiatives.id, args.targetId));
        if (!init) throw new Error("not_found");
      }

      const [row] = await db
        .insert(attachments)
        .values({
          targetType: args.targetType,
          targetId: args.targetId,
          fileName: metadata.name,
          mimeType: metadata.mimeType,
          driveFileId: metadata.id,
          driveUrl: metadata.webViewLink,
          driveFolderId: null,
          uploadedBy: user.oid,
          uploadedByName: user.name,
        })
        .returning();
      return textResult(row);
    }
  );

  server.registerTool(
    "delete_attachment",
    {
      description:
        "Remove an attachment. If it was uploaded (has a driveFolderId), the Drive file is also deleted; linked files are only unlinked.",
      inputSchema: { id: z.string().uuid().describe("Attachment UUID") },
    },
    async (args) => {
      requireScope(user, "write");
      const [row] = await db.select().from(attachments).where(eq(attachments.id, args.id));
      if (!row) throw new Error("not_found");

      if (row.driveFolderId) {
        try {
          const { deleteFile } = await import("@/lib/google-drive");
          await deleteFile(row.driveFileId);
        } catch (err) {
          console.warn(`Failed to delete Drive file ${row.driveFileId}:`, err);
        }
      }
      await db.delete(attachments).where(eq(attachments.id, args.id));
      return textResult({ ok: true, id: args.id });
    }
  );
}
