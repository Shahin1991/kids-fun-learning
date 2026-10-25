/** Moon phase angle in degrees: 0 is new moon, 180 is full, 270 is last quarter. */
export function litFraction(angle: number): number {
  return (1 - Math.cos((angle * Math.PI) / 180)) / 2;
}

/**
 * SVG path (centred on 0,0, radius r) for the sunlit part of the moon as seen from the northern hemisphere:
 * the right edge lights up first while the moon waxes, the left edge stays lit while it wanes.
 */
export function litPath(angle: number, r: number): string {
  const a = ((angle % 360) + 360) % 360;
  const waxing = a <= 180;
  const phase = waxing ? a : 360 - a;
  if (phase < 1) return "";
  const rx = Math.abs(Math.cos((phase * Math.PI) / 180)) * r;
  const sweep = phase > 90 ? 1 : 0;
  const side = waxing ? 1 : 0;
  return `M0,${-r} A${r},${r} 0 0 ${side} 0,${r} A${rx.toFixed(2)},${r} 0 0 ${sweep ^ (waxing ? 0 : 1)} 0,${-r} Z`;
}

/** What the moon is called at a phase angle (degrees, 0 = new, 180 = full). */
export function phaseName(angle: number) {
  const a = ((angle % 360) + 360) % 360;
  if (a < 20 || a > 340) return "New moon";
  if (a < 75 || a > 285) return "Crescent";
  if (a < 105 || a > 255) return "Half moon";
  if (a < 160 || a > 200) return "Almost full";
  return "Full moon";
}
