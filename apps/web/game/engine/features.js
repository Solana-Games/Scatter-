const MODIFIERS = ['double_payout', 'extra_scatter', 'mystery_upgrade', 'mini_respin'];

export function applyStickyWilds(grid, stickyPositions = []) {
  return grid.map((row, rowIndex) =>
    row.map((symbol, colIndex) => {
      const shouldStick = stickyPositions.some(([r, c]) => r === rowIndex && c === colIndex);
      return shouldStick ? 'WILD' : symbol;
    })
  );
}

export function applyWalkingWilds(grid, direction = 'left') {
  const width = grid[0]?.length ?? 0;
  if (width === 0) return grid;
  const shift = direction === 'right' ? 1 : -1;
  return grid.map((row) => {
    const next = new Array(width).fill(null);
    row.forEach((symbol, index) => {
      if (symbol !== 'WILD') {
        next[index] = next[index] ?? symbol;
        return;
      }
      const target = (index + shift + width) % width;
      next[target] = 'WILD';
    });
    return next.map((symbol, index) => symbol ?? row[index]);
  });
}

export function resolveMysterySymbols(grid, revealSymbol) {
  if (typeof revealSymbol !== 'string' || !revealSymbol.trim()) throw new Error('revealSymbol is required');
  return grid.map((row) => row.map((symbol) => (symbol === 'MYSTERY' ? revealSymbol : symbol)));
}

export function randomModifier(seed = 0) {
  const index = Math.abs(Number(seed) || 0) % MODIFIERS.length;
  return MODIFIERS[index];
}

export function symbolTransformationEvent(grid, fromSymbol, toSymbol) {
  return grid.map((row) => row.map((symbol) => (symbol === fromSymbol ? toSymbol : symbol)));
}

export function gambleFeature({ currentWin, guess, deterministicSource = 0 }) {
  const normalizedWin = Number(currentWin);
  if (!Number.isFinite(normalizedWin) || normalizedWin <= 0) throw new Error('currentWin must be positive');
  if (!['red', 'black'].includes(guess)) throw new Error('guess must be red or black');
  const outcome = Math.abs(Number(deterministicSource) || 0) % 2 === 0 ? 'red' : 'black';
  const won = guess === outcome;
  return { outcome, won, resultingWin: won ? normalizedWin * 2 : 0 };
}

export function shouldTriggerRespin({ hasScatter, randomValue }) {
  if (hasScatter) return true;
  const roll = Math.max(0, Math.min(1, Number(randomValue) || 0));
  return roll >= 0.93;
}
