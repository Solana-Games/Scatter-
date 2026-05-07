import http from 'node:http';
import { createSpinOutcome, generateServerSeed, hashServerSeed, verifyOutcome } from './provablyFair.js';
import { createDeposit } from './payments.js';
import { JackpotPool } from './jackpot.js';

const port = Number(process.env.PORT || 4000);
const jackpot = new JackpotPool();
let activeServerSeed = generateServerSeed();
const seedAuditChain = [hashServerSeed(activeServerSeed)];
const seedHash = () => hashServerSeed(activeServerSeed);

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
  return req.headers['x-admin-token'] === adminToken;
}

function parseBodyOrReply(req, res) {
  return readJson(req).catch((error) => {
    const statusCode = error.statusCode ?? 400;
    json(res, statusCode, { error: error.message });
    return null;
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, { status: 'ok', service: 'scaterx-api' });
  }

  if (req.method === 'GET' && req.url === '/provably-fair/current') {
    return json(res, 200, { serverSeedHash: seedHash(), seedVersion: seedAuditChain.length });
  }

  if (req.method === 'POST' && req.url === '/provably-fair/spin') {
    const body = await parseBodyOrReply(req, res);
    if (!body || res.writableEnded) return;
    const nonce = Number(body.nonce ?? 0);
    const clientSeed = String(body.clientSeed ?? 'default');
    let outcome;
    try {
      outcome = createSpinOutcome({ serverSeed: activeServerSeed, clientSeed, nonce });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
    jackpot.contribute(Number(body.stake ?? 10));
    return json(res, 200, { ...outcome, jackpot: jackpot.amount, serverSeedHash: seedHash(), seedVersion: seedAuditChain.length });
  }

  if (req.method === 'POST' && req.url === '/provably-fair/verify') {
    const body = await parseBodyOrReply(req, res);
    if (!body || res.writableEnded) return;
    const isValid = verifyOutcome(body);
    return json(res, 200, { isValid });
  }

  if (req.method === 'POST' && req.url === '/payments/deposit') {
    const body = await parseBodyOrReply(req, res);
    if (!body || res.writableEnded) return;
    try {
      const deposit = createDeposit(body);
      return json(res, 201, deposit);
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (req.method === 'POST' && req.url === '/provably-fair/rotate-seed') {
    if (!isAdminAuthorized(req)) {
      return json(res, 401, { error: 'Unauthorized' });
    }
    const previousHash = seedHash();
    activeServerSeed = generateServerSeed();
    const nextHash = seedHash();
    seedAuditChain.push(nextHash);
    return json(res, 200, { previousHash, serverSeedHash: nextHash, seedVersion: seedAuditChain.length });
  }

  return json(res, 404, { error: 'Not found' });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    console.log(`SCATERX API listening on :${port}`);
  });
}

export default server;
