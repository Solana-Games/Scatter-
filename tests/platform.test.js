import test from 'node:test';
import assert from 'node:assert/strict';

import { connectWallet } from '../apps/web/hooks/useWallets.js';
import { ScatterScene } from '../apps/web/game/phaser/ScatterScene.js';
import {
  adaptiveAnimationTiming,
  adaptiveQualityProfile,
  cinematicCameraEffect,
  gpuReelBlurVelocity,
  multiplierOverlayFrames,
  reelSpinDuration,
  reelTensionCurve
} from '../apps/web/game/animations/reels.js';
import {
  adaptiveJackpotDropChance,
  applyStickyWilds,
  applyWalkingWilds,
  clusterPays,
  expandReelGrid,
  gambleFeature,
  randomModifier,
  randomEventEngine,
  resolveMysterySymbols,
  shouldTriggerRespin,
  splitSymbol,
  symbolTransformationEvent
} from '../apps/web/game/engine/features.js';
import { TournamentNetwork, TournamentRoom } from '../apps/api/src/services/multiplayer.js';
import { nftVipTier, tokenizedJackpotLedger, walletLogin, walletReputationScore } from '../apps/api/src/services/web3.js';
import { economyTick } from '../apps/api/src/services/aiEconomy.js';
import { buildGatewayPlan, orchestrateTournamentRooms, websocketFailoverPlan } from '../apps/api/src/services/realtimeScaling.js';

test('wallet connect and web3 login are validated', () => {
  const connected = connectWallet('phantom', 'SoLanaAddR001');
  assert.equal(connected.connected, true);
  const login = walletLogin({ walletAddress: '0xabc12345', chain: 'ethereum' });
  assert.equal(login.chain, 'ethereum');
  assert.ok(login.sessionHint);
  assert.equal(nftVipTier(3), 'elite');
  assert.ok(walletReputationScore({ walletAgeDays: 365, txCount: 800, flaggedEvents: 0 }) > 0.3);
  assert.equal(tokenizedJackpotLedger({ jackpotId: 'jp-1', totalAmount: 120, chains: ['solana', 'base'] }).length, 2);
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
  assert.equal(scene.evaluateMegaWin({ payout: 800, bet: 10 }).mega, true);
  assert.equal(scene.environmentalPulse(0.8).distortion, true);
  assert.ok(reelTensionCurve({ reelIndex: 4, totalReels: 5, nearBonus: true }) > 1.5);
  assert.equal(cinematicCameraEffect(60).chroma, true);
  assert.equal(adaptiveQualityProfile({ deviceTier: 'flagship', batterySaver: false }).targetFps, 120);
});

test('multiplayer leaderboard sorts by score', () => {
  const room = new TournamentRoom('t1');
  room.join('u1');
  room.join('u2');
  room.submitScore('u1', 99);
  room.submitScore('u2', 120);
  assert.equal(room.leaderboard()[0].userId, 'u2');
  const network = new TournamentNetwork(2);
  network.assignPlayer({ userId: 'u1', region: 'apac' });
  network.assignPlayer({ userId: 'u2', region: 'apac' });
  network.assignPlayer({ userId: 'u3', region: 'apac' });
  const fallbackRegion = network.assignPlayer({ userId: 'u4', region: null });
  assert.equal(network.networkStatus().apac.rooms, 2);
  assert.equal(fallbackRegion.region, 'global');
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
  const gamble = gambleFeature({ currentWin: 100, guess: 'red', deterministicSource: 2 });
  assert.equal(gamble.won, true);
  assert.equal(shouldTriggerRespin({ hasScatter: false, randomValue: 0.95 }), true);
  const clusters = clusterPays([
    ['A', 'A', 'K'],
    ['A', 'Q', 'K'],
    ['A', 'K', 'K']
  ], 3);
  assert.equal(clusters.length >= 1, true);
  assert.equal(expandReelGrid([['A', 'B'], ['C', 'D']], 'right', 1)[0].length, 3);
  assert.equal(splitSymbol([['SCATTER', 'A']], 'SCATTER', ['S1', 'S2'])[0].length, 3);
  assert.equal(randomEventEngine(5, ['x', 'y', 'z']), 'z');
  assert.ok(adaptiveJackpotDropChance({ baseChance: 0.02, playerSegment: 'whale', streak: 5 }) > 0.02);
});

test('ai economy and realtime scaling orchestration outputs stable plans', () => {
  const tick = economyTick({
    daysSinceLastSession: 8,
    sessions30d: 3,
    avgSessionMinutes: 12,
    depositTrend: -150,
    supportTickets30d: 2,
    lifetimeValue: 21000,
    avgBet: 120,
    activePlayers: 4000,
    currentJackpotPool: 180000,
    targetJackpotPool: 350000
  });
  assert.equal(typeof tick.segment, 'string');
  assert.ok(tick.jackpotContributionBps >= 40);

  const gateway = buildGatewayPlan({ regions: ['apac', 'eu'], activeSockets: 120000, maxSocketsPerGateway: 50000 });
  assert.equal(gateway.length, 2);
  assert.ok(gateway[0].gateways >= 1);

  const rooms = orchestrateTournamentRooms({
    players: [
      { userId: 'u1', region: 'apac', latencyMs: 40 },
      { userId: 'u2', region: 'apac', latencyMs: 65 },
      { userId: 'u3', region: 'eu', latencyMs: 80 }
    ],
    roomSize: 2
  });
  assert.equal(rooms.length, 2);

  const failover = websocketFailoverPlan({
    nodes: [
      { id: 'n1', status: 'healthy', spareCapacity: 8000 },
      { id: 'n2', status: 'healthy', spareCapacity: 3000 },
      { id: 'n3', status: 'down', spareCapacity: 0 }
    ]
  });
  assert.equal(failover.unhealthyCount, 1);
});
