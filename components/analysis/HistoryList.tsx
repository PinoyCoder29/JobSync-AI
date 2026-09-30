import Link from "next/link";
import { formatDate } from "@/lib/labels";

export type HistoryItem = { id: string; score: number; createdAt: Date; title: string; subtitle?: string; demo?: boolean };

export function HistoryList({ items, basePath, selectedId }: { items: HistoryItem[]; basePath: string; selectedId?: string }) {
  if (items.length === 0) return <p className="text-muted small mb-0">Your saved analyses will appear here.</p>;
  return (
    <ul className="session-list">
      {items.map((h) => (
        <li key={h.id} className={h.id === selectedId ? "active" : ""}>
          <Link href={`${basePath}?id=${h.id}#results`} aria-current={h.id === selectedId ? "true" : undefined}>
            <strong>{h.title}</strong> <span className="ms-1">· {h.score}/100</span>
            <span className="d-block small text-muted">{formatDate(h.createdAt)}{h.subtitle ? ` · ${h.subtitle}` : ""}{h.demo ? " · old demo result" : ""}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
