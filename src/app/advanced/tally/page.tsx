"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import TallyCharts from "@/components/tally/TallyCharts";

export default function TallyChartsPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Tally & Charts" moduleId="tally" />
      <ClientOnly>
        <TallyCharts />
      </ClientOnly>
    </PageContainer>
  );
}
