import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Facebook from "next-auth/providers/facebook";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { isOAuthConfigured, OAUTH_PROVIDERS } from "@/lib/oauth-providers";
import { loginSchema } from "@/lib/validations/auth";
import { userRepository } from "@/repositories/user.repository";
import { readSignupTicket } from "@/lib/auth/signup-ticket";
import { userService } from "@/services/user.service";
import authConfig from "./auth.config";

const enabled = (id: string) => isOAuthConfigured(OAUTH_PROVIDERS.find((p) => p.id === id)!);

// Email + password is always available. Social providers are added only when their keys are in .env.
// Google, GitHub and Facebook read AUTH_<PROVIDER>_ID / AUTH_<PROVIDER>_SECRET automatically.
const providers: Provider[] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = loginSchema.safeParse(raw);
      if (!parsed.success) return null;
      return userService.verifyCredentials(parsed.data.email, parsed.data.password);
    },
  }),
  // Used ONLY right after email verification succeeds: accepts a short-lived ticket signed by the server, never a password.
  Credentials({
    id: "signup-ticket",
    credentials: { ticket: {} },
    async authorize(raw) {
      const userId = readSignupTicket((raw as { ticket?: unknown })?.ticket);
      if (!userId) return null;
      const user = await userService.getAccount(userId);
      return user ? { id: user.id, name: user.name, email: user.email } : null;
    },
  }),
];
if (enabled("google")) providers.push(Google);
if (enabled("github")) providers.push(GitHub);
if (enabled("facebook")) providers.push(Facebook);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers,
  callbacks: {
    ...authConfig.callbacks,
    // Our User table requires an email. Facebook accounts made with a phone number may not share one.
    async signIn({ user, account }) {
      if (account && account.type !== "credentials" && !user.email) return false;
      return true;
    },
  },
  events: {
    // Social sign-ups are created by the adapter, so give them an (empty) Profile row too.
    async createUser({ user }) {
      if (user.id) await userRepository.ensureProfile(user.id);
    },
  },
});
