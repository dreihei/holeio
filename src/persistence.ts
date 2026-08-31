const KEY = 'sink-city-highscore';

export function loadHighscore(): number {
  try { return Math.max(0, Number.parseInt(localStorage.getItem(KEY) ?? '0', 10) || 0); }
  catch { return 0; }
}

export function saveHighscore(score: number): number {
  const next = Math.max(loadHighscore(), Math.floor(score));
  try { localStorage.setItem(KEY, String(next)); } catch { /* Storage may be disabled. */ }
  return next;
}
