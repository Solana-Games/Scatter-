import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_API_TOKEN = 'admin-secret';

const { default: server } = await import('../apps/api/src/server.js');

test.after(() => {
  server.close();
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
  const baseUrl = await startServer();
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
  const baseUrl = server.listening ? `http://127.0.0.1:${server.address().port}` : await startServer();
  const largeSeed = 'x'.repeat(1_000_100);
  const response = await fetch(`${baseUrl}/provably-fair/spin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientSeed: largeSeed, nonce: 1 })
  });
  assert.equal(response.status, 413);
});

test('spin rejects invalid stake', async () => {
  const baseUrl = server.listening ? `http://127.0.0.1:${server.address().port}` : await startServer();
  const response = await fetch(`${baseUrl}/provably-fair/spin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientSeed: 'seed', nonce: 1, stake: -5 })
  });
  assert.equal(response.status, 400);
});

test('spin rejects nonce replay for same client seed', async () => {
  const baseUrl = server.listening ? `http://127.0.0.1:${server.address().port}` : await startServer();
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
  const baseUrl = server.listening ? `http://127.0.0.1:${server.address().port}` : await startServer();
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
  const baseUrl = server.listening ? `http://127.0.0.1:${server.address().port}` : await startServer();
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
  const baseUrl = server.listening ? `http://127.0.0.1:${server.address().port}` : await startServer();
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
