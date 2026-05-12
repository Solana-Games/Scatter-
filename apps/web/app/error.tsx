'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  const shouldShowDetails = process.env.NODE_ENV !== 'production';
  const message = shouldShowDetails && error?.message ? error.message : 'Unexpected runtime error.';
  return (
    <main className="shell">
      <section className="panel" role="alert">
        <h1 className="heading">Something went wrong</h1>
        <p className="muted">{message}</p>
        <button className="button" type="button" onClick={reset}>Retry</button>
      </section>
    </main>
  );
}
