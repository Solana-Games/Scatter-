import http from 'node:http';
import crypto from 'node:crypto';
import { createSpinOutcome, generateServerSeed, hashServerSeed, verifyOutcome } from './provablyFair.js';
import {
  approveWithdrawal,
  calculateFraudScore,
  choosePaymentProvider,
  createDeposit,
  createDepositQueueItem,
  createWithdrawalRequest,
  reconcileTransactions
} from './payments.js';
import { JackpotPool } from './jackpot.js';
import { AutoSpinGuard, issueRotatingToken, NonceGuard, RateLimiter, verifyRotatingToken } from './security.js';
import { auditRtpProfile, createRtpProfile } from '../../../packages/core/src/rtp.js';

const port = Number(process.env.PORT || 4000);
const jackpot = new JackpotPool();
let activeServerSeed = generateServerSeed();
const seedAuditChain = [hashServerSeed(activeServerSeed)];
const seedHash = () => hashServerSeed(activeServerSeed);
const nonceGuard = new NonceGuard(10_000);
const rateLimiter = new RateLimiter({ max: 120, intervalMs: 60_000 });
const autoSpinGuard = new AutoSpinGuard({ maxBursts: 40, intervalMs: 20_000 });
const depositQueue = [];
const withdrawals = new Map();
const paymentHealth = { xendit: 'healthy', paymongo: 'healthy', dragonpay: 'healthy' };
let tokenVersion = 1;
let tokenSecret = process.env.JWT_ROTATION_SECRET || 'dev-rotating-secret';
const rtpProfiles = [
  createRtpProfile({
    id: 'rtp-low',
    targetRtp: 94,
    volatility: 'low',
    weights: { A: 32, K: 24, Q: 18, J: 12, SCATTER: 8, WILD: 6 }
  }),
  createRtpProfile({
    id: 'rtp-medium',
    targetRtp: 96,
    volatility: 'medium',
    weights: { A: 28, K: 22, Q: 16, J: 14, SCATTER: 10, WILD: 10 }
  }),
  createRtpProfile({
    id: 'rtp-high',
    targetRtp: 97.2,
    volatility: 'high',
    weights: { A: 24, K: 18, Q: 14, J: 12, SCATTER: 14, WILD: 18 }
  })
];

function timingSafeStringEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let aborted = false;
    req.on('data', (chunk) => {
      if (aborted) return;
      body += chunk;
      if (body.length > 1_000_000) {
        aborted = true;
        const error = Object.assign(new Error('Payload too large'), { statusCode: 413 });
        req.pause();
        req.removeAllListeners('data');
        reject(error);
      }
    });
    req.on('end', () => {
      if (aborted) return;
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { statusCode: 400 }));
      }
    });
    req.on('error', (error) => {
      if (aborted) return;
      reject(error);
    });
  });
}

function json(res, code, payload) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'"
  });
  res.end(JSON.stringify(payload));
}

function isAdminAuthorized(req) {
  const adminToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken) return false;
  const headerToken = req.headers['x-admin-token'];
  if (Array.isArray(headerToken) || typeof headerToken !== 'string') return false;
  return timingSafeStringEqual(headerToken.trim(), adminToken.trim());
}

