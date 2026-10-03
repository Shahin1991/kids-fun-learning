export type BubbleMode = "colors" | "shapes" | "letters" | "numbers";

export interface BubbleItem {
  id: string;
  /** What is spoken and shown in the prompt */
  name: string;
  /** What appears in the bubble */
  face: string;
  color?: string;
}

export const BUBBLE_MODES: { id: BubbleMode; label: string; icon: string }[] = [
  { id: "colors", label: "Colors", icon: "🎨" },
  { id: "shapes", label: "Shapes", icon: "🔺" },
  { id: "letters", label: "Letters", icon: "🔤" },
  { id: "numbers", label: "Numbers", icon: "🔢" },
];

export const BUBBLE_ITEMS: Record<BubbleMode, BubbleItem[]> = {
  colors: [
    { id: "red", name: "red", face: "", color: "#ff6b6b" },
    { id: "blue", name: "blue", face: "", color: "#4d96ff" },
    { id: "green", name: "green", face: "", color: "#6bcb77" },
    { id: "yellow", name: "yellow", face: "", color: "#ffd93d" },
    { id: "purple", name: "purple", face: "", color: "#9b51e0" },
  ],
  shapes: [
    { id: "circle", name: "circle", face: "⚪" },
    { id: "square", name: "square", face: "⬜" },
    { id: "triangle", name: "triangle", face: "🔺" },
    { id: "star", name: "star", face: "⭐" },
    { id: "heart", name: "heart", face: "❤️" },
  ],
  letters: "ABCDEFGHIJ".split("").map((l) => ({ id: l, name: l, face: l })),
  numbers: "1 2 3 4 5 6 7 8 9 10".split(" ").map((n) => ({ id: n, name: n, face: n })),
};
