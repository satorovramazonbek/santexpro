import React, { useState } from 'react';
import { Calculator, Flame, Thermometer, Layers, Gauge, ArrowRight, Info } from 'lucide-react';
import { NumericInput } from '../components/common/NumericInput';

interface QuickCalculatorPageProps {
  onCreateProjectFromCalc: (calcData: any) => void;
}

export const QuickCalculatorPage: React.FC<QuickCalculatorPageProps> = ({ onCreateProjectFromCalc }) => {
  const [length, setLength] = useState<number>(5.0);
  const [width, setWidth] = useState<number>(4.0);
  const [height, setHeight] = useState<number>(3.0);
  const [tInside, setTInside] = useState<number>(22.0);
  const [tOutside, setTOutside] = useState<number>(-15.0);
  const [extWalls, setExtWalls] = useState<number>(1);
  const [insulationType, setInsulationType] = useState<'good' | 'medium' | 'poor'>('medium');
  const [windowArea, setWindowArea] = useState<number>(3.0);
  const [spacingMm, setSpacingMm] = useState<number>(150);

  // Hisob-kitoblar (Fizika formulalari)
  const area = Number((length * width).toFixed(1));
  const volume = Number((area * height).toFixed(1));
  const deltaT = Math.max(0, tInside - tOutside);

  // U-koeffitsiyentlar
  const uWall = insulationType === 'good' ? 0.35 : insulationType === 'medium' ? 0.48 : 0.85;
  const uWin = 1.8;

  // Tashqi devor maydoni
  const wallLengths = [length, width, length, width];
  const grossWallArea = wallLengths.slice(0, extWalls).reduce((a, b) => a + b, 0) * height;
  const netWallArea = Math.max(0, grossWallArea - windowArea);

  // Transmissiya yo'qotilishi
  const qWall = netWallArea * uWall * deltaT;
  const qWin = windowArea * uWin * deltaT;
  const qTrans = qWall + qWin;

  // Shamollatish yo'qotilishi (n = 0.8 marta/soat)
  const qVent = 0.34 * volume * 0.8 * deltaT;

  const totalHeatLossW = Math.round(qTrans + qVent);
  const specificLossW_m2 = area > 0 ? Math.round(totalHeatLossW / area) : 0;

  // Radiator hisobi (75/65/22 rejimda Delta T = 48K)
  const correctionK = Math.pow(48.0 / 50.0, 1.3);
  const radiator1000WActual = 1930.0 * correctionK;
  const recommendedRadiatorCount = Math.ceil(totalHeatLossW / radiator1000WActual);

  // Issiq pol hisobi
  const spacingM = spacingMm / 1000.0;
  const floorPipeM = Math.round((area / spacingM) * 1.05);
  const underfloorCircuits = Math.max(1, Math.ceil(floorPipeM / 85.0));

  // Gidravlik suv sarfi (Delta T = 10K bo'yicha)
  // m_dot = Q / (4186 * 10)
  const flowRateLh = Math.round((totalHeatLossW / (4186 * 10)) * 3600);
  const recommendedPipe = totalHeatLossW > 4000 ? "25 x 2.3 mm" : totalHeatLossW > 2000 ? "20 x 2.0 mm" : "16 x 2.0 mm";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Tezkor Muhandislik Hisoblagichi</h1>
            <p className="text-xs text-slate-500">Obyektda tezkorlik bilan dastlabki quvvat va materiallarni baholash</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Kiritish parametrlari (6 ustun) */}
        <div className="md:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <h2 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            Xona o‘lchamlari va sharoitlar
          </h2>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Uzunligi (m)</label>
              <NumericInput
                value={length}
                onChange={setLength}
                min={0.5}
                max={50}
                fallbackValue={5.0}
                className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kengligi (m)</label>
              <NumericInput
                value={width}
                onChange={setWidth}
                min={0.5}
                max={50}
                fallbackValue={4.0}
                className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Balandligi (m)</label>
              <NumericInput
                value={height}
                onChange={setHeight}
                min={1.0}
                max={20}
                fallbackValue={3.0}
                className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-around text-center border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 block">Maydon</span>
              <span className="font-bold text-slate-900 text-sm">{area} m²</span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] text-slate-400 block">Hajm</span>
              <span className="font-bold text-slate-900 text-sm">{volume} m³</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium text-slate-600 mb-1">Tashqi harorat (°C)</label>
              <NumericInput
                value={tOutside}
                onChange={setTOutside}
                allowNegative={true}
                fallbackValue={-15}
                className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Ichki harorat (°C)</label>
              <NumericInput
                value={tInside}
                onChange={setTInside}
                min={5}
                max={40}
                fallbackValue={22}
                className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-600 mb-1">Tashqi devorlar soni</label>
            <select
              value={extWalls}
              onChange={(e) => setExtWalls(Number(e.target.value))}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="1">1 ta tashqi devor (oddiy)</option>
              <option value="2">2 ta tashqi devor (burchak xona)</option>
              <option value="3">3 ta tashqi devor</option>
              <option value="4">4 ta tashqi devor</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-600 mb-1">Devor izolyatsiyasi sifati</label>
            <select
              value={insulationType}
              onChange={(e) => setInsulationType(e.target.value as any)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="good">Yaxshi izolyatsiyalangan (U ≈ 0.35 Vt/m²K, 5-10 sm penoplast)</option>
              <option value="medium">O‘rtacha izolyatsiya (U ≈ 0.48 Vt/m²K, standart 1.5 g‘isht)</option>
              <option value="poor">Izolyatsiyasiz / Yomon (U ≈ 0.85 Vt/m²K, sovuq devor)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium text-slate-600 mb-1">Deraza maydoni (m²)</label>
              <NumericInput
                value={windowArea}
                onChange={setWindowArea}
                min={0}
                max={100}
                fallbackValue={0}
                className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Issiq pol qadami (mm)</label>
              <select
                value={spacingMm}
                onChange={(e) => setSpacingMm(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="100">100 mm (Zich)</option>
                <option value="150">150 mm (Standart)</option>
                <option value="200">200 mm (Tejamkor)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Natijalar ko'rinishi (6 ustun) */}
        <div className="md:col-span-6 space-y-4">
          {/* Asosiy issiqlik quvvati */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-2xl shadow-md">
            <span className="text-xs uppercase tracking-wider font-semibold text-blue-200">
              Taxminiy issiqlik yo‘qotilishi (Q)
            </span>
            <div className="text-4xl font-black mt-1">
              {totalHeatLossW.toLocaleString('uz-UZ')} <span className="text-lg font-normal">Vt</span>
            </div>
            <div className="text-xs text-blue-100 mt-1 flex items-center justify-between">
              <span>Solishtirma quvvat: <b>{specificLossW_m2} Vt/m²</b></span>
              <span>ΔT = {deltaT} K</span>
            </div>
          </div>

          {/* Radiator tavsiyasi */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
              <Thermometer className="w-4 h-4 text-red-500" />
              <span>Radiator tavsiyasi:</span>
            </div>
            <p className="text-slate-600">
              Agar 22-tur 500x1000 mm panelli radiator o‘rnatilsa:
            </p>
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-900 font-semibold">
              Tavsiya etiladigan soni: <b className="text-base">{recommendedRadiatorCount} ta</b> (har biri ~1850 Vt)
            </div>
          </div>

          {/* Issiq pol tavsiyasi */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>Issiq pol (truba sarfi):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                <span className="text-slate-500 block text-[10px]">Truba uzunligi</span>
                <span className="font-bold text-blue-900 text-sm">~{floorPipeM} metr</span>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                <span className="text-slate-500 block text-[10px]">Konturlar soni</span>
                <span className="font-bold text-blue-900 text-sm">{underfloorCircuits} ta kontur</span>
              </div>
            </div>
          </div>

          {/* Gidravlika */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
              <Gauge className="w-4 h-4 text-emerald-500" />
              <span>Gidravlik oqim va truba diametri:</span>
            </div>
            <p className="text-slate-600">
              Talab qilinadigan suv sarfi: <b>{flowRateLh} l/soat</b>
            </p>
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-semibold">
              Tavsiya etilgan magistral quvur: <b>{recommendedPipe}</b>
            </div>
          </div>

          <button
            onClick={() => onCreateProjectFromCalc({ length, width, height, tInside, tOutside, totalHeatLossW })}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl text-xs transition-colors shadow-xs"
          >
            <span>Ushbu hisob bilan to‘liq loyiha yaratish</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
