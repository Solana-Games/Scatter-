const widgets = [
  'RTP controls',
  'Fraud scoring alerts',
  'Live jackpot monitoring',
  'KYC approval queue',
  'Payment approval queue'
];

export default function AdminPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>SCATERX Admin Console</h1>
      <ul>
        {widgets.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </main>
  );
}
