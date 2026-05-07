import crypto from 'node:crypto';

export function hashServerSeed(serverSeed) {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

export function generateServerSeed() {
  return crypto.randomBytes(32).toString('hex');
}

export function createSpinOutcome({ serverSeed, clientSeed, nonce, symbols = 20 }) {
  const input = `${serverSeed}:${clientSeed}:${nonce}`;
  const digest = crypto.createHash('sha256').update(input).digest('hex');
  const numeric = Number.parseInt(digest.slice(0, 12), 16);
  return {
    digest,
    resultIndex: numeric % symbols
  };
}

export function verifyOutcome({ serverSeed, clientSeed, nonce, digest }) {
  const recalculated = crypto
    .createHash('sha256')
    .update(`${serverSeed}:${clientSeed}:${nonce}`)
    .digest('hex');
  return recalculated === digest;
}
