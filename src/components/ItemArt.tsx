"use client";

import Image from "next/image";
import { useState } from "react";

/** Shows the illustration when there is one, otherwise (or if it fails to load) the emoji. */
export function ItemArt({ art, emoji, label, size }: { art?: string; emoji: string; label: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (art && !failed) {
    return <Image src={art} alt={label} width={size} height={size} unoptimized draggable={false} onError={() => setFailed(true)} />;
  }
  return emoji ? <span className="leading-none" style={{ fontSize: size * 0.85 }} aria-hidden>{emoji}</span> : null;
}
