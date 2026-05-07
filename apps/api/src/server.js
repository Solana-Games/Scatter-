import http from 'node:http';
import { createSpinOutcome, generateServerSeed, hashServerSeed, verifyOutcome } from './provablyFair.js';
import { createDeposit } from './payments.js';
import { JackpotPool } from './jackpot.js';

const port = Number(process.env.PORT || 4000);
const jackpot = new JackpotPool();
let activeServerSeed = generateServerSeed();
const seedHash = () => hashServerSeed(activeServerSeed);

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
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

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, { status: 'ok', service: 'scaterx-api' });
  }

  if (req.method === 'GET' && req.url === '/provably-fair/current') {
    return json(res, 200, { serverSeedHash: seedHash() });
  }

  if (req.method === 'POST' && req.url === '/provably-fair/spin') {
    const body = await readJson(req).catch((e) => json(res, 400, { error: e.message }));
    if (!body || res.writableEnded) return;
    const nonce = Number(body.nonce ?? 0);
    const clientSeed = String(body.clientSeed ?? 'default');
    const outcome = createSpinOutcome({ serverSeed: activeServerSeed, clientSeed, nonce });
    jackpot.contribute(Number(body.stake ?? 10));
    return json(res, 200, { ...outcome, jackpot: jackpot.amount, serverSeedHash: seedHash() });
  }

  if (req.method === 'POST' && req.url === '/provably-fair/verify') {
    const body = await readJson(req).catch((e) => json(res, 400, { error: e.message }));
    if (!body || res.writableEnded) return;
    const isValid = verifyOutcome(body);
    return json(res, 200, { isValid });
  }

  if (req.method === 'POST' && req.url === '/payments/deposit') {
    const body = await readJson(req).catch((e) => json(res, 400, { error: e.message }));
    if (!body || res.writableEnded) return;
    try {
      const deposit = createDeposit(body);
      return json(res, 201, deposit);
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (req.method === 'POST' && req.url === '/provably-fair/rotate-seed') {
    activeServerSeed = generateServerSeed();
    return json(res, 200, { serverSeedHash: seedHash() });
  }

  return json(res, 404, { error: 'Not found' });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    console.log(`SCATERX API listening on :${port}`);
  });
}

export default server;
