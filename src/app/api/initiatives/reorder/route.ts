import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { initiatives } from "@/db/schema";
import { getUser } from "@/lib/auth-utils";
import { unauthorized, badRequest } from "@/lib/errors";
import { ReorderSchema } from "@/types";

export async function POST(request: Request) {
  const user = await getUser(request.headers);
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = ReorderSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  const updates = parsed.data.map((item) =>
    db
      .update(initiatives)
      .set({
        sortOrder: item.sortOrder,
        ...(item.lane && { lane: item.lane }),
        ...(item.pillarId && { pillarId: item.pillarId }),
        updatedAt: new Date(),
      })
      .where(eq(initiatives.id, item.id))
  );

  await Promise.all(updates);

  return NextResponse.json({ message: "Reordered" });
}
