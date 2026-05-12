import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  auditRtpProfile,
  classifyVolatility,
  createRtpProfile,
  createWeightedMatrix,
  estimateRtp,
  payoutDistribution,
  sampleWeightedSymbol,
  simulateRtpSpins,
  volatilityHeatmap
} from '../packages/core/src/rtp.js';
import { vipTierFromPoints, cashbackForTier } from '../packages/core/src/vip.js';
import { createSpinOutcome, verifyOutcome } from '../apps/api/src/provablyFair.js';
import {
  approveWithdrawal,
  calculateFraudScore,
  choosePaymentProvider,
  createDeposit,
  createWithdrawalRequest,
  orchestratePayoutQueue,
  reconcileTransactions,
  routePaymentIntent,
  retryableStatus,
  trackSettlementWindow,
  validateWebhookSignature
} from '../apps/api/src/payments.js';
import { JackpotPool } from '../apps/api/src/jackpot.js';
import { issueRotatingToken, RateLimiter } from '../apps/api/src/security.js';
import { validateProductionEnvironment } from '../apps/api/src/env.js';

test('RTP estimator calculates expected return', () => {
  const spins = [
    { bet: 1, symbol: 'A' },
    { bet: 1, symbol: 'B' },
    { bet: 1, symbol: 'A' }
  ];
  const paytable = { A: 2, B: 0 };
  assert.equal(estimateRtp(spins, paytable), 133.3333);
});

test('volatility classifier tiers', () => {
  assert.equal(classifyVolatility(0.7), 'low');
  assert.equal(classifyVolatility(1.1), 'medium');
  assert.equal(classifyVolatility(2.1), 'high');
});

test('VIP tier and cashback are deterministic', () => {
  assert.equal(vipTierFromPoints(30000), 'gold');
  assert.equal(cashbackForTier('gold', 1000), 6);
});

test('provably fair outcome verifies', () => {
  const serverSeed = 'server-seed';
  const clientSeed = 'client-seed';
  const nonce = 4;
  const outcome = createSpinOutcome({ serverSeed, clientSeed, nonce });
  assert.equal(verifyOutcome({ serverSeed, clientSeed, nonce, digest: outcome.digest }), true);
});

test('provably fair rejects invalid symbols and nonce inputs', () => {
  assert.throws(() => createSpinOutcome({ serverSeed: 's', clientSeed: 'c', nonce: -1 }), /nonce/);
  assert.throws(() => createSpinOutcome({ serverSeed: 's', clientSeed: 'c', nonce: 0, symbols: 0 }), /symbols/);
});

test('payment creation validates provider and status retry', () => {
  const dep = createDeposit({ provider: 'xendit', method: 'gcash', amount: 500, userId: 'u1' });
  assert.match(dep.id, /^dep_[0-9a-f-]{36}$/);
  assert.equal(dep.status, 'pending_approval');
  assert.equal(retryableStatus('timeout'), true);
  assert.equal(retryableStatus('completed'), false);
  assert.throws(() => createDeposit({ provider: 'xendit', method: 'gcash', amount: 'abc', userId: 'u1' }), /Amount/);
  assert.throws(() => createDeposit({ provider: 'xendit', method: 'gcash', amount: 100, userId: '' }), /userId/);
});

test('webhook signatures are HMAC validated in timing-safe form', () => {
  const payload = '{"id":"evt_1","status":"paid"}';
  const secret = 'webhook-secret';
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  assert.equal(validateWebhookSignature({ payload, signature: `sha256=${expected}`, secret }), true);
  assert.equal(validateWebhookSignature({ payload, signature: expected, secret }), false);
  assert.equal(validateWebhookSignature({ payload: { id: 'evt_1' }, signature: `sha256=${expected}`, secret }), false);
});

test('jackpot events are capped to prevent unbounded growth', () => {
  const pool = new JackpotPool(1000, 3);
  pool.contribute(100);
  pool.contribute(100);
  pool.contribute(100);
  pool.payout('u1');
  assert.equal(pool.events.length, 3);
});

test('weighted matrix and simulation produce deterministic RTP analytics', () => {
  const profile = createRtpProfile({
    id: 'sim-medium',
    targetRtp: 96,
    volatility: 'medium',
    weights: { A: 40, B: 30, C: 20, WILD: 10 }
  });
  const matrix = createWeightedMatrix({ A: 2, B: 1 });
  assert.equal(sampleWeightedSymbol(matrix, 0.2), 'A');
  assert.equal(sampleWeightedSymbol(matrix, 0.95), 'B');

  const simulation = simulateRtpSpins({
    profile,
    paytable: { A: 0.8, B: 1.2, C: 2.5, WILD: 8 },
    spins: 2000,
    bet: 1,
    seed: 'deterministic'
  });
  assert.equal(simulation.outcomes.length, 2000);
  assert.ok(simulation.rtp > 0);

  const distribution = payoutDistribution(simulation.outcomes, 2);
  assert.ok(distribution.length >= 1);

  const heatmap = volatilityHeatmap(simulation.outcomes, 200);
  assert.ok(heatmap.length >= 1);

  const audit = auditRtpProfile({ profile, paytable: { A: 0.8, B: 1.2, C: 2.5, WILD: 8 }, spins: 2000 });
  assert.equal(audit.profileId, 'sim-medium');
  assert.ok(Number.isFinite(audit.rtpDrift));

  const betMultiplier = 3;
  const multiBetSimulation = simulateRtpSpins({
    profile,
    paytable: { A: 0.8, B: 1.2, C: 2.5, WILD: 8 },
    spins: 1000,
    bet: betMultiplier,
    seed: 'multi-bet'
  });
  const singleBetSimulation = simulateRtpSpins({
    profile,
    paytable: { A: 0.8, B: 1.2, C: 2.5, WILD: 8 },
    spins: 1000,
    bet: 1,
    seed: 'multi-bet'
  });
  assert.equal(multiBetSimulation.outcomes[0].payout, Number((singleBetSimulation.outcomes[0].payout * betMultiplier).toFixed(4)));
  assert.equal(multiBetSimulation.rtp, singleBetSimulation.rtp);
});

