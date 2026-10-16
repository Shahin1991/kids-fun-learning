import { describe, expect, it } from "vitest";
import { rng } from "@/lib/apex-highway/scenery";
import { changeFor, COINS, currencyForLocale, formatMoney, makePrice, sayMoney, total, type Currency } from "./money";

describe("coin shop money", () => {
  it("picks a currency from the device language", () => {
    expect(currencyForLocale("en-GB")).toBe("GBP");
    expect(currencyForLocale("ar-AE")).toBe("AED");
    expect(currencyForLocale("en-AE")).toBe("AED");
    expect(currencyForLocale("en-US")).toBe("USD");
  });

  it("prices can always be paid exactly with the coins on offer", () => {
    const r = rng(9);
    for (const cur of ["USD", "GBP", "AED"] as Currency[]) {
      const unit = COINS[cur][0].value;
      for (let level = 0; level < 3; level++) {
        for (let i = 0; i < 40; i++) {
          const p = makePrice(cur, level, r);
          expect(p).toBeGreaterThan(0);
          expect(p % unit).toBe(0);
        }
      }
    }
  });

  it("formats, speaks and totals amounts", () => {
    expect(formatMoney("USD", 65)).toBe("65¢");
    expect(formatMoney("GBP", 150)).toBe("£1.50");
    expect(formatMoney("AED", 75)).toBe("75 fils");
    expect(sayMoney("USD", 125)).toBe("1 dollar and 25 cents");
    expect(sayMoney("GBP", 200)).toBe("2 pounds");
    expect(total([25, 10, 5])).toBe(40);
  });

  it("works out change from the next coin up", () => {
    expect(changeFor("USD", 65)).toEqual({ paid: COINS.USD[4], change: 35 });
    expect(changeFor("AED", 75)?.change).toBe(25);
  });
});
