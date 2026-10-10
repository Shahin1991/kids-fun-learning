import type { ReactNode } from "react";

/**
 * Hand-drawn storybook illustrations: soft saturated fills, one dark-brown outline weight, round joins,
 * friendly faces. Every piece is a 100x100 SVG so it can be dropped into a scene at any size.
 */
const INK = "#5b3a29";
const SW = 3;

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      {children}
    </svg>
  );
}

/** Shapes that overlap are drawn twice so they share one clean outline. */
function Merged({ color, children }: { color: string; children: ReactNode }) {
  return (
    <>
      <g fill={INK} stroke={INK} strokeWidth={SW * 2}>{children}</g>
      <g fill={color}>{children}</g>
    </>
  );
}

function Face({ x, y, gap = 12, sleepy = false }: { x: number; y: number; gap?: number; sleepy?: boolean }) {
  return (
    <g>
      {sleepy ? (
        <g fill="none" stroke={INK} strokeWidth={2.4}>
          <path d={`M${x - gap - 4} ${y} q4 4 8 0`} />
          <path d={`M${x + gap - 4} ${y} q4 4 8 0`} />
        </g>
      ) : (
        <g fill={INK}>
          <circle cx={x - gap} cy={y} r={3} />
          <circle cx={x + gap} cy={y} r={3} />
          <circle cx={x - gap + 1} cy={y - 1} r={1} fill="#fff" />
          <circle cx={x + gap + 1} cy={y - 1} r={1} fill="#fff" />
        </g>
      )}
      <path d={`M${x - 5} ${y + 8} q5 5 10 0`} fill="none" stroke={INK} strokeWidth={2.4} />
      <circle cx={x - gap - 5} cy={y + 7} r={3.5} fill="#ff9aa8" opacity={0.6} />
      <circle cx={x + gap + 5} cy={y + 7} r={3.5} fill="#ff9aa8" opacity={0.6} />
    </g>
  );
}

const o = { stroke: INK, strokeWidth: SW } as const;

const moon = () => (
  <Svg>
    <circle cx="50" cy="50" r="38" fill="#ffe38a" {...o} />
    <circle cx="68" cy="34" r="6" fill="#f5cf62" />
    <circle cx="32" cy="66" r="5" fill="#f5cf62" />
    <Face x={50} y={48} gap={13} sleepy />
  </Svg>
);

const star = () => (
  <Svg>
    <polygon points="50,10 61,37 90,40 68,59 74,88 50,73 26,88 32,59 10,40 39,37" fill="#ffd23f" {...o} />
    <Face x={50} y={52} gap={8} />
  </Svg>
);

const cloud = () => (
  <Svg>
    <Merged color="#ffffff">
      <circle cx="30" cy="58" r="17" />
      <circle cx="52" cy="46" r="22" />
      <circle cx="74" cy="58" r="16" />
      <rect x="30" y="56" width="44" height="19" />
    </Merged>
  </Svg>
);

const sun = () => (
  <Svg>
    {Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      return <line key={i} x1={50 + Math.cos(a) * 33} y1={50 + Math.sin(a) * 33} x2={50 + Math.cos(a) * 45} y2={50 + Math.sin(a) * 45} stroke="#ffb703" strokeWidth={6} />;
    })}
    <circle cx="50" cy="50" r="28" fill="#ffd23f" {...o} />
    <Face x={50} y={48} gap={10} />
  </Svg>
);

const tree = () => (
  <Svg>
    <rect x="43" y="55" width="14" height="38" rx="3" fill="#a9703d" {...o} />
    <Merged color="#5fbf5a">
      <circle cx="50" cy="32" r="24" />
      <circle cx="30" cy="48" r="17" />
      <circle cx="70" cy="48" r="17" />
    </Merged>
    <circle cx="42" cy="26" r="3" fill="#8bdc7f" />
  </Svg>
);

const flower = () => (
  <Svg>
    <path d="M50 52 V92" stroke="#3f9a45" strokeWidth={5} fill="none" />
    <path d="M50 78 q-16 -4 -18 -16 q14 2 18 16z" fill="#5fbf5a" {...o} />
    <g {...o} fill="#ff8fb8">
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return <circle key={i} cx={50 + Math.cos(a) * 15} cy={34 + Math.sin(a) * 15} r={10} />;
      })}
    </g>
    <circle cx="50" cy="34" r="9" fill="#ffd23f" {...o} />
  </Svg>
);

