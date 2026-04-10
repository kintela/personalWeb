import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { F5PrankModal } from "@/components/f5-prank-modal";
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
  metadataBase: new URL("https://www.kintela.es"),
  title: {
    default: "kintela.es",
    template: "%s | kintela.es",
  },
  description:
    "Música, playlists, Instagram, fotos, conciertos, guitarra y colecciones personales en kintela.es.",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "kintela.es",
    title: "kintela.es",
    description:
      "Música, playlists, Instagram, fotos, conciertos, guitarra y colecciones personales en kintela.es.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Vista previa de kintela.es con un diseño oscuro y una selección de secciones musicales y personales.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "kintela.es",
    description:
      "Música, playlists, Instagram, fotos, conciertos, guitarra y colecciones personales en kintela.es.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <F5PrankModal />
      </body>
    </html>
  );
}
