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
      className={`min-h-touch min-w-touch rounded-full text-4xl shadow-md active:scale-95 ${musicEnabled ? "bg-kid-yellow" : "bg-white"}`}
    >
      🎵
    </button>
  );
}
