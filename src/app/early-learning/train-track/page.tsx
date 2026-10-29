"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import TrainTrack from "@/components/train-track/TrainTrack";

export default function TrainTrackPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Train Track Builder" moduleId="train-track" />
      <ClientOnly>
        <TrainTrack />
      </ClientOnly>
    </PageContainer>
  );
}
