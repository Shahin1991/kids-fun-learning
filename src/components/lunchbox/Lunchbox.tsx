"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { ShakeOnWrong } from "@/components/ShakeOnWrong";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { foodById, groupById, GROUPS, isPacked, lunchSpeech, makeTray, pack, sortMode, type Box, type GroupId } from "@/lib/lunchbox/lunch";

const MODULE_ID = "lunchbox";
const KIDS = [
  { name: "Riya", emoji: "👧" },
  { name: "Omar", emoji: "👦" },
  { name: "Maya", emoji: "👧🏽" },
  { name: "Arjun", emoji: "👦🏾" },
  { name: "Zara", emoji: "👧🏻" },
  { name: "Leo", emoji: "🧒" },
];
const GROUP_ICON: Record<GroupId, string> = { grain: "⚡", protein: "💪", fruit: "🍎", veg: "🥕", drink: "💧" };
const GROUP_LABEL: Record<GroupId, string> = { grain: "Energy", protein: "Body-building", fruit: "Fruit", veg: "Vegetables", drink: "Drink" };

function intro(kid: string, sorting: boolean) {
  return sorting ? `Pack ${kid}'s lunch! Tap a food, then tap the spot in the lunchbox where it goes.` : `Let's pack ${kid}'s lunchbox! Tap a food to put it in. One from each spot makes a balanced lunch.`;
}

