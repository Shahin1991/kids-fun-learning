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
    <h1 className="flex-1 text-center">
      <button type="button" onClick={() => audioManager.speak(title)} aria-label={`${title}. Tap to hear.`} className="rounded-2xl px-2 text-3xl font-extrabold active:scale-95">
        {title} <span aria-hidden className="text-2xl opacity-60">🔊</span>
      </button>
    </h1>
  );
}
