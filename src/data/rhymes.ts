export interface RhymeWord {
  word: string;
  emoji: string;
}

/** Rhyme families: every word in a family rhymes with the others, and with no word in any other family. */
export const RHYME_FAMILIES: RhymeWord[][] = [
  [{ word: "cat", emoji: "🐱" }, { word: "hat", emoji: "🎩" }, { word: "bat", emoji: "🦇" }],
  [{ word: "dog", emoji: "🐶" }, { word: "frog", emoji: "🐸" }, { word: "log", emoji: "🪵" }],
  [{ word: "cake", emoji: "🎂" }, { word: "snake", emoji: "🐍" }],
  [{ word: "bee", emoji: "🐝" }, { word: "tree", emoji: "🌳" }, { word: "key", emoji: "🔑" }],
  [{ word: "star", emoji: "⭐" }, { word: "car", emoji: "🚗" }, { word: "jar", emoji: "🫙" }],
  [{ word: "moon", emoji: "🌙" }, { word: "spoon", emoji: "🥄" }],
  [{ word: "mouse", emoji: "🐭" }, { word: "house", emoji: "🏠" }],
  [{ word: "goat", emoji: "🐐" }, { word: "boat", emoji: "⛵" }, { word: "coat", emoji: "🧥" }],
  [{ word: "bear", emoji: "🐻" }, { word: "pear", emoji: "🍐" }, { word: "chair", emoji: "🪑" }],
  [{ word: "fox", emoji: "🦊" }, { word: "box", emoji: "📦" }, { word: "socks", emoji: "🧦" }],
  [{ word: "bug", emoji: "🐛" }, { word: "mug", emoji: "☕" }],
  [{ word: "fish", emoji: "🐟" }, { word: "dish", emoji: "🍽️" }],
  [{ word: "king", emoji: "🤴" }, { word: "ring", emoji: "💍" }],
  [{ word: "clock", emoji: "🕐" }, { word: "rock", emoji: "🪨" }, { word: "lock", emoji: "🔒" }],
  [{ word: "bell", emoji: "🔔" }, { word: "shell", emoji: "🐚" }],
  [{ word: "bed", emoji: "🛏️" }, { word: "bread", emoji: "🍞" }],
  [{ word: "hen", emoji: "🐔" }, { word: "pen", emoji: "🖊️" }, { word: "ten", emoji: "🔟" }],
  [{ word: "nose", emoji: "👃" }, { word: "rose", emoji: "🌹" }],
  [{ word: "train", emoji: "🚂" }, { word: "rain", emoji: "🌧️" }, { word: "plane", emoji: "✈️" }],
  [{ word: "whale", emoji: "🐳" }, { word: "snail", emoji: "🐌" }, { word: "pail", emoji: "🪣" }],
  [{ word: "kite", emoji: "🪁" }, { word: "light", emoji: "💡" }],
  [{ word: "ball", emoji: "⚽" }, { word: "wall", emoji: "🧱" }],
  [{ word: "pig", emoji: "🐷" }, { word: "wig", emoji: "💇" }],
  [{ word: "sun", emoji: "☀️" }, { word: "bun", emoji: "🥯" }],
];
