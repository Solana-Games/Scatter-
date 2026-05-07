export class ScatterScene {
  constructor() {
    this.reels = 5;
    this.rows = 3;
    this.scatterTrigger = 3;
  }

  evaluateScatter(symbolGrid) {
    const scatterCount = symbolGrid.flat().filter((s) => s === 'SCATTER').length;
    return {
      scatterCount,
      triggered: scatterCount >= this.scatterTrigger,
      freeSpinsAwarded: scatterCount >= this.scatterTrigger ? 10 + scatterCount * 2 : 0
    };
  }
}
