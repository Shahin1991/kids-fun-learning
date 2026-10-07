"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { Button } from "@/components/Button";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";
import { findCell, ROBOT_LEVELS, step, type Dir } from "@/lib/robot-path";

const ARROWS: { dir: Dir; icon: string; label: string }[] = [
  { dir: "up", icon: "⬆️", label: "Up" },
  { dir: "left", icon: "⬅️", label: "Left" },
  { dir: "right", icon: "➡️", label: "Right" },
  { dir: "down", icon: "⬇️", label: "Down" },
];
const ICON: Record<Dir, string> = { up: "⬆️", down: "⬇️", left: "⬅️", right: "➡️" };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Unplugged-coding style puzzle: line up arrow cards, press Go, and the robot follows the program. */
function Game() {
  const [level, setLevel] = useState(0);
  const [program, setProgram] = useState<Dir[]>([]);
  const [robot, setRobot] = useState<[number, number]>(() => findCell(ROBOT_LEVELS[0].grid, "R"));
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState(-1);
  const [msg, setMsg] = useState("Pick arrows to take the robot to the star!");
  const [won, setWon] = useState(false);

  const { grid } = ROBOT_LEVELS[level];
  const size = grid.length;
  const cols = grid[0].length;
  const [sx, sy] = findCell(grid, "S");

  const add = (d: Dir) => {
    if (running || won || program.length >= 14) return;
    audioManager.playNote(program.length % 10);
    setProgram((p) => [...p, d]);
  };

  const reset = (lv = level) => {
    setRobot(findCell(ROBOT_LEVELS[lv].grid, "R"));
    setActive(-1);
  };

  const go = async () => {
    if (running || won || program.length === 0) return;
    setRunning(true);
    reset();
    await sleep(300);
    let at = findCell(grid, "R");
    for (let i = 0; i < program.length; i++) {
      setActive(i);
      const r = step(grid, at, program[i]);
      if (r.bumped) {
        audioManager.play("failure");
        setMsg("Oops, the robot bumped! Change the arrows and try again.");
        audioManager.speak("Oops! The robot bumped. Let's try again.");
        await sleep(600);
        reset();
        setRunning(false);
        return;
      }
      at = r.at;
      setRobot(at);
      audioManager.playNote(i % 10);
      await sleep(650);
    }
    setActive(-1);
    if (at[0] === sx && at[1] === sy) {
      setWon(true);
      setMsg("You did it! 🌟");
      audioManager.play("success");
      audioManager.speak("You did it! The robot found the star!");
      void finishActivity("robot-path", { score: level + 1 });
    } else {
      setMsg("Not at the star yet. Add more arrows or change them.");
      audioManager.speak("Almost! Keep going. The star is still waiting.");
      await sleep(500);
      reset();
    }
    setRunning(false);
  };

  const nextLevel = () => {
    const lv = (level + 1) % ROBOT_LEVELS.length;
    setLevel(lv);
    setProgram([]);
    setWon(false);
    setMsg("Pick arrows to take the robot to the star!");
    reset(lv);
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-3">
      <p className="text-center text-2xl font-bold" role="status">{msg}</p>
      <div className="relative aspect-square w-full max-w-[17rem] rounded-3xl bg-kid-blue/25 p-2">
        <div className="grid h-full w-full gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${size}, 1fr)` }}>
          {grid.flatMap((row, y) =>
            [...row].map((ch, x) => (
              <div key={`${x}-${y}`} className="flex items-center justify-center rounded-2xl bg-white text-4xl shadow-sm">
                {ch === "#" ? "🪨" : ch === "S" ? <span className="animate-pulse">⭐</span> : ""}
              </div>
            )),
          )}
        </div>
        <motion.div
          className="pointer-events-none absolute flex items-center justify-center text-5xl"
          initial={false}
          animate={{ left: `${(robot[0] * 100) / cols + 0.8}%`, top: `${(robot[1] * 100) / size + 0.8}%` }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          style={{ width: `${100 / cols - 0.6}%`, height: `${100 / size - 0.6}%` }}
          aria-label="Robot"
        >
          🤖
        </motion.div>
      </div>
      <div className="flex min-h-16 w-full max-w-md flex-wrap items-center justify-center gap-2 rounded-3xl bg-surface p-3 shadow-inner" aria-label="Your program">
        {program.length === 0 && <span className="text-xl opacity-60">Tap arrows below ⬇️</span>}
        {program.map((d, i) => (
          <span key={i} className={`flex h-12 w-12 items-center justify-center rounded-xl text-3xl ${active === i ? "bg-kid-yellow" : "bg-kid-blue/30"}`}>{ICON[d]}</span>
        ))}
      </div>
      <div className="flex gap-3">
        {ARROWS.map((a) => (
          <button key={a.dir} type="button" aria-label={a.label} onClick={() => add(a.dir)} className="flex min-h-touch min-w-touch items-center justify-center rounded-3xl bg-surface text-5xl shadow-md active:scale-90">
            {a.icon}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={() => !running && setProgram((p) => p.slice(0, -1))} aria-label="Undo last arrow">↩️</Button>
        <Button variant="ghost" onClick={() => { if (!running) { setProgram([]); reset(); } }} aria-label="Clear all arrows">🗑️</Button>
        {won ? (
          <Button onClick={nextLevel}>Next level ▶️</Button>
        ) : (
          <Button onClick={go} disabled={running || program.length === 0} className="bg-kid-green disabled:opacity-50" aria-label="Go">
            ▶️ Go!
          </Button>
        )}
      </div>
      <p className="text-lg font-bold opacity-70">Level {level + 1} of {ROBOT_LEVELS.length}</p>
    </div>
  );
}

export default function RobotPathPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Robot Path" moduleId="robot-path" />
      <ClientOnly>
        <Game />
      </ClientOnly>
    </PageContainer>
  );
}
