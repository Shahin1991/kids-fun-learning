"use client";

import { useEffect } from "react";
import { audioManager } from "@/lib/audio/AudioManager";

/** Page title that is read aloud on arrival and again when tapped, so non-readers know where they are. */
export function SpeakTitle({ title }: { title: string }) {
  useEffect(() => {
    const t = setTimeout(() => audioManager.speak(title), 250);
    return () => clearTimeout(t);
  }, [title]);
  return (
    <h1 className="min-w-0 flex-1 text-center">
      <button type="button" onClick={() => audioManager.speak(title)} aria-label={`${title}. Tap to hear.`} className="inline-flex max-w-full items-center justify-center gap-1 rounded-2xl px-2 py-1 text-xl font-extrabold leading-tight active:scale-95 sm:text-3xl">
        <span aria-hidden className="shrink-0 text-lg opacity-60 sm:text-2xl">🔊</span>
        <span className="min-w-0 text-balance">{title}</span>
      </button>
    </h1>
  );
}
