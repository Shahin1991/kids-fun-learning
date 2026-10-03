export interface TapItem {
  id: string;
  label: string;
  emoji: string;
  /** Spoken after the name */
  phrase: string;
  /** Pentatonic step 0-9 so each item has its own pitch */
  color?: string;
}

export const ANIMALS: TapItem[] = [
  { id: "dog", label: "Dog", emoji: "🐶", phrase: "Woof woof!" },
  { id: "cat", label: "Cat", emoji: "🐱", phrase: "Meow meow!" },
  { id: "cow", label: "Cow", emoji: "🐮", phrase: "Moo moo!" },
  { id: "duck", label: "Duck", emoji: "🦆", phrase: "Quack quack!" },
  { id: "pig", label: "Pig", emoji: "🐷", phrase: "Oink oink!" },
  { id: "sheep", label: "Sheep", emoji: "🐑", phrase: "Baa baa!" },
  { id: "lion", label: "Lion", emoji: "🦁", phrase: "Roar!" },
  { id: "frog", label: "Frog", emoji: "🐸", phrase: "Ribbit ribbit!" },
  { id: "horse", label: "Horse", emoji: "🐴", phrase: "Neigh!" },
  { id: "chick", label: "Chick", emoji: "🐥", phrase: "Cheep cheep!" },
];
