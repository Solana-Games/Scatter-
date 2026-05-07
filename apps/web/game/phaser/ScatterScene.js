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
}
