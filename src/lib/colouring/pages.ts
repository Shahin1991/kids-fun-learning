/** Colouring pages: simple line art on a 200×200 canvas, made of closed regions a tap can fill. Later regions sit on top. */
export interface Region {
  id: string;
  d: string;
  transform?: string;
}

export interface ColouringPage {
  id: string;
  title: string;
  emoji: string;
  regions: Region[];
  /** Lines drawn on top that are not fillable (antennae, whiskers) */
  lines?: string[];
}

const rect = (x: number, y: number, w: number, h: number, r = 0) =>
  r
    ? `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`
    : `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
const ellipse = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;
const circle = (cx: number, cy: number, r: number) => ellipse(cx, cy, r, r);
const BG = { id: "bg", d: rect(0, 0, 200, 200) };

export const PAGES: ColouringPage[] = [
  {
    id: "house",
    title: "House",
    emoji: "🏠",
    regions: [
      BG,
      { id: "cloud", d: "M20 45a14 14 0 0 1 22-14a16 16 0 0 1 28 4a12 12 0 0 1 0 22H24a12 12 0 0 1-4-12Z" },
      { id: "sun", d: circle(165, 38, 18) },
      { id: "grass", d: "M0 160Q50 148 100 160T200 160V200H0Z" },
      { id: "chimney", d: rect(124, 52, 14, 30) },
      { id: "walls", d: rect(50, 90, 100, 72) },
      { id: "roof", d: "M38 94L100 44L162 94Z" },
      { id: "door", d: rect(88, 122, 24, 40, 4) },
      { id: "window-l", d: rect(60, 104, 20, 20) },
      { id: "window-r", d: rect(120, 104, 20, 20) },
    ],
  },
  {
    id: "fish",
    title: "Fish",
    emoji: "🐟",
    regions: [
      BG,
      { id: "weed", d: "M20 200C10 170 30 160 22 130C34 150 40 175 32 200Z" },
      { id: "tail", d: "M45 100L12 68L18 100L12 132Z" },
      { id: "fin", d: "M78 66Q96 34 118 66Z" },
      { id: "body", d: ellipse(98, 100, 60, 38) },
      { id: "belly", d: ellipse(100, 118, 36, 12) },
      { id: "stripe", d: "M78 66Q68 100 78 134L90 137Q80 100 90 63Z" },
      { id: "eye", d: circle(130, 92, 9) },
      { id: "pupil", d: circle(132, 92, 4) },
      { id: "bubble-1", d: circle(168, 66, 7) },
      { id: "bubble-2", d: circle(178, 44, 5) },
      { id: "bubble-3", d: circle(170, 26, 4) },
    ],
  },
  {
    id: "butterfly",
    title: "Butterfly",
    emoji: "🦋",
    regions: [
      BG,
      { id: "wing-ul", d: ellipse(64, 74, 42, 30), transform: "rotate(-28 64 74)" },
      { id: "wing-ur", d: ellipse(136, 74, 42, 30), transform: "rotate(28 136 74)" },
      { id: "wing-ll", d: ellipse(72, 128, 30, 22), transform: "rotate(28 72 128)" },
      { id: "wing-lr", d: ellipse(128, 128, 30, 22), transform: "rotate(-28 128 128)" },
      { id: "spot-ul", d: circle(58, 70, 11) },
      { id: "spot-ur", d: circle(142, 70, 11) },
      { id: "spot-ll", d: circle(72, 130, 8) },
      { id: "spot-lr", d: circle(128, 130, 8) },
      { id: "body", d: ellipse(100, 104, 8, 46) },
      { id: "head", d: circle(100, 54, 10) },
    ],
    lines: ["M96 46Q86 26 78 22", "M104 46Q114 26 122 22"],
  },
  {
    id: "flower",
    title: "Flower",
    emoji: "🌷",
    regions: [
      BG,
      { id: "stem", d: rect(96, 104, 8, 80) },
      { id: "leaf-l", d: ellipse(80, 145, 18, 8), transform: "rotate(-30 80 145)" },
      { id: "leaf-r", d: ellipse(120, 135, 18, 8), transform: "rotate(30 120 135)" },
      ...Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return { id: `petal-${i}`, d: circle(Math.round(100 + Math.cos(a) * 27), Math.round(78 + Math.sin(a) * 27), 18) };
      }),
      { id: "centre", d: circle(100, 78, 16) },
      { id: "pot", d: "M68 168H132L124 200H76Z" },
      { id: "pot-rim", d: rect(64, 160, 72, 12, 4) },
    ],
  },
  {
    id: "car",
    title: "Car",
    emoji: "🚗",
    regions: [
      BG,
      { id: "road", d: rect(0, 166, 200, 34) },
      { id: "cabin", d: "M55 106L76 74H130L152 106Z" },
      { id: "body", d: rect(24, 104, 152, 46, 12) },
      { id: "window-f", d: "M108 102V80H127L142 102Z" },
      { id: "window-b", d: "M66 102L80 80H100V102Z" },
      { id: "light", d: circle(168, 120, 6) },
      { id: "wheel-b", d: circle(60, 150, 18) },
      { id: "wheel-f", d: circle(140, 150, 18) },
      { id: "hub-b", d: circle(60, 150, 7) },
      { id: "hub-f", d: circle(140, 150, 7) },
    ],
  },
  {
    id: "rocket",
    title: "Rocket",
    emoji: "🚀",
    regions: [
      BG,
      { id: "star-1", d: "M30 40l4 9 10 1-8 6 3 10-9-6-9 6 3-10-8-6 10-1Z" },
      { id: "star-2", d: "M165 140l3 7 8 1-6 5 2 8-7-5-7 5 2-8-6-5 8-1Z" },
      { id: "flame", d: "M84 150Q100 198 116 150Z" },
      { id: "fin-l", d: "M76 118L48 162L80 152Z" },
      { id: "fin-r", d: "M124 118L152 162L120 152Z" },
      { id: "body", d: "M100 22C132 50 132 120 126 154H74C68 120 68 50 100 22Z" },
      { id: "nose", d: "M100 22C112 32 118 42 121 52H79C82 42 88 32 100 22Z" },
      { id: "window", d: circle(100, 86, 14) },
    ],
  },
];

export const PALETTE = ["#ff4d4d", "#ff922b", "#ffd43b", "#51cf66", "#22b8cf", "#4d7cff", "#9b5de5", "#f06595", "#8d5524", "#ffffff", "#adb5bd", "#212529"];
