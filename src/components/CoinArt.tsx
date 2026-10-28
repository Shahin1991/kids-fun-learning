import type { Coin } from "@/lib/coin-shop/money";

const METAL = {
  copper: ["#f0a868", "#b8692e"],
  silver: ["#eef1f4", "#9aa3ad"],
  gold: ["#ffe066", "#d4a017"],
} as const;

/** A shiny coin with its value on it, for Coin Shop and Juice Stand. */
export function CoinArt({ coin, size = 76 }: { coin: Coin; size?: number }) {
  const [light, dark] = METAL[coin.metal];
  const big = coin.value >= 100;
  const s = big ? size * 1.12 : size;
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <radialGradient id={`g-${coin.metal}`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#g-${coin.metal})`} stroke={dark} strokeWidth="4" />
      <circle cx="50" cy="50" r="38" fill="none" stroke={light} strokeOpacity="0.7" strokeWidth="2" />
      <text x="50" y="58" textAnchor="middle" fontSize={coin.label.length > 4 ? 18 : 26} fontWeight="800" fill="#3b2f4a">
        {coin.label}
      </text>
    </svg>
  );
}
