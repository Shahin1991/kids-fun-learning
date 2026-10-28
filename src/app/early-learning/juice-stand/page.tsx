"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import JuiceStand from "@/components/juice-stand/JuiceStand";

export default function JuiceStandPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Juice Stand" moduleId="juice-stand" />
      <ClientOnly>
        <JuiceStand />
      </ClientOnly>
    </PageContainer>
  );
}
