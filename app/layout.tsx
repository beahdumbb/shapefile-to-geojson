import "./globals.css";

export const metadata = {
  title: "GeoConvert: Free Shapefile to GeoJSON Converter",
  description: "Convert your GIS Shapefile to GeoJSON format instantly. Support for various Korean coordinate systems (EPSG:5179, 5186, etc.) included.",
  keywords: ["Shapefile to GeoJSON", "GIS converter", "GeoJSON conversion", "EPSG coordinate system", "Korean GIS"],
  openGraph: {
    title: "GeoConvert - Easy Shapefile to GeoJSON Converter",
    description: "The fastest way to convert Shapefiles to GeoJSON online.",
    url: 'https://www.geoconvert.net',
    type: 'website',
  },
  verification: {
    other: {
      "naver-site-verification": "e50da0c55e436fa719a469f05e8bc19d",
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}