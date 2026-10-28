"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import PeekabooFarm from "@/components/peekaboo-farm/PeekabooFarm";

export default function PeekabooFarmPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Peekaboo Farm" moduleId="peekaboo-farm" />
      <ClientOnly>
        <PeekabooFarm />
      </ClientOnly>
    </PageContainer>
  );
}
