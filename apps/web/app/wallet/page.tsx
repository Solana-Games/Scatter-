import { supportedWallets } from '../../hooks/useWallets';

export default function WalletPage() {
  return (
    <main className="shell stack">
      <h1 className="heading">Wallet Connect</h1>
      <p className="subtitle">Safely initialize wallet adapters and choose your preferred account provider.</p>

      <section className="grid">
        {supportedWallets.map((wallet) => (
          <article className="card" key={wallet}>
            <h3 style={{ marginTop: 0, textTransform: 'capitalize' }}>{wallet}</h3>
            <p className="muted">Adapter status: ready</p>
            <button className="button" type="button" aria-label={`Connect ${wallet}`}>
              Connect {wallet}
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
