const walletStats = [
  { label: 'Wallet balance', value: '₱ 142,300.25' },
  { label: 'VIP tier', value: 'Elite' },
  { label: 'Churn risk', value: '0.24 (stable)' },
  { label: 'Active tournaments', value: '3' }
];

export default function DashboardPage({ searchParams }: { searchParams?: { wallet?: string } }) {
  const wallet = searchParams?.wallet?.trim();
  if (!wallet) {
    return (
      <main className="shell">
        <h1 className="heading">Player Dashboard</h1>
        <section className="panel">
          <p>No authenticated wallet session detected.</p>
          <a href="/wallet" className="button primary">Connect wallet to continue</a>
        </section>
      </main>
    );
  }
  return (
    <main className="shell stack" aria-label="Player dashboard">
      <header className="topbar">
        <h1 className="heading">Player Dashboard</h1>
        <span className="pill" aria-label="Connected wallet">Wallet: {wallet}</span>
        <div className="actions">
          <a href="/wallet" className="button">Connect wallet</a>
          <a href="/transactions" className="button primary">View transactions</a>
        </div>
      </header>

      <section className="grid">
        {walletStats.map((stat) => (
          <article key={stat.label} className="card">
            <h3>{stat.label}</h3>
            <p>{stat.value}</p>
          </article>
        ))}
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Recommendations</h2>
        <ul>
          <li>Daily retention pack ready: 20 free spins + 2.5% cashback boost.</li>
          <li>Regional tournament starts in 12 minutes with APAC low-latency room placement.</li>
          <li>Enable haptics and 120 FPS mode on supported devices from Settings.</li>
        </ul>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Empty state handling</h2>
        <p className="muted">No unresolved support tickets. You will see active requests here when they are created.</p>
      </section>
    </main>
  );
}
