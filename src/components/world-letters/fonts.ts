import { Baloo_2, Baloo_Bhaijaan_2 } from "next/font/google";

// Baloo's Devanagari and Arabic cousins match the app's Latin Baloo 2, and self-hosting them keeps the
// letters working offline (system fonts for these scripts vary a lot between devices).
export const devanagariFont = Baloo_2({ subsets: ["devanagari", "latin"], display: "swap" });
export const arabicFont = Baloo_Bhaijaan_2({ subsets: ["arabic", "latin"], display: "swap" });
