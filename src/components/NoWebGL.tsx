"use client";

import Link from "next/link";
import { useEffect } from "react";
import { audioManager } from "@/lib/audio/AudioManager";

/** Friendly full-screen fallback when a 3D game cannot start (no WebGL): a picture, a spoken line and a big way home. */
export function NoWebGL() {
  useEffect(() => {
    audioManager.speak("Oh no! This game can't play on this device. Let's pick another one!");
  }, []);
  return (
    <div role="alert" className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
      <span className="text-8xl" aria-hidden>🧸💤</span>
      <p className="text-2xl font-extrabold">This game can&apos;t play on this device.</p>
      <Link href="/" className="flex min-h-touch items-center rounded-3xl bg-kid-blue px-8 text-2xl font-bold text-white active:scale-95">
        🏠 Pick another game
      </Link>
    </div>
  );
}
