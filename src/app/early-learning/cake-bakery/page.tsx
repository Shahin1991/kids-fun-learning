"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const CakeBakery = dynamic(() => import("@/components/cake-bakery/CakeBakery"), { ssr: false, loading: () => <LoadingSpinner /> });

export default function CakeBakeryPage() {
  const router = useRouter();
  return <CakeBakery onExit={() => router.push("/")} />;
}
