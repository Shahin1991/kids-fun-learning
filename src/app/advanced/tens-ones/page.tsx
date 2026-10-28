"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import TensOnes from "@/components/tens-ones/TensOnes";

export default function TensOnesPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Tens & Ones" moduleId="tens-ones" />
      <ClientOnly>
        <TensOnes />
      </ClientOnly>
    </PageContainer>
  );
}
