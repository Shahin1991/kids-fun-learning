"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import Rangoli from "@/components/rangoli/Rangoli";

export default function RangoliPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Rangoli Maker" moduleId="rangoli" />
      <ClientOnly>
        <Rangoli />
      </ClientOnly>
    </PageContainer>
  );
}
