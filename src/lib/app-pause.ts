/**
 * App-wide pause, set while the play timer's "Time is up" screen is showing.
 * Games with their own loops (arcade useRaf, Apex Highway) listen so nothing keeps running underneath.
 */
const EVENT = "kids-hub:pause";
let paused = false;

export const isAppPaused = () => paused;

export function setAppPaused(value: boolean) {
  if (paused === value) return;
  paused = value;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
}

export function onAppPause(cb: (paused: boolean) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<boolean>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
