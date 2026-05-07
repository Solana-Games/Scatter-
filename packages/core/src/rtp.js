export function estimateRtp(spins, paytable) {
  let stake = 0;
  let payout = 0;

  for (const spin of spins) {
    stake += spin.bet;
    payout += paytable[spin.symbol] ?? 0;
  }

  if (stake === 0) return 0;
  return Number(((payout / stake) * 100).toFixed(4));
}

export function classifyVolatility(stdDeviation) {
  if (stdDeviation < 0.8) return 'low';
  if (stdDeviation < 1.6) return 'medium';
  return 'high';
}
