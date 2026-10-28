"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import DressUp from "@/components/dress-up/DressUp";

export default function DressUpPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Dress for the Weather" moduleId="dress-up" />
      <ClientOnly>
        <DressUp />
      </ClientOnly>
    </PageContainer>
  );
}
