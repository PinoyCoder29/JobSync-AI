import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Messages" };

/** Right-hand pane on wide screens when no chat is open. (On phones the inbox is shown instead; see MessagesShell.) */
export default function MessagesPage() {
  return (
    <div className="messenger-placeholder">
      <i className="bi bi-chat-dots" aria-hidden="true" />
      <h2 className="h5 mb-1">Select a conversation</h2>
      <p className="text-muted mb-3">Choose someone from the list, or open a profile in your network and tap Message to start a new one.</p>
      <Link href="/network" className="btn btn-brand">Go to My Network</Link>
    </div>
  );
}
