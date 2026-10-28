/**
 * Hindi (Devanagari) and Arabic letters and numbers for "Hindi & Arabic".
 * Hindi follows the CBSE Class 1 varnamala with the classic "क से कबूतर" chant; Arabic uses isolated
 * letter forms. `sound` is the letter spelled for an English voice, used when the device has no
 * Hindi or Arabic voice.
 */

export type Script = "hindi" | "arabic";
export type LetterGroup = "vowels" | "consonants" | "letters" | "numbers";

export interface PictureWord {
  text: string;
  /** For the English voice and the caption, e.g. "kabootar" */
  roman: string;
  meaning: string;
  emoji: string;
}

export interface WorldLetter {
  char: string;
  sound: string;
  /** Arabic letter name in Arabic, so an Arabic voice says "baa" and not just a sound */
  name?: string;
  word?: PictureWord;
  /** Numbers only */
  value?: number;
}

export interface ScriptInfo {
  id: Script;
  lang: "hi" | "ar";
  label: string;
  /** The script's own name on its button */
  native: string;
  rtl: boolean;
  groups: { id: LetterGroup; label: string; letters: WorldLetter[] }[];
}

const w = (text: string, roman: string, meaning: string, emoji: string): PictureWord => ({ text, roman, meaning, emoji });

const HINDI_VOWELS: WorldLetter[] = [
  { char: "अ", sound: "uh", word: w("अनानास", "ananaas", "pineapple", "🍍") },
  { char: "आ", sound: "aa", word: w("आम", "aam", "mango", "🥭") },
  { char: "इ", sound: "ih", word: w("इंजन", "injan", "engine", "🚂") },
  { char: "ई", sound: "ee", word: w("ईंट", "eent", "brick", "🧱") },
  { char: "उ", sound: "oo", word: w("उल्लू", "ullu", "owl", "🦉") },
  { char: "ऊ", sound: "ooo", word: w("ऊन", "oon", "wool", "🧶") },
  { char: "ऋ", sound: "ri", word: w("ऋषि", "rishi", "wise man", "🧘") },
  { char: "ए", sound: "ay", word: w("एक", "ek", "one", "1️⃣") },
  { char: "ऐ", sound: "ai", word: w("ऐनक", "ainak", "glasses", "👓") },
  { char: "ओ", sound: "oh", word: w("ओस", "os", "dew", "💧") },
  { char: "औ", sound: "aw", word: w("औरत", "aurat", "woman", "👩") },
  { char: "अं", sound: "ung", word: w("अंगूर", "angoor", "grapes", "🍇") },
  { char: "अः", sound: "uh-ha" },
];

