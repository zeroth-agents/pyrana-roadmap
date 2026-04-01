import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { initiatives } from "@/db/schema";
import { verifyLinearSignature } from "@/lib/linear-webhook";
import { unauthorized } from "@/lib/errors";
import { statusToLane, issueCountToSize, fetchProjectSnapshot } from "@/lib/linear";

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
          lane: statusToLane(statusName) as "now" | "next" | "backlog" | "done",
          linearSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(initiatives.linearProjectId, data.id));
    }
  }

  // Handle issue events — re-fetch actual counts and milestones from Linear
  if (type === "Issue" && data?.project?.id) {
    const projectId = data.project.id;
    const snapshot = await fetchProjectSnapshot(projectId);

    if (snapshot) {
      await db
        .update(initiatives)
        .set({
          issueCountTotal: snapshot.issueCountTotal,
          issueCountDone: snapshot.issueCountDone,
          milestones: JSON.stringify(snapshot.milestones),
          size: issueCountToSize(snapshot.issueCountTotal) as "S" | "M" | "L",
          linearSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(initiatives.linearProjectId, projectId));
    }
  }

  return NextResponse.json({ received: true });
}
