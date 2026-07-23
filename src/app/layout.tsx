import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navigation } from "@/components/Navigation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WorkoutDeck",
  description: "YouTube workout companion with interval timers and exercise cues",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-bg-base text-text`}
      >
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-accent px-4 py-3 font-semibold text-accent-fg focus-visible:translate-y-0 motion-safe:transition-transform motion-safe:[transition-duration:var(--dur)]"
        >
          Skip to main content
        </a>
        <Navigation />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </body>
    </html>
  );
}
