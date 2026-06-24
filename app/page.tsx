"use client";

import { useState, useCallback, useRef } from "react";
import proj4 from "proj4";

// 🌐 한국 주요 좌표계 엔진 세팅 (이 사이트의 최고 무기입니다)
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs"); 
proj4.defs("EPSG:5179", "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"); 
proj4.defs("EPSG:5174", "+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43 +units=m +no_defs"); 
proj4.defs("EPSG:5181", "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"); 
proj4.defs("EPSG:5186", "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"); 

// 재귀적으로 GeoJSON 좌표들을 추적해 변환해 주는 마법의 함수
function transformCoordinates(coords: any, fromCRS: string, toCRS = "EPSG:4326"): any {
  if (typeof coords[0] === "number") {
    return proj4(fromCRS, toCRS, [coords[0], coords[1]]);
  } else {
    return coords.map((c: any) => transformCoordinates(c, fromCRS, toCRS));
  }
}

type ConversionStatus = "idle" | "reading" | "extracting" | "converting" | "done" | "error";

interface StatusMessage {
  status: ConversionStatus;
  label: string;
  progress: number;
}

const STATUS_MESSAGES: Record<ConversionStatus, StatusMessage> = {
  idle:       { status: "idle",       label: "",                              progress: 0   },
  reading:    { status: "reading",    label: "Reading ZIP archive…",          progress: 20  },
  extracting: { status: "extracting", label: "Extracting shapefile layers…",  progress: 50  },
  converting: { status: "converting", label: "Converting to GeoJSON (with CRS)…", progress: 80  },
  done:       { status: "done",       label: "Conversion complete!",          progress: 100 },
  error:      { status: "error",      label: "Conversion failed.",            progress: 0   },
};

