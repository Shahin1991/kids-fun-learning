"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import RoadSafety from "@/components/road-safety/RoadSafety";

export default function RoadSafetyPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Road Safety" moduleId="road-safety" />
      <ClientOnly>
        <RoadSafety />
      </ClientOnly>
    </PageContainer>
  );
}
