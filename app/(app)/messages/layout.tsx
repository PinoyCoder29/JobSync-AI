import { MessagesShell } from "@/components/messages/MessagesShell";
import { requireUserId } from "@/lib/session";
import { messagingService } from "@/services/messaging/messaging.service";

/** Fetches the signed-in user's inbox from the database; the shell keeps it fresh while the page is open. */
export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  const conversations = await messagingService.list(userId);
  return <MessagesShell initial={conversations}>{children}</MessagesShell>;
}
