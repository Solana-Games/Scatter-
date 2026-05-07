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

export function clusterPays(grid, minCluster = 4) {
  if (!Array.isArray(grid) || !grid.length) return [];
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = new Set();
  const clusters = [];

  const neighbors = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const startKey = `${row}:${col}`;
      if (visited.has(startKey)) continue;
      const symbol = grid[row][col];
      const queue = [[row, col]];
      const cells = [];
      while (queue.length) {
        const [r, c] = queue.pop();
        const key = `${r}:${c}`;
        if (visited.has(key)) continue;
        if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
        if (grid[r][c] !== symbol) continue;
        visited.add(key);
        cells.push([r, c]);
        for (const [dr, dc] of neighbors) {
          queue.push([r + dr, c + dc]);
        }
      }
      if (cells.length >= minCluster) {
        clusters.push({ symbol, size: cells.length, cells });
      }
    }
  }
  return clusters;
}

export function expandReelGrid(grid, direction = 'right', growth = 1, maxColumns = 8) {
  const columns = grid[0]?.length ?? 0;
  const addColumns = Math.max(0, Number(growth) || 0);
  const targetColumns = Math.min(maxColumns, columns + addColumns);
  if (targetColumns <= columns) return grid;
  return grid.map((row) => {
    const seedSymbol = direction === 'left' ? row[0] : row[row.length - 1];
    const fill = new Array(targetColumns - columns).fill(seedSymbol);
    return direction === 'left' ? [...fill, ...row] : [...row, ...fill];
  });
}

export function splitSymbol(grid, symbol, replacement = ['A', 'K']) {
  const [left, right] = replacement;
  return grid.map((row) =>
    row.flatMap((cell) => {
      if (cell !== symbol) return [cell];
      return [left, right];
    })
  );
}

export function randomEventEngine(seed = 0, events = ['mystery_reel', 'jackpot_boost', 'boss_bonus']) {
  if (!events.length) throw new Error('events must not be empty');
  const index = Math.abs(Math.floor(Number(seed) || 0)) % events.length;
  return events[index];
}

export function adaptiveJackpotDropChance({ baseChance = 0.01, playerSegment = 'core', streak = 0 }) {
  const segmentMod = playerSegment === 'whale' ? 1.6 : playerSegment === 'vip' ? 1.35 : playerSegment === 'at_risk' ? 1.2 : 1;
  const streakMod = 1 + Math.min(0.5, Math.max(0, Number(streak) || 0) * 0.03);
  return Number(Math.max(0.001, Math.min(0.25, Number(baseChance) * segmentMod * streakMod)).toFixed(4));
}
