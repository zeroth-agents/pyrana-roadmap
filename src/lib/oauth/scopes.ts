export const ALL_SCOPES = ["read", "write"] as const;
export type Scope = (typeof ALL_SCOPES)[number];

export function parseScopes(raw: string | undefined): Scope[] {
  if (!raw) return [];
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const seen = new Set<Scope>();
  for (const t of tokens) {
    if (!(ALL_SCOPES as readonly string[]).includes(t)) {
      throw new Error(`unknown scope: ${t}`);
    }
    seen.add(t as Scope);
  }
  return Array.from(seen);
}

export function formatScopes(scopes: string[]): string {
  return scopes.join(" ");
}

export function isScopeSubset(requested: string[], allowed: string[]): boolean {
  const allowedSet = new Set(allowed);
  return requested.every((s) => allowedSet.has(s));
}
