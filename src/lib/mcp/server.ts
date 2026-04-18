import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerReadTools } from "./tools/read";
import { registerWriteTools } from "./tools/write";
import { registerResources } from "./resources";
import type { AuthUser } from "@/lib/auth-utils";

export function createMcpServer(user: AuthUser): McpServer {
  const server = new McpServer({
    name: "pyrana-roadmap",
    version: "0.3.0",
  });
  registerReadTools(server, user);
  registerWriteTools(server, user);
  registerResources(server);
  return server;
}
