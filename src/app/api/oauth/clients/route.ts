import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { auth } from "../../../../../auth";
import { db } from "@/db";
import { oauthClients, oauthTokens } from "@/db/schema";
import { createManualClient } from "@/lib/oauth/clients";
import { badRequest, unauthorized } from "@/lib/errors";

export const dynamic = "force-dynamic";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { oid: session.user.id, name: session.user.name ?? "" };
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  redirect_uris: z.array(z.string().url()).min(1),
  scopes: z.array(z.enum(["read", "write"])).optional(),
});

export async function GET() {
  const user = await requireSession();
  if (!user) return unauthorized();

  // Manual clients owned by this user
  const manual = await db
    .select()
    .from(oauthClients)
    .where(
      and(eq(oauthClients.ownerOid, user.oid), eq(oauthClients.registrationType, "manual"))
    );

  // DCR clients that currently hold non-revoked tokens for this user
  const activeTokenClients = await db
    .select({ clientId: oauthTokens.clientId })
    .from(oauthTokens)
    .where(and(eq(oauthTokens.userOid, user.oid), isNull(oauthTokens.revokedAt)));
  const uniqueClientIds = Array.from(new Set(activeTokenClients.map((r) => r.clientId)));
  const connected = uniqueClientIds.length
    ? await db
        .select()
        .from(oauthClients)
        .where(inArray(oauthClients.clientId, uniqueClientIds))
    : [];

  return NextResponse.json({
    manual: manual.map((c) => ({
      clientId: c.clientId,
      name: c.name,
      redirectUris: c.redirectUris,
      scopes: c.scopes,
      clientSecretPrefix: c.clientSecretPrefix,
      createdAt: c.createdAt,
    })),
    connected: connected.map((c) => ({
      clientId: c.clientId,
      name: c.name,
      registrationType: c.registrationType,
    })),
  });
}

export async function POST(request: Request) {
  const user = await requireSession();
  if (!user) return unauthorized();

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return badRequest("invalid JSON");
  }
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return badRequest("invalid request");

  const scopes = parsed.data.scopes ?? ["read"];
  const { client, clientSecret } = await createManualClient({
    name: parsed.data.name,
    redirectUris: parsed.data.redirect_uris,
    scopes,
    ownerOid: user.oid,
  });

  return NextResponse.json(
    {
      client_id: client.clientId,
      client_secret: clientSecret,
      name: client.name,
      redirect_uris: client.redirectUris,
      scopes: client.scopes,
    },
    { status: 201 }
  );
}
