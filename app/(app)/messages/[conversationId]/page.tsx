import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatView } from "@/components/messages/ChatView";
import { AppError } from "@/lib/errors";
import { requireUserId } from "@/lib/session";
import { conversationIdSchema } from "@/lib/validations/message";
import { messagingService } from "@/services/messaging/messaging.service";

export const metadata: Metadata = { title: "Messages" };

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const userId = await requireUserId();
  const id = conversationIdSchema.safeParse((await params).conversationId);
  if (!id.success) notFound();

  // Not a participant, blocked, or doesn't exist: all of these are the same 404.
  const result = await messagingService.get(userId, id.data).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "NOT_FOUND") return null;
    throw error;
  });
  if (!result) notFound();

  return <ChatView key={result.conversation.id} conversation={result.conversation} initial={result.messages} />;
}
