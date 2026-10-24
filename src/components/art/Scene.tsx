import { Illo } from "./illustrations";

export interface SceneItem {
  /** A drawn illustration from `illustrations.tsx`... */
  id?: string;
  /** ...or an emoji, for characters we have no drawing of (monkeys, pigs, a wolf). */
  emoji?: string;
  /** Centre, as % of the scene width / height */
  x: number;
  y: number;
  /** Width as % of the scene width */
  size: number;
  flip?: boolean;
  /** Tilt in degrees */
  tilt?: number;
}

export interface SceneDef {
  /** Sky gradient, top and bottom */
  sky: [string, string];
  /** Hill colour; leave out for no ground */
  ground?: string;
  items: SceneItem[];
}

/** A little picture-book scene: sky, a rolling hill, and illustrations placed on it. */
export function Scene({ scene }: { scene: SceneDef }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border-4 border-white/70 shadow-md" style={{ background: `linear-gradient(${scene.sky[0]}, ${scene.sky[1]})`, containerType: "inline-size" }} aria-hidden>
      {scene.ground && <div className="absolute -bottom-[38%] -left-[10%] h-[70%] w-[120%] rounded-[50%]" style={{ background: scene.ground }} />}
      {scene.items.map((it, i) => (
        <div key={i} className="absolute aspect-square" style={{ left: `${it.x}%`, top: `${it.y}%`, width: `${it.size}%`, transform: `translate(-50%, -50%) rotate(${it.tilt ?? 0}deg) scaleX(${it.flip ? -1 : 1})` }}>
          {it.emoji ? <span className="flex size-full items-center justify-center leading-none" style={{ fontSize: `${it.size * 0.8}cqw` }}>{it.emoji}</span> : it.id ? <Illo id={it.id} /> : null}
        </div>
      ))}
    </div>
  );
}
