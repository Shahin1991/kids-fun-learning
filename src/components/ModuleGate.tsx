"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MODULES } from "@/data/modules";
import { getSettings, SETTINGS_CHANGED } from "@/lib/storage/settings";

/** Sends the child home if the current activity was switched off in the parent dashboard, however they got there. */
export function ModuleGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const path = (pathname ?? "").replace(/\/+$/, "");
    const mod = MODULES.find((m) => m.route === path);
    if (!mod) return;
    const check = () =>
      getSettings()
        .then((s) => {
          if (s.disabledModules.includes(mod.id)) router.replace("/");
        })
        .catch(() => {});
    void check();
    window.addEventListener(SETTINGS_CHANGED, check);
    return () => window.removeEventListener(SETTINGS_CHANGED, check);
  }, [pathname, router]);

  return null;
}
