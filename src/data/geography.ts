import type { FactCategory } from "./facts";

export const GEOGRAPHY: FactCategory[] = [
  {
    id: "flags",
    label: "Flags",
    icon: "🏳️",
    items: [
      { id: "us", label: "United States", emoji: "🇺🇸", fact: "The flag has 50 stars, one for each state." },
      { id: "gb", label: "United Kingdom", emoji: "🇬🇧", fact: "This flag is called the Union Jack." },
      { id: "fr", label: "France", emoji: "🇫🇷", fact: "The French flag has three stripes: blue, white and red." },
      { id: "de", label: "Germany", emoji: "🇩🇪", fact: "The German flag is black, red and gold." },
      { id: "it", label: "Italy", emoji: "🇮🇹", fact: "Italy's flag is green, white and red." },
      { id: "jp", label: "Japan", emoji: "🇯🇵", fact: "Japan's flag shows a red sun on white." },
      { id: "cn", label: "China", emoji: "🇨🇳", fact: "China's flag is red with five yellow stars." },
      { id: "in", label: "India", emoji: "🇮🇳", fact: "India's flag has a blue wheel in the middle." },
      { id: "br", label: "Brazil", emoji: "🇧🇷", fact: "Brazil's flag has a blue globe inside a yellow diamond." },
      { id: "ca", label: "Canada", emoji: "🇨🇦", fact: "Canada's flag has a red maple leaf." },
      { id: "au", label: "Australia", emoji: "🇦🇺", fact: "Australia's flag has the Southern Cross stars." },
      { id: "eg", label: "Egypt", emoji: "🇪🇬", fact: "Egypt's flag has a golden eagle in the middle." },
    ],
  },
  {
    id: "countries",
    label: "Countries",
    icon: "🗺️",
    items: [
      { id: "france", label: "France", emoji: "🗼", fact: "France is in Europe. Its capital is Paris, home of the Eiffel Tower." },
      { id: "egypt", label: "Egypt", emoji: "🔺", fact: "Egypt is in Africa. It has the famous pyramids." },
      { id: "japan", label: "Japan", emoji: "🗻", fact: "Japan is in Asia. Mount Fuji is its tallest mountain." },
      { id: "india", label: "India", emoji: "🕌", fact: "India is in Asia. The Taj Mahal is there." },
      { id: "brazil", label: "Brazil", emoji: "🦜", fact: "Brazil is in South America. It has the huge Amazon rainforest." },
      { id: "australia", label: "Australia", emoji: "🦘", fact: "Australia is a country and a continent. Kangaroos live there." },
      { id: "italy", label: "Italy", emoji: "🍕", fact: "Italy is in Europe. Pizza comes from there." },
      { id: "kenya", label: "Kenya", emoji: "🦒", fact: "Kenya is in Africa. Giraffes and lions roam its plains." },
    ],
  },
  {
    id: "continents",
    label: "Continents",
    icon: "🌍",
    items: [
      { id: "africa", label: "Africa", emoji: "🦁", fact: "Africa has the Sahara desert and the Nile river." },
      { id: "asia", label: "Asia", emoji: "🐼", fact: "Asia is the biggest continent." },
      { id: "europe", label: "Europe", emoji: "🏰", fact: "Europe has many countries close together." },
      { id: "north-america", label: "North America", emoji: "🦅", fact: "North America includes Canada, the USA and Mexico." },
      { id: "south-america", label: "South America", emoji: "🦙", fact: "South America has the Amazon rainforest and the Andes." },
      { id: "oceania", label: "Oceania", emoji: "🐨", fact: "Oceania has Australia and many islands." },
      { id: "antarctica", label: "Antarctica", emoji: "🐧", fact: "Antarctica is the coldest place. Penguins live there." },
    ],
  },
];
