export class TournamentRoom {
  constructor(id) {
    this.id = id;
    this.players = new Map();
  }

  join(userId, score = 0) {
    this.players.set(userId, score);
    return this.players.size;
  }

  submitScore(userId, score) {
    if (!this.players.has(userId)) throw new Error('Player not in room');
    this.players.set(userId, score);
  }

  leaderboard() {
    return [...this.players.entries()]
      .map(([userId, score]) => ({ userId, score }))
      .sort((a, b) => b.score - a.score);
  }
}
