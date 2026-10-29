"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import DinoDig from "@/components/dino-dig/DinoDig";

export default function DinoDigPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Dino Dig" moduleId="dino-dig" />
      <ClientOnly>
        <DinoDig />
      </ClientOnly>
    </PageContainer>
  );
}
