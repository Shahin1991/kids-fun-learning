import Link from "next/link";

export function HomeButton() {
  return (
    <Link
      href="/"
      aria-label="Home"
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-3xl shadow-md active:scale-95 sm:h-20 sm:w-20 sm:text-4xl bg-surface"
    >
      🏠
    </Link>
  );
}
