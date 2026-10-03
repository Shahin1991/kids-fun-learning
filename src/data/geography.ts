import type { FactCategory } from "./facts";

export const GEOGRAPHY: FactCategory[] = [
  {
    id: "flags",
    label: "Flags",
    icon: "🏳️",
    items: [
      { id: "us", art: "/art/flags/us.svg", label: "United States", emoji: "🇺🇸", fact: "The flag has 50 stars, one for each state." },
      { id: "gb", art: "/art/flags/gb.svg", label: "United Kingdom", emoji: "🇬🇧", fact: "This flag is called the Union Jack." },
      { id: "fr", art: "/art/flags/fr.svg", label: "France", emoji: "🇫🇷", fact: "The French flag has three stripes: blue, white and red." },
      { id: "de", art: "/art/flags/de.svg", label: "Germany", emoji: "🇩🇪", fact: "The German flag is black, red and gold." },
      { id: "it", art: "/art/flags/it.svg", label: "Italy", emoji: "🇮🇹", fact: "Italy's flag is green, white and red." },
      { id: "jp", art: "/art/flags/jp.svg", label: "Japan", emoji: "🇯🇵", fact: "Japan's flag shows a red sun on white." },
      { id: "cn", art: "/art/flags/cn.svg", label: "China", emoji: "🇨🇳", fact: "China's flag is red with five yellow stars." },
      { id: "in", art: "/art/flags/in.svg", label: "India", emoji: "🇮🇳", fact: "India's flag has a blue wheel in the middle." },
      { id: "br", art: "/art/flags/br.svg", label: "Brazil", emoji: "🇧🇷", fact: "Brazil's flag has a blue globe inside a yellow diamond." },
      { id: "ca", art: "/art/flags/ca.svg", label: "Canada", emoji: "🇨🇦", fact: "Canada's flag has a red maple leaf." },
      { id: "au", art: "/art/flags/au.svg", label: "Australia", emoji: "🇦🇺", fact: "Australia's flag has the Southern Cross stars." },
      { id: "eg", art: "/art/flags/eg.svg", label: "Egypt", emoji: "🇪🇬", fact: "Egypt's flag has a golden eagle in the middle." },
    ],
  },
  {
    id: "countries",
    label: "Countries",
    icon: "🗺️",
    items: [
      { id: "france", art: "/art/countries/france.svg", label: "France", emoji: "🗼", fact: "France is in Europe. Its capital is Paris, home of the Eiffel Tower." },
      { id: "egypt", art: "/art/countries/egypt.svg", label: "Egypt", emoji: "🏜️", fact: "Egypt is in Africa. It has the famous pyramids." },
      { id: "japan", art: "/art/countries/japan.svg", label: "Japan", emoji: "🗻", fact: "Japan is in Asia. Mount Fuji is its tallest mountain." },
      { id: "india", art: "/art/countries/india.svg", label: "India", emoji: "🕌", fact: "India is in Asia. The Taj Mahal is there." },
      { id: "brazil", art: "/art/countries/brazil.svg", label: "Brazil", emoji: "🦜", fact: "Brazil is in South America. It has the huge Amazon rainforest." },
      { id: "australia", art: "/art/countries/australia.svg", label: "Australia", emoji: "🦘", fact: "Australia is a country and a continent. Kangaroos live there." },
      { id: "italy", art: "/art/countries/italy.svg", label: "Italy", emoji: "🍕", fact: "Italy is in Europe. Pizza comes from there." },
      { id: "kenya", art: "/art/countries/kenya.svg", label: "Kenya", emoji: "🦒", fact: "Kenya is in Africa. Giraffes and lions roam its plains." },
    ],
  },
  {
    id: "continents",
    label: "Continents",
    icon: "🌍",
    items: [
      { id: "africa", art: "/art/continents/africa.svg", label: "Africa", emoji: "🦁", fact: "Africa has the Sahara desert and the Nile river." },
      { id: "asia", art: "/art/continents/asia.svg", label: "Asia", emoji: "🐼", fact: "Asia is the biggest continent." },
      { id: "europe", art: "/art/continents/europe.svg", label: "Europe", emoji: "🏰", fact: "Europe has many countries close together." },
      { id: "north-america", art: "/art/continents/north-america.svg", label: "North America", emoji: "🦅", fact: "North America includes Canada, the USA and Mexico." },
      { id: "south-america", art: "/art/continents/south-america.svg", label: "South America", emoji: "🦙", fact: "South America has the Amazon rainforest and the Andes." },
      { id: "oceania", art: "/art/continents/oceania.svg", label: "Oceania", emoji: "🐨", fact: "Oceania has Australia and many islands." },
      { id: "antarctica", art: "/art/continents/antarctica.svg", label: "Antarctica", emoji: "🐧", fact: "Antarctica is the coldest place. Penguins live there." },
    ],
  },
];
