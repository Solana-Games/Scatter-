export class JackpotPool {
  constructor(seedAmount = 1000) {
    this.amount = seedAmount;
    this.events = [];
  }

  contribute(stake, ratio = 0.02) {
    const contribution = Number((stake * ratio).toFixed(2));
    this.amount = Number((this.amount + contribution).toFixed(2));
    this.events.push({ type: 'contribution', contribution, ts: Date.now() });
    return this.amount;
  }

  payout(winnerId, payoutRatio = 0.4) {
    const payout = Number((this.amount * payoutRatio).toFixed(2));
    this.amount = Number((this.amount - payout).toFixed(2));
    this.events.push({ type: 'payout', payout, winnerId, ts: Date.now() });
    return payout;
  }
}
