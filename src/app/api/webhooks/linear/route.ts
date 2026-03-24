import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { initiatives } from "@/db/schema";
import { verifyLinearSignature } from "@/lib/linear-webhook";
import { unauthorized } from "@/lib/errors";

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

  // Handle issue updates from Linear
  if (type === "Issue" && data?.id) {
    const linearId = data.id;

    if (action === "update") {
      await db
        .update(initiatives)
        .set({
          linearStatus: data.state?.name ?? null,
          linearAssignee: data.assignee?.name ?? null,
          linearSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(initiatives.linearId, linearId));
    }
  }

  return NextResponse.json({ received: true });
}
