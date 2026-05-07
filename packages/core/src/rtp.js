export function estimateRtp(spins, paytable) {
  let stake = 0;
  let payout = 0;

  for (const spin of spins) {
    stake += spin.bet;
    payout += paytable[spin.symbol] ?? 0;
  }

  if (stake === 0) return 0;
  return Number(((payout / stake) * 100).toFixed(4));
}

export function classifyVolatility(stdDeviation) {
  if (stdDeviation < 0.8) return 'low';
  if (stdDeviation < 1.6) return 'medium';
  return 'high';
}

export const VOLATILITY_PRESETS = Object.freeze({
  low: { hitFrequency: 0.42, maxWinMultiplier: 80, varianceTarget: 0.7 },
  medium: { hitFrequency: 0.31, maxWinMultiplier: 250, varianceTarget: 1.2 },
  high: { hitFrequency: 0.22, maxWinMultiplier: 1200, varianceTarget: 2.1 }
});

function seededRandom(seedText) {
  let state = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i += 1) {
    state = Math.imul(state ^ seedText.charCodeAt(i), 3432918353);
    state = (state << 13) | (state >>> 19);
  }
  return () => {
    state = Math.imul(state ^ (state >>> 16), 2246822507);
    state = Math.imul(state ^ (state >>> 13), 3266489909);
    state ^= state >>> 16;
    return (state >>> 0) / 4294967296;
  };
}

export function createWeightedMatrix(weights) {
  const entries = Object.entries(weights ?? {}).filter(([, weight]) => Number(weight) > 0);
  if (!entries.length) throw new Error('weights must include at least one positive entry');
  const totalWeight = entries.reduce((acc, [, weight]) => acc + Number(weight), 0);
  let cursor = 0;
  return entries.map(([symbol, weight]) => {
    cursor += Number(weight) / totalWeight;
    return { symbol, threshold: Number(cursor.toFixed(12)) };
  });
}

export function sampleWeightedSymbol(matrix, roll) {
  if (!Array.isArray(matrix) || !matrix.length) throw new Error('matrix is required');
  const normalizedRoll = Number.isFinite(roll) ? Math.max(0, Math.min(0.999999999999, roll)) : 0;
  const found = matrix.find((entry) => normalizedRoll < entry.threshold);
  return found?.symbol ?? matrix[matrix.length - 1].symbol;
}

export function createRtpProfile({ id, targetRtp, volatility = 'medium', weights }) {
  if (typeof id !== 'string' || !id.trim()) throw new Error('profile id is required');
  if (!Number.isFinite(targetRtp) || targetRtp <= 0 || targetRtp > 105) {
    throw new Error('targetRtp must be between 0 and 105');
  }
  if (!VOLATILITY_PRESETS[volatility]) throw new Error('unsupported volatility preset');
  return {
    id: id.trim(),
    targetRtp: Number(targetRtp),
    volatility,
    matrix: createWeightedMatrix(weights),
    preset: VOLATILITY_PRESETS[volatility]
  };
}

export function simulateRtpSpins({ profile, paytable, spins = 100000, bet = 1, seed = 'default' }) {
  if (!profile?.matrix) throw new Error('profile with matrix is required');
  if (!Number.isInteger(spins) || spins <= 0) throw new Error('spins must be a positive integer');
  if (!Number.isFinite(bet) || bet <= 0) throw new Error('bet must be positive');
  const random = seededRandom(`${seed}:${profile.id}:${spins}`);
  const outcomes = [];
  for (let i = 0; i < spins; i += 1) {
    const symbol = sampleWeightedSymbol(profile.matrix, random());
    outcomes.push({ bet, symbol, payout: Number(paytable?.[symbol] ?? 0) });
  }
  const totalStake = Number((spins * bet).toFixed(4));
  const totalPayout = Number(outcomes.reduce((acc, spin) => acc + spin.payout, 0).toFixed(4));
  return {
    totalStake,
    totalPayout,
    rtp: totalStake === 0 ? 0 : Number(((totalPayout / totalStake) * 100).toFixed(4)),
    outcomes
  };
}

export function payoutDistribution(outcomes, bucketSize = 10) {
  if (!Array.isArray(outcomes) || !outcomes.length) return [];
  if (!Number.isInteger(bucketSize) || bucketSize <= 0) throw new Error('bucketSize must be a positive integer');
  const buckets = new Map();
  for (const outcome of outcomes) {
    const payout = Number(outcome.payout ?? 0);
    const bucket = Math.floor(payout / bucketSize) * bucketSize;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, count]) => ({ bucketStart: bucket, bucketEnd: bucket + bucketSize - 1, count }));
}

export function volatilityHeatmap(outcomes, windowSize = 100) {
  if (!Array.isArray(outcomes) || !outcomes.length) return [];
  if (!Number.isInteger(windowSize) || windowSize <= 1) throw new Error('windowSize must be > 1');
  const heatmap = [];
  for (let start = 0; start < outcomes.length; start += windowSize) {
    const segment = outcomes.slice(start, start + windowSize).map((entry) => Number(entry.payout ?? 0));
    if (segment.length < 2) continue;
    const mean = segment.reduce((acc, value) => acc + value, 0) / segment.length;
    const variance = segment.reduce((acc, value) => acc + (value - mean) ** 2, 0) / segment.length;
    heatmap.push({
      window: [start, Math.min(outcomes.length - 1, start + windowSize - 1)],
      volatility: Number(Math.sqrt(variance).toFixed(6)),
      level: classifyVolatility(Math.sqrt(variance))
    });
  }
  return heatmap;
}

export function auditRtpProfile({ profile, paytable, spins = 100000, bet = 1, seed = 'audit' }) {
  const simulation = simulateRtpSpins({ profile, paytable, spins, bet, seed });
  return {
    profileId: profile.id,
    targetRtp: profile.targetRtp,
    observedRtp: simulation.rtp,
    rtpDrift: Number((simulation.rtp - profile.targetRtp).toFixed(4)),
    payoutDistribution: payoutDistribution(simulation.outcomes),
    volatilityHeatmap: volatilityHeatmap(simulation.outcomes)
  };
}
