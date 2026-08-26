import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { JourneyProvider } from "@/components/journey-provider";
import { AppShell } from "@/components/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "UMANG Life — Public services organised around your life",
  description: "Keep the services, documents, and responsibilities for the people and things in your life together.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <TooltipProvider><JourneyProvider><AppShell>{children}</AppShell></JourneyProvider></TooltipProvider>
      </body>
    </html>
  );
}