const HINDI_CONSONANTS: WorldLetter[] = [
  { char: "क", sound: "ka", word: w("कबूतर", "kabootar", "pigeon", "🕊️") },
  { char: "ख", sound: "kha", word: w("खरगोश", "khargosh", "rabbit", "🐇") },
  { char: "ग", sound: "ga", word: w("गमला", "gamla", "flower pot", "🪴") },
  { char: "घ", sound: "gha", word: w("घर", "ghar", "house", "🏠") },
  { char: "ङ", sound: "nga" },
  { char: "च", sound: "cha", word: w("चम्मच", "chammach", "spoon", "🥄") },
  { char: "छ", sound: "chha", word: w("छतरी", "chhatri", "umbrella", "☂️") },
  { char: "ज", sound: "ja", word: w("जहाज़", "jahaaz", "ship", "🚢") },
  { char: "झ", sound: "jha", word: w("झंडा", "jhanda", "flag", "🚩") },
  { char: "ञ", sound: "nya" },
  { char: "ट", sound: "ta", word: w("टमाटर", "tamaatar", "tomato", "🍅") },
  { char: "ठ", sound: "tha", word: w("ठेला", "thela", "cart", "🛒") },
  { char: "ड", sound: "da", word: w("डमरू", "damroo", "little drum", "🪘") },
  { char: "ढ", sound: "dha", word: w("ढोल", "dhol", "drum", "🥁") },
  { char: "ण", sound: "na" },
  { char: "त", sound: "ta", word: w("तरबूज़", "tarbooz", "watermelon", "🍉") },
  { char: "थ", sound: "tha", word: w("थाली", "thaali", "plate", "🍽️") },
  { char: "द", sound: "da", word: w("दाँत", "daant", "tooth", "🦷") },
  { char: "ध", sound: "dha", word: w("धनुष", "dhanush", "bow", "🏹") },
  { char: "न", sound: "na", word: w("नल", "nal", "tap", "🚰") },
  { char: "प", sound: "pa", word: w("पतंग", "patang", "kite", "🪁") },
  { char: "फ", sound: "pha", word: w("फूल", "phool", "flower", "🌸") },
  { char: "ब", sound: "ba", word: w("बत्तख", "battakh", "duck", "🦆") },
  { char: "भ", sound: "bha", word: w("भालू", "bhaaloo", "bear", "🐻") },
  { char: "म", sound: "ma", word: w("मछली", "machhli", "fish", "🐟") },
  { char: "य", sound: "ya", word: w("यो-यो", "yo-yo", "yo-yo", "🪀") },
  { char: "र", sound: "ra", word: w("रेल", "rail", "train", "🚆") },
  { char: "ल", sound: "la", word: w("लड़की", "ladki", "girl", "👧") },
  { char: "व", sound: "va", word: w("वन", "van", "forest", "🌲") },
  { char: "श", sound: "sha", word: w("शेर", "sher", "lion", "🦁") },
  { char: "ष", sound: "sha", word: w("षट्कोण", "shatkon", "hexagon", "⬢") },
  { char: "स", sound: "sa", word: w("सेब", "seb", "apple", "🍎") },
  { char: "ह", sound: "ha", word: w("हाथी", "haathi", "elephant", "🐘") },
  { char: "क्ष", sound: "ksha", word: w("क्षत्रिय", "kshatriya", "warrior", "🛡️") },
  { char: "त्र", sound: "tra", word: w("त्रिशूल", "trishool", "trident", "🔱") },
  { char: "ज्ञ", sound: "gya", word: w("ज्ञानी", "gyaani", "wise teacher", "🧑‍🏫") },
];

const HINDI_NUMBERS: WorldLetter[] = [
  ["१", "एक", "ek"],
  ["२", "दो", "do"],
  ["३", "तीन", "teen"],
  ["४", "चार", "chaar"],
  ["५", "पाँच", "paanch"],
  ["६", "छह", "chheh"],
  ["७", "सात", "saat"],
  ["८", "आठ", "aath"],
  ["९", "नौ", "nau"],
  ["१०", "दस", "das"],
].map(([char, text, roman], i) => ({ char, sound: roman, value: i + 1, word: w(text, roman, String(i + 1), "") }));

