"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import MeasureIt from "@/components/measure-it/MeasureIt";

export default function MeasureItPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Measure It" moduleId="measure-it" />
      <ClientOnly>
        <MeasureIt />
      </ClientOnly>
    </PageContainer>
  );
}
