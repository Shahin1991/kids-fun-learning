import type { SceneDef } from "@/components/art/Scene";
import type { BookDef, BookPage } from "./books";

const DAY: SceneDef["sky"] = ["#bfe6ff", "#eaf8ff"];
const NIGHT: SceneDef["sky"] = ["#1e2a6b", "#4a3c8f"];
const RAIN: SceneDef["sky"] = ["#9db4c9", "#cfdbe6"];
const GRASS = "#7ccf6e";
const NIGHT_GRASS = "#2f5a52";

/** A story page: a picture and a few words, read aloud as written. */
const page = (id: string, text: string, scene: SceneDef, bg: string, fg: string): BookPage => ({ id, bg, fg, caption: "", text, scene, say: text });

const PAPER = ["#fff1c9", "#ffe0ea", "#d9f0ff", "#dcf6d3", "#eadcff", "#ffe5cc"];
const INKS = ["#e67e00", "#d6336c", "#1971c2", "#2f9e44", "#7048e8", "#e8590c"];
const pages = (id: string, list: [string, SceneDef][]): BookPage[] =>
  [...list.map(([t, s], i) => page(`${id}${i + 1}`, t, s, PAPER[i % PAPER.length], INKS[i % INKS.length]), { id: `${id}-end`, bg: "#fff3b0", fg: "#e67e00", big: "The End", illo: "star", caption: "", say: "The end!" } as BookPage)];

const STAR_SPOTS = [[10, 14, 11], [90, 12, 13], [88, 52, 9], [12, 50, 10], [28, 10, 8], [74, 8, 9]] as const;
const stars = (n: number): SceneDef["items"] => STAR_SPOTS.slice(0, n).map(([x, y, size], i) => ({ id: "star", x, y, size, tilt: i * 25 - 30 }));