export default function Home() {
  const [status, setStatus]     = useState<ConversionStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isDragging, setDragging] = useState(false);
  const [fileName, setFileName]   = useState<string>("");
  const [sourceCrs, setSourceCrs] = useState<string>("EPSG:4326"); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convert = useCallback(async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      setErrorMsg("Please upload a .zip file containing your Shapefile.");
      setStatus("error");
      return;
    }

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg("File is too large. Please upload files under 100MB.");
      setStatus("error");
      return;
    }

    setFileName(file.name);
    setErrorMsg("");

    try {
      setStatus("reading");
      const JSZip = (await import("jszip")).default;
      const zip   = await JSZip.loadAsync(file);

      setStatus("extracting");

      const entries  = Object.keys(zip.files);
      const shpEntry = entries.find((n) => n.toLowerCase().endsWith(".shp") && !n.includes("__MACOSX") && !n.includes("._"));
      const dbfEntry = entries.find((n) => n.toLowerCase().endsWith(".dbf") && !n.includes("__MACOSX") && !n.includes("._"));

      if (!shpEntry) throw new Error("No valid .shp file found inside the ZIP archive.");

      const shpBuffer  = await zip.files[shpEntry].async("arraybuffer");
      const dbfBuffer  = dbfEntry ? await zip.files[dbfEntry].async("arraybuffer") : undefined;

      setStatus("converting");
      const shapefile = await import("shapefile");
      const source    = await shapefile.open(shpBuffer, dbfBuffer, { encoding: "euc-kr" });

      const features: GeoJSON.Feature[] = [];
      let result = await source.read();
      
      while (!result.done) {
        if (result.value) {
          const feature = result.value as GeoJSON.Feature;
          
          if (sourceCrs !== "EPSG:4326" && feature.geometry && feature.geometry.coordinates) {
             feature.geometry.coordinates = transformCoordinates(feature.geometry.coordinates, sourceCrs, "EPSG:4326");
          }
          
          features.push(feature);
        }
        result = await source.read();
      }

      const geojson: GeoJSON.FeatureCollection = {
        type:     "FeatureCollection",
        features,
      };

      const blob = new Blob([JSON.stringify(geojson)], {
        type: "application/geo+json",
      });
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = file.name.replace(/\.zip$/i, ".geojson");
      a.click();
      URL.revokeObjectURL(url);

      setStatus("done");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(message);
      setStatus("error");
    }
  }, [sourceCrs]); 

  const handleFile = useCallback(
    (f: File | null | undefined) => { if (f) convert(f); },
    [convert]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const isProcessing = ["reading", "extracting", "converting"].includes(status);
  const { label, progress } = STATUS_MESSAGES[status];

  return (
    <main className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-sans">
      <header className="relative border-b border-[#21262d] px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
            <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
          </svg>
          <span className="font-semibold text-sm tracking-wide text-[#58a6ff]">GeoConvert</span>
        </div>
        <span className="text-xs text-[#8b949e]">100% Secure · No Server Uploads</span>
      </header>

      <section className="relative max-w-3xl mx-auto text-center px-6 pt-20 pb-12">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#e6edf3] leading-tight mb-4">
          Free Shapefile to <span className="text-[#58a6ff]">GeoJSON</span> Converter
        </h1>
        <p className="text-[#8b949e] text-lg max-w-xl mx-auto leading-relaxed">
          국내외 모든 좌표계(EPSG)를 글로벌 위경도(WGS84)로 자동 변환합니다. 
        </p>
      </section>

      <section className="max-w-2xl mx-auto px-6 pb-20">
        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={[
            "relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none",
            "flex flex-col items-center justify-center gap-4 p-12 text-center",
            isDragging ? "border-[#58a6ff] bg-[#58a6ff]/5 scale-[1.01]" : status === "error" ? "border-[#f85149]/60 bg-[#f85149]/5" : status === "done" ? "border-[#3fb950]/60 bg-[#3fb950]/5" : "border-[#30363d] bg-[#161b22] hover:border-[#58a6ff]/50 hover:bg-[#58a6ff]/5",
            isProcessing ? "pointer-events-none" : "",
          ].join(" ")}
        >
          <input ref={fileInputRef} type="file" accept=".zip" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} />

          {status === "idle" && (
            <>
              <div>
                <p className="text-[#e6edf3] font-semibold text-lg mb-1">여기에 .zip 파일을 올려놓으세요</p>
                <p className="text-[#8b949e] text-sm mb-6">(.shp, .dbf 포함 필수)</p>
              </div>
              
              {/* ✨ V2 핵심: 좌표계 선택 드롭다운 ✨ */}
              <div className="flex items-center gap-3 bg-[#0d1117] border border-[#30363d] px-4 py-2 rounded-lg" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs font-semibold text-[#8b949e]">원본 좌표계 :</span>
                <select 
                  className="bg-transparent text-sm font-medium text-[#58a6ff] outline-none cursor-pointer"
                  value={sourceCrs}
                  onChange={(e) => setSourceCrs(e.target.value)}
                >
                  <option value="EPSG:4326">EPSG:4326 (글로벌 표준 / 변환안함)</option>
                  <option value="EPSG:5179">EPSG:5179 (UTM-K, 네이버/카카오/최신공공)</option>
                  <option value="EPSG:5186">EPSG:5186 (중부원점, 2010년 이후)</option>
                  <option value="EPSG:5181">EPSG:5181 (중부원점, 2010년 이전)</option>
                  <option value="EPSG:5174">EPSG:5174 (구 지적도 / 구 한국측지계)</option>
                </select>
              </div>
            </>
          )}

          {isProcessing && (
            <div className="w-full max-w-xs">
              <p className="text-[#e6edf3] font-medium mb-3">{label}</p>
              <div className="h-1.5 rounded-full bg-[#21262d] overflow-hidden">
                <div className="h-full rounded-full bg-[#58a6ff] transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {status === "done" && (
            <div>
              <p className="text-[#3fb950] font-semibold text-lg mb-1">변환 완료!</p>
              <button onClick={(e) => { e.stopPropagation(); setStatus("idle"); setFileName(""); }} className="text-xs text-[#58a6ff] hover:underline mt-2">다른 파일 변환하기 →</button>
            </div>
          )}
          {status === "error" && (
             <div>
               <p className="text-[#f85149] font-semibold text-lg mb-1">오류 발생</p>
               <p className="text-[#8b949e] text-sm mb-3 max-w-xs">{errorMsg}</p>
               <button onClick={(e) => { e.stopPropagation(); setStatus("idle"); setFileName(""); }} className="text-xs text-[#58a6ff] hover:underline">다시 시도하기 →</button>
             </div>
          )}
        </div>
      </section>
    </main>
  );
}