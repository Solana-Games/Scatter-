'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="shell">
      <section className="panel" role="alert">
        <h1 className="heading">Something went wrong</h1>
        <p className="muted">{error.message || 'Unexpected runtime error.'}</p>
        <button className="button" type="button" onClick={reset}>Retry</button>
      </section>
    </main>
  );
}
