/** Long enough for the caption to be read aloud at a child-friendly pace, plus a moment to watch. */
export function stepMs(say: string) {
  return Math.max(6000, say.split(/\s+/).length * 450 + 2000);
}
