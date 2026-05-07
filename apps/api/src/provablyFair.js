import crypto from 'node:crypto';

export function hashServerSeed(serverSeed) {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

export function generateServerSeed() {
  return crypto.randomBytes(32).toString('hex');
}

export function normalizeClientSeed(clientSeed) {
  const normalized = String(clientSeed ?? 'default').trim();
  return normalized.slice(0, 64) || 'default';
}

export function createSpinOutcome({ serverSeed, clientSeed, nonce, symbols = 20 }) {
  if (!Number.isInteger(symbols) || symbols <= 0) {
    throw new Error('symbols must be a positive integer');
  }
  if (!Number.isInteger(nonce) || nonce < 0) {
    throw new Error('nonce must be a non-negative integer');
  }
  const normalizedClientSeed = normalizeClientSeed(clientSeed);
  const input = `${serverSeed}:${normalizedClientSeed}:${nonce}`;
  const digest = crypto.createHash('sha256').update(input).digest('hex');
  const numeric = Number.parseInt(digest.slice(0, 12), 16);
  return {
    digest,
    resultIndex: numeric % symbols
  };
}

export function verifyOutcome({ serverSeed, clientSeed, nonce, digest }) {
  const normalizedClientSeed = normalizeClientSeed(clientSeed);
  const recalculated = crypto
    .createHash('sha256')
    .update(`${serverSeed}:${normalizedClientSeed}:${nonce}`)
    .digest('hex');
  return recalculated === digest;
}
