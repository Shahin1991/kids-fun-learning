import { HomeButton } from "./HomeButton";
import { ProgressStars } from "./ProgressStars";
import { SoundToggle } from "./SoundToggle";

export function ActivityHeader({ title, moduleId }: { title: string; moduleId?: string }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <HomeButton />
      <h1 className="flex-1 text-center text-3xl font-extrabold">{title}</h1>
      {moduleId && <ProgressStars moduleId={moduleId} />}
      <SoundToggle />
    </header>
  );
}
