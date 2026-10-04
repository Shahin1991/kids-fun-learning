"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { getSettings, updateSettings } from "@/lib/storage/settings";

interface Ctx {
  soundEnabled: boolean;
  musicEnabled: boolean;
  toggleSound: () => void;
  toggleMusic: () => void;
}

const AudioCtx = createContext<Ctx>({ soundEnabled: true, musicEnabled: false, toggleSound: () => {}, toggleMusic: () => {} });

export function AudioProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSound] = useState(true);
  const [musicEnabled, setMusic] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setSound(s.soundEnabled);
        setMusic(s.musicEnabled);
        audioManager.configure(s.soundEnabled, false);
      })
      .catch(() => {});
    // Touch screens only count a finished tap (pointerup/touchend/click) as permission to play audio and speech.
    const events = ["pointerdown", "pointerup", "touchend", "click", "keydown"] as const;
    const unlock = () => audioManager.unlock();
    events.forEach((e) => window.addEventListener(e, unlock));
    return () => events.forEach((e) => window.removeEventListener(e, unlock));
  }, []);

  // Music only starts after a gesture, so it is applied when the toggle is pressed.
  const toggleSound = useCallback(() => {
    const next = !soundEnabled;
    setSound(next);
    audioManager.configure(next, musicEnabled && next);
    updateSettings({ soundEnabled: next }).catch(() => {});
  }, [soundEnabled, musicEnabled]);

  const toggleMusic = useCallback(() => {
    const next = !musicEnabled;
    setMusic(next);
    audioManager.setMusic(next);
    updateSettings({ musicEnabled: next }).catch(() => {});
  }, [musicEnabled]);

  const value = useMemo(
    () => ({ soundEnabled, musicEnabled, toggleSound, toggleMusic }),
    [soundEnabled, musicEnabled, toggleSound, toggleMusic],
  );
  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio() {
  return useContext(AudioCtx);
}
