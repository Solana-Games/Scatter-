export const supportedChains = ['ethereum', 'solana', 'polygon', 'base', 'bsc'];

export function walletLogin({ walletAddress, chain }) {
  if (!walletAddress || walletAddress.length < 8) throw new Error('Invalid wallet address');
  if (!supportedChains.includes(chain)) throw new Error('Unsupported chain');
  return {
    sessionToken: Buffer.from(`${walletAddress}:${chain}`).toString('base64url'),
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
