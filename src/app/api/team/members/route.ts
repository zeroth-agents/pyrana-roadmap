import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth-utils";
import { unauthorized } from "@/lib/errors";
import { getTeamMembers } from "@/lib/linear";

export async function GET(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const members = await getTeamMembers();
  return NextResponse.json(members);
}
