"use client";

import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";

/** Hold for 3 seconds to open the parent area. */
export function LogoLongPress({ children }: { children: ReactNode }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = () => {
    timer.current = setTimeout(() => router.push("/parent/unlock"), 3000);
  };
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
  };

  return (
    <div onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel} onContextMenu={(e) => e.preventDefault()} className="select-none">
      {children}
    </div>
  );
}