const pup = () => (
  <Svg>
    <ellipse cx="50" cy="76" rx="25" ry="19" fill="#f2c48d" {...o} />
    <ellipse cx="30" cy="38" rx="9" ry="16" fill="#a9703d" {...o} transform="rotate(14 30 38)" />
    <ellipse cx="70" cy="38" rx="9" ry="16" fill="#a9703d" {...o} transform="rotate(-14 70 38)" />
    <circle cx="50" cy="44" r="24" fill="#f2c48d" {...o} />
    <ellipse cx="50" cy="54" rx="11" ry="8" fill="#fff3df" />
    <ellipse cx="50" cy="49" rx="4.5" ry="3.2" fill={INK} />
    <circle cx="39" cy="40" r="3" fill={INK} />
    <circle cx="61" cy="40" r="3" fill={INK} />
    <path d="M44 58 q6 6 12 0" fill="none" stroke={INK} strokeWidth={2.4} />
    <path d="M47 60 q3 9 6 0z" fill="#ff7b9c" />
  </Svg>
);

const bear = () => (
  <Svg>
    <ellipse cx="50" cy="78" rx="27" ry="19" fill="#b9814d" {...o} />
    <circle cx="27" cy="26" r="11" fill="#b9814d" {...o} />
    <circle cx="73" cy="26" r="11" fill="#b9814d" {...o} />
    <circle cx="27" cy="26" r="5" fill="#f2c48d" />
    <circle cx="73" cy="26" r="5" fill="#f2c48d" />
    <circle cx="50" cy="45" r="27" fill="#b9814d" {...o} />
    <ellipse cx="50" cy="55" rx="12" ry="9" fill="#f2c48d" />
    <ellipse cx="50" cy="51" rx="4.5" ry="3.2" fill={INK} />
    <circle cx="39" cy="40" r="3" fill={INK} />
    <circle cx="61" cy="40" r="3" fill={INK} />
    <path d="M45 58 q5 5 10 0" fill="none" stroke={INK} strokeWidth={2.4} />
  </Svg>
);

const bunny = () => (
  <Svg>
    <ellipse cx="50" cy="78" rx="24" ry="18" fill="#fdfaf5" {...o} />
    <ellipse cx="37" cy="22" rx="8" ry="20" fill="#fdfaf5" {...o} />
    <ellipse cx="63" cy="22" rx="8" ry="20" fill="#fdfaf5" {...o} />
    <ellipse cx="37" cy="24" rx="3.5" ry="13" fill="#ffb3c8" />
    <ellipse cx="63" cy="24" rx="3.5" ry="13" fill="#ffb3c8" />
    <circle cx="50" cy="52" r="22" fill="#fdfaf5" {...o} />
    <circle cx="40" cy="48" r="3" fill={INK} />
    <circle cx="60" cy="48" r="3" fill={INK} />
    <ellipse cx="50" cy="56" rx="3.5" ry="2.6" fill="#ff7b9c" />
    <path d="M44 61 q6 5 12 0" fill="none" stroke={INK} strokeWidth={2.4} />
    <circle cx="35" cy="57" r="3.5" fill="#ff9aa8" opacity={0.6} />
    <circle cx="65" cy="57" r="3.5" fill="#ff9aa8" opacity={0.6} />
  </Svg>
);

const bird = () => (
  <Svg>
    <path d="M42 80 v10 M58 80 v10 M36 91 h12 M52 91 h12" stroke="#f08a24" strokeWidth={3.5} fill="none" />
    <ellipse cx="50" cy="56" rx="30" ry="27" fill="#63b8ff" {...o} />
    <ellipse cx="50" cy="66" rx="18" ry="14" fill="#d9f0ff" />
    <path d="M24 56 q-14 6 -10 18 q16 -2 20 -14z" fill="#3b95e0" {...o} />
    <path d="M44 42 l-3 -12 M52 41 l1 -13" stroke="#3b95e0" strokeWidth={3.5} fill="none" />
    <circle cx="58" cy="46" r="4" fill={INK} />
    <circle cx="59.3" cy="44.7" r="1.3" fill="#fff" />
    <path d="M72 50 l14 5 l-14 5z" fill="#ffb703" {...o} />
  </Svg>
);

const pumpkin = () => (
  <Svg>
    <path d="M48 24 q2 -12 12 -14" stroke="#3f9a45" strokeWidth={5} fill="none" />
    <path d="M56 22 q12 -8 18 2 q-10 8 -18 -2z" fill="#5fbf5a" {...o} />
    <ellipse cx="30" cy="58" rx="20" ry="30" fill="#f08a24" {...o} />
    <ellipse cx="70" cy="58" rx="20" ry="30" fill="#f08a24" {...o} />
    <ellipse cx="50" cy="58" rx="20" ry="33" fill="#ff9f43" {...o} />
    <path d="M50 28 v60" stroke="#d9731a" strokeWidth={2} fill="none" />
    <Face x={50} y={58} gap={11} />
  </Svg>
);

