"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import type { FactItem } from "@/data/facts";
import { ItemArt } from "./ItemArt";
import { useAppReducedMotion } from "./ReducedMotionProvider";

type Scene = "road" | "rail" | "sky" | "water" | "space" | "garden" | "sunny" | "rain" | "storm" | "snow" | "rainbow" | "wind" | "fog" | "flags" | "globe";
type Move = "drive" | "fly" | "launch" | "float" | "grow" | "wave" | "spin" | "rock" | "drop" | "pulse" | "hover";

const SCENE_BG: Record<Scene, string> = {
  road: "linear-gradient(#8fd3ff 0%, #d9f1ff 62%, #7bbf6a 62%)",
  rail: "linear-gradient(#9fdcff 0%, #e4f6ff 60%, #8cc77a 60%)",
  sky: "linear-gradient(#3d9cf0 0%, #a9dcff 100%)",
  water: "linear-gradient(#8fd3ff 0%, #d9f1ff 55%, #2f8fd8 55%)",
  space: "radial-gradient(circle at 30% 20%, #2b2f6e, #0b0d24 70%)",
  garden: "linear-gradient(#9fe0ff 0%, #e8fbff 65%, #6fbf52 65%)",
  sunny: "linear-gradient(#5db8ff, #bfe8ff)",
  rain: "linear-gradient(#6f8aa3, #a9bccb)",
  storm: "linear-gradient(#3b4658, #6b7788)",
  snow: "linear-gradient(#b7d4ee, #eef6ff)",
  rainbow: "linear-gradient(#8fd3ff, #e6f7ff 70%, #7bbf6a 70%)",
  wind: "linear-gradient(#9fdcff, #e4f6ff)",
  fog: "linear-gradient(#b8c4cc, #e3e8ea)",
  flags: "linear-gradient(#8fd3ff, #e6f7ff)",
  globe: "radial-gradient(circle at 50% 120%, #1f6fd0, #0d2f66 70%)",
};

/** Pseudo-random 0..1 that stays the same between renders (no Math.random in render). */
const rnd = (i: number, s: number) => Math.abs((Math.sin(i * 12.9898 + s * 78.233) * 43758.5453) % 1);

const ITEM_MOVE: Record<string, Move> = {
  rocket: "launch", plane: "fly", helicopter: "hover", balloon: "float", ship: "rock", boat: "rock", train: "drive", metro: "drive", comet: "fly",
  sun: "pulse", earth: "spin", moon: "spin", mars: "spin", saturn: "spin", star: "pulse", sunflower: "grow", tree: "grow", cactus: "grow", sprout: "grow", seed: "drop",
  mushroom: "grow", tomato: "grow", sunny: "pulse", rain: "float", storm: "hover", snow: "float", rainbow: "pulse", wind: "float", fog: "float",
};
const CAT_MOVE: Record<string, Move> = { road: "drive", sky: "fly", "rail-water": "drive", space: "float", plants: "grow", weather: "float", flags: "wave", countries: "drop", continents: "pulse" };

function sceneFor(catId: string, itemId: string): Scene {
  if (catId === "road") return "road";
  if (catId === "sky") return itemId === "rocket" ? "space" : "sky";
  if (catId === "rail-water") return itemId === "ship" || itemId === "boat" ? "water" : "rail";
  if (catId === "space") return "space";
  if (catId === "plants") return "garden";
  if (catId === "weather") return (["sunny", "rain", "storm", "snow", "rainbow", "wind", "fog"] as const).find((s) => s === itemId) ?? "sunny";
  if (catId === "flags") return "flags";
  return "globe";
}

/** Scenes where the item stands on the ground/water line: bottom padding that puts its base there. */
const GROUND: Partial<Record<Scene, string>> = { road: "27%", rail: "29%", water: "24%", garden: "27%", rainbow: "28%" };

const layer = "pointer-events-none absolute inset-0 overflow-hidden";

function Clouds({ n = 3, dark = false }: { n?: number; dark?: boolean }) {
  return (
    <div className={layer} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <motion.span key={i} className="absolute text-6xl" style={{ top: `${6 + rnd(i, 1) * 30}%`, opacity: dark ? 0.9 : 0.85, filter: dark ? "grayscale(1) brightness(0.6)" : undefined }} initial={{ x: "-20%" }} animate={{ x: "120%" }} transition={{ duration: 18 + rnd(i, 2) * 14, repeat: Infinity, ease: "linear", delay: -rnd(i, 3) * 20 }}>
          ☁️
        </motion.span>
      ))}
    </div>
  );
}