const ARABIC_LETTERS: WorldLetter[] = [
  { char: "ا", sound: "alif", name: "ألف", word: w("أرنب", "arnab", "rabbit", "🐇") },
  { char: "ب", sound: "baa", name: "باء", word: w("بطة", "batta", "duck", "🦆") },
  { char: "ت", sound: "taa", name: "تاء", word: w("تفاحة", "tuffaaha", "apple", "🍎") },
  { char: "ث", sound: "thaa", name: "ثاء", word: w("ثعلب", "thalab", "fox", "🦊") },
  { char: "ج", sound: "jeem", name: "جيم", word: w("جمل", "jamal", "camel", "🐫") },
  { char: "ح", sound: "hah", name: "حاء", word: w("حصان", "hisaan", "horse", "🐴") },
  { char: "خ", sound: "khaa", name: "خاء", word: w("خروف", "kharoof", "sheep", "🐑") },
  { char: "د", sound: "daal", name: "دال", word: w("دب", "dubb", "bear", "🐻") },
  { char: "ذ", sound: "dhaal", name: "ذال", word: w("ذرة", "dhura", "corn", "🌽") },
  { char: "ر", sound: "raa", name: "راء", word: w("ريشة", "reesha", "feather", "🪶") },
  { char: "ز", sound: "zay", name: "زاي", word: w("زرافة", "zaraafa", "giraffe", "🦒") },
  { char: "س", sound: "seen", name: "سين", word: w("سمكة", "samaka", "fish", "🐟") },
  { char: "ش", sound: "sheen", name: "شين", word: w("شمس", "shams", "sun", "☀️") },
  { char: "ص", sound: "saad", name: "صاد", word: w("صقر", "saqr", "falcon", "🦅") },
  { char: "ض", sound: "daad", name: "ضاد", word: w("ضفدع", "difda", "frog", "🐸") },
  { char: "ط", sound: "tah", name: "طاء", word: w("طائرة", "taa-ira", "aeroplane", "✈️") },
  { char: "ظ", sound: "dhah", name: "ظاء", word: w("ظرف", "dharf", "envelope", "✉️") },
  { char: "ع", sound: "ayn", name: "عين", word: w("عنب", "inab", "grapes", "🍇") },
  { char: "غ", sound: "ghayn", name: "غين", word: w("غيمة", "ghayma", "cloud", "☁️") },
  { char: "ف", sound: "faa", name: "فاء", word: w("فيل", "feel", "elephant", "🐘") },
  { char: "ق", sound: "qaaf", name: "قاف", word: w("قمر", "qamar", "moon", "🌙") },
  { char: "ك", sound: "kaaf", name: "كاف", word: w("كلب", "kalb", "dog", "🐶") },
  { char: "ل", sound: "laam", name: "لام", word: w("ليمون", "laymoon", "lemon", "🍋") },
  { char: "م", sound: "meem", name: "ميم", word: w("موز", "mawz", "banana", "🍌") },
  { char: "ن", sound: "noon", name: "نون", word: w("نحلة", "nahla", "bee", "🐝") },
  { char: "ه", sound: "haa", name: "هاء", word: w("هدية", "hadiyya", "present", "🎁") },
  { char: "و", sound: "waaw", name: "واو", word: w("وردة", "warda", "rose", "🌹") },
  { char: "ي", sound: "yaa", name: "ياء", word: w("يد", "yad", "hand", "✋") },
];

const ARABIC_NUMBERS: WorldLetter[] = [
  ["١", "واحد", "waahid"],
  ["٢", "اثنان", "ithnaan"],
  ["٣", "ثلاثة", "thalaatha"],
  ["٤", "أربعة", "arbaa"],
  ["٥", "خمسة", "khamsa"],
  ["٦", "ستة", "sitta"],
  ["٧", "سبعة", "saba"],
  ["٨", "ثمانية", "thamaaniya"],
  ["٩", "تسعة", "tisa"],
  ["١٠", "عشرة", "ashara"],
].map(([char, text, roman], i) => ({ char, sound: roman, value: i + 1, word: w(text, roman, String(i + 1), "") }));

export const SCRIPTS: ScriptInfo[] = [
  {
    id: "hindi",
    lang: "hi",
    label: "Hindi",
    native: "हिन्दी",
    rtl: false,
    groups: [
      { id: "vowels", label: "अ आ", letters: HINDI_VOWELS },
      { id: "consonants", label: "क ख", letters: HINDI_CONSONANTS },
      { id: "numbers", label: "१२३", letters: HINDI_NUMBERS },
    ],
  },
  {
    id: "arabic",
    lang: "ar",
    label: "Arabic",
    native: "العربية",
    rtl: true,
    groups: [
      { id: "letters", label: "أ ب ت", letters: ARABIC_LETTERS },
      { id: "numbers", label: "١٢٣", letters: ARABIC_NUMBERS },
    ],
  },
];

/** What a voice for the script's language says: "क। क से कबूतर", "باء. بطة", "पाँच". */
export function nativeLine(script: Script, l: WorldLetter): string {
  if (l.value) return l.word!.text;
  if (script === "hindi") return l.word ? `${l.char}। ${l.char} से ${l.word.text}।` : `${l.char}।`;
  return l.word ? `${l.name ?? l.char}. ${l.word.text}.` : `${l.name ?? l.char}.`;
}

/** The same line for the English voice when the device has no Hindi or Arabic voice. */
export function fallbackLine(script: Script, l: WorldLetter): string {
  if (l.value) return `${l.word!.roman}. ${l.value}.`;
  if (!l.word) return `${l.sound}.`;
  return script === "hindi" ? `${l.sound}. ${l.sound} say ${l.word.roman}. ${l.word.meaning}.` : `${l.sound}. ${l.word.roman}. ${l.word.meaning}.`;
}
