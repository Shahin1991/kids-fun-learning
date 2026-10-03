export interface TapItem {
  id: string;
  label: string;
  emoji: string;
  /** Spoken after the name */
  phrase: string;
  /** Pentatonic step 0-9 so each item has its own pitch */
  color?: string;
  /** Illustration path under /public; emoji is the fallback */
  art?: string;
}

export const ANIMALS: TapItem[] = [
  { id: "dog", art: "/art/animals/dog.svg", label: "Dog", emoji: "🐶", phrase: "Woof woof!" },
  { id: "cat", art: "/art/animals/cat.svg", label: "Cat", emoji: "🐱", phrase: "Meow meow!" },
  { id: "cow", art: "/art/animals/cow.svg", label: "Cow", emoji: "🐮", phrase: "Moo moo!" },
  { id: "duck", art: "/art/animals/duck.svg", label: "Duck", emoji: "🦆", phrase: "Quack quack!" },
  { id: "pig", art: "/art/animals/pig.svg", label: "Pig", emoji: "🐷", phrase: "Oink oink!" },
  { id: "sheep", art: "/art/animals/sheep.svg", label: "Sheep", emoji: "🐑", phrase: "Baa baa!" },
  { id: "lion", art: "/art/animals/lion.svg", label: "Lion", emoji: "🦁", phrase: "Roar!" },
  { id: "frog", art: "/art/animals/frog.svg", label: "Frog", emoji: "🐸", phrase: "Ribbit ribbit!" },
  { id: "horse", art: "/art/animals/horse.svg", label: "Horse", emoji: "🐴", phrase: "Neigh!" },
  { id: "chick", art: "/art/animals/chick.svg", label: "Chick", emoji: "🐥", phrase: "Cheep cheep!" },
];
