"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};

/** Skips server rendering for children that use randomness, avoiding hydration mismatches. */
export function ClientOnly({ children }: { children: ReactNode }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  return isClient ? <>{children}</> : null;
}
