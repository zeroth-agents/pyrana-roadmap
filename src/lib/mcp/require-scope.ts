import type { AuthUser } from "@/lib/auth-utils";

export class ScopeError extends Error {
  constructor(public readonly required: string) {
    super(`forbidden: missing scope ${required}`);
  }
}

export function requireScope(user: AuthUser, scope: "read" | "write"): void {
  if (!user.scopes.includes(scope)) throw new ScopeError(scope);
}
