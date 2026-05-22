import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Shield, Trophy, Users } from "lucide-react";
import { PwaRegister } from "@/components/pwa-register";
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
  title: "WCWS Pick'em",
  description: "A mobile pick'em pool for the Women's College World Series.",
  appleWebApp: {
    capable: true,
    title: "WCWS Pick'em",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <PwaRegister />
        <header className="app-header">
          <Link className="brand" href="/">
            <span className="brand-mark">W</span>
            <span>
              <strong>WCWS Pick&apos;em</strong>
              <small>$10 bracket pool</small>
            </span>
          </Link>
          <nav className="top-nav" aria-label="Primary navigation">
            <Link href="/">
              <Trophy size={17} />
              Dashboard
            </Link>
            <Link href="/entrants">
              <Users size={17} />
              Entrants
            </Link>
            <Link href="/admin">
              <Shield size={17} />
              Admin
            </Link>
          </nav>
        </header>
        <main className="page-shell">{children}</main>
      </body>
    </html>
  );
}
