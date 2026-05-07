export function reelSpinDuration(turbo, quick) {
  if (turbo) return 320;
  if (quick) return 520;
  return 1100;
}

export function cascadingDelay(step) {
  return 120 + step * 70;
}
