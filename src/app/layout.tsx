import type { Metadata, Viewport } from "next";
import { Baloo_2 } from "next/font/google";
import { AudioProvider } from "@/components/AudioProvider";
import { BadgeToast } from "@/components/BadgeToast";
import { ReducedMotionProvider } from "@/components/ReducedMotionProvider";
import { RewardCelebration } from "@/components/RewardCelebration";
import { THEME_INIT_SCRIPT, ThemeProvider } from "@/components/ThemeProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const baloo = Baloo_2({ subsets: ["latin"], variable: "--font-baloo", display: "swap" });

export const metadata: Metadata = {
  title: "Kids Learning Hub",
  description: "Fun learning games for ages 2-8, playable offline.",
  appleWebApp: { capable: true, title: "Kids Hub", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ff6fa5" },
    { media: "(prefers-color-scheme: dark)", color: "#261f3f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={baloo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <ReducedMotionProvider>
            <AudioProvider>
              {children}
              <RewardCelebration />
              <BadgeToast />
            </AudioProvider>
          </ReducedMotionProvider>
        </ThemeProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