function Stars() {
  return (
    <div className={layer} aria-hidden>
      {Array.from({ length: 36 }, (_, i) => (
        <motion.span key={i} className="absolute rounded-full bg-white" style={{ left: `${rnd(i, 4) * 100}%`, top: `${rnd(i, 5) * 100}%`, width: 2 + rnd(i, 6) * 3, height: 2 + rnd(i, 6) * 3 }} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.5 + rnd(i, 7) * 2, repeat: Infinity, delay: rnd(i, 8) * 2 }} />
      ))}
      <motion.span className="absolute text-2xl" initial={{ x: "-10%", y: "10%", opacity: 0 }} animate={{ x: "110%", y: "55%", opacity: [0, 1, 1, 0] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}>
        ☄️
      </motion.span>
    </div>
  );
}

function Stripe({ top, height, color, dash, speed = 1.2 }: { top: string; height: string; color: string; dash?: string; speed?: number }) {
  return (
    <div className="absolute inset-x-0 overflow-hidden" style={{ top, height, background: color }} aria-hidden>
      {dash && (
        <motion.div
          className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2"
          style={{ backgroundImage: dash, backgroundSize: "80px 100%", width: "calc(100% + 80px)" }}
          animate={{ x: [0, -80] }}
          transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
        />
      )}
    </div>
  );
}

function Drops({ snow = false, n = 26 }: { snow?: boolean; n?: number }) {
  return (
    <div className={layer} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{ left: `${rnd(i, 9) * 100}%`, top: -20, fontSize: snow ? 14 + rnd(i, 3) * 14 : 0, width: snow ? undefined : 3, height: snow ? undefined : 16 + rnd(i, 4) * 10, background: snow ? undefined : "#cfe8ff", borderRadius: 3 }}
          animate={snow ? { y: [0, 340], x: [0, 24, -24, 0], rotate: [0, 180] } : { y: [0, 340] }}
          transition={{ duration: snow ? 4 + rnd(i, 5) * 3 : 0.7 + rnd(i, 5) * 0.5, repeat: Infinity, ease: "linear", delay: -rnd(i, 6) * 4 }}
        >
          {snow ? "❄" : null}
        </motion.span>
      ))}
    </div>
  );
}

function Waves() {
  return (
    <div className="absolute inset-x-0 bottom-0 h-[45%] overflow-hidden" aria-hidden>
      {[0, 1].map((k) => (
        <motion.div key={k} className="absolute bottom-0 h-full" style={{ left: "-10%", width: "120%", background: k ? "rgba(255,255,255,0.18)" : "rgba(10,70,150,0.35)", borderRadius: "50% 50% 0 0 / 40% 40% 0 0", top: k ? "30%" : "12%" }} animate={{ x: k ? [20, -20, 20] : [-24, 24, -24], y: [0, 5, 0] }} transition={{ duration: 3 + k, repeat: Infinity, ease: "easeInOut" }} />
      ))}
    </div>
  );
}

function Wind() {
  return (
    <div className={layer} aria-hidden>
      {Array.from({ length: 7 }, (_, i) => (
        <motion.span key={i} className="absolute h-1 rounded-full bg-white/80" style={{ top: `${10 + i * 12}%`, width: 60 + rnd(i, 1) * 80 }} initial={{ x: "-30%" }} animate={{ x: "130%" }} transition={{ duration: 1.4 + rnd(i, 2), repeat: Infinity, ease: "linear", delay: -rnd(i, 3) * 2 }} />
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <motion.span key={i} className="absolute text-2xl" style={{ top: `${20 + i * 18}%` }} initial={{ x: "-10%" }} animate={{ x: "115%", rotate: 360 }} transition={{ duration: 3 + i, repeat: Infinity, ease: "linear", delay: -i }}>
          🍃
        </motion.span>
      ))}
    </div>
  );
}

function Fog() {
  return (
    <div className={layer} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <motion.div key={i} className="absolute h-24 w-2/3 rounded-full bg-white/60 blur-2xl" style={{ top: `${i * 18}%` }} animate={{ x: i % 2 ? ["-20%", "40%"] : ["50%", "-10%"] }} transition={{ duration: 9 + i * 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }} />
      ))}
    </div>
  );
}

function Rays() {
  return (
    <motion.div className="pointer-events-none absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "repeating-conic-gradient(rgba(255,240,150,0.5) 0 10deg, transparent 10deg 24deg)", maskImage: "radial-gradient(circle, black 15%, transparent 65%)", WebkitMaskImage: "radial-gradient(circle, black 15%, transparent 65%)" }} animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} aria-hidden />
  );
}

