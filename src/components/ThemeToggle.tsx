"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { resolved, setPref } = useTheme();
  const dark = resolved === "dark";
  return (
    <button
      type="button"
      onClick={() => setPref(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-3xl shadow-md active:scale-95 sm:h-20 sm:w-20 sm:text-4xl bg-surface"
    >
      {dark ? "🌙" : "☀️"}
    </button>
  );
}
