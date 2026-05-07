export function reelSpinDuration(turbo, quick) {
  if (turbo) return 320;
  if (quick) return 520;
  return 1100;
}

export function cascadingDelay(step) {
  return 120 + step * 70;
}

export function gpuReelBlurVelocity(spinVelocity) {
  const normalized = Math.max(0, Number(spinVelocity) || 0);
  return Number(Math.min(1, normalized / 1200).toFixed(3));
}

export function adaptiveAnimationTiming({ isBigWin = false, volatility = 'medium', turbo = false }) {
  if (turbo) {
    return { anticipationMs: 180, bounceMs: 140, celebrationMs: 900 };
  }
  const volatilityMod = volatility === 'high' ? 1.15 : volatility === 'low' ? 0.9 : 1;
  return {
    anticipationMs: Math.round((isBigWin ? 520 : 340) * volatilityMod),
    bounceMs: Math.round((isBigWin ? 380 : 240) * volatilityMod),
    celebrationMs: Math.round((isBigWin ? 2600 : 1300) * volatilityMod)
  };
}

export function multiplierOverlayFrames(multiplier) {
  const value = Math.max(1, Number(multiplier) || 1);
  if (value >= 20) return 72;
  if (value >= 10) return 54;
  if (value >= 5) return 40;
  return 28;
}
