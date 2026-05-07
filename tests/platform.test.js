import test from 'node:test';
import assert from 'node:assert/strict';

import { connectWallet } from '../apps/web/hooks/useWallets.js';
import { ScatterScene } from '../apps/web/game/phaser/ScatterScene.js';
import { adaptiveAnimationTiming, gpuReelBlurVelocity, multiplierOverlayFrames, reelSpinDuration } from '../apps/web/game/animations/reels.js';
import {
  applyStickyWilds,
  applyWalkingWilds,
  gambleFeature,
  randomModifier,
  resolveMysterySymbols,
  shouldTriggerRespin,
  symbolTransformationEvent
} from '../apps/web/game/engine/features.js';
import { TournamentRoom } from '../apps/api/src/services/multiplayer.js';
import { walletLogin, nftVipTier } from '../apps/api/src/services/web3.js';

test('wallet connect and web3 login are validated', () => {
  const connected = connectWallet('phantom', 'SoLanaAddR001');
  assert.equal(connected.connected, true);
  const login = walletLogin({ walletAddress: '0xabc12345', chain: 'ethereum' });
  assert.equal(login.chain, 'ethereum');
  assert.ok(login.sessionHint);
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
  assert.equal(gpuReelBlurVelocity(900), 0.75);
  assert.equal(multiplierOverlayFrames(10), 54);
  const timing = adaptiveAnimationTiming({ isBigWin: true, volatility: 'high', turbo: false });
  assert.ok(timing.celebrationMs > 1300);
  const chain = scene.evaluateComboChain([2, 4, 1, 0, 8]);
  assert.equal(chain.multiplier, 2);
  assert.equal(scene.multiplierOverlay(6).pulse, true);
});

test('multiplayer leaderboard sorts by score', () => {
  const room = new TournamentRoom('t1');
  room.join('u1');
  room.join('u2');
  room.submitScore('u1', 99);
  room.submitScore('u2', 120);
  assert.equal(room.leaderboard()[0].userId, 'u2');
});

test('slot feature helpers support sticky and mystery mechanics', () => {
  const grid = [
    ['A', 'MYSTERY', 'WILD'],
    ['K', 'Q', 'WILD']
  ];
  const sticky = applyStickyWilds(grid, [
    [0, 0],
    [1, 1]
  ]);
  assert.equal(sticky[0][0], 'WILD');
  assert.equal(sticky[1][1], 'WILD');
  const revealed = resolveMysterySymbols(sticky, 'SCATTER');
  assert.equal(revealed[0].includes('SCATTER'), true);
  const walked = applyWalkingWilds(revealed, 'left');
  assert.equal(walked[0].includes('WILD'), true);
  const transformed = symbolTransformationEvent(revealed, 'K', 'WILD');
  assert.equal(transformed[1][0], 'WILD');
  assert.equal(['double_payout', 'extra_scatter', 'mystery_upgrade', 'mini_respin'].includes(randomModifier(2)), true);
  const gamble = gambleFeature({ currentWin: 100, guess: 'red', source: 2 });
  assert.equal(gamble.won, true);
  assert.equal(shouldTriggerRespin({ hasScatter: false, randomValue: 0.95 }), true);
});
