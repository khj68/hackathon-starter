import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const sansFont = Plus_Jakarta_Sans({
  variable: "--font-travel-sans",
  subsets: ["latin"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-travel-mono",
  subsets: ["latin"],
});

const displayFont = Playfair_Display({
  variable: "--font-travel-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Travel Agent",
  description: "Chat-based travel planning agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${sansFont.variable} ${monoFont.variable} ${displayFont.variable} antialiased`}
      >
        <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
