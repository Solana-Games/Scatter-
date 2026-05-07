function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

export function predictPlayerChurn({
  daysSinceLastSession = 0,
  sessions30d = 0,
  avgSessionMinutes = 0,
  depositTrend = 0,
  supportTickets30d = 0
}) {
  const inactivityRisk = clamp(daysSinceLastSession / 30);
  const engagementProtection = clamp(sessions30d / 40) * 0.4 + clamp(avgSessionMinutes / 60) * 0.2;
  const spendingRisk = clamp((0 - Number(depositTrend)) / 1000) * 0.2;
  const supportRisk = clamp(supportTickets30d / 10) * 0.1;
  const score = inactivityRisk * 0.6 + spendingRisk + supportRisk - engagementProtection;
  return Number(clamp(score).toFixed(4));
}

export function segmentPlayer({
  lifetimeValue = 0,
  avgBet = 0,
  sessions30d = 0,
  churnRisk = 0
}) {
  if (lifetimeValue >= 100_000 || avgBet >= 500) return 'whale';
  if (churnRisk >= 0.72) return 'at_risk';
  if (lifetimeValue >= 15_000 || avgBet >= 100) return 'vip';
  if (sessions30d >= 16) return 'engaged';
  return 'core';
}

export function recommendRetentionOffer({ segment, churnRisk = 0, vipTier = 'none', budget = 0 }) {
  const normalizedBudget = Math.max(0, Number(budget) || 0);
  const intensity = churnRisk >= 0.8 ? 'critical' : churnRisk >= 0.55 ? 'elevated' : 'steady';
  if (segment === 'whale') {
    return {
      type: 'concierge_bonus',
      intensity,
      credit: Number(Math.min(Math.max(250, normalizedBudget * 0.08), 5000).toFixed(2)),
      perks: ['host_priority', 'lossback_boost']
    };
  }
  if (segment === 'at_risk') {
    return {
      type: 'reactivation_bundle',
      intensity,
      freeSpins: churnRisk >= 0.85 ? 100 : 50,
      cashbackBps: vipTier === 'legend' ? 900 : 650
    };
  }
  return {
    type: 'standard_loyalty',
    intensity,
    freeSpins: segment === 'engaged' ? 20 : 10,
    cashbackBps: segment === 'vip' ? 450 : 250
  };
}

export function tuneDynamicJackpot({
  currentPool = 0,
  targetPool = 0,
  activePlayers = 0,
  baseContributionBps = 150
}) {
  const current = Math.max(0, Number(currentPool) || 0);
  const target = Math.max(1, Number(targetPool) || 1);
  const players = Math.max(1, Number(activePlayers) || 1);
  const demandFactor = clamp((target - current) / target, 0, 1.2);
  const trafficFactor = clamp(players / 10_000, 0.25, 1.25);
  const tuned = Number(baseContributionBps) * (0.75 + demandFactor * 0.8) * trafficFactor;
  return Math.round(Math.max(40, Math.min(450, tuned)));
}

export function economyTick(input) {
  const churnRisk = predictPlayerChurn(input);
  const segment = segmentPlayer({ ...input, churnRisk });
  const offer = recommendRetentionOffer({
    segment,
    churnRisk,
    vipTier: input.vipTier,
    budget: input.monthlyNgr ?? input.lifetimeValue ?? 0
  });
  const jackpotContributionBps = tuneDynamicJackpot({
    currentPool: input.currentJackpotPool,
    targetPool: input.targetJackpotPool,
    activePlayers: input.activePlayers,
    baseContributionBps: input.baseContributionBps
  });
  return {
    churnRisk,
    segment,
    offer,
    jackpotContributionBps
  };
}
