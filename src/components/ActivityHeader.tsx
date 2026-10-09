import { HomeButton } from "./HomeButton";
import { ProgressStars } from "./ProgressStars";
import { SoundToggle } from "./SoundToggle";
import { SpeakTitle } from "./SpeakTitle";

export function ActivityHeader({ title, moduleId }: { title: string; moduleId?: string }) {
  return (
    <header className="flex items-center justify-between gap-2 sm:gap-3">
      <HomeButton />
      <SpeakTitle title={title} />
      {moduleId && <ProgressStars moduleId={moduleId} />}
      <SoundToggle />
    </header>
  );
}
