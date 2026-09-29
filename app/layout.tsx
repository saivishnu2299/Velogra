import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Velogra · Creative Coding Studio",
  description:
    "Code becomes form. An open creative coding studio for art, motion, sound, and your next idea. Powered by p5.js.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
