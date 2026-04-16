import { NextResponse } from "next/server";
import { getClientByClientId, verifyClientSecret } from "@/lib/oauth/clients";
import { hashToken } from "@/lib/oauth/crypto";
import { db } from "@/db";
import { oauthTokens } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

function parseBasicAuth(header: string | null): { id: string; secret: string } | null {
  if (!header?.startsWith("Basic ")) return null;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const idx = decoded.indexOf(":");
  if (idx < 0) return null;
  return { id: decoded.slice(0, idx), secret: decoded.slice(idx + 1) };
}

export async function POST(request: Request) {
  const text = await request.text();
  const form = new URLSearchParams(text);
  const token = form.get("token");
  const basic = parseBasicAuth(request.headers.get("authorization"));
  const clientId = basic?.id ?? form.get("client_id");
  const clientSecret = basic?.secret ?? form.get("client_secret");
  if (!token || !clientId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const client = await getClientByClientId(clientId);
  if (!client) return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  if (client.clientType === "confidential") {
    if (!clientSecret || !(await verifyClientSecret(client, clientSecret))) {
      return NextResponse.json({ error: "invalid_client" }, { status: 401 });
    }
  }

  await db
    .update(oauthTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(oauthTokens.tokenHash, hashToken(token)),
        eq(oauthTokens.clientId, client.clientId),
        isNull(oauthTokens.revokedAt)
      )
    );

  return NextResponse.json({}, { status: 200 });
}
