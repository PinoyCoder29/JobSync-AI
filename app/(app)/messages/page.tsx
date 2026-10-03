import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Messages" };

/** Messaging isn't built yet. This page says so honestly instead of showing fake conversations. */
export default function MessagesPage() {
  return (
    <div className="narrow-page">
      <h1 className="page-title">Messages</h1>
      <EmptyState icon="bi-chat-dots" title="Messaging is coming soon." text="Until then, find people in your network and view their profiles." href="/network" actionLabel="Go to My Network" />
    </div>
  );
}
