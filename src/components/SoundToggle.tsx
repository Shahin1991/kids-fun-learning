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
      className="min-h-touch min-w-touch rounded-full bg-white text-4xl shadow-md active:scale-95"
    >
      {soundEnabled ? "🔊" : "🔇"}
    </button>
  );
}
