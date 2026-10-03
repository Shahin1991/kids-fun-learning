import type { FactCategory } from "./facts";

export const SCIENCE: FactCategory[] = [
  {
    id: "space",
    label: "Space",
    icon: "🚀",
    items: [
      { id: "sun", label: "Sun", emoji: "☀️", fact: "The Sun is a star. It gives us light and warmth." },
      { id: "earth", label: "Earth", emoji: "🌍", fact: "Earth is our home planet. Most of it is covered in water." },
      { id: "moon", label: "Moon", emoji: "🌙", fact: "The Moon goes around the Earth." },
      { id: "mars", label: "Mars", emoji: "🔴", fact: "Mars is called the red planet." },
      { id: "saturn", label: "Saturn", emoji: "🪐", fact: "Saturn has beautiful rings." },
      { id: "comet", label: "Comet", emoji: "☄️", fact: "A comet has a glowing tail made of ice and dust." },
      { id: "rocket", label: "Rocket", emoji: "🚀", fact: "Rockets carry astronauts into space." },
      { id: "star", label: "Stars", emoji: "⭐", fact: "Stars are far away suns that twinkle at night." },
    ],
  },
  {
    id: "plants",
    label: "Plants",
    icon: "🌱",
    items: [
      { id: "seed", label: "Seed", emoji: "🌰", fact: "Every plant begins as a tiny seed." },
      { id: "sprout", label: "Sprout", emoji: "🌱", fact: "A seed grows a sprout when it has water and light." },
      { id: "sunflower", label: "Sunflower", emoji: "🌻", fact: "Sunflowers turn their faces toward the sun." },
      { id: "tree", label: "Tree", emoji: "🌳", fact: "Trees give us shade, fruit and fresh air." },
      { id: "cactus", label: "Cactus", emoji: "🌵", fact: "A cactus stores water so it can live in the desert." },
      { id: "mushroom", label: "Mushroom", emoji: "🍄", fact: "Mushrooms are fungi, not plants!" },
      { id: "tomato", label: "Tomato", emoji: "🍅", fact: "Tomatoes grow on a vine and are really a fruit." },
    ],
  },
  {
    id: "weather",
    label: "Weather",
    icon: "⛅",
    items: [
      { id: "sunny", label: "Sunny", emoji: "☀️", fact: "On sunny days the sky is bright and warm." },
      { id: "rain", label: "Rain", emoji: "🌧️", fact: "Rain falls from clouds and helps plants grow." },
      { id: "storm", label: "Storm", emoji: "⛈️", fact: "Thunder is the sound lightning makes." },
      { id: "snow", label: "Snow", emoji: "❄️", fact: "Snow is frozen water. Every snowflake is different." },
      { id: "rainbow", label: "Rainbow", emoji: "🌈", fact: "A rainbow appears when sun shines through rain." },
      { id: "wind", label: "Wind", emoji: "💨", fact: "Wind is moving air. It can fly a kite." },
      { id: "fog", label: "Fog", emoji: "🌫️", fact: "Fog is a cloud close to the ground." },
    ],
  },
];
