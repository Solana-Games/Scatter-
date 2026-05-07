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
