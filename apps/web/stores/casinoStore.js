export function createCasinoState() {
  return { balance: 0, autoSpin: false, turbo: false };
}

export function applyWin(state, amount) {
  return { ...state, balance: Number((state.balance + amount).toFixed(2)) };
}
