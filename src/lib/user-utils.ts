import { db } from "@/db";
import { users } from "@/db/schema";

export async function upsertUser(
  entraOid: string,
  name: string,
  email?: string
) {
  const [user] = await db
    .insert(users)
    .values({
      entraOid,
      name,
      email: email ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.entraOid,
      set: {
        name,
        email: email ?? undefined,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}
