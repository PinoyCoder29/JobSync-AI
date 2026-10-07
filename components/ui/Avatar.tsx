import { avatarColor, initialsOf } from "@/lib/avatar";

/**
 * Round avatar. A real photo (Cloudinary) when the person has one; otherwise a generated initials avatar
 * (e.g. "Jay-Vee Bico" -> "JB") on a colour derived from the name, so every account has an identity from day one.
 * Plain <img> because Cloudinary already serves a sized, optimised URL.
 */
export function Avatar({ name, src, size = 48 }: { name: string; src?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * (initialsOf(name).length > 1 ? 0.38 : 0.44)) };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" className="avatar-img" style={style} />;
  }
  return (
    <span className="avatar-fallback" style={{ ...style, background: avatarColor(name), color: "#fff", letterSpacing: "0.02em" }} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}
