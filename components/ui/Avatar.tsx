/** Round avatar. Falls back to the person's initial. Plain <img> because Cloudinary already serves a sized, optimised URL. */
export function Avatar({ name, src, size = 48 }: { name: string; src?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" className="avatar-img" style={style} />;
  }
  return (
    <span className="avatar-fallback" style={style} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
