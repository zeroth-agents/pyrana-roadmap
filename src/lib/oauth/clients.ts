import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { oauthClients } from "@/db/schema";
import { generateToken, generateClientSecret, hashToken, tokenPrefix } from "./crypto";

export type OauthClient = typeof oauthClients.$inferSelect;

export function matchRedirectUri(requested: string, registered: string[]): boolean {
  if (registered.length === 0) return false;
  return registered.includes(requested);
}

export async function getClientByClientId(clientId: string): Promise<OauthClient | null> {
  const rows = await db.select().from(oauthClients).where(eq(oauthClients.clientId, clientId));
  return rows[0] ?? null;
}

export async function createDcrClient(input: {
  name: string;
  redirectUris: string[];
  scopes: string[];
}): Promise<OauthClient> {
  const clientId = `c_${generateToken()}`;
  const [row] = await db
    .insert(oauthClients)
    .values({
      clientId,
      clientType: "public",
      name: input.name,
      redirectUris: input.redirectUris,
      scopes: input.scopes,
      registrationType: "dcr",
      ownerOid: null,
    })
    .returning();
  return row;
}

export async function createManualClient(input: {
  name: string;
  redirectUris: string[];
  scopes: string[];
  ownerOid: string;
}): Promise<{ client: OauthClient; clientSecret: string }> {
  const clientId = `c_${generateToken()}`;
  const clientSecret = generateClientSecret();
  const [row] = await db
    .insert(oauthClients)
    .values({
      clientId,
      clientType: "confidential",
      clientSecretHash: hashToken(clientSecret),
      clientSecretPrefix: tokenPrefix(clientSecret),
      name: input.name,
      redirectUris: input.redirectUris,
      scopes: input.scopes,
      registrationType: "manual",
      ownerOid: input.ownerOid,
    })
    .returning();
  return { client: row, clientSecret };
}

export async function verifyClientSecret(
  client: OauthClient,
  secret: string
): Promise<boolean> {
  if (client.clientType !== "confidential" || !client.clientSecretHash) return false;
  return client.clientSecretHash === hashToken(secret);
}

export async function deleteClient(clientId: string, ownerOid: string): Promise<boolean> {
  const res = await db
    .delete(oauthClients)
    .where(and(eq(oauthClients.clientId, clientId), eq(oauthClients.ownerOid, ownerOid)))
    .returning();
  return res.length > 0;
}
