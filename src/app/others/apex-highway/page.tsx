"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";

// No reward integration on purpose; prefs and best score live in localStorage.
const ApexHighwayGame = dynamic(() => import("@/components/apex-highway/ApexHighwayGame"), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});

export default function ApexHighwayPage() {
  const router = useRouter();
  return (
    <div className="h-dvh w-full">
      <ApexHighwayGame onExit={() => router.push("/")} />
    </div>
  );
}
