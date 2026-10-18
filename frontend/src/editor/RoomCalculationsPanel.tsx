import React, { useState, useEffect, useMemo } from 'react';
import { Room, RadiatorCatalogItem, CalculationResult } from '../types';
import { api } from '../api/client';
import {
  Flame,
  Thermometer,
  Layers,
  Gauge,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Info,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { NumericInput } from '../components/common/NumericInput';

interface RoomCalculationsPanelProps {
  room: Room;
  catalogRadiators: RadiatorCatalogItem[];
  onCalculationUpdated: () => void;
}

export const RoomCalculationsPanel: React.FC<RoomCalculationsPanelProps> = ({
  room,
  catalogRadiators,
  onCalculationUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'heat_loss' | 'radiator' | 'underfloor' | 'hydraulics'>('heat_loss');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Latest calculation results
  const heatLossCalc = room.calculation_results?.find((c) => c.calculation_type === 'heat_loss');
  const radiatorCalc = room.calculation_results?.find((c) => c.calculation_type === 'radiator');
  const underfloorCalc = room.calculation_results?.find((c) => c.calculation_type === 'underfloor');
  const hydraulicsCalc = room.calculation_results?.find((c) => c.calculation_type === 'hydraulics');

  // Detect whether room dimensions have changed since last heat loss calculation
  const isHeatLossOutdated = useMemo(() => {
    if (!heatLossCalc || !heatLossCalc.input_parameters) return false;
    const inp = heatLossCalc.input_parameters;
    return (
      inp.length !== room.length ||
      inp.width !== room.width ||
      inp.height !== room.height ||
      inp.exterior_walls_count !== room.exterior_walls_count ||
      inp.t_inside !== room.desired_temp
    );
  }, [heatLossCalc, room.length, room.width, room.height, room.exterior_walls_count, room.desired_temp]);

  // Radiator form state
  const [selectedCatalogId, setSelectedCatalogId] = useState<number | ''>(
    catalogRadiators.length > 0 ? catalogRadiators[0].id : ''
  );
  const [radSupplyTemp, setRadSupplyTemp] = useState<number>(75);
  const [radReturnTemp, setRadReturnTemp] = useState<number>(65);
  const [userRadiatorQty, setUserRadiatorQty] = useState<number>(1);

  // Underfloor form state
  const [ufSpacing, setUfSpacing] = useState<number>(150);
  const [ufPattern, setUfPattern] = useState<'spiral' | 'serpentine'>('spiral');
  const [ufNumCircuits, setUfNumCircuits] = useState<number>(0);
  const [ufMaxCircuitLength, setUfMaxCircuitLength] = useState<number>(85);
  const [ufManifoldDistance, setUfManifoldDistance] = useState<number>(4);
  const [ufExcludedArea, setUfExcludedArea] = useState<number>(0);

  // Hydraulics form state
  const [hydSupplyTemp, setHydSupplyTemp] = useState<number>(75);
  const [hydReturnTemp, setHydReturnTemp] = useState<number>(65);
  const [hydPipeLength, setHydPipeLength] = useState<number>(20);
  const [hydPipeDia, setHydPipeDia] = useState<number>(20);

  useEffect(() => {
    if (catalogRadiators.length > 0 && !selectedCatalogId) {
      setSelectedCatalogId(catalogRadiators[0].id);
    }
  }, [catalogRadiators]);

  // Sync underfloor form state from saved calculation
  useEffect(() => {
    if (underfloorCalc?.input_parameters?.custom_num_circuits) {
      setUfNumCircuits(underfloorCalc.input_parameters.custom_num_circuits);
    } else if (room.underfloor_circuits && room.underfloor_circuits.length > 0) {
      setUfNumCircuits(room.underfloor_circuits.length);
    }
  }, [underfloorCalc, room.underfloor_circuits]);

  // Hisoblash funksiyalari
  const handleCalculateHeatLoss = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.calculateHeatLoss(room.id);
      onCalculationUpdated();
    } catch (err: any) {
      setError(err.message || "Issiqlik yo‘qotilishini hisoblashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateRadiator = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.calculateRadiator(room.id, {
        catalog_item_id: selectedCatalogId ? Number(selectedCatalogId) : undefined,
        t_supply: radSupplyTemp,
        t_return: radReturnTemp,
        quantity: userRadiatorQty > 0 ? userRadiatorQty : undefined,
      });
      onCalculationUpdated();
    } catch (err: any) {
      setError(err.message || "Radiator hisobida xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateUnderfloor = async () => {
    setLoading(true);
    setError(null);
    try {
      const excluded = ufExcludedArea > 0
        ? [{ name: "Mebel", width: Math.sqrt(ufExcludedArea), length: Math.sqrt(ufExcludedArea) }]
        : [];

      await api.calculateUnderfloor(room.id, {
        spacing_mm: ufSpacing,
        routing_pattern: ufPattern,
        max_circuit_length_m: ufMaxCircuitLength,
        manifold_distance_m: ufManifoldDistance,
        excluded_areas: excluded,
        custom_num_circuits: ufNumCircuits > 0 ? ufNumCircuits : undefined,
      });
      onCalculationUpdated();
    } catch (err: any) {
      setError(err.message || "Issiq pol hisobida xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateHydraulics = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.calculateHydraulics(room.id, {
        t_supply: hydSupplyTemp,
        t_return: hydReturnTemp,
        pipe_length_m: hydPipeLength,
        pipe_nominal_dia_mm: hydPipeDia,
      });
      onCalculationUpdated();
    } catch (err: any) {
      setError(err.message || "Gidravlik hisobda xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-full overflow-hidden">
      {/* Tablar sarlavhasi */}
      <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('heat_loss')}
          className={`flex items-center gap-1.5 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'heat_loss'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          Issiqlik yo‘qotilishi
        </button>

        <button
          onClick={() => setActiveTab('radiator')}
          className={`flex items-center gap-1.5 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'radiator'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Thermometer className="w-3.5 h-3.5 text-red-500" />
          Radiator
        </button>

        <button
          onClick={() => setActiveTab('underfloor')}
          className={`flex items-center gap-1.5 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'underfloor'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-blue-500" />
          Issiq pol
        </button>

        <button
          onClick={() => setActiveTab('hydraulics')}
          className={`flex items-center gap-1.5 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'hydraulics'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Gauge className="w-3.5 h-3.5 text-emerald-500" />
          Gidravlika
        </button>
      </div>

      {/* Xatolik xabari */}
      {error && (
        <div className="p-3 bg-red-50 border-b border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Kontenti */}
      <div className="p-4 overflow-y-auto flex-1 space-y-4">
        {/* TAB 1: ISSIQLIK YO'QOTILISHI */}
        {activeTab === 'heat_loss' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Issiqlik yo‘qotilishi hisobi</h3>
                <p className="text-xs text-slate-500">Q = Σ(U × A × ΔT) + Q_vent</p>
              </div>
              <button
                onClick={handleCalculateHeatLoss}
                disabled={loading}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Hisoblanmoqda...' : 'Hisoblash'}
              </button>
            </div>

            {isHeatLossOutdated && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="leading-snug">
                    <b>Eslatma:</b> Xona o‘lchamlari yoki harorati o‘zgargan. Yangi parametrlarga moslash uchun qayta hisoblang.
                  </span>
                </div>
                <button
                  onClick={handleCalculateHeatLoss}
                  disabled={loading}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shrink-0 transition-colors shadow-xs"
                >
                  Qayta hisoblash
                </button>
              </div>
            )}

            {heatLossCalc ? (
              <div className="space-y-3">
                {/* Asosiy natijalar kartochkalari */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                    <div className="text-[11px] text-blue-700 font-medium">Umumiy yo‘qotilish</div>
                    <div className="text-xl font-extrabold text-blue-900">
                      {heatLossCalc.output_results.total_heat_loss_w?.toFixed(0)} <span className="text-xs font-normal">Vt</span>
                    </div>
                    <div className="text-[10px] text-blue-600 mt-0.5">
                      Transmissiya: {heatLossCalc.output_results.transmission_loss_w?.toFixed(0)} Vt | Shamollatish: {heatLossCalc.output_results.ventilation_loss_w?.toFixed(0)} Vt
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="text-[11px] text-slate-600 font-medium">Solishtirma quvvat</div>
                    <div className="text-xl font-extrabold text-slate-900">
                      {heatLossCalc.output_results.specific_heat_loss_w_m2?.toFixed(1)} <span className="text-xs font-normal">Vt/m²</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      ΔT = {heatLossCalc.output_results.delta_t} K (+{room.desired_temp}°C ichki)
                    </div>
                  </div>
                </div>

                {/* Elementlar bo'yicha tahlil jadvali */}
                {heatLossCalc.output_results.elements_breakdown && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-1.5">Konstruksiya elementlari tahlili:</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="py-2 px-2.5 text-left font-semibold">Element</th>
                            <th className="py-2 px-2 text-right font-semibold">Maydon (m²)</th>
                            <th className="py-2 px-2 text-right font-semibold">U (Vt/m²K)</th>
                            <th className="py-2 px-2.5 text-right font-semibold">Yo‘qotilish</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {heatLossCalc.output_results.elements_breakdown.map((el: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="py-1.5 px-2.5 text-slate-800">{el.element}</td>
                              <td className="py-1.5 px-2 text-right text-slate-600">{el.area_m2?.toFixed(1)}</td>
                              <td className="py-1.5 px-2 text-right text-slate-600">{el.u_value?.toFixed(2)}</td>
                              <td className="py-1.5 px-2.5 text-right font-bold text-slate-900">{el.heat_loss_w?.toFixed(0)} Vt</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Farazlar va ogohlantirishlar */}
                {heatLossCalc.assumptions && heatLossCalc.assumptions.length > 0 && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <div className="font-semibold text-slate-700 flex items-center gap-1">
                      <Info className="w-3 h-3 text-blue-500" />
                      Qabul qilingan hisobiy farazlar:
                    </div>
                    {heatLossCalc.assumptions.map((a: string, i: number) => (
                      <p key={i}>• {a}</p>
                    ))}
                  </div>
                )}

                {heatLossCalc.warnings && heatLossCalc.warnings.length > 0 && (
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-800 space-y-1">
                    <div className="font-semibold text-amber-900 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      Muhandislik ogohlantirishi:
                    </div>
                    {heatLossCalc.warnings.map((w: string, i: number) => (
                      <p key={i}>• {w}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                Ushbu xona uchun hali issiqlik yo‘qotilishi hisoblanmagan. "Hisoblash" tugmasini bosing.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RADIATOR HISOBI */}
        {activeTab === 'radiator' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Radiator quvvatini tanlash (EN 442)</h3>
              <p className="text-xs text-slate-500">Haqiqiy harorat rejimiga qarab quvvatni korreksiya qilish</p>
            </div>

            {/* Form parametrlari */}
            <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Radiator modeli (katalogdan)</label>
                <select
                  value={selectedCatalogId}
                  onChange={(e) => setSelectedCatalogId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-800"
                >
                  {catalogRadiators.map((rad) => (
                    <option key={rad.id} value={rad.id}>
                      {rad.manufacturer} {rad.model_name} — {rad.rated_power_w} Vt (ΔT=50K)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Uzatish harorati (°C)</label>
                  <NumericInput
                    value={radSupplyTemp}
                    onChange={(val) => setRadSupplyTemp(val)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Qaytish harorati (°C)</label>
                  <NumericInput
                    value={radReturnTemp}
                    onChange={(val) => setRadReturnTemp(val)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Radiatorlar soni (dona)</label>
                <NumericInput
                  min={1}
                  value={userRadiatorQty}
                  onChange={(val) => setUserRadiatorQty(val)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <button
                onClick={handleCalculateRadiator}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? 'Hisoblanmoqda...' : 'Radiatorni hisoblash va saqlash'}
              </button>
            </div>

            {/* Natijalar */}
            {radiatorCalc && (
              <div className="space-y-3">
                <div className="p-3 bg-red-50/80 border border-red-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-red-700">Umumiy ta’minlangan quvvat</span>
                    <span className="text-[11px] font-bold text-red-600">
                      Zaxira: {radiatorCalc.output_results.power_reserve_percent > 0 ? '+' : ''}
                      {radiatorCalc.output_results.power_reserve_percent}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-red-900 mt-1">
                    {radiatorCalc.output_results.total_provided_power_w} <span className="text-sm font-normal">Vt</span>
                  </div>
                  <div className="text-[11px] text-red-700 mt-1">
                    Bitta radiator haqiqiy quvvati: <b>{radiatorCalc.output_results.actual_power_per_unit_w} Vt</b> (nominal {radiatorCalc.output_results.model_info?.rated_power_w} Vt)
                  </div>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                  <div>• Haqiqiy harorat farqi: <b>ΔT = {radiatorCalc.output_results.effective_delta_t} K</b></div>
                  <div>• Quvvat pasayish koeffitsiyenti: <b>k = {radiatorCalc.output_results.correction_factor}</b></div>
                  <div>• Tavsiya etilgan soni: <b>{radiatorCalc.output_results.recommended_quantity} dona</b></div>
                  <div>• Taxminiy truba sarfi: <b>{radiatorCalc.output_results.estimated_pipe_length_m} metr</b></div>
                </div>

                {radiatorCalc.warnings && radiatorCalc.warnings.length > 0 && (
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-800">
                    {radiatorCalc.warnings.map((w: string, i: number) => (
                      <p key={i}>• {w}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ISSIQ POL HISOBI */}
        {activeTab === 'underfloor' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Issiq pol tizimi (EN 1264)</h3>
              <p className="text-xs text-slate-500">Truba uzunligi, konturlar bo‘linishi va kollektor chiqishlari</p>
            </div>

            <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Truba qadami (mm)</label>
                  <select
                    value={ufSpacing}
                    onChange={(e) => setUfSpacing(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="100">100 mm (Zich - hammom/vitrina)</option>
                    <option value="150">150 mm (Standart tavsiya)</option>
                    <option value="200">200 mm (Tejamkor / Markaz)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sxema turi</label>
                  <select
                    value={ufPattern}
                    onChange={(e) => setUfPattern(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="spiral">Chig‘anoq (spiral / улитка)</option>
                    <option value="serpentine">Ilon izi (serpentine / змейка)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Konturlar soni (bo‘linishi)
                </label>
                <select
                  value={ufNumCircuits}
                  onChange={(e) => setUfNumCircuits(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold text-blue-900 focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Avtomatik hisoblash (me‘yor bo‘yicha)</option>
                  <option value={1}>1 ta kontur (bitta yaxlit zona)</option>
                  <option value={2}>2 ta konturga bo‘lish</option>
                  <option value={3}>3 ta konturga bo‘lish</option>
                  <option value={4}>4 ta konturga bo‘lish</option>
                  <option value={5}>5 ta konturga bo‘lish</option>
                  <option value={6}>6 ta konturga bo‘lish</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Xonani nechta alohida konturga ajratishni tanlashingiz mumkin.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Maks. kontur uzunligi (m)</label>
                  <NumericInput
                    value={ufMaxCircuitLength}
                    onChange={(val) => setUfMaxCircuitLength(val)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Kollektorgacha masofa (m)</label>
                  <NumericInput
                    value={ufManifoldDistance}
                    onChange={(val) => setUfManifoldDistance(val)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Isitilmaydigan mebel maydoni (m²)</label>
                <NumericInput
                  step={0.5}
                  value={ufExcludedArea}
                  onChange={(val) => setUfExcludedArea(val)}
                  placeholder="Shkaf yoki oshxona mebeli osti"
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <button
                onClick={handleCalculateUnderfloor}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? 'Hisoblanmoqda...' : 'Issiq pol konturlarini hisoblash'}
              </button>
            </div>

            {underfloorCalc && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="text-blue-700 font-medium">Jami truba uzunligi</div>
                    <div className="text-xl font-bold text-blue-900">
                      {underfloorCalc.output_results.total_pipe_length_m} <span className="text-xs font-normal">m</span>
                    </div>
                    <div className="text-[10px] text-blue-600">
                      Pol ichida: {underfloorCalc.output_results.estimated_floor_pipe_length_m} m
                    </div>
                  </div>

                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="text-emerald-700 font-medium">Konturlar soni</div>
                    <div className="text-xl font-bold text-emerald-900">
                      {underfloorCalc.output_results.num_circuits} <span className="text-xs font-normal">ta</span>
                    </div>
                    <div className="text-[10px] text-emerald-600">
                      O‘rtacha: {underfloorCalc.output_results.average_circuit_length_m} m / kontur
                    </div>
                  </div>
                </div>

                {underfloorCalc.warnings && underfloorCalc.warnings.length > 0 && (
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-800">
                    {underfloorCalc.warnings.map((w: string, i: number) => (
                      <p key={i}>• {w}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: GIDRAVLIKA */}
        {activeTab === 'hydraulics' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Gidravlik hisoblash va truba diametri</h3>
              <p className="text-xs text-slate-500">Suv sarfi m_dot = Q / (cp × ΔT), tezlik va bosim yo‘qotilishi</p>
            </div>

            <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Uzatish harorati (°C)</label>
                  <NumericInput
                    value={hydSupplyTemp}
                    onChange={(val) => setHydSupplyTemp(val)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Qaytish harorati (°C)</label>
                  <NumericInput
                    value={hydReturnTemp}
                    onChange={(val) => setHydReturnTemp(val)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Truba uzunligi (m)</label>
                  <NumericInput
                    value={hydPipeLength}
                    onChange={(val) => setHydPipeLength(val)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Sinov diametri (mm)</label>
                  <select
                    value={hydPipeDia}
                    onChange={(e) => setHydPipeDia(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="16">16x2.0 mm (ichki 12 mm)</option>
                    <option value="20">20x2.0 mm (ichki 16 mm)</option>
                    <option value="25">25x2.3 mm (ichki 20.4 mm)</option>
                    <option value="32">32x2.9 mm (ichki 26.2 mm)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleCalculateHydraulics}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? 'Hisoblanmoqda...' : 'Gidravlikani hisoblash'}
              </button>
            </div>

            {hydraulicsCalc && (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs">
                  <div className="text-emerald-800 font-semibold mb-1">Tavsiya etilgan optimal quvur:</div>
                  <div className="text-xl font-bold text-emerald-950">
                    {hydraulicsCalc.output_results.recommended_pipe}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-1">
                    Suv sarfi: <b>{hydraulicsCalc.output_results.volume_flow_l_h} l/soat</b> ({hydraulicsCalc.output_results.volume_flow_m3_h} m³/soat) | Tezlik: <b>{hydraulicsCalc.output_results.velocity_m_s} m/s</b>
                  </div>
                </div>

                {/* Variantlar taqqoslash jadvali */}
                {hydraulicsCalc.output_results.pipe_options && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-1.5">Standart diametrlar taqqoslashi:</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px]">
                      <table className="w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="py-1.5 px-2 text-left">Quvur</th>
                            <th className="py-1.5 px-1.5 text-right">Tezlik</th>
                            <th className="py-1.5 px-1.5 text-right">Bosim yo‘q.</th>
                            <th className="py-1.5 px-2 text-center">Holat</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {hydraulicsCalc.output_results.pipe_options.map((opt: any, idx: number) => (
                            <tr key={idx} className={opt.status === 'optimal' ? 'bg-emerald-50/50' : ''}>
                              <td className="py-1.5 px-2 font-medium text-slate-800">{opt.pipe_name}</td>
                              <td className="py-1.5 px-1.5 text-right">{opt.velocity_m_s} m/s</td>
                              <td className="py-1.5 px-1.5 text-right">{opt.total_pressure_loss_kpa} kPa</td>
                              <td className="py-1.5 px-2 text-center">
                                {opt.status === 'optimal' ? (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">Optimal</span>
                                ) : opt.status === 'too_small' ? (
                                  <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px]">Tor</span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">Katta</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {hydraulicsCalc.warnings && hydraulicsCalc.warnings.length > 0 && (
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-800">
                    {hydraulicsCalc.warnings.map((w: string, i: number) => (
                      <p key={i}>• {w}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
