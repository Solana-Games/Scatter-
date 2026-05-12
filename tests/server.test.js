import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_API_TOKEN = 'admin-secret';

const { default: server } = await import('../apps/api/src/server.js');
let baseUrl;

test.after(() => {
  server.close();
});

test.before(async () => {
  baseUrl = await startServer();
});

function startServer() {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve(`http://127.0.0.1:${port}`);
    });
  });
}

test('rotate seed requires admin token', async () => {
  const unauthorized = await fetch(`${baseUrl}/provably-fair/rotate-seed`, { method: 'POST' });
  assert.equal(unauthorized.status, 401);

  const authorized = await fetch(`${baseUrl}/provably-fair/rotate-seed`, {
    method: 'POST',
    headers: { 'x-admin-token': 'admin-secret' }
  });
  assert.equal(authorized.status, 200);
  const payload = await authorized.json();
  assert.ok(payload.serverSeedHash);
  assert.ok(payload.seedVersion >= 2);
});

test('oversized payload returns 413', async () => {
  const largeSeed = 'x'.repeat(1_000_100);
  const response = await fetch(`${baseUrl}/provably-fair/spin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientSeed: largeSeed, nonce: 1 })
  });
  assert.equal(response.status, 413);
});

test('spin rejects invalid stake', async () => {
  const response = await fetch(`${baseUrl}/provably-fair/spin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientSeed: 'seed', nonce: 1, stake: -5 })
  });
  assert.equal(response.status, 400);
});

test('spin rejects nonce replay for same client seed', async () => {
  const payload = { clientSeed: 'seed-1', nonce: 777, stake: 10 };
  const first = await fetch(`${baseUrl}/provably-fair/spin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(first.status, 200);
  const second = await fetch(`${baseUrl}/provably-fair/spin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(second.status, 409);
});

test('rtp simulation endpoint returns audit payload', async () => {
  const response = await fetch(`${baseUrl}/rtp/simulate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ profileId: 'rtp-medium', spins: 5000, bet: 1, seed: 'test-seed' })
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.profileId, 'rtp-medium');
  assert.ok(Number.isFinite(payload.observedRtp));
});

test('payment provider selection and withdrawal approval work', async () => {
  const providerSelection = await fetch(`${baseUrl}/payments/provider/select`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      method: 'gcash',
      preferredProvider: 'xendit',
      health: { xendit: 'degraded', paymongo: 'healthy', dragonpay: 'healthy' }
    })
  });
  assert.equal(providerSelection.status, 200);

  const withdrawalCreate = await fetch(`${baseUrl}/payments/withdraw`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId: 'u1', amount: 500, destination: '09170000000', method: 'maya' })
  });
  assert.equal(withdrawalCreate.status, 201);
  const withdrawal = await withdrawalCreate.json();

  const withdrawalApprove = await fetch(`${baseUrl}/payments/withdraw/approve`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-token': 'admin-secret' },
    body: JSON.stringify({ withdrawalId: withdrawal.id, approverId: 'admin-1', riskScore: 0.2 })
  });
  assert.equal(withdrawalApprove.status, 200);
});

test('token rotate and verify flow is functional', async () => {
  const rotate = await fetch(`${baseUrl}/security/token/rotate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-token': 'admin-secret' },
    body: JSON.stringify({ subject: 'ops-admin', ttlSec: 300 })
  });
  assert.equal(rotate.status, 200);
  const tokenPayload = await rotate.json();
  assert.ok(tokenPayload.token);

  const verify = await fetch(`${baseUrl}/security/token/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: tokenPayload.token, subject: 'ops-admin' })
  });
  assert.equal(verify.status, 200);
  const verified = await verify.json();
  assert.equal(verified.valid, true);
});

test('pr3 economy, realtime, and payment orchestration endpoints respond', async () => {
  const economy = await fetch(`${baseUrl}/ai/economy/evaluate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      daysSinceLastSession: 12,
      sessions30d: 4,
      avgSessionMinutes: 15,
      depositTrend: -120,
      supportTickets30d: 1,
      lifetimeValue: 25000,
      avgBet: 120,
      activePlayers: 2300,
      currentJackpotPool: 150000,
      targetJackpotPool: 320000
    })
  });
  assert.equal(economy.status, 200);
  const economyPayload = await economy.json();
  assert.equal(typeof economyPayload.segment, 'string');

  const route = await fetch(`${baseUrl}/payments/route/intelligent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      method: 'gcash',
      amount: 1200,
      health: { xendit: 'healthy', paymongo: 'degraded', dragonpay: 'down' },
      providerMetrics: {
        xendit: { successRate: 0.96, latencyMs: 220, feeBps: 210, liquidity: 0.9 },
        paymongo: { successRate: 0.9, latencyMs: 140, feeBps: 260, liquidity: 0.7 }
      }
    })
  });
  assert.equal(route.status, 200);

  const payout = await fetch(`${baseUrl}/payments/payout/orchestrate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-token': 'admin-secret' },
    body: JSON.stringify({
      availableLiquidity: 500,
      requests: [
        { id: 'wd-1', amount: 100, riskScore: 0.1 },
        { id: 'wd-2', amount: 200, riskScore: 0.95 }
      ]
    })
  });
  assert.equal(payout.status, 200);

  const topology = await fetch(`${baseUrl}/realtime/topology`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ regions: ['apac', 'eu'], activeSockets: 100000, maxSocketsPerGateway: 50000 })
  });
  assert.equal(topology.status, 200);
  const topologyPayload = await topology.json();
  assert.equal(topologyPayload.plan.length, 2);

  const tournament = await fetch(`${baseUrl}/tournaments/orchestrate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      roomSize: 2,
      players: [
        { userId: 'u1', region: 'apac', latencyMs: 40 },
        { userId: 'u2', region: 'apac', latencyMs: 50 },
        { userId: 'u3', region: 'eu', latencyMs: 80 }
      ]
    })
  });
  assert.equal(tournament.status, 200);
});
