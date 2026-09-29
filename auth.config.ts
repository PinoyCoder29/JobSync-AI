import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe config (no Prisma, no bcrypt) so it can be used by middleware.
 * The full config with the Prisma Adapter and Credentials provider lives in auth.ts.
 */
export default {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) session.user.id = String(token.id);
      return session;
    },
  },
} satisfies NextAuthConfig;
