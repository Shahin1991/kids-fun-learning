"use client";

import { useEffect } from "react";

/** Registers the service worker and applies updates: a freshly installed worker takes over and the page reloads once. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const sw = navigator.serviceWorker;
    let reloading = false;
    const hadController = Boolean(sw.controller);
    const onControllerChange = () => {
      // The very first install also fires this; only reload when an older worker was replaced.
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    };
    sw.addEventListener("controllerchange", onControllerChange);

    const activate = (w: ServiceWorker | null) => w?.postMessage("SKIP_WAITING");
    sw.register("/sw.js")
      .then((reg) => {
        if (reg.waiting && sw.controller) activate(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          next?.addEventListener("statechange", () => {
            if (next.state === "installed" && sw.controller) activate(next);
          });
        });
      })
      .catch(() => {});
    return () => sw.removeEventListener("controllerchange", onControllerChange);
  }, []);
  return null;
}
