import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Free Shapefile to GeoJSON Converter — 100% Client-Side & Private",
  description:
    "Convert Shapefile (.zip) to GeoJSON instantly in your browser. No file uploads, no server, no signup. Supports .shp, .dbf, .prj files. Free and open source.",
  keywords: [
    "shapefile to geojson",
    "shp to geojson converter",
    "free geojson converter",
    "shapefile converter online",
    "client side geojson",
    "convert shp online",
    "geospatial converter",
  ],
  authors: [{ name: "GeoConvert" }],
  openGraph: {
    title: "Free Shapefile to GeoJSON Converter",
    description:
      "Upload a .zip Shapefile and download a .geojson file instantly. All processing happens locally — your data never leaves your browser.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Shapefile to GeoJSON Converter",
    description:
      "Client-side Shapefile → GeoJSON conversion. No uploads, no server, 100% private.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
