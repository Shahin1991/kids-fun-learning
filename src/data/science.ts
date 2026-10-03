import type { FactCategory } from "./facts";

export const SCIENCE: FactCategory[] = [
  {
    id: "space",
    label: "Space",
    icon: "🚀",
    items: [
      { id: "sun", art: "/art/space/sun.svg", label: "Sun", emoji: "☀️", fact: "The Sun is a star. It gives us light and warmth." },
      { id: "earth", art: "/art/space/earth.svg", label: "Earth", emoji: "🌍", fact: "Earth is our home planet. Most of it is covered in water." },
      { id: "moon", art: "/art/space/moon.svg", label: "Moon", emoji: "🌙", fact: "The Moon goes around the Earth." },
      { id: "mars", art: "/art/space/mars.svg", label: "Mars", emoji: "🔴", fact: "Mars is called the red planet." },
      { id: "saturn", art: "/art/space/saturn.svg", label: "Saturn", emoji: "🪐", fact: "Saturn has beautiful rings." },
      { id: "comet", art: "/art/space/comet.svg", label: "Comet", emoji: "☄️", fact: "A comet has a glowing tail made of ice and dust." },
      { id: "rocket", art: "/art/space/rocket.svg", label: "Rocket", emoji: "🚀", fact: "Rockets carry astronauts into space." },
      { id: "star", art: "/art/space/star.svg", label: "Stars", emoji: "⭐", fact: "Stars are far away suns that twinkle at night." },
    ],
  },
  {
    id: "plants",
    label: "Plants",
    icon: "🌱",
    items: [
      { id: "seed", art: "/art/plants/seed.svg", label: "Seed", emoji: "🌰", fact: "Every plant begins as a tiny seed." },
      { id: "sprout", art: "/art/plants/sprout.svg", label: "Sprout", emoji: "🌱", fact: "A seed grows a sprout when it has water and light." },
      { id: "sunflower", art: "/art/plants/sunflower.svg", label: "Sunflower", emoji: "🌻", fact: "Sunflowers turn their faces toward the sun." },
      { id: "tree", art: "/art/plants/tree.svg", label: "Tree", emoji: "🌳", fact: "Trees give us shade, fruit and fresh air." },
      { id: "cactus", art: "/art/plants/cactus.svg", label: "Cactus", emoji: "🌵", fact: "A cactus stores water so it can live in the desert." },
      { id: "mushroom", art: "/art/plants/mushroom.svg", label: "Mushroom", emoji: "🍄", fact: "Mushrooms are fungi, not plants!" },
      { id: "tomato", art: "/art/plants/tomato.svg", label: "Tomato", emoji: "🍅", fact: "Tomatoes grow on a vine and are really a fruit." },
    ],
  },
  {
    id: "weather",
    label: "Weather",
    icon: "⛅",
    items: [
      { id: "sunny", art: "/art/weather/sunny.svg", label: "Sunny", emoji: "☀️", fact: "On sunny days the sky is bright and warm." },
      { id: "rain", art: "/art/weather/rain.svg", label: "Rain", emoji: "🌧️", fact: "Rain falls from clouds and helps plants grow." },
      { id: "storm", art: "/art/weather/storm.svg", label: "Storm", emoji: "⛈️", fact: "Thunder is the sound lightning makes." },
      { id: "snow", art: "/art/weather/snow.svg", label: "Snow", emoji: "❄️", fact: "Snow is frozen water. Every snowflake is different." },
      { id: "rainbow", art: "/art/weather/rainbow.svg", label: "Rainbow", emoji: "🌈", fact: "A rainbow appears when sun shines through rain." },
      { id: "wind", art: "/art/weather/wind.svg", label: "Wind", emoji: "💨", fact: "Wind is moving air. It can fly a kite." },
      { id: "fog", art: "/art/weather/fog.svg", label: "Fog", emoji: "🌫️", fact: "Fog is a cloud close to the ground." },
    ],
  },
];
