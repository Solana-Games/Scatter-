export default function Loading() {
  return (
    <main className="shell">
      <section className="panel" role="status" aria-live="polite">
        <h2 style={{ marginTop: 0 }}>Loading SCATERX modules…</h2>
        <p className="muted">Realtime data streams and wallet adapters are initializing.</p>
      </section>
    </main>
  );
}
