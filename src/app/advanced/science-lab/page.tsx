"use client";

import { useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { PageContainer } from "@/components/PageContainer";
import { LessonPlayer } from "@/components/science-lab/LessonPlayer";
import { LAB_GROUPS, LAB_LESSONS, type LabLesson } from "@/data/science-lab";
import { audioManager } from "@/lib/audio/AudioManager";

const MODULE = "science-lab";

const GROUPS = LAB_GROUPS.map((name) => ({
  name,
  lessons: LAB_LESSONS.filter((l) => (l.group ?? LAB_GROUPS[0]) === name),
}));

export default function ScienceLabPage() {
  const [lesson, setLesson] = useState<LabLesson | null>(null);

  return (
    <PageContainer className="gap-3!">
      <ActivityHeader title={lesson ? lesson.title : "Science Lab"} moduleId={MODULE} />
      {lesson ? (
        <>
          <button type="button" onClick={() => setLesson(null)} className="min-h-touch self-start rounded-3xl bg-surface px-5 text-xl font-bold shadow active:scale-95">
            ← All lessons
          </button>
          <LessonPlayer key={lesson.id} lesson={lesson} moduleId={MODULE} />
        </>
      ) : (
        <>
          <p className="text-center text-xl font-bold">Pick something to watch and learn!</p>
          {GROUPS.map((g) => (
            <section key={g.name} className="flex flex-col gap-3">
              <h2 className="text-2xl font-extrabold">{g.name}</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {g.lessons.map((l) => (
                  <button key={l.id} type="button" onClick={() => { audioManager.playPop(1); setLesson(l); }} className={`${l.bg} flex min-h-40 flex-col items-center justify-center gap-2 rounded-3xl p-4 text-white shadow-lg active:scale-95`}>
                    <span className="text-6xl" aria-hidden>{l.icon}</span>
                    <span className="text-2xl font-extrabold leading-tight">{l.title}</span>
                    <span className="text-base opacity-90">{l.steps.length} steps</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </PageContainer>
  );
}
