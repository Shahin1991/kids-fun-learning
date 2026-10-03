import type { ReactNode } from "react";

export function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 p-4 ${className}`}>{children}</main>;
}
