/**
 * Default avatar identity: initials on a colour that is derived from the name, so it is the same everywhere,
 * needs no stored image, and exists the moment an account does. A real uploaded photo (Cloudinary) always replaces it.
 * Deliberately NOT a generated face: nothing here can be mistaken for the real person.
 */
const PALETTE = ["#c2410c", "#0f766e", "#1d4ed8", "#7e22ce", "#be123c", "#4d7c0f", "#a16207", "#0e7490"] as const; // all ≥ 4.5:1 with white text

export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? "").replace(/[^\p{L}\p{N}\s'-]/gu, " ").split(/[\s-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = [...words[0]][0] ?? "";
  const last = words.length > 1 ? [...words[words.length - 1]][0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function avatarColor(name: string | null | undefined): string {
  let h = 0x811c9dc5; // FNV-1a
  for (const ch of (name ?? "").trim().toLowerCase()) h = Math.imul(h ^ ch.codePointAt(0)!, 0x01000193) >>> 0;
  return PALETTE[h % PALETTE.length];
}
