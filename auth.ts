import NextAuth, { DefaultSession } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

async function refreshAccessToken(token: Record<string, unknown>) {
  const issuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!.replace(
    /\/v2\.0\/?$/,
    "",
  );
  const url = `${issuer}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
    client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
    grant_type: "refresh_token",
    refresh_token: token.refreshToken as string,
    scope: "openid profile email User.Read offline_access",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const refreshed = await response.json();

  if (!response.ok) {
    console.error("Token refresh failed:", refreshed);
    return { ...token, error: "RefreshTokenError" as const };
  }

  return {
    ...token,
    accessToken: refreshed.access_token,
    accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
    refreshToken: refreshed.refresh_token ?? token.refreshToken,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!,
      authorization: {
        params: { scope: "openid profile email User.Read offline_access" },
      },
      profile(profile) {
        return {
          id: profile.oid ?? profile.sub,
          name: profile.name,
          email: profile.email ?? profile.preferred_username,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Initial sign-in: persist OAuth tokens
      if (account && profile) {
        token.oid = (profile as Record<string, unknown>).oid ?? profile.sub;
        token.email =
          (profile as Record<string, unknown>).email ??
          (profile as Record<string, unknown>).preferred_username;
        token.accessToken = account.access_token;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 3600 * 1000;
        token.refreshToken = account.refresh_token;
        return token;
      }

      // Token still valid — return as-is
      if (Date.now() < (token.accessTokenExpires as number) - 60_000) {
        return token;
      }

      // Token expired — attempt refresh
      return refreshAccessToken(token);
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.oid as string;
        session.user.email = token.email as string;
      }
      if (token.error) {
        // Surface the error so the client can force re-login
        (session as unknown as Record<string, unknown>).error = token.error;
      }
      return session;
    },
  },
});
