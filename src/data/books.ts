import { ALPHABET } from "./alphabet";
import { ANIMALS } from "./animals";
import { COLORS } from "./colors";
import { COUNT_OBJECTS } from "./numbers";
import { SHAPES } from "./shapes";

/** One page of a picture book. Only the fields a page needs are set. */
export interface BookPage {
  id: string;
  /** Paper tint */
  bg: string;
  /** Accent colour for the big text */
  fg: string;
  /** Huge heading: a letter pair, a number... */
  big?: string;
  emoji?: string;
  /** Show the emoji this many times (counting pages) */
  count?: number;
  art?: string;
  swatch?: string;
  shapePath?: string;
  caption: string;
  /** Read aloud when the page opens or is tapped */
  say: string;
}

export interface BookDef {
  id: string;
  title: string;
  emoji: string;
  /** Cover and spine colour */
  color: string;
  dark: string;
  pages: BookPage[];
}

const TINTS = ["#fff1c9", "#ffe0ea", "#d9f0ff", "#dcf6d3", "#eadcff", "#ffe5cc"];
const ACCENTS = ["#e67e00", "#d6336c", "#1971c2", "#2f9e44", "#7048e8", "#e8590c"];
const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

const END_PAGE: BookPage = { id: "end", bg: "#fff3b0", fg: "#e67e00", big: "The End", emoji: "🎉", caption: "Great reading!", say: "The end! Great reading!" };

export const BOOKS: BookDef[] = [
  {
    id: "abc",
    title: "ABC Book",
    emoji: "🔤",
    color: "#4d96ff",
    dark: "#2b6fd6",
    pages: [
      ...ALPHABET.map((a, i) => ({
        id: a.letter,
        bg: TINTS[i % TINTS.length],
        fg: ACCENTS[i % ACCENTS.length],
        big: `${a.letter}${a.letter.toLowerCase()}`,
        emoji: a.emoji,
        caption: `${a.letter} is for ${a.word}`,
        say: `${a.letter}. ${a.letter} is for ${a.word}!`,
      })),
      END_PAGE,
    ],
  },
  {
    id: "numbers",
    title: "Counting Book",
    emoji: "🔢",
    color: "#6bcb77",
    dark: "#3d9d4b",
    pages: [
      ...Array.from({ length: 10 }, (_, k) => {
        const n = k + 1;
        return { id: String(n), bg: TINTS[k % TINTS.length], fg: ACCENTS[k % ACCENTS.length], big: String(n), emoji: COUNT_OBJECTS[k % COUNT_OBJECTS.length], count: n, caption: NUMBER_WORDS[n], say: `${n}. ${NUMBER_WORDS[n]}!` } as BookPage;
      }),
      END_PAGE,
    ],
  },
  {
    id: "animals",
    title: "Animal Friends",
    emoji: "🐶",
    color: "#ff9f43",
    dark: "#d97a14",
    pages: [
      ...ANIMALS.map((a, i) => ({ id: a.id, bg: TINTS[i % TINTS.length], fg: ACCENTS[i % ACCENTS.length], emoji: a.emoji, art: a.art, caption: a.label, say: `${a.label}. ${a.phrase}` })),
      END_PAGE,
    ],
  },
  {
    id: "colors",
    title: "Colour Book",
    emoji: "🎨",
    color: "#ff6b6b",
    dark: "#d64545",
    pages: [
      ...COLORS.map((c, i) => ({ id: c.id, bg: TINTS[i % TINTS.length], fg: c.color ?? ACCENTS[i % ACCENTS.length], swatch: c.color, caption: c.label, say: `${c.label}. ${c.phrase}` })),
      END_PAGE,
    ],
  },
  {
    id: "shapes",
    title: "Shape Book",
    emoji: "🔺",
    color: "#9b51e0",
    dark: "#7632b8",
    pages: [
      ...SHAPES.map((s, i) => ({ id: s.id, bg: TINTS[i % TINTS.length], fg: s.color, shapePath: s.path, swatch: s.color, caption: s.label, say: `This is a ${s.label}!` })),
      END_PAGE,
    ],
  },
];

export const getBook = (id: string) => BOOKS.find((b) => b.id === id);