export const STORIES: BookDef[] = [
  {
    id: "sleepy-moon",
    title: "The Sleepy Moon",
    emoji: "🌙",
    illo: "moon",
    color: "#5b6ee1",
    dark: "#3a47b0",
    pages: pages("moon", [
      ["The moon was very sleepy.", { sky: NIGHT, items: [{ id: "moon", x: 50, y: 42, size: 52 }, ...stars(4)] }],
      ["She gave a big, big yawn.", { sky: NIGHT, items: [{ id: "moon", x: 50, y: 40, size: 56 }, { id: "cloud", x: 20, y: 72, size: 30 }, { id: "cloud", x: 82, y: 66, size: 26, flip: true }] }],
      ["“Goodnight, Moon!” said the stars.", { sky: NIGHT, items: [{ id: "moon", x: 72, y: 36, size: 34 }, ...stars(6)] }],
      ["“Goodnight!” tweeted the little bird.", { sky: NIGHT, ground: NIGHT_GRASS, items: [{ id: "moon", x: 74, y: 24, size: 26 }, { id: "tree", x: 30, y: 58, size: 40 }, { id: "bird", x: 56, y: 68, size: 24 }] }],
      ["“Goodnight!” yawned the pup.", { sky: NIGHT, ground: NIGHT_GRASS, items: [{ id: "moon", x: 78, y: 22, size: 24 }, { id: "house", x: 30, y: 62, size: 38 }, { id: "pup", x: 66, y: 74, size: 28 }] }],
      ["Everything was quiet and still.", { sky: NIGHT, ground: NIGHT_GRASS, items: [{ id: "moon", x: 50, y: 28, size: 30 }, { id: "tree", x: 18, y: 62, size: 32 }, { id: "house", x: 52, y: 66, size: 32 }, { id: "tree", x: 84, y: 62, size: 30 }, ...stars(3)] }],
      ["The moon closed her eyes. Goodnight!", { sky: NIGHT, items: [{ id: "moon", x: 50, y: 48, size: 62 }, ...stars(5)] }],
    ]),
  },
  {
    id: "pip-pup",
    title: "Pip the Little Pup",
    emoji: "🐶",
    illo: "pup",
    color: "#f4a261",
    dark: "#c97b2e",
    pages: pages("pip", [
      ["Pip was a little pup.", { sky: DAY, ground: GRASS, items: [{ id: "pup", x: 50, y: 62, size: 46 }] }],
      ["Pip loved to play in the sun.", { sky: DAY, ground: GRASS, items: [{ id: "sun", x: 80, y: 22, size: 28 }, { id: "pup", x: 38, y: 64, size: 40 }, { id: "flower", x: 76, y: 78, size: 16 }] }],
      ["Pip found a big, big bone!", { sky: DAY, ground: GRASS, items: [{ id: "pup", x: 34, y: 62, size: 36 }, { id: "bone", x: 68, y: 66, size: 34, tilt: -15 }] }],
      ["Pip met a bunny. “Hop with me!”", { sky: DAY, ground: GRASS, items: [{ id: "pup", x: 32, y: 64, size: 34 }, { id: "bunny", x: 68, y: 62, size: 34, flip: true }] }],
      ["They hopped past the flowers.", { sky: DAY, ground: GRASS, items: [{ id: "flower", x: 14, y: 72, size: 20 }, { id: "flower", x: 40, y: 80, size: 18 }, { id: "pup", x: 52, y: 58, size: 30 }, { id: "bunny", x: 78, y: 56, size: 28, flip: true }, { id: "flower", x: 90, y: 78, size: 18 }] }],
      ["They played all day long.", { sky: DAY, ground: GRASS, items: [{ id: "sun", x: 18, y: 20, size: 24 }, { id: "balloon", x: 52, y: 32, size: 22 }, { id: "pup", x: 34, y: 66, size: 30 }, { id: "bunny", x: 68, y: 64, size: 30, flip: true }] }],
      ["Pip went home and fell fast asleep.", { sky: ["#ffc999", "#ffe7cf"], ground: GRASS, items: [{ id: "house", x: 36, y: 58, size: 44 }, { id: "pup", x: 72, y: 72, size: 28 }, { id: "heart", x: 76, y: 44, size: 14 }] }],
    ]),
  },
  {
    id: "giant-pumpkin",
    title: "The Giant Pumpkin",
    emoji: "🎃",
    illo: "pumpkin",
    color: "#f08a24",
    dark: "#c4600a",
    pages: pages("pumpkin", [
      ["Bear planted a tiny seed.", { sky: DAY, ground: "#8fd37a", items: [{ id: "bear", x: 50, y: 62, size: 40 }] }],
      ["The sun shone. The rain fell.", { sky: DAY, ground: "#8fd37a", items: [{ id: "sun", x: 22, y: 24, size: 28 }, { id: "cloud", x: 72, y: 24, size: 34 }, { id: "drop", x: 66, y: 50, size: 8 }, { id: "drop", x: 76, y: 56, size: 8 }, { id: "flower", x: 50, y: 76, size: 18 }] }],
      ["It grew and grew and grew!", { sky: DAY, ground: "#8fd37a", items: [{ id: "bear", x: 28, y: 62, size: 30 }, { id: "pumpkin", x: 66, y: 64, size: 40 }] }],
      ["A giant pumpkin! Too big to lift.", { sky: DAY, ground: "#8fd37a", items: [{ id: "bear", x: 22, y: 66, size: 28 }, { id: "pumpkin", x: 64, y: 54, size: 62 }] }],
      ["Bunny came to help. Push, push, push!", { sky: DAY, ground: "#8fd37a", items: [{ id: "bear", x: 16, y: 68, size: 26 }, { id: "bunny", x: 34, y: 70, size: 24 }, { id: "pumpkin", x: 68, y: 56, size: 56 }] }],
      ["Bird came to help. Heave, ho!", { sky: DAY, ground: "#8fd37a", items: [{ id: "bear", x: 14, y: 68, size: 24 }, { id: "bunny", x: 30, y: 70, size: 22 }, { id: "bird", x: 46, y: 70, size: 18, flip: true }, { id: "pumpkin", x: 72, y: 56, size: 52 }] }],
      ["Roll, roll, roll! Hooray!", { sky: DAY, ground: "#8fd37a", items: [{ id: "house", x: 80, y: 52, size: 34 }, { id: "pumpkin", x: 44, y: 66, size: 44, tilt: 25 }, { id: "bear", x: 14, y: 68, size: 22 }, { id: "bunny", x: 26, y: 74, size: 18 }, { id: "star", x: 30, y: 24, size: 12 }, { id: "star", x: 56, y: 18, size: 10 }] }],
    ]),
  },
  {
    id: "rainy-day",
    title: "Rainy Day Friends",
    emoji: "☔",
    illo: "umbrella",
    color: "#4dabf7",
    dark: "#1c7ed6",
    pages: pages("rain", [
      ["Plip, plop! It began to rain.", { sky: RAIN, ground: "#6fb56a", items: [{ id: "cloud", x: 50, y: 22, size: 52 }, { id: "drop", x: 36, y: 50, size: 9 }, { id: "drop", x: 52, y: 60, size: 9 }, { id: "drop", x: 66, y: 48, size: 9 }, { id: "drop", x: 44, y: 74, size: 9 }] }],
      ["Bunny had a red umbrella.", { sky: RAIN, ground: "#6fb56a", items: [{ id: "cloud", x: 78, y: 18, size: 30 }, { id: "bunny", x: 44, y: 70, size: 34 }, { id: "umbrella", x: 44, y: 42, size: 44 }] }],
      ["Bear had no umbrella.", { sky: RAIN, ground: "#6fb56a", items: [{ id: "cloud", x: 28, y: 18, size: 34 }, { id: "bear", x: 56, y: 64, size: 40 }, { id: "drop", x: 40, y: 38, size: 8 }, { id: "drop", x: 70, y: 30, size: 8 }] }],
      ["“Come under mine!” said Bunny.", { sky: RAIN, ground: "#6fb56a", items: [{ id: "umbrella", x: 50, y: 34, size: 56 }, { id: "bunny", x: 66, y: 70, size: 30, flip: true }, { id: "bear", x: 32, y: 66, size: 34 }] }],
      ["Pup came splashing by.", { sky: RAIN, ground: "#6fb56a", items: [{ id: "umbrella", x: 36, y: 34, size: 44 }, { id: "bunny", x: 46, y: 70, size: 24, flip: true }, { id: "bear", x: 22, y: 68, size: 26 }, { id: "pup", x: 80, y: 68, size: 30, flip: true }, { id: "drop", x: 62, y: 76, size: 8 }] }],
      ["There was room for everyone!", { sky: RAIN, ground: "#6fb56a", items: [{ id: "umbrella", x: 50, y: 30, size: 66 }, { id: "bear", x: 24, y: 70, size: 26 }, { id: "bunny", x: 46, y: 72, size: 22 }, { id: "pup", x: 68, y: 72, size: 24, flip: true }, { id: "bird", x: 86, y: 70, size: 16, flip: true }] }],
      ["Then the sun peeked out. Hooray!", { sky: DAY, ground: GRASS, items: [{ id: "sun", x: 76, y: 22, size: 32 }, { id: "umbrella", x: 24, y: 58, size: 26, tilt: -20 }, { id: "bear", x: 34, y: 70, size: 22 }, { id: "bunny", x: 52, y: 72, size: 20 }, { id: "pup", x: 70, y: 72, size: 22, flip: true }, { id: "flower", x: 88, y: 78, size: 14 }] }],
    ]),
  },
  {
    id: "bears-birthday",
    title: "Bear's Birthday Cake",
    emoji: "🎂",
    illo: "cake",
    color: "#ff6b9d",
    dark: "#d6336c",
    pages: pages("bday", [
      ["It was Bear’s birthday!", { sky: DAY, ground: GRASS, items: [{ id: "bear", x: 50, y: 62, size: 40 }, { id: "balloon", x: 20, y: 30, size: 20 }, { id: "balloon", x: 80, y: 28, size: 20 }, { id: "star", x: 50, y: 16, size: 12 }] }],
      ["Bunny baked a yummy cake.", { sky: DAY, ground: GRASS, items: [{ id: "bunny", x: 32, y: 64, size: 34 }, { id: "cake", x: 68, y: 62, size: 36 }] }],
      ["Bird hung up the balloons.", { sky: DAY, ground: GRASS, items: [{ id: "bird", x: 50, y: 56, size: 26 }, { id: "balloon", x: 22, y: 30, size: 22 }, { id: "balloon", x: 50, y: 22, size: 22 }, { id: "balloon", x: 78, y: 30, size: 22 }] }],
      ["Pup brought a bone for the party.", { sky: DAY, ground: GRASS, items: [{ id: "pup", x: 38, y: 64, size: 34 }, { id: "bone", x: 68, y: 66, size: 26, tilt: -15 }, { id: "heart", x: 52, y: 30, size: 12 }] }],
      ["One, two, three... Happy Birthday, Bear!", { sky: DAY, ground: GRASS, items: [{ id: "cake", x: 50, y: 56, size: 42 }, { id: "bear", x: 20, y: 68, size: 26 }, { id: "bunny", x: 80, y: 68, size: 24, flip: true }, { id: "balloon", x: 14, y: 26, size: 18 }, { id: "balloon", x: 86, y: 26, size: 18 }] }],
      ["Everyone shared the cake. Yum!", { sky: ["#ffd9e8", "#fff0f6"], ground: GRASS, items: [{ id: "bear", x: 22, y: 66, size: 28 }, { id: "bunny", x: 42, y: 70, size: 24 }, { id: "pup", x: 62, y: 70, size: 26, flip: true }, { id: "bird", x: 82, y: 70, size: 18, flip: true }, { id: "heart", x: 50, y: 28, size: 14 }, { id: "star", x: 74, y: 24, size: 12 }] }],
    ]),
  },
];
