import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.geoconvert.net"),
  title: "SHP GeoJSON 변환 | 중부원점·UTM-K 한국 좌표계 무료 변환기",
  description:
    "Shapefile(SHP)을 GeoJSON으로 브라우저에서 바로 변환. 중부원점(EPSG:5186/5181), UTM-K(5179) 등 한국 좌표계를 지원해 좌표가 틀어지는 문제 없이 정확하게 변환합니다. 무료·설치 불필요.",
  keywords: [
    "SHP GeoJSON 변환",
    "Shapefile GeoJSON 변환",
    "중부원점 좌표계 변환",
    "UTM-K 변환",
    "EPSG:5186",
    "EPSG:5181",
    "QGIS 좌표계",
    "한국 GIS 변환",
  ],
  openGraph: {
    title: "SHP GeoJSON 변환 | 한국 좌표계 지원 무료 변환기",
    description:
      "중부원점·UTM-K까지 지원하는 무료 SHP→GeoJSON 변환기. 좌표가 바다에 찍히는 문제를 해결합니다.",
    url: "https://www.geoconvert.net",
    type: "website",
    locale: "ko_KR",
  },
  alternates: { canonical: "https://www.geoconvert.net" },
  verification: {
    other: { "naver-site-verification": "e50da0c55e436fa719a469f05e8bc19d" },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
