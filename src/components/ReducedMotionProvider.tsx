"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSettings } from "@/lib/storage/settings";

interface Ctx {
  reduced: boolean;
  /** Set by the parent dashboard; null follows the OS. */
  setOverride: (value: boolean | null) => void;
}

const MotionCtx = createContext<Ctx>({ reduced: false, setOverride: () => {} });

export function ReducedMotionProvider({ children }: { children: ReactNode }) {
  const [system, setSystem] = useState(false);
  const [override, setOverride] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setSystem(mq.matches);
    const t = setTimeout(onChange, 0);
    mq.addEventListener("change", onChange);
    getSettings().then((s) => setOverride(s.reducedMotion)).catch(() => {});
    return () => {
      clearTimeout(t);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  const reduced = override ?? system;

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reduced);
  }, [reduced]);

  const value = useMemo(() => ({ reduced, setOverride }), [reduced]);
  return <MotionCtx.Provider value={value}>{children}</MotionCtx.Provider>;
}

export function useAppReducedMotion(): boolean {
  return useContext(MotionCtx).reduced;
}

export function useSetMotionOverride() {
  return useContext(MotionCtx).setOverride;
}
