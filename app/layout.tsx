import "./globals.css";

export const metadata = {
  title: 'GeoConvert',
  description: 'Free Shapefile to GeoJSON Converter',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}