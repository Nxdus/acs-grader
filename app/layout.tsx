import "@/lib/init";

import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Sans_Thai_Looped } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const notoThaiLooped = Noto_Sans_Thai_Looped({
  subsets: ["thai"],
  variable: "--font-noto-thai-looped",
});

export const metadata: Metadata = {
  title: "ACS Grader",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jetBrainsMono.variable} ${notoThaiLooped.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`antialiased select-none`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
        >
          <AppShell>
            {children}
          </AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
