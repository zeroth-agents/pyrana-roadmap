import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth-utils";
import { unauthorized } from "@/lib/errors";
import { runFullSync } from "@/lib/linear-sync";

export async function POST(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  try {
    const result = await runFullSync();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Full sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 }
    );
  }
}
