"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import TreasureMap from "@/components/treasure-map/TreasureMap";

export default function TreasureMapPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Treasure Map" moduleId="treasure-map" />
      <ClientOnly>
        <TreasureMap />
      </ClientOnly>
    </PageContainer>
  );
}
