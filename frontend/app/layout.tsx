import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";

import { AuthStateSync } from "@/components/auth-state-sync";
import { NotificationProvider } from "@/components/notification-center";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";
import "./tokens.css";

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext", "cyrillic", "vietnamese"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  // Keep glyphs absent from the subset (e.g. arrows) on the system font, as in the design export.
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "LabLink",
  description: "Managed donation marketplace for scientific and clinical equipment.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="app-body">
        <AuthStateSync />
        <NotificationProvider>
          <SiteHeader />
          <main className="site-main">{children}</main>
          <footer className="footer">
            <div className="shell">
              LabLink v1 is a managed donation marketplace. Verified donor labs and recipient institutions move through
              admin-reviewed workflows, not direct checkout.
            </div>
          </footer>
        </NotificationProvider>
      </body>
    </html>
  );
}
