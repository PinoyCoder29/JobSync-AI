import { startConversationAction } from "@/app/actions/message.actions";
import {
  blockUserAction,
  cancelRequestAction,
  followAction,
  removeConnectionAction,
  respondToRequestAction,
  sendConnectionRequestAction,
  unblockUserAction,
  unfollowAction,
} from "@/app/actions/network.actions";
import type { Relationship } from "@/services/networking.service";
import { ActionButton } from "./ActionButton";

/** Shows exactly the buttons that make sense for the current relationship. The server re-checks every one of them. */
export function RelationshipActions({ targetUserId, relationship, showFollow = true, showBlock = false, showMessage = false }: { targetUserId: string; relationship: Relationship; showFollow?: boolean; showBlock?: boolean; showMessage?: boolean }) {
  const { state, connectionId, following } = relationship;
  if (state === "SELF") return null;

  if (state === "BLOCKED_BY_ME") {
    return <ActionButton action={unblockUserAction} fields={{ targetUserId }} label="Unblock" icon="bi-slash-circle" pendingText="Unblocking…" />;
  }

  return (
    <div className="d-flex flex-wrap align-items-start gap-2">
      {state === "NONE" && <ActionButton action={sendConnectionRequestAction} fields={{ targetUserId }} label="Connect" icon="bi-person-plus" pendingText="Sending…" className="btn btn-brand btn-sm" />}
      {state === "PENDING_SENT" && connectionId && <ActionButton action={cancelRequestAction} fields={{ connectionId }} label="Pending · Withdraw" icon="bi-hourglass-split" pendingText="Withdrawing…" />}
      {state === "PENDING_RECEIVED" && connectionId && (
        <>
          <ActionButton action={respondToRequestAction} fields={{ connectionId, decision: "accept" }} label="Accept" icon="bi-check2" pendingText="Accepting…" className="btn btn-brand btn-sm" />
          <ActionButton action={respondToRequestAction} fields={{ connectionId, decision: "reject" }} label="Decline" pendingText="Declining…" />
        </>
      )}
      {state === "CONNECTED" && <ActionButton action={removeConnectionAction} fields={{ targetUserId }} label="Connected · Remove" icon="bi-person-check" pendingText="Removing…" confirm="Remove this connection?" />}

      {showFollow && (following
        ? <ActionButton action={unfollowAction} fields={{ targetUserId }} label="Following" icon="bi-bell-fill" pendingText="Updating…" className="btn btn-soft btn-sm" />
        : <ActionButton action={followAction} fields={{ targetUserId }} label="Follow" icon="bi-bell" pendingText="Following…" />)}

      {showMessage && <ActionButton action={startConversationAction} fields={{ targetUserId }} label="Message" icon="bi-chat-dots" pendingText="Opening…" />}

      {showBlock && <ActionButton action={blockUserAction} fields={{ targetUserId }} label="Block" icon="bi-slash-circle" pendingText="Blocking…" className="btn btn-outline-danger btn-sm" confirm="Block this person? They won't be able to find you or contact you, and any connection or follow between you will be removed." />}
    </div>
  );
}
