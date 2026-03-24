import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest } from "@/lib/errors";
import { fetchProjectIssues, createProjectIssue } from "@/lib/linear";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const { id } = await params;

  try {
    const issues = await fetchProjectIssues(id);
    return NextResponse.json(issues);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch issues", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  if (!body.title || typeof body.title !== "string") {
    return badRequest("Title is required");
  }

  try {
    const issue = await createProjectIssue(id, body.title);
    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create issue", details: String(error) },
      { status: 500 }
    );
  }
}
