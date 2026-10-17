"use client";

import { useEffect, useRef, useState } from "react";

const HOLD_MS = 1000;

/**
 * An exit button that small children can't hit by accident: it only fires after being held for a
 * second (a ring fills while held), and a quick tap only shows a "Hold to leave" hint. The press
 * still bubbles to the game underneath, so a game listening on its container also gets the tap.
 * Keyboard activation exits straight away.
 */
export function HoldToExitButton({ onExit, className = "" }: { onExit: () => void; className?: string }) {
  const [progress, setProgress] = useState(0);
  const hold = useRef<{ start: number; raf: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const [hint, setHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      if (hold.current) {
        cancelAnimationFrame(hold.current.raf);
        clearTimeout(hold.current.timer);
      }
      clearTimeout(hintTimer.current);
    },
    [],
  );

  // Animation frames only draw the ring; the timer decides, so exiting works even when frames stall.
  const tick = (now: number) => {
    const h = hold.current;
    if (!h) return;
    setProgress(Math.min(1, Math.max(0, (now - h.start) / HOLD_MS)));
    h.raf = requestAnimationFrame(tick);
  };

  const done = () => {
    const h = hold.current;
    if (!h) return;
    cancelAnimationFrame(h.raf);
    hold.current = null;
    setProgress(1);
    onExit();
  };

  const end = (tapped: boolean) => {
    const h = hold.current;
    if (!h) return;
    cancelAnimationFrame(h.raf);
    clearTimeout(h.timer);
    hold.current = null;
    setProgress(0);
    if (tapped) {
      setHint(true);
      clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => setHint(false), 1800);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        aria-label="Exit (hold to leave)"
        onPointerDown={(e) => {
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // pointer already gone; the hold still works without capture
          }
          // performance.now() and e.timeStamp share a clock, so the first frame continues from here
          hold.current = { start: e.timeStamp, raf: requestAnimationFrame(tick), timer: setTimeout(done, HOLD_MS) };
        }}
        onPointerUp={() => end(true)}
        onPointerCancel={() => end(false)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onExit()}
        onContextMenu={(e) => e.preventDefault()}
        className="relative flex min-h-touch min-w-touch select-none items-center justify-center rounded-full bg-surface/90 text-3xl shadow"
        style={{ transform: `scale(${1 + progress * 0.15})` }}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeOpacity={progress ? 0.15 : 0} strokeWidth="8" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="#ff6b6b" strokeOpacity={progress ? 1 : 0} strokeWidth="8" strokeLinecap="round" pathLength={1} strokeDasharray={`${progress} 1`} />
        </svg>
        ✕
      </button>
      {hint && <span className="pointer-events-none rounded-full bg-surface/90 px-3 py-1 text-sm font-bold text-foreground shadow">Hold to leave</span>}
    </div>
  );
}