function Rainbow() {
  return (
    <div className={layer} aria-hidden>
      {["#ff5a5a", "#ffa84d", "#ffe45e", "#6fd37b", "#5ab6ff", "#a66cff"].map((c, i) => {
        const w = 90 - i * 7;
        return (
          <motion.div
            key={c}
            className="absolute rounded-full"
            style={{ width: `${w}%`, left: `${(100 - w) / 2}%`, aspectRatio: "1", top: `${26 + i * 3.4}%`, border: `10px solid ${c}`, clipPath: "inset(0 0 50% 0)", opacity: 0.85 }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.85 }}
            transition={{ delay: i * 0.12, type: "spring", stiffness: 120, damping: 14 }}
          />
        );
      })}
    </div>
  );
}

function Pins() {
  return (
    <div className={layer} aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <motion.span key={i} className="absolute text-2xl" style={{ left: `${10 + rnd(i, 1) * 80}%`, top: `${10 + rnd(i, 2) * 70}%` }} animate={{ y: [0, -10, 0], scale: [1, 1.2, 1] }} transition={{ duration: 1.8 + rnd(i, 3), repeat: Infinity, delay: rnd(i, 4) }}>
          📍
        </motion.span>
      ))}
      <motion.div className="absolute left-1/2 top-[130%] h-[150%] w-[150%] -translate-x-1/2 rounded-full border-4 border-white/20" animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }} />
    </div>
  );
}

function Grass() {
  return (
    <div className="absolute inset-x-0 bottom-0 flex h-[36%] items-end justify-around overflow-hidden" style={{ background: "#6fbf52" }} aria-hidden>
      {Array.from({ length: 14 }, (_, i) => (
        <motion.span key={i} className="text-xl" style={{ transformOrigin: "bottom" }} animate={{ rotate: [-6, 6, -6] }} transition={{ duration: 2 + rnd(i, 1), repeat: Infinity, delay: rnd(i, 2) }}>
          🌿
        </motion.span>
      ))}
    </div>
  );
}

function Backdrop({ scene }: { scene: Scene }) {
  switch (scene) {
    case "road":
      return (<><Clouds /><Stripe top="62%" height="38%" color="#4a4f58" dash="repeating-linear-gradient(90deg,#fff 0 40px,transparent 40px 80px)" speed={0.6} /></>);
    case "rail":
      return (<><Clouds /><Stripe top="60%" height="40%" color="#8a6f55" dash="repeating-linear-gradient(90deg,#3b2f26 0 14px,transparent 14px 40px)" speed={0.5} /></>);
    case "sky":
      return <Clouds n={5} />;
    case "water":
      return (<><Clouds /><Waves /></>);
    case "space":
      return <Stars />;
    case "garden":
      return (<><Rays /><Grass /></>);
    case "sunny":
      return <Rays />;
    case "rain":
      return (<><Clouds n={4} dark /><Drops /></>);
    case "storm":
      return (<><Clouds n={4} dark /><Drops n={34} /><motion.div className={layer} style={{ background: "white" }} animate={{ opacity: [0, 0, 0.85, 0, 0.6, 0, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.5, 0.52, 0.56, 0.58, 0.64, 1] }} /></>);
    case "snow":
      return <Drops snow n={30} />;
    case "rainbow":
      return (<><Clouds /><Rainbow /></>);
    case "wind":
      return <Wind />;
    case "fog":
      return <Fog />;
    case "flags":
      return <Clouds n={3} />;
    default:
      return <Pins />;
  }
}

function Rings() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white/70" initial={{ scale: 0.8, opacity: 0.8 }} animate={{ scale: 3, opacity: 0 }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8 }} aria-hidden />
      ))}
    </>
  );
}

