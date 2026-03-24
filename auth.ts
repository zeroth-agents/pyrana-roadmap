import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!,
      authorization: {
        params: { scope: "openid profile email User.Read" },
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
    jwt({ token, profile }) {
      if (profile) {
        token.oid = (profile as Record<string, unknown>).oid ?? profile.sub;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.oid as string;
      }
      return session;
    },
  },
});
