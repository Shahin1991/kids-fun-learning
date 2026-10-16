"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const GAME_ROUTES = /^\/(toddler|early-learning|advanced|others)\//;

/** While a game route is open, suppress the long-press / right-click context menu and text/image selection. */
export function GameContextMenuGuard() {
  const pathname = usePathname();
  const active = GAME_ROUTES.test(pathname ?? "");

  useEffect(() => {
    if (!active) return;
    const block = (e: Event) => e.preventDefault();
    document.documentElement.setAttribute("data-in-game", "");
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    return () => {
      document.documentElement.removeAttribute("data-in-game");
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
    };
  }, [active]);

  return null;
}
