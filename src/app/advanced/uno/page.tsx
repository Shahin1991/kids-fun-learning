"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import { UnoGame } from "@/components/uno/UnoGame";

export default function UnoPage() {
  return (
    <PageContainer className="!max-w-4xl">
      <ActivityHeader title="Uno" moduleId="uno" />
      <ClientOnly>
        <UnoGame />
      </ClientOnly>
    </PageContainer>
  );
}
