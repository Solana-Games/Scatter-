export default function NotFound() {
  return (
    <main className="shell">
      <section className="panel">
        <h1 className="heading">Page not found</h1>
        <p className="muted">The requested route does not exist. Use the homepage navigation to continue.</p>
        <a href="/" className="button">Back to home</a>
      </section>
    </main>
  );
}
