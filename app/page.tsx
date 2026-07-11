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
    try {
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
    } catch {
      setStatus("error");
    }
  }, [sourceCrs]);

  return (
    <main className="min-h-screen bg-[#0d1117] text-[#e6edf3] p-6 md:p-10">
      <header className="flex items-center gap-2 cursor-pointer mb-16" onClick={() => window.location.reload()}>
        <span className="font-bold text-xl text-[#58a6ff]">GeoConvert</span>
      </header>

      <h1 className="text-4xl md:text-5xl font-bold mb-4">
        SHP → <span className="text-[#58a6ff]">GeoJSON</span> 변환기
      </h1>
      <p className="text-[#8b949e] mb-10 max-w-2xl leading-relaxed">
        Shapefile을 GeoJSON으로 즉시 변환합니다. 중부원점(EPSG:5186 / 5181), UTM-K(EPSG:5179) 등
        한국 좌표계를 지원하여 좌표가 틀어지는 문제 없이 정확하게 변환됩니다.
        모든 처리는 브라우저에서 이루어지며 파일은 서버로 전송되지 않습니다.
      </p>

      <div
        className="border-2 border-dashed border-[#30363d] rounded-lg p-10 text-center cursor-pointer hover:border-[#58a6ff] transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && convert(e.target.files[0])}
        />
        <p className="text-lg mb-2">Shapefile(.zip)을 여기에 놓으세요</p>
        <p className="text-sm text-[#8b949e] mb-4">.shp, .dbf, .prj 파일이 포함된 zip 파일</p>

        <label className="block text-sm text-[#8b949e] mb-2">원본 좌표계 선택</label>
        <select
          value={sourceCrs}
          onChange={(e) => setSourceCrs(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#161b22] text-[#58a6ff] border border-[#30363d] rounded p-2"
        >
          <option value="EPSG:4326">WGS84 (위경도, EPSG:4326)</option>
          <option value="EPSG:5186">중부원점 2010~ (EPSG:5186)</option>
          <option value="EPSG:5181">중부원점 ~2010 (EPSG:5181)</option>
          <option value="EPSG:5179">UTM-K (EPSG:5179)</option>
        </select>

        {status === "converting" && <p className="mt-4 text-[#58a6ff]">변환 중...</p>}
        {status === "done" && <p className="mt-4 text-green-400">변환 완료! 파일이 다운로드됩니다.</p>}
        {status === "error" && <p className="mt-4 text-red-400">변환 실패. zip 안에 .shp 파일이 있는지 확인하세요.</p>}
      </div>

      <section className="mt-20 p-6 bg-[#161b22] border border-[#30363d] rounded-lg max-w-4xl">
        <h2 className="text-2xl font-bold mb-4">
          왜 GeoJSON 좌표가 엉뚱한 곳(바다·아프리카)에 찍힐까요?
        </h2>
        <p className="text-sm text-[#8b949e] mb-6 leading-relaxed">
          한국 공공데이터(브이월드, 국가공간정보포털, data.go.kr)에서 받은 Shapefile은 대부분{" "}
          <strong className="text-[#e6edf3]">중부원점(EPSG:5186 / EPSG:5181)</strong> 또는{" "}
          <strong className="text-[#e6edf3]">UTM-K(EPSG:5179)</strong> 좌표계로 저장되어 있습니다.
          이 값은 위경도가 아니라 미터 단위의 평면좌표입니다. 좌표계 정보를 지정하지 않고 그대로 변환하면
          GeoJSON 표준인 WGS84(위경도)로 잘못 해석되어, 지도의 바다 한가운데나 아프리카 부근에 찍히게 됩니다.
        </p>

        <h3 className="text-lg font-bold mb-3">한국 좌표계별 특징</h3>
        <ul className="list-disc pl-5 text-sm text-[#8b949e] space-y-2 mb-8">
          <li><strong className="text-[#e6edf3]">EPSG:5186</strong> — 중부원점 (2010년 이후 표준). 최근 공공데이터는 대부분 이것입니다.</li>
          <li><strong className="text-[#e6edf3]">EPSG:5181</strong> — 중부원점 (2010년 이전). 오래된 데이터에서 자주 보입니다.</li>
          <li><strong className="text-[#e6edf3]">EPSG:5179</strong> — UTM-K. 전국 단위 데이터에 많이 쓰입니다.</li>
          <li><strong className="text-[#e6edf3]">EPSG:4326</strong> — WGS84 위경도. 이미 변환된 데이터라면 이것을 선택하세요.</li>
        </ul>

        <h3 className="text-lg font-bold mb-3">해결 방법 1: 위 변환기에서 좌표계 선택</h3>
        <p className="text-sm text-[#8b949e] mb-8 leading-relaxed">
          파일을 올리기 전에 원본 Shapefile의 좌표계를 선택하세요. 좌표계를 지정하면 자동으로 WGS84로
          재투영되어 정확한 위치의 GeoJSON이 생성됩니다. 어떤 좌표계인지 모르겠다면 EPSG:5186부터
          시도해 보세요. 최근 공공데이터는 대부분 중부원점입니다.
        </p>

        <h3 className="text-lg font-bold mb-3">해결 방법 2: QGIS에서 좌표계 지정</h3>
        <ol className="list-decimal pl-5 text-sm text-[#8b949e] space-y-2 mb-8">
          <li>QGIS에서 해당 Shapefile을 불러옵니다.</li>
          <li>레이어 우클릭 → [레이어 CRS 설정]에서 <strong className="text-[#e6edf3]">EPSG:5186</strong> 또는{" "}
            <strong className="text-[#e6edf3]">EPSG:5181</strong>을 지정합니다.</li>
          <li>레이어 우클릭 → [내보내기] → [다른 이름으로 저장]에서 CRS를 EPSG:4326(WGS84)으로 지정해 저장합니다.</li>
          <li>변환된 파일을 다시 업로드하면 정확한 좌표의 GeoJSON을 얻을 수 있습니다.</li>
        </ol>

        <h3 className="text-lg font-bold mb-3">자주 묻는 질문</h3>
        <div className="text-sm text-[#8b949e] space-y-4">
          <div>
            <p className="font-bold text-[#e6edf3] mb-1">.prj 파일이 없으면 어떻게 하나요?</p>
            <p>.prj 파일에 좌표계 정보가 담겨 있습니다. 없다면 데이터 출처를 확인하거나, 위 변환기에서 좌표계를 직접 선택하세요.</p>
          </div>
          <div>
            <p className="font-bold text-[#e6edf3] mb-1">한글 속성이 깨져서 나옵니다.</p>
            <p>Shapefile의 속성 테이블(.dbf)이 EUC-KR 인코딩인 경우가 많습니다. 이 변환기는 EUC-KR을 자동으로 처리합니다.</p>
          </div>
          <div>
            <p className="font-bold text-[#e6edf3] mb-1">파일이 서버로 업로드되나요?</p>
            <p>아니요. 모든 변환은 브라우저 안에서 처리되며, 파일이 서버로 전송되지 않습니다.</p>
          </div>
          <div>
            <p className="font-bold text-[#e6edf3] mb-1">중부원점 EPSG:5186과 EPSG:5181의 차이는?</p>
            <p>둘 다 중부원점이지만 원점의 Y값(false northing)이 다릅니다. 2010년 이후 데이터는 5186, 이전 데이터는 5181인 경우가 많습니다.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
