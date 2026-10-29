/** Pure rules for Road Safety: the steps of crossing the road, polite cars that stop, and a picture quiz. */

export type Scene = "lights" | "zebra";
export type Action = "ask" | "lookLeft" | "lookRight" | "walk";

export interface CrossState {
  scene: Scene;
  /** Pressed the button (lights) or stepped up to the kerb (zebra) */
  asked: boolean;
  /** Green man showing, or the cars have stopped */
  safe: boolean;
  looked: { left: boolean; right: boolean };
}

export const startCrossing = (scene: Scene): CrossState => ({ scene, asked: false, safe: false, looked: { left: false, right: false } });

/** Cars stop and, at the lights, the little man turns green. */
export const becomeSafe = (s: CrossState): CrossState => ({ ...s, safe: true });

const waitLine = (s: CrossState) => (s.scene === "lights" ? "Wait for the green man." : "Wait for the cars to stop.");
const firstLine = (s: CrossState) => (s.scene === "lights" ? "First, press the button on the pole." : "First, stand by the zebra crossing.");

/** What the child should do next: glows after a mistake. */
export function nextAction(s: CrossState): Action | "wait" {
  if (!s.asked) return "ask";
  if (!s.safe) return "wait";
  if (!s.looked.left) return "lookLeft";
  if (!s.looked.right) return "lookRight";
  return "walk";
}

/** One tap. Nothing goes wrong on the road: a step out of order just explains the right one. */
export function act(s: CrossState, a: Action): { state: CrossState; ok: boolean; say: string } {
  if (a === "ask") {
    if (s.asked) return { state: s, ok: false, say: waitLine(s) };
    return { state: { ...s, asked: true }, ok: true, say: s.scene === "lights" ? "Beep! Good. Now wait for the green man." : "Good. Wait at the kerb for the cars to stop." };
  }
  if (!s.asked) return { state: s, ok: false, say: firstLine(s) };
  if (!s.safe) {
    if (a === "walk") return { state: s, ok: false, say: s.scene === "lights" ? "Stop! The little man is red. Red means wait." : "Wait! The cars are still moving." };
    return { state: s, ok: false, say: `Cars are still going. ${waitLine(s)}` };
  }
  if (a === "lookLeft" || a === "lookRight") {
    const side = a === "lookLeft" ? "left" : "right";
    const looked = { ...s.looked, [side]: true };
    const both = looked.left && looked.right;
    return { state: { ...s, looked }, ok: true, say: both ? `${side === "left" ? "Left" : "Right"} is clear too. Now you can walk!` : `${side === "left" ? "Left" : "Right"}: the cars have stopped. Now look ${side === "left" ? "right" : "left"}.` };
  }
  if (!s.looked.left || !s.looked.right) {
    const missing = !s.looked.left && !s.looked.right ? "left and right" : !s.looked.left ? "left" : "right";
    return { state: s, ok: false, say: `Look ${missing} first, to check the cars have stopped.` };
  }
  return { state: s, ok: true, say: "Walk across, don't run. Well done!" };
}

/* ---- Cars ---- */

/** Road positions are in % of the scene width; the crossing is in the middle. */
export const CROSSING = { left: 42, right: 58 };
export const CAR_LEN = 10;
const GAP = 14;
const WRAP = 130;

export interface Car {
  id: number;
  x: number;
  /** 1 drives left to right (near lane), -1 right to left (far lane) */
  dir: 1 | -1;
}

/** The front of a car must stay out of the crossing, so it stops just before it. */
const stopLine = (dir: 1 | -1) => (dir === 1 ? CROSSING.left - CAR_LEN - 2 : CROSSING.right + 2);
const approaching = (c: Car) => (c.dir === 1 ? c.x <= stopLine(1) : c.x >= stopLine(-1));

/**
 * Move one lane on by `dt` seconds. When `stop` is set, cars that haven't reached the crossing queue up before it
 * one behind another; cars already past it drive on.
 */
