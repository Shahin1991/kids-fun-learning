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
      className="min-h-touch min-w-touch rounded-full bg-surface text-4xl shadow-md active:scale-95"
    >
      {dark ? "🌙" : "☀️"}
    </button>
  );
}
