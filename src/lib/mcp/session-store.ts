import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

export interface Session {
  transport: WebStandardStreamableHTTPServerTransport;
  server: McpServer;
  userOid: string;
  lastSeen: number;
}

const IDLE_TTL_MS = 30 * 60 * 1000;
const REAP_INTERVAL_MS = 5 * 60 * 1000;

const sessions = new Map<string, Session>();
let reaperTimer: ReturnType<typeof setInterval> | null = null;

function startReaper() {
  if (reaperTimer) return;
  reaperTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.lastSeen > IDLE_TTL_MS) {
        session.transport.close().catch(() => {});
        session.server.close().catch(() => {});
        sessions.delete(id);
      }
    }
  }, REAP_INTERVAL_MS);
  reaperTimer.unref?.();
}
startReaper();

export function storeSession(sessionId: string, session: Session): void {
  sessions.set(sessionId, session);
}

export function getSession(sessionId: string): Session | undefined {
  const session = sessions.get(sessionId);
  if (session) session.lastSeen = Date.now();
  return session;
}

export function deleteSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (session) {
    session.transport.close().catch(() => {});
    session.server.close().catch(() => {});
    sessions.delete(sessionId);
    return true;
  }
  return false;
}
