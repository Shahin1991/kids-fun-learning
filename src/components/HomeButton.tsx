import Link from "next/link";

export function HomeButton() {
  return (
    <Link
      href="/"
      aria-label="Home"
      className="flex min-h-touch min-w-touch items-center justify-center rounded-full bg-surface text-4xl shadow-md active:scale-95"
    >
      🏠
    </Link>
  );
}
