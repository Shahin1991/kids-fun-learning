import { describe, expect, it } from "vitest";
import { fallbackLine, nativeLine, SCRIPTS } from "@/data/world-letters";
import { alphaOf, coverage, hintCell } from "./coverage";

/** A size x size alpha grid with the cells where `fill(x, y)` is true set to 255. */
const grid = (size: number, fill: (x: number, y: number) => boolean) => Uint8Array.from({ length: size * size }, (_, i) => (fill(i % size, Math.floor(i / size)) ? 255 : 0));

describe("letter painting coverage", () => {
  const size = 10;
  // An "L": a column and a bottom row
  const letter = grid(size, (x, y) => (x === 2 && y >= 1 && y <= 8) || (y === 8 && x >= 2 && x <= 7));

  it("counts only the letter's own cells", () => {
    expect(coverage(letter, grid(size, () => false))).toBe(0);
    expect(coverage(letter, grid(size, () => true))).toBe(1);
    // Painting outside the letter does not help
    expect(coverage(letter, grid(size, (x) => x > 8))).toBe(0);
    // The column alone is 8 of the 13 cells
    expect(coverage(letter, grid(size, (x) => x === 2))).toBeCloseTo(8 / 13);
  });

  it("points the hint at an unpainted part of the letter", () => {
    const columnDone = grid(size, (x) => x === 2);
    const hint = hintCell(letter, columnDone, size)!;
    expect(hint.y).toBe(8);
    expect(hint.x).toBeGreaterThan(2);
    expect(letter[hint.y * size + hint.x]).toBe(255);
    expect(hintCell(letter, grid(size, () => true), size)).toBeNull();
  });

  it("reads the alpha channel", () => {
    expect([...alphaOf([1, 2, 3, 40, 5, 6, 7, 200])]).toEqual([40, 200]);
  });
});

describe("Hindi and Arabic letters", () => {
  it("has the full varnamala and all 28 Arabic letters, with no repeats", () => {
    const [hindi, arabic] = SCRIPTS;
    expect(hindi.groups.find((g) => g.id === "vowels")!.letters).toHaveLength(13);
    expect(hindi.groups.find((g) => g.id === "consonants")!.letters).toHaveLength(36);
    expect(arabic.groups.find((g) => g.id === "letters")!.letters).toHaveLength(28);
    for (const s of SCRIPTS) {
      for (const g of s.groups) expect(new Set(g.letters.map((l) => l.char)).size, `${s.id} ${g.id}`).toBe(g.letters.length);
    }
  });

  it("picture words start with their letter", () => {
    for (const s of SCRIPTS) {
      for (const l of s.groups.flatMap((g) => g.letters)) {
        if (!l.word || l.value) continue;
        // Arabic alif is written with a hamza (أ) at the start of أرنب
        const first = s.id === "arabic" && l.char === "ا" ? "أ" : l.char;
        expect(l.word.text.startsWith(first), `${l.char} ${l.word.text}`).toBe(true);
      }
    }
  });

  it("builds the chant for each voice", () => {
    const ka = SCRIPTS[0].groups[1].letters[0];
    expect(nativeLine("hindi", ka)).toBe("क। क से कबूतर।");
    expect(fallbackLine("hindi", ka)).toBe("ka. ka say kabootar. pigeon.");
    const baa = SCRIPTS[1].groups[0].letters[1];
    expect(nativeLine("arabic", baa)).toBe("باء. بطة.");
    expect(fallbackLine("arabic", SCRIPTS[1].groups[1].letters[2])).toBe("thalaatha. 3.");
  });
});
