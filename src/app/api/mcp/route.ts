import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth-utils";
import { tools, type ToolName } from "@/lib/mcp/tools";
import { ScopeError } from "@/lib/mcp/require-scope";
import { createRateLimiter } from "@/lib/oauth/rate-limit";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

const rl = createRateLimiter({ limit: 60, windowMs: 60_000 });

function unauthorizedWithDiscovery(origin: string) {
  return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      "content-type": "application/json",
      "www-authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
    },
  });
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

function jsonRpcResult(id: string | number | null, result: unknown) {
  return { jsonrpc: "2.0" as const, id, result };
}
function jsonRpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0" as const, id, error: { code, message } };
}

export async function POST(request: Request) {
  const origin = process.env.APP_URL ?? new URL(request.url).origin;
  const user = await getUser(request.headers);
  if (!user) return unauthorizedWithDiscovery(origin);

  const bearer = request.headers.get("authorization")?.slice(7) ?? "";
  const rlKey = bearer ? createHash("sha256").update(bearer).digest("hex") : user.oid;
  if (!rl.check(rlKey)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: JsonRpcRequest;
  try {
    body = (await request.json()) as JsonRpcRequest;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const id = body.id ?? null;

  if (body.method === "initialize") {
    return NextResponse.json(
      jsonRpcResult(id, {
        protocolVersion: "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "pyrana-roadmap", version: "0.0.0" },
      })
    );
  }

  if (body.method === "tools/list") {
    return NextResponse.json(
      jsonRpcResult(id, {
        tools: Object.entries(tools).map(([name, t]) => ({
          name,
          description: t.description,
          inputSchema: { type: "object" }, // minimal; full JSON Schema conversion deferred
        })),
      })
    );
  }

  if (body.method === "tools/call") {
    const params = (body.params ?? {}) as {
      name: ToolName;
      arguments?: Record<string, unknown>;
    };
    const tool = tools[params.name];
    if (!tool) {
      return NextResponse.json(jsonRpcError(id, -32601, `unknown tool: ${params.name}`));
    }
    const parsed = tool.inputSchema.safeParse(params.arguments ?? {});
    if (!parsed.success) {
      return NextResponse.json(jsonRpcError(id, -32602, "invalid_argument"));
    }
    try {
      const result = await (tool.handler as (u: typeof user, a: unknown) => Promise<unknown>)(
        user,
        parsed.data
      );
      return NextResponse.json(
        jsonRpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(result) }],
        })
      );
    } catch (e) {
      if (e instanceof ScopeError) {
        return NextResponse.json(jsonRpcError(id, -32001, e.message), { status: 403 });
      }
      if ((e as Error).message === "not_found") {
        return NextResponse.json(jsonRpcError(id, -32004, "not_found"), { status: 404 });
      }
      return NextResponse.json(jsonRpcError(id, -32000, (e as Error).message), { status: 500 });
    }
  }

  return NextResponse.json(jsonRpcError(id, -32601, `unknown method: ${body.method}`));
}
