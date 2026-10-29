"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import CleanUp from "@/components/clean-up/CleanUp";

export default function CleanUpPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Clean-Up & Recycle" moduleId="clean-up" />
      <ClientOnly>
        <CleanUp />
      </ClientOnly>
    </PageContainer>
  );
}
