import crypto from 'node:crypto';

const MAX_CLIENT_SEED_LENGTH = 64;
const DEFAULT_RATE_LIMITER_CLEANUP_EVERY = 100;
const MAX_TOKEN_TTL_SEC = 86_400;

export class NonceGuard {
  constructor(windowSize = 1000) {
    this.windowSize = windowSize;
    this.used = new Map();
  }

  assertAndTrack({ clientSeed, nonce }) {
    const normalizedSeed = String(clientSeed ?? '').trim().slice(0, MAX_CLIENT_SEED_LENGTH);
    if (!normalizedSeed) throw new Error('clientSeed is required');
    if (!Number.isInteger(nonce) || nonce < 0) throw new Error('nonce must be a non-negative integer');
    const key = `${normalizedSeed}:${nonce}`;
    if (this.used.has(key)) throw new Error('nonce already used');
    this.used.set(key, Date.now());
    if (this.used.size > this.windowSize) {
      const oldest = this.used.keys().next().value;
      this.used.delete(oldest);
    }
    return true;
  }
}

export class RateLimiter {
  constructor({ max = 90, intervalMs = 60_000 } = {}) {
    this.max = max;
    this.intervalMs = intervalMs;
    this.hits = new Map();
    this.checkCount = 0;
    this.cleanupEvery = DEFAULT_RATE_LIMITER_CLEANUP_EVERY;
  }

  pruneStale(now = Date.now()) {
    for (const [identity, timestamps] of this.hits.entries()) {
      if (!Array.isArray(timestamps) || timestamps.length === 0) {
        this.hits.delete(identity);
        continue;
      }
      const latest = timestamps[timestamps.length - 1];
      if (now - latest >= this.intervalMs) {
        this.hits.delete(identity);
      }
    }
  }

  check(identity) {
    const now = Date.now();
    this.checkCount += 1;
    if (this.checkCount % this.cleanupEvery === 0) {
      this.pruneStale(now);
    }
    const key = String(identity ?? 'unknown');
    const bucket = this.hits.get(key) ?? [];
    const fresh = bucket.filter((timestamp) => now - timestamp < this.intervalMs);
    fresh.push(now);
    this.hits.set(key, fresh);
    return {
      allowed: fresh.length <= this.max,
      remaining: Math.max(0, this.max - fresh.length),
      retryAfterMs: fresh.length <= this.max ? 0 : this.intervalMs - (now - fresh[0])
    };
  }
}

export class AutoSpinGuard {
  constructor({ maxBursts = 25, intervalMs = 15_000 } = {}) {
    this.maxBursts = maxBursts;
    this.intervalMs = intervalMs;
    this.sessions = new Map();
  }

  track(sessionId) {
    const now = Date.now();
    const key = String(sessionId ?? 'anon');
    const history = this.sessions.get(key) ?? [];
    const fresh = history.filter((timestamp) => now - timestamp <= this.intervalMs);
    fresh.push(now);
    this.sessions.set(key, fresh);
    return fresh.length <= this.maxBursts;
  }
}

export function issueRotatingToken({ subject, secret, ttlSec = 900, version = 1 }) {
  if (!subject) throw new Error('subject is required');
  if (!secret) throw new Error('secret is required');
  if (!Number.isInteger(ttlSec) || ttlSec <= 0 || ttlSec > MAX_TOKEN_TTL_SEC) {
    throw new Error(`ttlSec must be an integer between 1 and ${MAX_TOKEN_TTL_SEC}`);
  }
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + ttlSec;
  const body = `${subject}:${issuedAt}:${expiresAt}:${version}`;
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return Buffer.from(`${body}:${signature}`, 'utf8').toString('base64url');
}

export function verifyRotatingToken({ token, secret, expectedSubject }) {
  if (!token || !secret) return { valid: false, reason: 'missing token or secret' };
  let decoded;
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    return { valid: false, reason: 'invalid encoding' };
  }
  const [subject, issuedAt, expiresAt, version, signature] = decoded.split(':');
  if (!subject || !issuedAt || !expiresAt || !version || !signature) {
    return { valid: false, reason: 'invalid payload' };
  }
  if (expectedSubject && subject !== expectedSubject) {
    return { valid: false, reason: 'subject mismatch' };
  }
  const body = `${subject}:${issuedAt}:${expiresAt}:${version}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const left = Buffer.from(expectedSignature, 'hex');
  const right = Buffer.from(signature, 'hex');
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return { valid: false, reason: 'bad signature' };
  }
  const now = Math.floor(Date.now() / 1000);
  if (Number(expiresAt) < now) return { valid: false, reason: 'expired' };
  return { valid: true, subject, version: Number(version), expiresAt: Number(expiresAt) };
}
