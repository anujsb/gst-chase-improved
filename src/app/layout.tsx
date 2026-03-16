// src/app/layout.tsx

import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

// const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
// const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});


export const metadata: Metadata = {
  title: "GSTFlow — CA Practice Management",
  description: "GSTR filing automation for chartered accountants",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(dmSans.variable, dmMono.variable)}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}