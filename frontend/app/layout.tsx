import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthStateSync } from "@/components/auth-state-sync";
import { NotificationProvider } from "@/components/notification-center";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

export const metadata: Metadata = {
  title: "LabLink",
  description: "Managed donation marketplace for scientific and clinical equipment.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
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
