import type { Metadata } from "next";
import "./globals.css";
import { AppearanceProvider } from "./studio/appearance";

export const metadata: Metadata = {
  metadataBase: new URL("https://velogra.saivishnu2299.chatgpt.site"),
  title: "Velogra · Creative Coding Studio",
  description:
    "Code becomes form. An open creative coding studio for art, motion, sound, and your next idea. Powered by p5.js.",
  openGraph: {
    title: "Velogra · Code becomes form.",
    description:
      "A creative coding studio for p5.js. Art, motion, sound, and your next idea.",
    type: "website",
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 3200,
        height: 1800,
        alt: "Velogra. Code becomes form. Inter typography beside a mint and lilac generative orbit on graphite.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Velogra · Code becomes form.",
    description:
      "A creative coding studio for p5.js. Art, motion, sound, and your next idea.",
    images: ["/og.png"],
  },
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/InterVariable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased"><AppearanceProvider>{children}</AppearanceProvider></body>
    </html>
  );
}
