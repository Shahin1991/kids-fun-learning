"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { UnoGame } from "@/components/uno/UnoGame";

export default function UnoPage() {
  return (
    // One screen tall on purpose: the hand must never fall below the fold on a phone.
    <main className="mx-auto flex h-dvh w-full max-w-4xl flex-col gap-2 p-2">
      <ActivityHeader title="Uno" moduleId="uno" />
      <ClientOnly>
        <UnoGame />
      </ClientOnly>
    </main>
  );
}
