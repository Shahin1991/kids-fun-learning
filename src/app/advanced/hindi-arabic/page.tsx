"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import WorldLetters from "@/components/world-letters/WorldLetters";

export default function HindiArabicPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Hindi & Arabic" moduleId="hindi-arabic" />
      <ClientOnly>
        <WorldLetters />
      </ClientOnly>
    </PageContainer>
  );
}
