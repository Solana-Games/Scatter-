export class JackpotPool {
  constructor(seedAmount = 1000, maxEvents = 500) {
    this.amount = seedAmount;
    this.maxEvents = maxEvents;
    this.events = [];
  }

  pushEvent(event) {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  contribute(stake, ratio = 0.02) {
    const contribution = Number((stake * ratio).toFixed(2));
    this.amount = Number((this.amount + contribution).toFixed(2));
    this.pushEvent({ type: 'contribution', contribution, ts: Date.now() });
    return this.amount;
  }

  payout(winnerId, payoutRatio = 0.4) {
    const payout = Number((this.amount * payoutRatio).toFixed(2));
    this.amount = Number((this.amount - payout).toFixed(2));
    this.pushEvent({ type: 'payout', payout, winnerId, ts: Date.now() });
    return payout;
  }
}
