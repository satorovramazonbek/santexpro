import React, { useState, useEffect } from 'react';
import { Building, Project } from '../../types';
import {
  CLIMATE_ZONES,
  WALL_BASE_MATERIALS,
  INSULATION_MATERIALS,
  CEILING_PRESETS,
  FLOOR_PRESETS,
  WINDOW_PRESETS,
  DOOR_PRESETS,
  calculateWallThermalProperties,
} from '../../rules/buildingConstructionRules';
import {
  Building2,
  X,
  Save,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { NumericInput } from '../common/NumericInput';

interface BuildingEnvelopeModalProps {
  project: Project;
  building?: Building;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Building> & { sync_rooms?: boolean }) => Promise<void>;
}

export const BuildingEnvelopeModal: React.FC<BuildingEnvelopeModalProps> = ({
  project,
  building,
  isOpen,
  onClose,
  onSave,
}) => {
  const [buildingType, setBuildingType] = useState<string>(building?.building_type || 'residential_house');
  const [floorsCount, setFloorsCount] = useState<number>(building?.floors_count || 1);
  const [climateZone, setClimateZone] = useState<string>(building?.climate_zone || 'tashkent');

  // Devor
  const [wallBaseMaterial, setWallBaseMaterial] = useState<string>(building?.wall_base_material || 'brick_380');
  const [insulationMaterial, setInsulationMaterial] = useState<string>(building?.insulation_material || 'eps');
  const [insulationThicknessMm, setInsulationThicknessMm] = useState<number>(building?.insulation_thickness_mm ?? 50);

  // Shift & Pol presets
  const [ceilingPreset, setCeilingPreset] = useState<string>('concrete_slab_wool_100');
  const [floorPreset, setFloorPreset] = useState<string>('ground_slab_xps_50');

  // Oyna & Eshik presets
  const [windowPreset, setWindowPreset] = useState<string>('double_low_e');
  const [doorPreset, setDoorPreset] = useState<string>('insulated_metal');

  // Custom U values
  const [customWallU, setCustomWallU] = useState<number>(building?.default_wall_u || 0.45);
  const [customCeilingU, setCustomCeilingU] = useState<number>(building?.default_ceiling_u || 0.35);
  const [customFloorU, setCustomFloorU] = useState<number>(building?.default_floor_u || 0.35);
  const [customWindowU, setCustomWindowU] = useState<number>(building?.default_window_u || 1.8);
  const [customDoorU, setCustomDoorU] = useState<number>(building?.default_door_u || 2.0);

  const [useAutoWallCalc, setUseAutoWallCalc] = useState<boolean>(true);
  const [syncRooms, setSyncRooms] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Dinamik devor hisobi
  const calcWall = calculateWallThermalProperties(
    wallBaseMaterial,
    insulationMaterial,
    insulationThicknessMm
  );

  const selectedClimate = CLIMATE_ZONES[climateZone] || CLIMATE_ZONES.tashkent;
  const activeWallU = useAutoWallCalc ? calcWall.u_value : customWallU;
  const activeWallR = Number((1.0 / activeWallU).toFixed(2));
  const isWallCompliant = activeWallR >= (selectedClimate.r_req_wall * 0.95);

  // Synchronize custom values when presets change
  useEffect(() => {
    if (CEILING_PRESETS[ceilingPreset]) {
      setCustomCeilingU(CEILING_PRESETS[ceilingPreset].u_value);
    }
  }, [ceilingPreset]);

  useEffect(() => {
    if (FLOOR_PRESETS[floorPreset]) {
      setCustomFloorU(FLOOR_PRESETS[floorPreset].u_value);
    }
  }, [floorPreset]);

  useEffect(() => {
    if (WINDOW_PRESETS[windowPreset]) {
      setCustomWindowU(WINDOW_PRESETS[windowPreset].u_value);
    }
  }, [windowPreset]);

  useEffect(() => {
    if (DOOR_PRESETS[doorPreset]) {
      setCustomDoorU(DOOR_PRESETS[doorPreset].u_value);
    }
  }, [doorPreset]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const wallDesc = useAutoWallCalc ? calcWall.description : `Maxsus devor (U=${customWallU})`;
      const ceilingDesc = CEILING_PRESETS[ceilingPreset]?.name || `Shift (U=${customCeilingU})`;
      const floorDesc = FLOOR_PRESETS[floorPreset]?.name || `Pol (U=${customFloorU})`;
      const windowDesc = WINDOW_PRESETS[windowPreset]?.name || `Oyna (U=${customWindowU})`;

      await onSave({
        building_type: buildingType,
        floors_count: floorsCount,
        climate_zone: climateZone,
        wall_base_material: wallBaseMaterial,
        insulation_material: insulationMaterial,
        insulation_thickness_mm: insulationThicknessMm,
        wall_material_description: wallDesc,
        ceiling_material_description: ceilingDesc,
        floor_material_description: floorDesc,
        window_description: windowDesc,
        default_wall_u: activeWallU,
        default_ceiling_u: customCeilingU,
        default_floor_u: customFloorU,
        default_window_u: customWindowU,
        default_door_u: customDoorU,
        sync_rooms: syncRooms,
      });
      onClose();
    } catch (err: any) {
      alert("Saqlashda xatolik: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Bino Konstruksiyasi va Issiqlik Himoyasi</h3>
              <p className="text-xs text-slate-300">
                KMK 2.01.04-97 & ShNK 2.04.05-97 me’yoriy parametrlarini loyihaga sozlash
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
          {/* 1-Bo'lim: Bino turi va Hudud */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
              Bino me’moriy turi va iqlim hududi
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bino turi</label>
                <select
                  value={buildingType}
                  onChange={(e) => setBuildingType(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="residential_house">Hovli uy / Kottej</option>
                  <option value="apartment">Ko‘p qavatli bino xonadoni</option>
                  <option value="commercial">Tijorat / Ofis binosi</option>
                  <option value="industrial">Sanoat / Ishlab chiqarish</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Qavatlar soni</label>
                <NumericInput
                  min={1}
                  max={20}
                  fallbackValue={1}
                  value={floorsCount}
                  onChange={(val) => setFloorsCount(val)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Iqlim hududi (O‘zbekiston)</label>
                <select
                  value={climateZone}
                  onChange={(e) => setClimateZone(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  {Object.values(CLIMATE_ZONES).map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} (t_ext: {z.t_ext}°C)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
              <span>
                Tanlangan hudud bo‘yicha talab etiladigan me’yoriy devor qarshiligi: <b>R_talab = {selectedClimate.r_req_wall} m²·K/Vt</b>
              </span>
              <span className="text-blue-600 font-semibold">t_ext = {selectedClimate.t_ext}°C</span>
            </div>
          </div>

          {/* 2-Bo'lim: Tashqi Devor Konstruksiyasi va KMK Kalkulyatori */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
                Tashqi Devor Konstruksiyasi (KMK 2.01.04-97 qatlamlar hisobi)
              </h4>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAutoWallCalc}
                  onChange={(e) => setUseAutoWallCalc(e.target.checked)}
                  className="rounded text-blue-600"
                />
                Qatlamlardan avto-hisoblash
              </label>
            </div>

            {useAutoWallCalc ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Asosiy devor materiali</label>
                    <select
                      value={wallBaseMaterial}
                      onChange={(e) => setWallBaseMaterial(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      {Object.values(WALL_BASE_MATERIALS).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Izolyatsiya turi</label>
                    <select
                      value={insulationMaterial}
                      onChange={(e) => setInsulationMaterial(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      {Object.values(INSULATION_MATERIALS).map((ins) => (
                        <option key={ins.id} value={ins.id}>
                          {ins.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Izolyatsiya qalinligi (mm)</label>
                    <select
                      value={insulationThicknessMm}
                      disabled={insulationMaterial === 'none'}
                      onChange={(e) => setInsulationThicknessMm(Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="0">0 mm (izolyatsiyasiz)</option>
                      <option value="30">30 mm</option>
                      <option value="50">50 mm (standart)</option>
                      <option value="80">80 mm</option>
                      <option value="100">100 mm (energiya samarador)</option>
                      <option value="150">150 mm (passiv uy)</option>
                    </select>
                  </div>
                </div>

                {/* Hisoblangan natija kartochkasi */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  isWallCompliant ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">
                      Konstruksiya: {calcWall.description}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Devor issiqlik qarshiligi: <b>R₀ = {calcWall.r_value} m²·K/Vt</b> | U-koeffitsiyenti: <b>{calcWall.u_value} Vt/(m²·K)</b>
                    </div>
                  </div>

                  <div className="text-right">
                    {isWallCompliant ? (
                      <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" /> KMK Me’yoriga mos
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-white px-2.5 py-1 rounded-lg border border-amber-200">
                        <ShieldAlert className="w-4 h-4 text-amber-600" /> Me’yordan past (izolyatsiyani oshiring)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Maxsus Devor U-koeffitsiyenti (Vt/m²·K)</label>
                <NumericInput
                  min={0.1}
                  max={5.0}
                  step={0.01}
                  fallbackValue={0.45}
                  value={customWallU}
                  onChange={(val) => setCustomWallU(val)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm max-w-xs"
                />
              </div>
            )}
          </div>

          {/* 3-Bo'lim: Shift va Pol Konstruksiyasi */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">3</span>
              Shift / Tom va Pol / Zamin Konstruksiyasi
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Shift / Tom konstruksiyasi</label>
                <select
                  value={ceilingPreset}
                  onChange={(e) => setCeilingPreset(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white mb-2"
                >
                  {Object.values(CEILING_PRESETS).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (U={p.u_value})
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>Shift U koeffitsiyenti:</span>
                  <NumericInput
                    min={0.05}
                    max={5.0}
                    step={0.01}
                    fallbackValue={0.35}
                    value={customCeilingU}
                    onChange={(val) => setCustomCeilingU(val)}
                    className="w-24 p-1 border border-slate-300 rounded bg-white"
                  />
                  <span>Vt/m²·K</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pol / Zamin konstruksiyasi</label>
                <select
                  value={floorPreset}
                  onChange={(e) => setFloorPreset(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white mb-2"
                >
                  {Object.values(FLOOR_PRESETS).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (U={p.u_value})
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>Pol U koeffitsiyenti:</span>
                  <NumericInput
                    min={0.05}
                    max={5.0}
                    step={0.01}
                    fallbackValue={0.35}
                    value={customFloorU}
                    onChange={(val) => setCustomFloorU(val)}
                    className="w-24 p-1 border border-slate-300 rounded bg-white"
                  />
                  <span>Vt/m²·K</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Bo'lim: Oyna va Eshiklar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">4</span>
              Oynalar va Tashqi Eshiklar Turi
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Standart oyna turi</label>
                <select
                  value={windowPreset}
                  onChange={(e) => setWindowPreset(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white mb-2"
                >
                  {Object.values(WINDOW_PRESETS).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (U={p.u_value})
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>Oyna U koeffitsiyenti:</span>
                  <NumericInput
                    min={0.5}
                    max={6.0}
                    step={0.1}
                    fallbackValue={1.8}
                    value={customWindowU}
                    onChange={(val) => setCustomWindowU(val)}
                    className="w-24 p-1 border border-slate-300 rounded bg-white"
                  />
                  <span>Vt/m²·K</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Standart tashqi eshik turi</label>
                <select
                  value={doorPreset}
                  onChange={(e) => setDoorPreset(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white mb-2"
                >
                  {Object.values(DOOR_PRESETS).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (U={p.u_value})
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>Eshik U koeffitsiyenti:</span>
                  <NumericInput
                    min={0.5}
                    max={6.0}
                    step={0.1}
                    fallbackValue={2.0}
                    value={customDoorU}
                    onChange={(val) => setCustomDoorU(val)}
                    className="w-24 p-1 border border-slate-300 rounded bg-white"
                  />
                  <span>Vt/m²·K</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sinxronlash opsiyasi */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3">
            <input
              type="checkbox"
              id="syncRoomsCheck"
              checked={syncRooms}
              onChange={(e) => setSyncRooms(e.target.checked)}
              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="syncRoomsCheck" className="text-xs text-slate-700 cursor-pointer">
              <b className="text-blue-900 block mb-0.5">Loyiha xonalari bilan sinxronlash</b>
              Ushbu yangi issiqlik koeffitsiyentlarini (devor, shift, pol, oyna) loyihadagi barcha xonalarga avtomatik tatbiq qilish va issiqlik yo‘qotilishini yangilash.
            </label>
          </div>

          {/* Pastki tugmalar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saqlanmoqda..." : "Konstruksiyani saqlash"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
