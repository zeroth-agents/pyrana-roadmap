import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth-utils";
import { unauthorized } from "@/lib/errors";
import { searchOpenProjects } from "@/lib/linear";

export async function GET(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const results = await searchOpenProjects(q);
  return NextResponse.json(results);
}
