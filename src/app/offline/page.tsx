import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";

export default function OfflinePage() {
  return (
    <PageContainer className="items-center justify-center text-center">
      <span className="text-8xl" aria-hidden>📴</span>
      <h1 className="text-4xl font-extrabold">You are offline</h1>
      <p className="text-xl">This page has not been saved yet. Go home and pick a game: once the app has loaded with internet, every game works offline!</p>
      <Link href="/" className="flex min-h-touch items-center rounded-3xl bg-kid-blue px-8 text-2xl font-bold text-white">Go home</Link>
    </PageContainer>
  );
}
