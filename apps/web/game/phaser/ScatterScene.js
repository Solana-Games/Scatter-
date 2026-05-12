export class ScatterScene {
  constructor() {
    this.reels = 5;
    this.rows = 3;
    this.scatterTrigger = 3;
    this.jackpotTicker = [];
  }

  evaluateScatter(symbolGrid) {
    const scatterCount = symbolGrid.flat().filter((s) => s === 'SCATTER').length;
    return {
      scatterCount,
      triggered: scatterCount >= this.scatterTrigger,
      freeSpinsAwarded: scatterCount >= this.scatterTrigger ? 10 + scatterCount * 2 : 0
    };
  }

  evaluateComboChain(cascadeWins) {
    const chainLength = (cascadeWins ?? []).filter((value) => Number(value) > 0).length;
    const multiplier = chainLength >= 5 ? 4 : chainLength >= 3 ? 2 : 1;
    return {
      chainLength,
      multiplier,
      cinematic: chainLength >= 4
    };
  }

  updateJackpotTicker(payload) {
    this.jackpotTicker.push({ ...payload, ts: Date.now() });
    if (this.jackpotTicker.length > 25) this.jackpotTicker.shift();
    return [...this.jackpotTicker];
  }

  multiplierOverlay(multiplier) {
    const value = Number(multiplier) || 1;
    return {
      visible: value > 1,
      text: `x${Math.max(1, value)}`,
      pulse: value >= 5
    };
  }

  evaluateMegaWin({ payout, bet }) {
    const normalizedBet = Math.max(1, Number(bet) || 1);
    const ratio = Math.max(0, Number(payout) || 0) / normalizedBet;
    return {
      ratio: Number(ratio.toFixed(2)),
      mega: ratio >= 50,
      ultra: ratio >= 150,
      fullscreenFx: ratio >= 100
    };
  }

  environmentalPulse(intensity = 0) {
    const normalized = Math.max(0, Math.min(1, Number(intensity) || 0));
    return {
      lighting: Number((0.5 + normalized * 0.5).toFixed(3)),
      particleDensity: Number((0.2 + normalized * 0.8).toFixed(3)),
      distortion: normalized >= 0.7
    };
  }
}
