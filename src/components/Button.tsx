"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const STYLES: Record<Variant, string> = {
  primary: "bg-kid-blue text-white shadow-md",
  secondary: "bg-kid-yellow text-ink shadow-md",
  ghost: "bg-surface/70 text-foreground",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`min-h-touch min-w-touch rounded-3xl px-6 text-2xl font-bold transition-transform active:scale-95 ${STYLES[variant]} ${className}`}
      {...props}
    />
  );
}
