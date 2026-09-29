export function ErrorState({ title = "We couldn't load this", text = "Please refresh the page. If the problem continues, try again in a few minutes." }: { title?: string; text?: string }) {
  return (
    <div className="empty-state error" role="alert">
      <i className="bi bi-exclamation-triangle" aria-hidden="true" />
      <h2 className="h5 mb-1">{title}</h2>
      <p className="text-muted mb-0">{text}</p>
    </div>
  );
}
