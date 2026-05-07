export function CasinoShell() {
  const cards = [
    'Provably Fair SHA-256 RNG',
    'Scatter + Avalanche Slot Engine',
    'Global Jackpot and Tournament Streams',
    'PH Payments: Xendit, PayMongo, Dragonpay',
    'Wallets: MetaMask, Phantom, WalletConnect'
  ];

  return (
    <main style={{ padding: '24px', maxWidth: 980, margin: '0 auto' }}>
      <h1 style={{ color: '#a36dff' }}>SCATERX Casino Platform</h1>
      <p>Cyberpunk multi-platform crypto casino foundation with realtime, payments, and provably fair systems.</p>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {cards.map((card) => (
          <article key={card} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, border: '1px solid #42227b' }}>
            {card}
          </article>
        ))}
      </section>
    </main>
  );
}
