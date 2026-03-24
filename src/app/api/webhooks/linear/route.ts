import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { initiatives } from "@/db/schema";
import { verifyLinearSignature } from "@/lib/linear-webhook";
import { unauthorized } from "@/lib/errors";
import { statusToLane, issueCountToSize } from "@/lib/linear";

const DONE_STATES = new Set(["Done", "Completed", "Canceled", "Cancelled"]);

export async function POST(request: Request) {
  const secret = process.env.LINEAR_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook not configured", code: "NOT_CONFIGURED" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("linear-signature") ?? "";

  if (!verifyLinearSignature(body, signature, secret)) {
    return unauthorized("Invalid webhook signature");
  }

  const payload = JSON.parse(body);
  const { action, type, data } = payload;

  // Handle project status changes
  if (type === "Project" && action === "update" && data?.id) {
    const statusName = data.state?.name ?? data.status?.name;
    if (statusName) {
      await db
        .update(initiatives)
        .set({
          lane: statusToLane(statusName) as any,
          linearSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(initiatives.linearProjectId, data.id));
    }
  }

  // Handle issue events — update counts via arithmetic
  if (type === "Issue" && data?.project?.id) {
    const projectId = data.project.id;
    const currentState = data.state?.name;
    const previousState = data.changes?.state?.name;

    if (action === "create") {
      // New issue: total +1, check if created as done
      const isDone = currentState && DONE_STATES.has(currentState);
      await db
        .update(initiatives)
        .set({
          issueCountTotal: sql`${initiatives.issueCountTotal} + 1`,
          ...(isDone ? { issueCountDone: sql`${initiatives.issueCountDone} + 1` } : {}),
          linearSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(initiatives.linearProjectId, projectId));
    } else if (action === "remove") {
      // Deleted issue: total -1, check if was done
      const wasDone = currentState && DONE_STATES.has(currentState);
      await db
        .update(initiatives)
        .set({
          issueCountTotal: sql`GREATEST(${initiatives.issueCountTotal} - 1, 0)`,
          ...(wasDone ? { issueCountDone: sql`GREATEST(${initiatives.issueCountDone} - 1, 0)` } : {}),
          linearSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(initiatives.linearProjectId, projectId));
    } else if (action === "update" && currentState && previousState) {
      // State transition
      const nowDone = DONE_STATES.has(currentState);
      const wasDone = DONE_STATES.has(previousState);

      if (nowDone && !wasDone) {
        // Moved TO done
        await db
          .update(initiatives)
          .set({
            issueCountDone: sql`${initiatives.issueCountDone} + 1`,
            linearSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(initiatives.linearProjectId, projectId));
      } else if (!nowDone && wasDone) {
        // Moved FROM done
        await db
          .update(initiatives)
          .set({
            issueCountDone: sql`GREATEST(${initiatives.issueCountDone} - 1, 0)`,
            linearSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(initiatives.linearProjectId, projectId));
      }
    }

    // Recalculate size after any issue count change
    const [updated] = await db
      .select({ issueCountTotal: initiatives.issueCountTotal })
      .from(initiatives)
      .where(eq(initiatives.linearProjectId, projectId))
      .limit(1);

    if (updated) {
      const newSize = issueCountToSize(updated.issueCountTotal);
      await db
        .update(initiatives)
        .set({ size: newSize as any })
        .where(eq(initiatives.linearProjectId, projectId));
    }
  }

  return NextResponse.json({ received: true });
}
