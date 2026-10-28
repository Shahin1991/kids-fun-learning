"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import CarWash from "@/components/car-wash/CarWash";

export default function CarWashPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Car Wash" moduleId="car-wash" />
      <ClientOnly>
        <CarWash />
      </ClientOnly>
    </PageContainer>
  );
}
