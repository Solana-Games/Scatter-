import test from 'node:test';
import assert from 'node:assert/strict';

import { connectWallet } from '../apps/web/hooks/useWallets.js';
import { ScatterScene } from '../apps/web/game/phaser/ScatterScene.js';
import { reelSpinDuration } from '../apps/web/game/animations/reels.js';
import { TournamentRoom } from '../apps/api/src/services/multiplayer.js';
import { walletLogin, nftVipTier } from '../apps/api/src/services/web3.js';

test('wallet connect and web3 login are validated', () => {
  const connected = connectWallet('phantom', 'SoLanaAddR001');
  assert.equal(connected.connected, true);
  const login = walletLogin({ walletAddress: '0xabc12345', chain: 'ethereum' });
  assert.equal(login.chain, 'ethereum');
  assert.equal(nftVipTier(3), 'elite');
});

test('scatter scene and reel animation helpers are deterministic', () => {
  const scene = new ScatterScene();
  const result = scene.evaluateScatter([
    ['SCATTER', 'A', 'K'],
    ['Q', 'SCATTER', 'J'],
    ['9', '8', 'SCATTER']
  ]);
  assert.equal(result.triggered, true);
  assert.equal(reelSpinDuration(true, false), 320);
});

test('multiplayer leaderboard sorts by score', () => {
  const room = new TournamentRoom('t1');
  room.join('u1');
  room.join('u2');
  room.submitScore('u1', 99);
  room.submitScore('u2', 120);
  assert.equal(room.leaderboard()[0].userId, 'u2');
});
