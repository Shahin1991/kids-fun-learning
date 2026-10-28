"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import BeadBuilder from "@/components/bead-builder/BeadBuilder";

export default function BeadBuilderPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Bead Builder" moduleId="bead-builder" />
      <ClientOnly>
        <BeadBuilder />
      </ClientOnly>
    </PageContainer>
  );
}
