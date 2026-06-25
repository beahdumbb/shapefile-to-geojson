"use client";

import { useState, useCallback, useRef } from "react";
import proj4 from "proj4";

proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs"); 
proj4.defs("EPSG:5179", "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"); 
proj4.defs("EPSG:5174", "+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43 +units=m +no_defs"); 
proj4.defs("EPSG:5181", "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"); 
proj4.defs("EPSG:5186", "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"); 

function transformCoordinates(coords: any, fromCRS: string, toCRS = "EPSG:4326"): any {
  if (typeof coords[0] === "number") {
    return proj4(fromCRS, toCRS, [coords[0], coords[1]]);
  } else {
    return coords.map((c: any) => transformCoordinates(c, fromCRS, toCRS));
  }
}

export default function Home() {
  const [status, setStatus] = useState<string>("idle");
  const [sourceCrs, setSourceCrs] = useState<string>("EPSG:4326"); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convert = useCallback(async (file: File) => {
    setStatus("converting");
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(file);
    const shpEntry = Object.keys(zip.files).find((n) => n.toLowerCase().endsWith(".shp"));
    if (!shpEntry) return setStatus("error");
    const shpBuffer = await zip.files[shpEntry].async("arraybuffer");
    
    const shapefile = await import("shapefile");
    const source = await shapefile.open(shpBuffer, undefined, { encoding: "euc-kr" });
    const features: any[] = [];
    let result = await source.read();
    while (!result.done) {
      if (result.value) {
        const feature = result.value as any;
        if (sourceCrs !== "EPSG:4326" && feature.geometry) {
           feature.geometry.coordinates = transformCoordinates(feature.geometry.coordinates, sourceCrs);
        }
        features.push(feature);
      }
      result = await source.read();
    }
    const blob = new Blob([JSON.stringify({ type: "FeatureCollection", features })], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name.replace(/\.zip$/i, ".geojson");
    a.click();
    setStatus("done");
  }, [sourceCrs]); 

  return (
    <main className="min-h-screen bg-[#0d1117] text-[#e6edf3] p-10">
      <header className="flex items-center gap-2 cursor-pointer mb-20" onClick={() => window.location.reload()}>
        <span className="font-bold text-xl text-[#58a6ff]">GeoConvert</span>
      </header>
      <h1 className="text-5xl font-bold mb-4">Shapefile to <span className="text-[#58a6ff]">GeoJSON</span></h1>
      <div className="border-2 border-dashed border-[#30363d] p-10 text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && convert(e.target.files[0])} />
        <p>Drop your file here</p>
        <select value={sourceCrs} onChange={(e) => setSourceCrs(e.target.value)} className="mt-4 bg-[#161b22] text-[#58a6ff] p-2">
            <option value="EPSG:4326">WGS84</option><option value="EPSG:5179">UTM-K</option>
            <option value="EPSG:5186">중부원점(2010~)</option><option value="EPSG:5181">중부원점(~2010)</option>
        </select>
      </div>
      <section className="mt-20 p-6 bg-[#161b22] border border-[#30363d]">
        <h2 className="text-lg font-bold mb-4">🇰🇷 한국 데이터 좌표계 오류 해결 가이드</h2>
        <ul className="list-decimal pl-5 text-sm text-[#8b949e]">
          <li>QGIS에서 해당 파일을 불러옵니다.</li>
          <li>[레이어 CRS 변경]에서 <strong>EPSG:5186</strong> 또는 <strong>EPSG:5181</strong>을 지정하세요.</li>
          <li>올바른 좌표계를 지정 후 다시 저장하여 업로드하세요.</li>
        </ul>
      </section>
    </main>
  );
}