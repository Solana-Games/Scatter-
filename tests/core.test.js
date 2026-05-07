import test from 'node:test';
import assert from 'node:assert/strict';

import { estimateRtp, classifyVolatility } from '../packages/core/src/rtp.js';
import { vipTierFromPoints, cashbackForTier } from '../packages/core/src/vip.js';
import { createSpinOutcome, verifyOutcome } from '../apps/api/src/provablyFair.js';
import { createDeposit, retryableStatus } from '../apps/api/src/payments.js';

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

test('payment creation validates provider and status retry', () => {
  const dep = createDeposit({ provider: 'xendit', method: 'gcash', amount: 500, userId: 'u1' });
  assert.equal(dep.status, 'pending_approval');
  assert.equal(retryableStatus('timeout'), true);
  assert.equal(retryableStatus('completed'), false);
});
