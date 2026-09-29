import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** The ONLY place user identity comes from: the server-side session. Never from the client. */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const session = await auth();
  return session?.user?.id ?? null;
});

export async function requireUserId(): Promise<string> {
  const id = await getCurrentUserId();
  if (!id) redirect("/login");
  return id;
}
