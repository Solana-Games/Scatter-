export default function SettingsPage() {
  return (
    <main className="shell stack">
      <h1 className="heading">Settings & Profile</h1>
      <section className="grid">
        <article className="card">
          <h3>Profile</h3>
          <p className="muted">Display name: NeonWhale</p>
          <p className="muted">Region: APAC</p>
        </article>
        <article className="card">
          <h3>Rendering</h3>
          <p className="muted">Quality profile: Adaptive (60/120 FPS)</p>
          <p className="muted">Battery saver: Disabled</p>
        </article>
        <article className="card">
          <h3>Accessibility</h3>
          <p className="muted">High contrast text available via browser theme settings.</p>
          <p className="muted">Interactive controls include explicit labels.</p>
        </article>
      </section>
    </main>
  );
}
