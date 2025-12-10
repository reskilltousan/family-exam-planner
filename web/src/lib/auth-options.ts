import type { NextAuthOptions, Session } from "next-auth";
import AppleProvider from "next-auth/providers/apple";
import GoogleProvider from "next-auth/providers/google";

const providers: NextAuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

const hasApple =
  process.env.APPLE_CLIENT_ID &&
  process.env.APPLE_TEAM_ID &&
  process.env.APPLE_KEY_ID &&
  process.env.APPLE_PRIVATE_KEY;

if (hasApple) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      teamId: process.env.APPLE_TEAM_ID!,
      keyId: process.env.APPLE_KEY_ID!,
      privateKey: process.env.APPLE_PRIVATE_KEY!.split("\\n").join("\n"),
    }),
  );
}

if (providers.length === 0) {
  throw new Error("No OAuth providers configured. Set GOOGLE_* and/or APPLE_* env vars.");
}

export const authOptions: NextAuthOptions = {
  providers,
  secret: process.env.NEXTAUTH_SECRET || "dev-secret",
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile && "email" in profile && typeof profile.email === "string") {
        token.email = profile.email;
        token.familyId = token.familyId ?? `family-${profile.email}`;
      }
      return token;
    },
    async session({ session, token }) {
      const s = session as Session & { familyId?: string };
      if (token.email) {
        s.user = s.user || {};
        s.user.email = token.email as string;
      }
      if (token.familyId) {
        s.familyId = token.familyId as string;
      }
      return s;
    },
  },
};
