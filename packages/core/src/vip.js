export function vipTierFromPoints(points) {
  if (points >= 200000) return 'diamond';
  if (points >= 75000) return 'platinum';
  if (points >= 25000) return 'gold';
  if (points >= 5000) return 'silver';
  return 'bronze';
}

export function cashbackForTier(tier, wageredAmount) {
  const ratio = {
    bronze: 0.002,
    silver: 0.004,
    gold: 0.006,
    platinum: 0.008,
    diamond: 0.01
  }[tier] ?? 0;
  return Number((wageredAmount * ratio).toFixed(2));
}
