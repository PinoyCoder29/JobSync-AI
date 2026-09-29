import bcrypt from "bcryptjs";
import { AppError } from "@/lib/errors";
import { userRepository } from "@/repositories/user.repository";

const ROUNDS = 12;

export const userService = {
  async register(input: { name: string; email: string; password: string }) {
    const existing = await userRepository.findByEmailWithHash(input.email);
    if (existing) throw new AppError("An account with this email already exists.", "CONFLICT");
    const passwordHash = await bcrypt.hash(input.password, ROUNDS);
    return userRepository.createWithProfile({ name: input.name, email: input.email, passwordHash });
  },

  /** Used by Auth.js. Returns only safe fields – never the hash. */
  async verifyCredentials(email: string, password: string) {
    const user = await userRepository.findByEmailWithHash(email);
    if (!user?.passwordHash) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? { id: user.id, name: user.name, email: user.email } : null;
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await userRepository.findByIdWithHash(userId);
    if (!user?.passwordHash) throw new AppError("Password sign-in is not enabled for this account.");
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw new AppError("Your current password is incorrect.");
    await userRepository.updatePassword(userId, await bcrypt.hash(newPassword, ROUNDS));
  },

  /** How this user can sign in: password, and/or which social accounts are linked. */
  async getSignInMethods(userId: string) {
    const [user, accounts] = await Promise.all([userRepository.findByIdWithHash(userId), userRepository.listAccounts(userId)]);
    return { hasPassword: Boolean(user?.passwordHash), providers: accounts.map((a) => a.provider) };
  },

  getAccount(userId: string) {
    return userRepository.findById(userId);
  },
};
