/** Shows an error passed through ?error= (set by redirecting actions). Rendered as plain text. */
export function PageMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="alert alert-danger" role="alert">
      {message.slice(0, 200)}
    </div>
  );
}
