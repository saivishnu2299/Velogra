import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Canvas · p5.js Studio",
  description:
    "An open canvas for creative ideas. Explore, edit, and create with p5.js.",
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