export function moveLane(cars: Car[], dt: number, stop: boolean, speed = 16): Car[] {
  if (!cars.length) return cars;
  const dir = cars[0].dir;
  const line = stopLine(dir);
  const queue = cars.filter(approaching).sort((a, b) => dir * (b.x - a.x));
  return cars.map((c) => {
    let x = c.x + dir * speed * dt;
    const k = queue.indexOf(c);
    if (stop && k >= 0) {
      const limit = line - dir * k * GAP;
      x = dir === 1 ? Math.min(x, Math.max(c.x, limit)) : Math.max(x, Math.min(c.x, limit));
    }
    if (x > 100 + 15) x -= WRAP;
    if (x < -15 - CAR_LEN) x += WRAP;
    return { ...c, x };
  });
}

/** No car body is over the zebra stripes. */
export const crossingClear = (cars: Car[]) => cars.every((c) => c.x + CAR_LEN <= CROSSING.left || c.x >= CROSSING.right);

export const startCars = (): Car[] => [
  { id: 1, x: -10, dir: 1 },
  { id: 2, x: 40, dir: 1 },
  { id: 3, x: 90, dir: 1 },
  { id: 4, x: 100, dir: -1 },
  { id: 5, x: 50, dir: -1 },
  { id: 6, x: 5, dir: -1 },
];

/* ---- Quiz ---- */

export interface QuizChoice {
  emoji: string;
  label: string;
  right?: boolean;
}

export interface Quiz {
  q: string;
  choices: QuizChoice[];
  /** Spoken after the right answer, or as the hint */
  why: string;
}

export const QUIZ: Quiz[] = [
  {
    q: "Where is the safest place to cross?",
    choices: [
      { emoji: "🦓", label: "Zebra crossing", right: true },
      { emoji: "🚙", label: "Between parked cars" },
      { emoji: "↪️", label: "On a bend" },
    ],
    why: "At a zebra crossing drivers can see you and stop.",
  },
  {
    q: "The little man is red. What do you do?",
    choices: [
      { emoji: "✋", label: "Wait", right: true },
      { emoji: "🏃", label: "Run across" },
      { emoji: "🚶", label: "Walk across" },
    ],
    why: "Red means wait. Cross when the man is green.",
  },
  {
    q: "Which light tells cars to stop?",
    choices: [
      { emoji: "🔴", label: "Red", right: true },
      { emoji: "🟢", label: "Green" },
      { emoji: "🟡", label: "Yellow" },
    ],
    why: "Red means stop, yellow means get ready, green means go.",
  },
  {
    q: "Who do you hold hands with near the road?",
    choices: [
      { emoji: "🧑", label: "A grown-up", right: true },
      { emoji: "🐶", label: "Your dog" },
      { emoji: "🧸", label: "Your teddy" },
    ],
    why: "Always hold a grown-up's hand near the road.",
  },
  {
    q: "Where should you walk?",
    choices: [
      { emoji: "🚸", label: "On the footpath", right: true },
      { emoji: "🛣️", label: "On the road" },
      { emoji: "🚧", label: "On the kerb edge" },
    ],
    why: "Walk on the footpath, away from the cars.",
  },
  {
    q: "What helps drivers see you at night?",
    choices: [
      { emoji: "🦺", label: "Bright, shiny clothes", right: true },
      { emoji: "🕶️", label: "Sunglasses" },
      { emoji: "🧥", label: "A dark coat" },
    ],
    why: "Bright, shiny clothes glow in car lights.",
  },
  {
    q: "Before you cross, you look...",
    choices: [
      { emoji: "👀", label: "Left and right", right: true },
      { emoji: "⬆️", label: "Up at the sky" },
      { emoji: "📱", label: "At a phone" },
    ],
    why: "Look both ways, and keep looking as you cross.",
  },
  {
    q: "Your ball rolls into the road. What do you do?",
    choices: [
      { emoji: "🙋", label: "Ask a grown-up", right: true },
      { emoji: "🏃", label: "Run after it" },
      { emoji: "🦵", label: "Kick it further" },
    ],
    why: "Never run into the road. A grown-up will get it.",
  },
];

/** Every third crossing is a quiz card; scenes alternate, starting at the lights. */
export function roundKind(n: number): { kind: "cross"; scene: Scene } | { kind: "quiz"; quiz: number } {
  if (n % 3 === 2) return { kind: "quiz", quiz: Math.floor(n / 3) % QUIZ.length };
  return { kind: "cross", scene: (n - Math.floor(n / 3)) % 2 === 0 ? "lights" : "zebra" };
}
