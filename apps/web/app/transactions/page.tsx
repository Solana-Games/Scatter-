const transactions = [
  { id: 'tx_102', type: 'Deposit', amount: '₱2,000', status: 'settled' },
  { id: 'tx_103', type: 'Withdrawal', amount: '₱500', status: 'queued' },
  { id: 'tx_104', type: 'Jackpot payout', amount: '₱12,300', status: 'settled' }
];

export default function TransactionsPage() {
  return (
    <main className="shell stack">
      <h1 className="heading">Transactions</h1>
      <div className="panel">
        <p><strong>Feedback:</strong> Your most recent deposit was settled successfully.</p>
      </div>
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>History</h2>
        <table className="table" aria-label="Transaction history">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.type}</td>
                <td>{item.amount}</td>
                <td className={item.status === 'settled' ? 'status-ok' : 'status-warn'}>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Empty state demo</h2>
        <p className="muted">No failed transactions in the selected period.</p>
      </section>
    </main>
  );
}
