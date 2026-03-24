import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { proposals, initiatives } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest, notFound } from "@/lib/errors";
import { ReviewProposalSchema } from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const parsed = ReviewProposalSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  const [updated] = await db
    .update(proposals)
    .set({
      status: parsed.data.status,
      reviewerNotes: parsed.data.reviewerNotes,
      resolvedAt: new Date(),
      resolvedBy: user.oid,
      updatedAt: new Date(),
    })
    .where(eq(proposals.id, id))
    .returning();

  if (!updated) return notFound("Proposal not found");

  // If accepted, create an initiative from proposal data
  let initiative = null;
  if (parsed.data.status === "accepted") {
    [initiative] = await db
      .insert(initiatives)
      .values({
        pillarId: updated.pillarId,
        title: updated.title,
        size: updated.size,
        why: updated.why,
        lane: parsed.data.lane ?? "backlog",
        dependsOn: parsed.data.dependsOn ?? [],
        createdBy: user.oid,
        createdByName: user.name,
      })
      .returning();
  }

  return NextResponse.json({ proposal: updated, initiative });
}
