/** Smallest signed turn, in degrees, from angle `from` to angle `to`: always in (-180, 180]. */
export function turnBetween(from: number, to: number) {
  const d = (((to - from) % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}

/** `target` shifted by whole turns to sit nearest `current`, so a spring there never unwinds extra spins. */
export function nearestTurn(current: number, target: number) {
  return current + turnBetween(current, target);
}

/**
 * Which side of the Earth the house is on after spinning the land by `deg` (clockwise on screen).
 * The house starts on top and the Sun is on the left, so turning it anticlockwise brings it into the light.
 */
export function homeSide(deg: number): "day" | "night" {
  const n = ((deg % 360) + 360) % 360;
  return n > 180 ? "day" : "night";
}
