import crypto from 'node:crypto';

const PROVIDERS = new Set(['xendit', 'paymongo', 'dragonpay']);
const METHODS = new Set(['gcash', 'maya', 'grabpay', 'gotyme', 'qrph', 'bank_transfer', 'card']);
const PROVIDER_METHODS = Object.freeze({
  xendit: new Set(['gcash', 'maya', 'qrph', 'bank_transfer', 'card']),
  paymongo: new Set(['gcash', 'maya', 'grabpay', 'card']),
  dragonpay: new Set(['gotyme', 'qrph', 'bank_transfer', 'card'])
});

export function createDeposit({ provider, method, amount, userId }) {
  if (!PROVIDERS.has(provider)) throw new Error('Unsupported provider');
  if (!METHODS.has(method)) throw new Error('Unsupported payment method');
  if (!PROVIDER_METHODS[provider]?.has(method)) {
    throw new Error(`Unsupported payment method '${method}' for provider: ${provider}`);
  }
  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error('Amount must be a positive number');
  }
  if (typeof userId !== 'string' || !userId.trim()) {
    throw new Error('userId is required');
  }

  return {
    id: `dep_${crypto.randomUUID()}`,
    provider,
    method,
    amount: normalizedAmount,
    userId: userId.trim(),
    status: 'pending_approval',
    riskScore: normalizedAmount > 50000 ? 0.8 : 0.1,
    requiresKyc: normalizedAmount >= 10000
  };
}

export function validateWebhookSignature({ payload, signature, secret }) {
  if (!secret || !signature) return false;
  if (!(typeof payload === 'string' || Buffer.isBuffer(payload))) return false;
  const signatureText = String(signature).trim();
  if (!/^sha256=[a-fA-F0-9]{64}$/.test(signatureText)) return false;
  const rawPayload = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
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

export function choosePaymentProvider({ method, preferredProvider, health = {} }) {
  if (!METHODS.has(method)) throw new Error('Unsupported payment method');
  const availableProviders = [...PROVIDERS].filter((provider) => PROVIDER_METHODS[provider].has(method));
  if (!availableProviders.length) throw new Error('No provider available for method');
  if (preferredProvider && availableProviders.includes(preferredProvider) && health[preferredProvider] !== 'down') {
    return preferredProvider;
  }
  const ranked = [...availableProviders].sort((left, right) => {
    const leftScore = health[left] === 'healthy' ? 2 : health[left] === 'degraded' ? 1 : 0;
    const rightScore = health[right] === 'healthy' ? 2 : health[right] === 'degraded' ? 1 : 0;
    return rightScore - leftScore;
  });
  return ranked[0];
}

export function createDepositQueueItem(deposit, attempt = 0) {
  if (!deposit?.id) throw new Error('deposit is required');
  const now = Date.now();
  return {
    id: `dq_${crypto.randomUUID()}`,
    depositId: deposit.id,
    attempt,
    status: 'queued',
    queuedAt: now,
    nextRetryAt: now
  };
}

export function nextRetryAt(attempt, baseMs = 1500) {
  if (!Number.isInteger(attempt) || attempt < 0) throw new Error('attempt must be a non-negative integer');
  const delay = Math.min(60_000, baseMs * 2 ** attempt);
  return Date.now() + delay;
}

export function createWithdrawalRequest({ userId, amount, destination, method }) {
  if (typeof userId !== 'string' || !userId.trim()) throw new Error('userId is required');
  if (!METHODS.has(method)) throw new Error('Unsupported payment method');
  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error('Amount must be a positive number');
  }
  if (typeof destination !== 'string' || !destination.trim()) throw new Error('destination is required');
  return {
    id: `wd_${crypto.randomUUID()}`,
    userId: userId.trim(),
    amount: normalizedAmount,
    destination: destination.trim(),
    method,
    status: 'pending_approval',
    locked: true,
    createdAt: Date.now()
  };
}

export function approveWithdrawal(withdrawal, { approverId, riskScore = 0 }) {
  if (!withdrawal?.id) throw new Error('withdrawal is required');
  if (withdrawal.status !== 'pending_approval') throw new Error('withdrawal is not pending approval');
  if (typeof approverId !== 'string' || !approverId.trim()) throw new Error('approverId is required');
  if (Number(riskScore) >= 0.85) throw new Error('withdrawal requires manual AML review');
  return {
    ...withdrawal,
    status: 'approved',
    locked: false,
    approvedBy: approverId.trim(),
    approvedAt: Date.now()
  };
}

export function calculateFraudScore({ amount = 0, velocityCount = 0, deviceTrust = 1, kycVerified = false, countryRisk = 0 }) {
  const normalizedAmount = Math.max(0, Number(amount) || 0);
  const normalizedVelocity = Math.max(0, Number(velocityCount) || 0);
  const normalizedTrust = Math.max(0, Math.min(1, Number(deviceTrust) || 0));
  const normalizedCountryRisk = Math.max(0, Math.min(1, Number(countryRisk) || 0));
  let score = 0;
  score += Math.min(0.45, normalizedAmount / 100000);
  score += Math.min(0.25, normalizedVelocity / 20);
  score += (1 - normalizedTrust) * 0.2;
  score += normalizedCountryRisk * 0.15;
  if (!kycVerified) score += 0.1;
  return Number(Math.max(0, Math.min(1, score)).toFixed(4));
}

export function reconcileTransactions({ ledgerEntries, providerEntries }) {
  const ledgerMap = new Map((ledgerEntries ?? []).map((entry) => [entry.id, entry]));
  const providerMap = new Map((providerEntries ?? []).map((entry) => [entry.id, entry]));
  const matched = [];
  const mismatched = [];
  const missingInProvider = [];
  const missingInLedger = [];

  for (const [id, ledgerEntry] of ledgerMap.entries()) {
    const providerEntry = providerMap.get(id);
    if (!providerEntry) {
      missingInProvider.push(ledgerEntry);
      continue;
    }
    const sameAmount = Number(ledgerEntry.amount) === Number(providerEntry.amount);
    const sameStatus = String(ledgerEntry.status) === String(providerEntry.status);
    if (sameAmount && sameStatus) {
      matched.push({ id, status: ledgerEntry.status, amount: ledgerEntry.amount });
    } else {
      mismatched.push({ id, ledger: ledgerEntry, provider: providerEntry });
    }
  }

  for (const [id, providerEntry] of providerMap.entries()) {
    if (!ledgerMap.has(id)) {
      missingInLedger.push(providerEntry);
    }
  }

  return {
    matched,
    mismatched,
    missingInProvider,
    missingInLedger,
    summary: {
      matched: matched.length,
      mismatched: mismatched.length,
      missingInProvider: missingInProvider.length,
      missingInLedger: missingInLedger.length
    }
  };
}
