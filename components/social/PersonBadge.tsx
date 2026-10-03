import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { relativeTime } from "@/lib/time";
import type { AuthorDTO } from "@/services/social/types";

const REL_LABEL = { self: "", connection: "Connection", following: "Following", none: "" } as const;
const VIS_ICON = { PUBLIC: "bi-globe2", CONNECTIONS_ONLY: "bi-people", PRIVATE: "bi-lock" } as const;
const VIS_LABEL = { PUBLIC: "Public", CONNECTIONS_ONLY: "Connections only", PRIVATE: "Only me" } as const;

/** Profile photo, name, headline, relationship, time and visibility: the header of a post or comment. */
export function PersonBadge({ author, createdAt, visibility, size = 44, edited }: { author: AuthorDTO; createdAt: string; visibility?: keyof typeof VIS_ICON; size?: number; edited?: boolean }) {
  const rel = REL_LABEL[author.relationship];
  return (
    <div className="person-badge">
      <Link href={author.relationship === "self" ? "/profile" : `/people/${author.id}`} aria-label={`${author.name}'s profile`}>
        <Avatar name={author.name} src={author.avatarUrl} size={size} />
      </Link>
      <div className="min-w-0">
        <div className="person-badge-name">
          <Link href={author.relationship === "self" ? "/profile" : `/people/${author.id}`}>{author.name}</Link>
          {rel && <span className="rel-chip">{rel}</span>}
        </div>
        {author.headline && <div className="person-badge-headline">{author.headline}</div>}
        <div className="person-badge-meta">
          <time dateTime={createdAt}>{relativeTime(createdAt)}</time>
          {edited && <span> · Edited</span>}
          {visibility && (
            <span title={VIS_LABEL[visibility]}>
              {" · "}<i className={`bi ${VIS_ICON[visibility]}`} aria-hidden="true" /><span className="visually-hidden">{VIS_LABEL[visibility]}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
