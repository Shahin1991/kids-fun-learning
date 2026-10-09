"use client";

import { useAudio } from "./AudioProvider";

export function SoundToggle() {
  const { soundEnabled, toggleSound } = useAudio();
  return (
    <button
      type="button"
      onClick={toggleSound}
      aria-label={soundEnabled ? "Turn sound off" : "Turn sound on"}
      aria-pressed={soundEnabled}
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-3xl shadow-md active:scale-95 sm:h-20 sm:w-20 sm:text-4xl bg-surface"
    >
      {soundEnabled ? "🔊" : "🔇"}
    </button>
  );
}
