import type { Metadata } from "next";
import Link from "next/link";
import { ThemeProvider } from "next-themes";
import { CupidLogo } from "@/components/cupid-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cupid — AI Relationship Analyzer",
  description:
    "A privacy-first, self-hosted AI relationship analyzer. Analyze conversations, explore communication patterns, and generate relationship insights with your own AI provider.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
              <div className="container flex h-14 items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                  <CupidLogo className="h-6 w-6" />
                  <span className="text-lg font-bold tracking-tight">Cupid</span>
                </Link>
                <nav className="flex items-center gap-1 sm:gap-2">
                  <Link
                    href="/analyze"
                    className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Analyze
                  </Link>
                  <Link
                    href="/settings"
                    className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Settings
                  </Link>
                  <ThemeToggle />
                </nav>
              </div>
            </header>
            <main className="flex-1">{children}</main>
            <footer className="border-t py-6">
              <div className="container flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
                <p>
                  AI-based relationship analysis, not a scientific prediction.
                </p>
                <p>
                  Cupid is open source (MIT) · Your data never leaves your
                  server ·{" "}
                  <Link href="/settings" className="underline">
                    Provider settings
                  </Link>
                </p>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
