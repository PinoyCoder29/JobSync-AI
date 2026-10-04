export default function Loading() {
  return (
    <div className="chat-loading" aria-busy="true" aria-label="Loading conversation">
      <div className="chat-head"><div className="skeleton" style={{ width: 40, height: 40, borderRadius: "50%" }} /><div className="skeleton" style={{ width: 160, height: 16 }} /></div>
      <div className="chat-scroll d-flex flex-column gap-2">
        <div className="skeleton" style={{ width: "55%", height: 38, borderRadius: 18 }} />
        <div className="skeleton align-self-end" style={{ width: "40%", height: 38, borderRadius: 18 }} />
        <div className="skeleton" style={{ width: "62%", height: 38, borderRadius: 18 }} />
      </div>
    </div>
  );
}
