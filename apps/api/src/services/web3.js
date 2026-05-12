export const supportedChains = ['ethereum', 'solana', 'polygon', 'base', 'arbitrum', 'bsc'];

export function walletLogin({ walletAddress, chain }) {
  if (!walletAddress || walletAddress.length < 8) throw new Error('Invalid wallet address');
  if (!supportedChains.includes(chain)) throw new Error('Unsupported chain');
  return {
    sessionHint: Buffer.from(`${walletAddress}:${chain}`).toString('base64url'),
    walletAddress,
    chain
  };
}

export function nftVipTier(balance) {
  if (balance >= 10) return 'legend';
  if (balance >= 3) return 'elite';
  if (balance >= 1) return 'member';
  return 'guest';
}

export function walletReputationScore({ walletAgeDays = 0, txCount = 0, flaggedEvents = 0 }) {
  const ageScore = Math.min(0.45, Math.max(0, Number(walletAgeDays) || 0) / 1000);
  const txScore = Math.min(0.45, Math.max(0, Number(txCount) || 0) / 5000);
  const penalty = Math.min(0.7, Math.max(0, Number(flaggedEvents) || 0) * 0.15);
  return Number(Math.max(0, Math.min(1, ageScore + txScore - penalty)).toFixed(4));
}

export function tokenizedJackpotLedger({ jackpotId, totalAmount, chains = supportedChains }) {
  const normalizedTotal = Math.max(0, Number(totalAmount) || 0);
  const normalizedChains = [...new Set(chains.filter((chain) => supportedChains.includes(chain)))];
  if (!normalizedChains.length) throw new Error('At least one supported chain is required');
  const splitAmount = Number((normalizedTotal / normalizedChains.length).toFixed(4));
  return normalizedChains.map((chain, index) => ({
    id: `${jackpotId || 'jackpot'}-${chain}-${index + 1}`,
    chain,
    amount: splitAmount
  }));
}
