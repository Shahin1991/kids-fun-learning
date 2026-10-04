/** Best scores live in localStorage; every call is safe when storage is unavailable. */
export function readBest(game: string): number {
  try {
    return Number(localStorage.getItem(`arcade-best-${game}`)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(game: string, score: number): boolean {
  if (score <= readBest(game)) return false;
  try {
    localStorage.setItem(`arcade-best-${game}`, String(score));
  } catch {
    // storage unavailable
  }
  return true;
}
