const PROVIDERS = new Set(['xendit', 'paymongo', 'dragonpay']);
const METHODS = new Set(['gcash', 'maya', 'grabpay', 'gotyme', 'qrph', 'bank_transfer', 'card']);

export function createDeposit({ provider, method, amount, userId }) {
  if (!PROVIDERS.has(provider)) throw new Error('Unsupported provider');
  if (!METHODS.has(method)) throw new Error('Unsupported payment method');
  if (amount <= 0) throw new Error('Amount must be positive');

  return {
    id: `dep_${Date.now()}`,
    provider,
    method,
    amount,
    userId,
    status: 'pending_approval',
    riskScore: amount > 50000 ? 0.8 : 0.1,
    requiresKyc: amount >= 10000
  };
}

export function validateWebhookSignature({ payload, signature, secret }) {
  const expected = Buffer.from(`${payload}.${secret}`).toString('base64url');
  return expected === signature;
}

export function retryableStatus(status) {
  return ['failed', 'timeout', 'network_error'].includes(status);
}