const cake = () => (
  <Svg>
    <rect x="14" y="56" width="72" height="32" rx="6" fill="#ffb3c8" {...o} />
    <rect x="24" y="30" width="52" height="30" rx="6" fill="#fff0c9" {...o} />
    <path d="M24 38 q6 10 13 0 q6 10 13 0 q6 10 13 0 q6 10 13 0" fill="#ff7b9c" {...o} />
    <path d="M14 64 q9 10 18 0 q9 10 18 0 q9 10 18 0 q9 10 18 0" fill="#fff" {...o} />
    <rect x="46" y="14" width="8" height="18" rx="2" fill="#7fd6ff" {...o} />
    <path d="M50 4 q7 7 0 10 q-7 -3 0 -10z" fill="#ffb347" {...o} />
    <circle cx="30" cy="78" r="3" fill="#ffd23f" />
    <circle cx="50" cy="80" r="3" fill="#7fd6ff" />
    <circle cx="70" cy="78" r="3" fill="#ffd23f" />
  </Svg>
);

const umbrella = () => (
  <Svg>
    <path d="M50 30 v50 q0 10 -9 10 q-6 0 -7 -6" stroke={INK} strokeWidth={4.5} fill="none" />
    <path d="M6 54 A44 40 0 0 1 94 54 q-7 -7 -14.6 0 q-7.3 -7 -14.6 0 q-7.3 -7 -14.8 0 q-7.3 -7 -14.6 0 q-7.3 -7 -14.6 0 q-7 -7 -14.8 0z" fill="#ff5a5f" {...o} />
    <path d="M50 14 V54 M28 22 Q22 38 20 54 M72 22 Q78 38 80 54" stroke="#ffd0d2" strokeWidth={3} fill="none" />
  </Svg>
);

const house = () => (
  <Svg>
    <rect x="20" y="46" width="60" height="44" fill="#ffd9a0" {...o} />
    <polygon points="12,48 50,12 88,48" fill="#e5606b" {...o} />
    <rect x="42" y="62" width="16" height="28" rx="3" fill="#a9703d" {...o} />
    <circle cx="54" cy="77" r="1.8" fill="#ffd23f" />
    <rect x="25" y="55" width="13" height="13" rx="2" fill="#fff6b8" {...o} />
    <rect x="62" y="55" width="13" height="13" rx="2" fill="#fff6b8" {...o} />
    <rect x="64" y="18" width="9" height="18" fill="#c97b5a" {...o} />
  </Svg>
);

const balloon = () => (
  <Svg>
    <path d="M50 74 q-8 10 2 14 q8 4 0 10" stroke={INK} strokeWidth={2.4} fill="none" />
    <path d="M50 8 C20 8 18 56 50 72 C82 56 80 8 50 8z" fill="#ff6b8b" {...o} />
    <polygon points="45,76 55,76 50,70" fill="#e5446a" {...o} />
    <ellipse cx="38" cy="30" rx="5" ry="9" fill="#fff" opacity={0.55} transform="rotate(20 38 30)" />
  </Svg>
);

const bone = () => (
  <Svg>
    <path d="M26 38 a10 10 0 1 1 14 -10 L62 50 a10 10 0 1 1 10 14 a10 10 0 1 1 -10 10 L40 52 a10 10 0 1 1 -14 -14z" fill="#fff6e6" {...o} transform="translate(-4 -2) rotate(0)" />
  </Svg>
);

const drop = () => (
  <Svg>
    <path d="M50 10 C50 10 20 46 20 64 a30 30 0 0 0 60 0 C80 46 50 10 50 10z" fill="#63b8ff" {...o} />
    <ellipse cx="40" cy="62" rx="5" ry="9" fill="#fff" opacity={0.5} transform="rotate(15 40 62)" />
  </Svg>
);

const heart = () => (
  <Svg>
    <path d="M50 86 C10 58 14 22 36 22 c8 0 12 5 14 10 c2 -5 6 -10 14 -10 c22 0 26 36 -14 64z" fill="#ff6b8b" {...o} />
  </Svg>
);

export const ILLOS: Record<string, () => ReactNode> = { moon, star, cloud, sun, tree, flower, pup, bear, bunny, bird, pumpkin, cake, umbrella, house, balloon, bone, drop, heart };

export type IlloId = keyof typeof ILLOS;
export const hasIllo = (id?: string): id is string => !!id && id in ILLOS;

export function Illo({ id, label, size }: { id: string; label?: string; size?: number }) {
  const body = ILLOS[id]?.();
  if (!body) return null;
  return (
    <span className="inline-block" style={size ? { width: size, height: size } : { width: "100%", height: "100%" }} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {body}
    </span>
  );
}
