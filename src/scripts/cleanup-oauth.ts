import { lt, or, and, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { oauthAuthCodes, oauthTokens } from "@/db/schema";

const CUTOFF_MS = 30 * 24 * 60 * 60 * 1000;

async function main() {
  const cutoff = new Date(Date.now() - CUTOFF_MS);

  const codeRes = await db
    .delete(oauthAuthCodes)
    .where(lt(oauthAuthCodes.expiresAt, cutoff))
    .returning();

  const tokenRes = await db
    .delete(oauthTokens)
    .where(
      or(
        lt(oauthTokens.expiresAt, cutoff),
        and(isNotNull(oauthTokens.revokedAt), lt(oauthTokens.revokedAt, cutoff))
      )
    )
    .returning();

  console.log(
    `cleaned up ${codeRes.length} auth codes and ${tokenRes.length} tokens older than 30 days`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
