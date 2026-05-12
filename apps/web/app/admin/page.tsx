const widgets = [
  { title: 'RTP controls', status: 'healthy' },
  { title: 'Fraud scoring alerts', status: 'review' },
  { title: 'Live jackpot monitoring', status: 'healthy' },
  { title: 'KYC approval queue', status: 'review' },
  { title: 'Payment approval queue', status: 'healthy' }
];

type SearchParams = {
  token?: string | string[];
};

export default function AdminPage({ searchParams }: { searchParams?: SearchParams }) {
  const expected = process.env.NEXT_PUBLIC_ADMIN_DASHBOARD_TOKEN?.trim();
  const token = Array.isArray(searchParams?.token) ? searchParams?.token[0] : searchParams?.token;
  const granted = Boolean(expected && token === expected);
  if (!granted) {
    return (
      <main className="shell">
        <h1 className="heading">Admin Dashboard Protected</h1>
        <section className="panel">
          <p>
            {expected
              ? <>Access denied. Provide an admin access token in query params: <code>?token=...</code></>
              : <>Access denied. Admin dashboard token is not configured.</>}
          </p>
          <p className="muted">Server-side admin endpoints still require <code>x-admin-token</code>.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell stack">
      <h1 className="heading">SCATERX Admin Command Center</h1>
      <section className="grid">
        {widgets.map((widget) => (
          <article key={widget.title} className="card">
            <h3>{widget.title}</h3>
            <p className={widget.status === 'healthy' ? 'status-ok' : 'status-warn'}>
              {widget.status === 'healthy' ? 'Operational' : 'Needs review'}
            </p>
          </article>
        ))}
      </section>
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Live moderation + finance controls</h2>
        <p className="muted">Approve withdrawals, monitor suspicious payout anomalies, and tune RTP profiles from this panel.</p>
      </section>
    </main>
  );
}
