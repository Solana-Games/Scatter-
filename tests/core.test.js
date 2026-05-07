import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

import { estimateRtp, classifyVolatility } from '../packages/core/src/rtp.js';
import { vipTierFromPoints, cashbackForTier } from '../packages/core/src/vip.js';
import { createSpinOutcome, verifyOutcome } from '../apps/api/src/provablyFair.js';
import { createDeposit, retryableStatus, validateWebhookSignature } from '../apps/api/src/payments.js';
import { JackpotPool } from '../apps/api/src/jackpot.js';

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
