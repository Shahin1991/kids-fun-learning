"use client";

import { useAudio } from "./AudioProvider";

export function MusicToggle() {
  const { musicEnabled, toggleMusic } = useAudio();
  return (
    <button
      type="button"
      onClick={toggleMusic}
      aria-label={musicEnabled ? "Turn music off" : "Turn music on"}
      aria-pressed={musicEnabled}
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-3xl shadow-md active:scale-95 sm:h-20 sm:w-20 sm:text-4xl ${musicEnabled ? "bg-kid-yellow" : "bg-surface"}`}
    >
      🎵
    </button>
  );
}