function Mover({ move, children, scene }: { move: Move; children: ReactNode; scene: Scene }) {
  const base = "relative flex items-center justify-center";
  switch (move) {
    case "drive":
      return (
        <motion.div className={base} initial={{ x: -420 }} animate={{ x: 0 }} transition={{ type: "spring", stiffness: 70, damping: 14 }}>
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="absolute -left-4 top-1/2 text-2xl" initial={{ opacity: 0 }} animate={{ x: [-4, -60], opacity: [0.8, 0], scale: [0.6, 1.4] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.33 }} aria-hidden>
              💨
            </motion.span>
          ))}
          <motion.div animate={{ y: [0, -3, 0], rotate: [0, -0.8, 0] }} transition={{ duration: 0.35, repeat: Infinity }}>{children}</motion.div>
        </motion.div>
      );
    case "fly":
      return (
        <motion.div className={base} initial={{ x: -480, y: -30 }} animate={{ x: 0, y: 0 }} transition={{ type: "spring", stiffness: 50, damping: 14 }}>
          <motion.div animate={{ y: [0, -16, 0], rotate: [-3, 3, -3] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>{children}</motion.div>
        </motion.div>
      );
    case "hover":
      return (
        <motion.div className={base} initial={{ y: 200, scale: 0.5 }} animate={{ y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 80, damping: 11 }}>
          <motion.div animate={{ y: [0, -8, 0], x: [-3, 3, -3], rotate: [-2, 2, -2] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>{children}</motion.div>
        </motion.div>
      );
    case "launch":
      return (
        <motion.div className={base} animate={{ y: [0, -4, 4, -3, -330, 330, 0], scale: [1, 1, 1, 1, 0.8, 0.8, 1] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.08, 0.14, 0.2, 0.42, 0.43, 0.6], repeatDelay: 1 }}>
          {children}
          <motion.span className="absolute left-1/2 top-[85%] -translate-x-1/2 text-5xl" animate={{ opacity: [0, 0, 1, 1, 0], scaleY: [0.4, 0.4, 1.3, 1.6, 0.4] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.16, 0.22, 0.42, 0.44], repeatDelay: 1 }} aria-hidden>
            🔥
          </motion.span>
        </motion.div>
      );
    case "float":
      return (
        <motion.div className={base} initial={{ scale: 0, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 160, damping: 10 }}>
          <motion.div animate={{ y: [0, -18, 0], rotate: [-4, 4, -4] }} transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}>{children}</motion.div>
        </motion.div>
      );
    case "grow":
      return (
        <motion.div className={base} style={{ transformOrigin: "50% 100%" }} initial={{ scaleY: 0.05, scaleX: 0.5, opacity: 0 }} animate={{ scaleY: 1, scaleX: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 80, damping: 7, mass: 1.2 }}>
          <motion.div style={{ transformOrigin: "50% 100%" }} animate={{ rotate: [-3, 3, -3] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}>{children}</motion.div>
        </motion.div>
      );
    case "wave":
      return (
        <motion.div className={base} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 11 }}>
          <motion.div style={{ transformOrigin: "0% 50%" }} animate={{ skewY: [-5, 5, -5], scaleX: [1, 0.95, 1], rotate: [-1.5, 1.5, -1.5] }} transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}>{children}</motion.div>
        </motion.div>
      );
    case "spin":
      return (
        <motion.div className={base} initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 90, damping: 12 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 16, repeat: Infinity, ease: "linear" }}>{children}</motion.div>
        </motion.div>
      );
    case "rock":
      return (
        <motion.div className={base} initial={{ x: -420 }} animate={{ x: 0 }} transition={{ type: "spring", stiffness: 50, damping: 14 }}>
          <motion.div style={{ transformOrigin: "50% 90%" }} animate={{ rotate: [-6, 6, -6], y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>{children}</motion.div>
        </motion.div>
      );
    case "drop":
      return (
        <motion.div className={base} initial={{ y: -260, scale: 0.7 }} animate={{ y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 160, damping: 7 }}>
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 1 }}>{children}</motion.div>
        </motion.div>
      );
    case "pulse":
      return (
        <motion.div className={base} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 170, damping: 9 }}>
          {scene !== "sunny" && <Rings />}
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>{children}</motion.div>
        </motion.div>
      );
  }
}

/** The animated "picture" of the selected fact: a themed scene with the item moving in it. */
export function FactStage({ catId, item, speaking }: { catId: string; item: FactItem; speaking: boolean }) {
  const reduced = useAppReducedMotion();
  const scene = sceneFor(catId, item.id);
  const move = ITEM_MOVE[item.id] ?? CAT_MOVE[catId] ?? "float";
  const bg: CSSProperties = { background: SCENE_BG[scene] };
  const art = <ItemArt art={item.art} emoji={item.emoji} label={item.label} size={128} />;

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-3xl shadow-md sm:h-80" style={bg} role="img" aria-label={`${item.label} scene`}>
      {!reduced && <Backdrop scene={scene} />}
      <div className={`absolute inset-0 flex justify-center ${GROUND[scene] ? "items-end" : "items-center"}`} style={{ paddingBottom: GROUND[scene] ?? 0 }}>
        <AnimatePresence mode="popLayout">
          <motion.div key={item.id} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.18 }}>
            {reduced ? art : <Mover move={move} scene={scene}>{art}</Mover>}
          </motion.div>
        </AnimatePresence>
      </div>
      {speaking && item.sound && (
        <motion.div key={`${item.id}-sound`} className="absolute right-4 top-4 max-w-[60%] rounded-3xl rounded-bl-md bg-white px-4 py-2 text-lg font-extrabold text-slate-800 shadow-lg sm:text-2xl" initial={reduced ? false : { scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 10, delay: reduced ? 0 : 0.5 }}>
          {item.sound}
        </motion.div>
      )}
      <span className="pointer-events-none absolute bottom-2 left-4 rounded-full bg-black/45 px-3 py-1 text-sm font-bold text-white">{item.label}</span>
    </div>
  );
}
