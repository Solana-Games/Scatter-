export const supportedWallets = ['metamask', 'walletconnect', 'phantom', 'coinbase'];

export function connectWallet(wallet, account) {
  if (!supportedWallets.includes(wallet)) throw new Error('Unsupported wallet');
  if (!account) throw new Error('Account is required');
  return { wallet, account, connected: true };
}