export default function Lunchbox() {
  const reduced = useAppReducedMotion();
  const [level, setLevel] = useState(0);
  const [tray, setTray] = useState<string[]>(() => makeTray(0));
  const [box, setBox] = useState<Box>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [wobble, setWobble] = useState<Record<string, number>>({});
  const [glowEmpty, setGlowEmpty] = useState(false);
  const [closed, setClosed] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const kid = KIDS[level % KIDS.length];
  const sorting = sortMode(level);

  useEffect(() => {
    const t = setTimeout(() => audioManager.speak(intro(KIDS[0].name, false)), 500);
    return () => clearTimeout(t);
  }, []);

  const shake = (key: string) => setWobble((w) => ({ ...w, [key]: (w[key] ?? 0) + 1 }));

  const finish = (full: Box) => {
    timers.current.push(setTimeout(() => setClosed(true), 700));
    timers.current.push(
      setTimeout(() => {
        audioManager.speak(`Snap! A balanced lunch for ${kid.name}. ${lunchSpeech(full)}.`);
      }, 1100),
    );
    void finishActivity(MODULE_ID, { score: level + 1 });
    timers.current.push(
      setTimeout(() => {
        const n = level + 1;
        setLevel(n);
        setTray(makeTray(n));
        setBox({});
        setClosed(false);
        setGlowEmpty(false);
        audioManager.speak(intro(KIDS[n % KIDS.length].name, sortMode(n)));
      }, 9000),
    );
  };

  const put = (foodId: string, spot?: GroupId) => {
    const f = foodById(foodId);
    const res = pack(box, foodId, spot);
    if (!res.ok) {
      audioManager.play("failure");
      if (res.reason === "treat") {
        shake(foodId);
        setPicked(null);
        audioManager.speak(`A ${f.name} is a sometimes food. Let's pack food that helps ${kid.name} grow!`);
      } else if (res.reason === "full") {
        shake(res.group!);
        setPicked(null);
        setGlowEmpty(true);
        audioManager.speak(`There's already ${foodById(box[res.group!]!).name} in the ${groupById(res.group!).name} spot. Pick a food for an empty spot!`);
      } else {
        shake(spot!);
        audioManager.speak(`Hmm, ${f.name} isn't ${groupById(spot!).name}. ${f.name} is ${groupById(res.group!).name}!`);
      }
      return;
    }
    setBox(res.box);
    setTray((t) => t.filter((id) => id !== foodId));
    setPicked(null);
    setGlowEmpty(false);
    audioManager.play("success");
    const g = groupById(res.group);
    audioManager.speak(`${f.name[0].toUpperCase()}${f.name.slice(1)} ${g.why}.`);
    if (isPacked(res.box)) finish(res.box);
  };

  const tapFood = (id: string) => {
    if (closed) return;
    audioManager.playPop(1);
    if (!sorting || foodById(id).group === "treat") return put(id);
    setPicked(id);
    audioManager.speak(`${foodById(id).name}! Where does it go?`);
  };

  const tapSpot = (g: GroupId) => {
    if (closed) return;
    if (picked) return put(picked, g);
    const grp = groupById(g);
    audioManager.speak(box[g] ? `${foodById(box[g]!).name}. ${grp.name[0].toUpperCase()}${grp.name.slice(1)} ${grp.why}.` : `The ${grp.name} spot. ${grp.name[0].toUpperCase()}${grp.name.slice(1)} ${grp.why}.`);
  };

  return (
    <LayoutGroup>
      <div className="flex flex-1 flex-col items-center gap-4 pb-4">
        <div className="flex items-center gap-3 rounded-full bg-surface px-4 py-2 shadow">
          <motion.span className="text-5xl" animate={closed && !reduced ? { y: [0, -14, 0, -14, 0], rotate: [0, -8, 8, 0] } : { y: 0 }} transition={{ duration: 1.2 }} aria-hidden>
            {kid.emoji}
          </motion.span>
          <span className="text-xl font-extrabold">{closed ? "Yum, thank you! 😋" : `${kid.name}'s lunchbox`}</span>
        </div>

        {/* The lunchbox: five spots, one per food group */}
        <div className="relative w-full max-w-xl">
          <div className="grid grid-cols-3 grid-rows-2 gap-2 rounded-[2rem] border-8 border-[#ff9f43] bg-[#fff4e0] p-2 shadow-lg">
            {GROUPS.map((g, i) => {
              const food = box[g.id];
              const empty = !food;
              return (
                <ShakeOnWrong key={g.id} trigger={wobble[g.id] ?? 0} className={i === 0 ? "row-span-2" : ""}>
                  <motion.button
                    type="button"
                    onClick={() => tapSpot(g.id)}
                    aria-label={`${g.name} spot${food ? `: ${foodById(food).name}` : ", empty"}`}
                    className={`relative flex h-full min-h-28 w-full flex-col items-center justify-center rounded-2xl border-4 border-dashed ${empty && (glowEmpty || picked) ? "ring-4 ring-kid-yellow" : ""}`}
                    style={{ borderColor: g.color, background: `${g.color}22` }}
                    animate={empty && picked && !reduced ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                    transition={{ repeat: empty && picked ? Infinity : 0, duration: 0.9 }}
                  >
                    <span className="absolute left-2 top-1 text-sm font-extrabold text-ink/70">
                      {GROUP_ICON[g.id]} {GROUP_LABEL[g.id]}
                    </span>
                    {food ? (
                      <motion.span layoutId={food} className="mt-4 text-6xl" transition={{ type: "spring", stiffness: 300, damping: 18 }}>
                        {foodById(food).emoji}
                      </motion.span>
                    ) : (
                      <span className="mt-4 text-4xl opacity-25" aria-hidden>
                        {GROUP_ICON[g.id]}
                      </span>
                    )}
                  </motion.button>
                </ShakeOnWrong>
              );
            })}
          </div>
          <AnimatePresence>
            {closed && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center rounded-[2rem] border-8 border-[#e07f22] bg-[#ffb366] shadow-xl"
                initial={reduced ? { opacity: 0 } : { y: "-110%", rotateX: 60, opacity: 0 }}
                animate={{ y: 0, rotateX: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 16 }}
              >
                <span className="text-6xl" aria-hidden>
                  ⭐
                </span>
                <span className="ml-3 text-3xl font-extrabold text-white drop-shadow">Balanced lunch!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* The tray */}
        <div className="flex w-full max-w-2xl flex-wrap justify-center gap-2 rounded-3xl bg-[#e8d9c0] p-3 shadow-inner" aria-label="Food tray">
          <AnimatePresence>
            {tray.map((id) => {
              const f = foodById(id);
              const on = picked === id;
              return (
                <ShakeOnWrong key={id} trigger={wobble[id] ?? 0}>
                  <motion.button
                    layoutId={id}
                    type="button"
                    onClick={() => tapFood(id)}
                    aria-label={f.name}
                    aria-pressed={on}
                    className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-5xl shadow active:scale-90 ${on ? "ring-4 ring-kid-yellow" : ""}`}
                    animate={on ? { y: -8, scale: 1.1 } : { y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {f.emoji}
                  </motion.button>
                </ShakeOnWrong>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </LayoutGroup>
  );
}
