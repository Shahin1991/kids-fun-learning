"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import Lunchbox from "@/components/lunchbox/Lunchbox";

export default function LunchboxPage() {
  return (
    <PageContainer>
      <ActivityHeader title="My Lunchbox" moduleId="lunchbox" />
      <ClientOnly>
        <Lunchbox />
      </ClientOnly>
    </PageContainer>
  );
}
