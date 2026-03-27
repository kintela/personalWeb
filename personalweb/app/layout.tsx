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
  title: "Personal Web",
  description: "Aquí se encuentra mucho de lo que me apasiona.",
  openGraph: {
    type: "website",
    url: "https://www.kintela.es",
    siteName: "kintela.es",
    title: "Personal Web",
    description: "Aquí se encuentra mucho de lo que me apasiona.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Vista previa de kintela.es con un diseño oscuro y el texto Personal Web.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Personal Web",
    description: "Aquí se encuentra mucho de lo que me apasiona.",
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
