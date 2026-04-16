import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/oauth/session";

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  read: "View pillars, initiatives, ideas, and comments",
  write: "Create, update, and move initiatives and ideas; post comments",
};

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    redirect(`/login?callbackUrl=${encodeURIComponent(`/oauth/consent?${qs}`)}`);
  }

  const clientName = params.client_name ?? "Unknown app";
  const registrationType = params.registration_type ?? "manual";
  const redirectUri = params.redirect_uri ?? "";
  const scopes = (params.scope ?? "").split(" ").filter(Boolean);

  const hidden = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => (
      <input key={k} type="hidden" name={k} value={v} />
    ));

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <h1 className="mb-1 text-xl font-semibold">{clientName}</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          wants to access your roadmap
        </p>

        {registrationType === "dcr" && (
          <p className="mb-4 rounded border border-yellow-500/30 bg-yellow-500/10 p-2 text-xs text-yellow-700 dark:text-yellow-400">
            ⚠ This app self-registered. Verify the redirect URL below matches what you expect.
          </p>
        )}

        <div className="mb-4">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="text-sm font-medium">{sessionUser.name}</p>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-xs text-muted-foreground">Requested permissions</p>
          <ul className="space-y-2">
            {scopes.map((s) => (
              <li key={s} className="text-sm">
                <span className="font-medium">{s}</span>
                <span className="ml-2 text-muted-foreground">
                  {SCOPE_DESCRIPTIONS[s] ?? ""}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-4">
          <p className="text-xs text-muted-foreground">Redirects to</p>
          <p className="break-all font-mono text-xs">{redirectUri}</p>
        </div>

        <form action="/api/oauth/authorize/decision" method="POST" className="flex gap-2">
          {hidden}
          <button
            type="submit"
            name="decision"
            value="deny"
            className="flex-1 rounded border border-border py-2 text-sm"
          >
            Deny
          </button>
          <button
            type="submit"
            name="decision"
            value="allow"
            className="flex-1 rounded bg-primary py-2 text-sm font-medium text-primary-foreground"
          >
            Allow access
          </button>
        </form>
      </div>
    </div>
  );
}
