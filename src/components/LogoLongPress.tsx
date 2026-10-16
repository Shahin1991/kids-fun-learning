"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/** Hold for 3 seconds to open the parent area. */
export function LogoLongPress({ children }: { children: ReactNode }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  // A second finger restarts the hold instead of leaving an orphaned timer behind.
  const start = () => {
    cancel();
    timer.current = setTimeout(() => router.push("/parent/unlock"), 3000);
  };

  useEffect(() => cancel, []);

  return (
    <div onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel} onContextMenu={(e) => e.preventDefault()} className="select-none">
      {children}
    </div>
  );
}