test('payment failover, withdrawal approval, fraud scoring, and reconciliation work', () => {
  const selected = choosePaymentProvider({
    method: 'gcash',
    preferredProvider: 'xendit',
    health: { xendit: 'degraded', paymongo: 'healthy', dragonpay: 'healthy' }
  });
  assert.equal(selected, 'xendit');

  const withdrawal = createWithdrawalRequest({
    userId: 'u1',
    amount: 500,
    destination: '09170000000',
    method: 'maya'
  });
  const approved = approveWithdrawal(withdrawal, { approverId: 'admin-1', riskScore: 0.2 });
  assert.equal(approved.status, 'approved');
  assert.equal(approved.locked, false);

  const score = calculateFraudScore({
    amount: 10000,
    velocityCount: 5,
    deviceTrust: 0.4,
    kycVerified: false,
    countryRisk: 0.5
  });
  assert.ok(score > 0 && score <= 1);

  const report = reconcileTransactions({
    ledgerEntries: [
      { id: 'tx1', amount: 100, status: 'completed' },
      { id: 'tx2', amount: 50, status: 'pending' }
    ],
    providerEntries: [
      { id: 'tx1', amount: 100, status: 'completed' },
      { id: 'tx2', amount: 50, status: 'failed' },
      { id: 'tx3', amount: 10, status: 'completed' }
    ]
  });
  assert.equal(report.summary.matched, 1);
  assert.equal(report.summary.mismatched, 1);
  assert.equal(report.summary.missingInLedger, 1);
  assert.throws(
    () =>
      choosePaymentProvider({
        method: 'gcash',
        health: { xendit: 'down', paymongo: 'down', dragonpay: 'down' }
      }),
    /No healthy provider/
  );
});

test('intelligent routing, settlement tracking, and payout orchestration are deterministic', () => {
  const route = routePaymentIntent({
    method: 'gcash',
    amount: 15000,
    health: { xendit: 'healthy', paymongo: 'healthy', dragonpay: 'down' },
    providerMetrics: {
      xendit: { successRate: 0.97, latencyMs: 220, feeBps: 200, liquidity: 0.9 },
      paymongo: { successRate: 0.9, latencyMs: 180, feeBps: 240, liquidity: 0.7 }
    }
  });
  assert.equal(route.provider, 'xendit');
  assert.ok(route.score > 0);

  const now = Date.now();
  const settlement = trackSettlementWindow({
    transactions: [
      { id: 'a', status: 'settled', amount: 120, ts: now - 3_000 },
      { id: 'b', status: 'pending', amount: 70, ts: now - 2_000 },
      { id: 'c', status: 'settled', amount: 30, ts: now - 90_000_000 }
    ],
    windowMinutes: 60
  });
  assert.equal(settlement.total, 2);
  assert.equal(settlement.settledVolume, 120);

  const payout = orchestratePayoutQueue({
    requests: [
      { id: 'wd1', amount: 100, riskScore: 0.2 },
      { id: 'wd2', amount: 400, riskScore: 0.9 },
      { id: 'wd3', amount: 250, riskScore: 0.4 }
    ],
    availableLiquidity: 300
  });
  assert.equal(payout.approved.length, 1);
  assert.equal(payout.queued.length, 2);
});

test('security helpers validate ttl and prune stale identities', async () => {
  assert.throws(() => issueRotatingToken({ subject: 'u1', secret: 's1', ttlSec: 0 }), /ttlSec/);
  assert.throws(() => issueRotatingToken({ subject: 'u1', secret: 's1', ttlSec: 999999 }), /ttlSec/);

  const limiter = new RateLimiter({ max: 2, intervalMs: 5 });
  limiter.check('ip-1');
  await new Promise((resolve) => setTimeout(resolve, 10));
  limiter.pruneStale();
  assert.equal(limiter.hits.has('ip-1'), false);
});

test('production environment validation enforces required secrets only in production', () => {
  assert.equal(validateProductionEnvironment({ NODE_ENV: 'test' }).valid, true);
  assert.throws(
    () => validateProductionEnvironment({ NODE_ENV: 'production', JWT_ROTATION_SECRET: '1', ADMIN_API_TOKEN: '' }),
    /Missing required production environment variables/
  );
  assert.equal(
    validateProductionEnvironment({
      NODE_ENV: 'production',
      JWT_ROTATION_SECRET: '1',
      ADMIN_API_TOKEN: '2',
      WEBHOOK_SIGNING_SECRET: '3'
    }).valid,
    true
  );
});
