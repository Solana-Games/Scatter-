import crypto from 'node:crypto';

const PROVIDERS = new Set(['xendit', 'paymongo', 'dragonpay']);
const METHODS = new Set(['gcash', 'maya', 'grabpay', 'gotyme', 'qrph', 'bank_transfer', 'card']);

export function createDeposit({ provider, method, amount, userId }) {
  if (!PROVIDERS.has(provider)) throw new Error('Unsupported provider');
  if (!METHODS.has(method)) throw new Error('Unsupported payment method');
  if (amount <= 0) throw new Error('Amount must be positive');

  return {
    id: `dep_${crypto.randomUUID()}`,
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
  if (!secret || !signature) return false;
  const signatureText = String(signature).trim();
  if (!/^sha256=[a-fA-F0-9]{64}$/.test(signatureText)) return false;
  const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const expectedHex = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
  const normalizedSignature = signatureText.slice('sha256='.length);
  const expectedBuffer = Buffer.from(expectedHex, 'hex');
  const signatureBuffer = Buffer.from(normalizedSignature, 'hex');
  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export function retryableStatus(status) {
  return ['failed', 'timeout', 'network_error'].includes(status);
}
