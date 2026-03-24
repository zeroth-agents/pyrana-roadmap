import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth-utils";
import { unauthorized } from "@/lib/errors";
import { updateIssue } from "@/lib/linear";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  try {
    await updateIssue(id, {
      stateId: body.stateId ?? undefined,
      assigneeId: body.assigneeId ?? undefined,
    });
    return NextResponse.json({ updated: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update issue", details: String(error) },
      { status: 500 }
    );
  }
}
