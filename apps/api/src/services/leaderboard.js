export function topWins(entries, limit = 10) {
  return [...entries].sort((a, b) => b.amount - a.amount).slice(0, limit);
}

export function streakScore(wins) {
  return wins.reduce((acc, amount, i) => acc + amount * (1 + i * 0.1), 0);
}
