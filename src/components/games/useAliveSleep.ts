"use client";

import { useCallback, useEffect, useRef } from "react";
import { audioManager } from "@/lib/audio/AudioManager";

/**
 * `sleep(ms)` for step-by-step sequences (hopping, robot moves) that resolves to false once the page has been left,
 * so the caller can stop instead of speaking and playing notes on whatever page comes next. Unmounting also cancels speech.
 */
export function useAliveSleep() {
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      audioManager.stopSpeech();
    };
  }, []);
  return useCallback((ms: number) => new Promise<boolean>((r) => setTimeout(() => r(alive.current), ms)), []);
}
