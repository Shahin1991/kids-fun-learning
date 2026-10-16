"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isAppPaused } from "@/lib/app-pause";
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
  /** Saved "music on" is applied at the first gesture, since browsers block audio before one. */
  const musicOnUnlock = useRef(false);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setSound(s.soundEnabled);
        setMusic(s.musicEnabled);
        musicOnUnlock.current = s.soundEnabled && s.musicEnabled;
        audioManager.configure(s.soundEnabled, false);
      })
      .catch(() => {});
    // Touch screens only count a finished tap (pointerup/touchend/click) as permission to play audio and speech.
    const events = ["pointerdown", "pointerup", "touchend", "click", "keydown"] as const;
    const unlock = () => {
      audioManager.unlock();
      if (musicOnUnlock.current && !isAppPaused()) {
        musicOnUnlock.current = false;
        audioManager.setMusic(true);
      }
    };
    events.forEach((e) => window.addEventListener(e, unlock));
    return () => events.forEach((e) => window.removeEventListener(e, unlock));
  }, []);

  // Music only starts after a gesture, so it is applied when the toggle is pressed.
  const toggleSound = useCallback(() => {
    const next = !soundEnabled;
    musicOnUnlock.current = false;
    setSound(next);
    audioManager.configure(next, musicEnabled && next);
    updateSettings({ soundEnabled: next }).catch(() => {});
  }, [soundEnabled, musicEnabled]);

  const toggleMusic = useCallback(() => {
    const next = !musicEnabled;
    musicOnUnlock.current = false;
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
