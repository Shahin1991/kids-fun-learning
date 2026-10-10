"use client";

import Image from "next/image";
import { useState } from "react";
import { Illo, hasIllo } from "@/components/art/illustrations";

/** Shows a drawn illustration, else the art file, otherwise (or if it fails to load) the emoji. */
export function ItemArt({ art, illo, emoji, label, size }: { art?: string; illo?: string; emoji: string; label: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (hasIllo(illo)) return <Illo id={illo} label={label} size={size} />;
  if (art && !failed) {
    return <Image src={art} alt={label} width={size} height={size} unoptimized draggable={false} onError={() => setFailed(true)} />;
  }
  return emoji ? <span className="leading-none" style={{ fontSize: size * 0.85 }} aria-hidden>{emoji}</span> : null;
}
