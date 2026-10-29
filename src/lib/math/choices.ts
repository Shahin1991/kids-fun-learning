/** Three different positive whole-number choices, one of them `answer`. `tempting` wrongs go in first. */
export function numberChoices(answer: number, r: () => number = Math.random, tempting: number[] = []): number[] {
  const out = new Set<number>([answer]);
  for (const t of tempting) if (t > 0 && out.size < 3) out.add(t);
  const near = [answer - 1, answer + 1, answer - 2, answer + 2, answer + 3].filter((n) => n > 0).sort(() => r() - 0.5);
  for (const n of near) if (out.size < 3) out.add(n);
  return [...out].sort((a, b) => a - b);
}
