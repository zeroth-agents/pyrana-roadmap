import { randomUUID } from "crypto";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { getUser } from "@/lib/auth-utils";
import { createMcpServer } from "@/lib/mcp/server";
import { storeSession, getSession, deleteSession } from "@/lib/mcp/session-store";
import { registerPromptsFromDb } from "@/lib/mcp/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorizedWithDiscovery(origin: string) {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      "content-type": "application/json",
      "www-authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
    },
  });
}

function jsonRpcError(status: number, message: string, id: unknown = null) {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id }),
    { status, headers: { "content-type": "application/json" } }
  );
}

export async function POST(request: Request) {
  const origin = process.env.APP_URL ?? new URL(request.url).origin;
  const user = await getUser(request.headers);
  if (!user) return unauthorizedWithDiscovery(origin);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonRpcError(400, "Invalid JSON");
  }

  const sessionId = request.headers.get("mcp-session-id");

  // Existing session
  if (sessionId) {
    const session = getSession(sessionId);
    if (!session) return jsonRpcError(404, "Session not found. Re-initialize.");
    if (session.userOid !== user.oid) return jsonRpcError(403, "Forbidden");
    return session.transport.handleRequest(request, { parsedBody: body });
  }

  // New session (must be initialize)
  if (isInitializeRequest(body)) {
    const server = createMcpServer(user);
    const prompts = await registerPromptsFromDb(server);

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        storeSession(sid, {
          transport,
          server,
          userOid: user.oid,
          lastSeen: Date.now(),
          prompts,
        });
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) deleteSession(transport.sessionId);
    };

    await server.connect(transport);

    return transport.handleRequest(request, { parsedBody: body });
  }

  return jsonRpcError(400, "Missing Mcp-Session-Id header or not an initialize request");
}

export async function GET(request: Request) {
  const origin = process.env.APP_URL ?? new URL(request.url).origin;
  const user = await getUser(request.headers);
  if (!user) return unauthorizedWithDiscovery(origin);

  const sessionId = request.headers.get("mcp-session-id");
  if (!sessionId) return jsonRpcError(400, "Missing Mcp-Session-Id header");

  const session = getSession(sessionId);
  if (!session) return jsonRpcError(404, "Session not found. Re-initialize.");
  if (session.userOid !== user.oid) return jsonRpcError(403, "Forbidden");

  return session.transport.handleRequest(request);
}

export async function DELETE(request: Request) {
  const origin = process.env.APP_URL ?? new URL(request.url).origin;
  const user = await getUser(request.headers);
  if (!user) return unauthorizedWithDiscovery(origin);

  const sessionId = request.headers.get("mcp-session-id");
  if (!sessionId) return jsonRpcError(400, "Missing Mcp-Session-Id header");

  const session = getSession(sessionId);
  if (!session) return jsonRpcError(404, "Session not found");
  if (session.userOid !== user.oid) return jsonRpcError(403, "Forbidden");

  deleteSession(sessionId);
  return new Response(null, { status: 204 });
}