function parseBodyOrReply(req, res) {
  return readJson(req).catch((error) => {
    const statusCode = error.statusCode ?? 400;
    json(res, statusCode, { error: error.message });
    return null;
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, 'http://localhost');
  const path = requestUrl.pathname;
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  if (req.method === 'POST') {
    const limit = rateLimiter.check(ip);
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(Math.ceil(limit.retryAfterMs / 1000)));
      return json(res, 429, { error: 'Rate limit exceeded', retryAfterMs: limit.retryAfterMs });
    }
  }

  if (req.method === 'GET' && path === '/health') {
    return json(res, 200, { status: 'ok', service: 'scaterx-api' });
  }

  if (req.method === 'GET' && path === '/provably-fair/current') {
    return json(res, 200, { serverSeedHash: seedHash(), seedVersion: seedAuditChain.length });
  }

  if (req.method === 'GET' && path === '/jackpot/ticker') {
    return json(res, 200, { amount: jackpot.amount, events: jackpot.events.slice(-20) });
  }

  if (req.method === 'GET' && path === '/rtp/profiles') {
    return json(res, 200, {
      profiles: rtpProfiles.map((profile) => ({
        id: profile.id,
        targetRtp: profile.targetRtp,
        volatility: profile.volatility
      }))
    });
  }

  if (req.method === 'POST' && path === '/rtp/simulate') {
    const body = await parseBodyOrReply(req, res);
    if (!body || res.writableEnded) return;
    const profile = rtpProfiles.find((entry) => entry.id === body.profileId) ?? rtpProfiles[1];
    const paytable = body.paytable ?? { A: 0.8, K: 1.2, Q: 1.6, J: 2, SCATTER: 4, WILD: 6 };
    try {
      const audit = auditRtpProfile({
        profile,
        paytable,
        spins: Number(body.spins ?? 50000),
        bet: Number(body.bet ?? 1),
        seed: String(body.seed ?? `audit-${Date.now()}`)
      });
      return json(res, 200, audit);
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (req.method === 'POST' && path === '/provably-fair/spin') {
    const body = await parseBodyOrReply(req, res);
    if (!body || res.writableEnded) return;
    const nonce = Number(body.nonce ?? 0);
    const clientSeed = String(body.clientSeed ?? 'default');
    const sessionId = String(body.sessionId ?? req.headers['x-session-id'] ?? 'anon');
    if (body.autoSpin && !autoSpinGuard.track(sessionId)) {
      return json(res, 429, { error: 'Auto-spin burst detected', sessionId });
    }
    const stake = Number(body.stake ?? 10);
    if (!Number.isFinite(stake) || stake <= 0) {
      return json(res, 400, { error: 'stake must be a positive number' });
    }
    try {
      nonceGuard.assertAndTrack({ clientSeed, nonce });
    } catch (error) {
      return json(res, 409, { error: error.message });
    }
    let outcome;
    try {
      outcome = createSpinOutcome({ serverSeed: activeServerSeed, clientSeed, nonce });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
    jackpot.contribute(stake);
    return json(res, 200, { ...outcome, jackpot: jackpot.amount, serverSeedHash: seedHash(), seedVersion: seedAuditChain.length });
  }

  if (req.method === 'POST' && path === '/provably-fair/verify') {
    const body = await parseBodyOrReply(req, res);
    if (!body || res.writableEnded) return;
    const isValid = verifyOutcome(body);
    return json(res, 200, { isValid });
  }

  if (req.method === 'POST' && path === '/payments/provider/select') {
    const body = await parseBodyOrReply(req, res);
    if (!body || res.writableEnded) return;
    try {
      const provider = choosePaymentProvider({
        method: body.method,
        preferredProvider: body.preferredProvider,
        health: { ...paymentHealth, ...(body.health ?? {}) }
      });
      return json(res, 200, { provider });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (req.method === 'POST' && path === '/payments/deposit') {
    const body = await parseBodyOrReply(req, res);
    if (!body || res.writableEnded) return;
    try {
      const deposit = createDeposit(body);
      const riskScore = calculateFraudScore({
        amount: deposit.amount,
        velocityCount: Number(body.velocityCount ?? 0),
        deviceTrust: Number(body.deviceTrust ?? 1),
        kycVerified: Boolean(body.kycVerified),
        countryRisk: Number(body.countryRisk ?? 0)
      });
      const queueItem = createDepositQueueItem(deposit);
      depositQueue.push(queueItem);
      return json(res, 201, { ...deposit, riskScore, queueItemId: queueItem.id });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (req.method === 'POST' && path === '/payments/withdraw') {
    const body = await parseBodyOrReply(req, res);
    if (!body || res.writableEnded) return;
    try {
      const withdrawal = createWithdrawalRequest(body);
      withdrawals.set(withdrawal.id, withdrawal);
      return json(res, 201, withdrawal);
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (req.method === 'POST' && path === '/payments/withdraw/approve') {
    if (!isAdminAuthorized(req)) {
      return json(res, 401, { error: 'Unauthorized' });
    }
    const body = await parseBodyOrReply(req, res);
    if (!body || res.writableEnded) return;
    const current = withdrawals.get(body.withdrawalId);
    if (!current) return json(res, 404, { error: 'Withdrawal not found' });
    try {
      const approved = approveWithdrawal(current, { approverId: body.approverId, riskScore: body.riskScore });
      withdrawals.set(current.id, approved);
      return json(res, 200, approved);
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (req.method === 'POST' && path === '/payments/reconcile') {
    const body = await parseBodyOrReply(req, res);
    if (!body || res.writableEnded) return;
    try {
      const report = reconcileTransactions({
        ledgerEntries: body.ledgerEntries ?? [],
        providerEntries: body.providerEntries ?? []
      });
      return json(res, 200, report);
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (req.method === 'POST' && path === '/security/token/rotate') {
    if (!isAdminAuthorized(req)) {
      return json(res, 401, { error: 'Unauthorized' });
    }
    const body = await parseBodyOrReply(req, res);
    if (!body || res.writableEnded) return;
    tokenVersion += 1;
    tokenSecret = crypto.createHash('sha256').update(`${tokenSecret}:${Date.now()}:${tokenVersion}`).digest('hex');
    const subject = String(body.subject ?? 'admin');
    const token = issueRotatingToken({ subject, secret: tokenSecret, version: tokenVersion, ttlSec: Number(body.ttlSec ?? 900) });
    return json(res, 200, { tokenVersion, subject, token });
  }

  if (req.method === 'POST' && path === '/security/token/verify') {
    const body = await parseBodyOrReply(req, res);
    if (!body || res.writableEnded) return;
    const result = verifyRotatingToken({ token: body.token, secret: tokenSecret, expectedSubject: body.subject });
    return json(res, 200, result);
  }

  if (req.method === 'GET' && path === '/payments/queue') {
    if (!isAdminAuthorized(req)) {
      return json(res, 401, { error: 'Unauthorized' });
    }
    return json(res, 200, { queued: depositQueue.length, items: depositQueue.slice(-100) });
  }

  if (req.method === 'POST' && path === '/provably-fair/rotate-seed') {
    if (!isAdminAuthorized(req)) {
      return json(res, 401, { error: 'Unauthorized' });
    }
    const previousHash = seedHash();
    activeServerSeed = generateServerSeed();
    const nextHash = seedHash();
    seedAuditChain.push(nextHash);
    return json(res, 200, { previousHash, serverSeedHash: nextHash, seedVersion: seedAuditChain.length });
  }

  if (req.method === 'POST' && path === '/payments/deposit/webhook/verify') {
    const body = await parseBodyOrReply(req, res);
    if (!body || res.writableEnded) return;
    try {
      const deposit = createDeposit(body);
      return json(res, 201, deposit);
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  return json(res, 404, { error: 'Not found' });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    console.log(`SCATERX API listening on :${port}`);
  });
}

export default server;
