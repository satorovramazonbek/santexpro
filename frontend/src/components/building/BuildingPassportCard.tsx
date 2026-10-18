import React from 'react';
import { Building, Project } from '../../types';
import {
  CLIMATE_ZONES,
  WALL_BASE_MATERIALS,
  INSULATION_MATERIALS,
} from '../../rules/buildingConstructionRules';
import {
  Building2,
  Layers,
  Thermometer,
  ShieldCheck,
  ShieldAlert,
  Edit3,
  CheckCircle2,
  Home,
  Sliders
} from 'lucide-react';

interface BuildingPassportCardProps {
  project: Project;
  building?: Building;
  onEditEnvelope: () => void;
}

export const BuildingPassportCard: React.FC<BuildingPassportCardProps> = ({
  project,
  building,
  onEditEnvelope,
}) => {
  const climate = CLIMATE_ZONES[building?.climate_zone || 'tashkent'] || CLIMATE_ZONES.tashkent;
  const wallU = building?.default_wall_u ?? 0.45;
  const wallR = Number((1.0 / wallU).toFixed(2));
  const isWallCompliant = wallR >= (climate.r_req_wall * 0.95);

  const ceilingU = building?.default_ceiling_u ?? 0.35;
  const ceilingR = Number((1.0 / ceilingU).toFixed(2));

  const floorU = building?.default_floor_u ?? 0.35;
  const floorR = Number((1.0 / floorU).toFixed(2));

  const windowU = building?.default_window_u ?? 1.8;
  const doorU = building?.default_door_u ?? 2.0;

  const buildingTypeNames: Record<string, string> = {
    residential_house: "Hovli uy / Kottej",
    apartment: "Ko‘p qavatli bino xonadoni",
    commercial: "Tijorat / Ofis binosi",
    industrial: "Sanoat / Ishlab chiqarish binosi",
  };

  const buildingTypeName = buildingTypeNames[building?.building_type || 'residential_house'] || "Hovli uy / Kottej";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Bino Konstruksiyasi va Issiqlik Himoyasi Pasporti
            </h3>
            <p className="text-xs text-slate-500">
              KMK 2.01.04-97 & ShNK 2.04.05-97 me’yoriy issiqlik texnikasi parametrlari
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onEditEnvelope}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200 shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5" />
            Konstruksiyani sozlash
          </button>
        </div>
      </div>

      {/* Asosiy ko'rsatkichlar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-xs">
        {/* Bino turi va iqlim */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">
              Bino va Hudud
            </span>
            <div className="font-bold text-slate-900 text-sm">{buildingTypeName}</div>
            <div className="text-slate-600 text-xs mt-0.5">
              {building?.floors_count || 1} qavatli • {climate.name}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-blue-600 font-medium">
            Tashqi hisobiy: <b>{project.outdoor_design_temp}°C</b>
          </div>
        </div>

        {/* Devor konstruksiyasi */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Devor Konstruksiyasi
              </span>
              {isWallCompliant ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" /> KMK Norma
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  <ShieldAlert className="w-3 h-3" /> Zaif
                </span>
              )}
            </div>
            <div className="font-semibold text-slate-800 text-xs line-clamp-2" title={building?.wall_material_description}>
              {building?.wall_material_description || "Standart g‘isht + penoplast"}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/60">
            <span className="text-slate-500">U = <b className="text-slate-800">{wallU}</b> Vt/m²K</span>
            <span className="text-slate-500">R₀ = <b className="text-slate-800">{wallR}</b> m²K/Vt</span>
          </div>
        </div>

        {/* Shift va Pol */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">
              Shift va Zamin (Pol)
            </span>
            <div className="text-[11px] text-slate-700 truncate" title={building?.ceiling_material_description}>
              Shift: <b className="text-slate-900">{building?.ceiling_material_description || "Beton plita + vata"}</b>
            </div>
            <div className="text-[11px] text-slate-700 truncate mt-0.5" title={building?.floor_material_description}>
              Pol: <b className="text-slate-900">{building?.floor_material_description || "Styajka + XPS penopleks"}</b>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/60">
            <span className="text-slate-500">U_shift: <b className="text-slate-800">{ceilingU}</b></span>
            <span className="text-slate-500">U_pol: <b className="text-slate-800">{floorU}</b></span>
          </div>
        </div>

        {/* Oynalar va Eshiklar */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">
              Oynalar va Tashqi Eshik
            </span>
            <div className="text-[11px] text-slate-700 truncate" title={building?.window_description}>
              Oyna: <b className="text-slate-900">{building?.window_description || "2-qavatli Low-E"}</b>
            </div>
            <div className="text-[11px] text-slate-700 truncate mt-0.5">
              Eshik: <b className="text-slate-900">Termo-izolyatsiyalangan</b>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/60">
            <span className="text-slate-500">U_oyna: <b className="text-slate-800">{windowU}</b></span>
            <span className="text-slate-500">U_eshik: <b className="text-slate-800">{doorU}</b></span>
          </div>
        </div>
      </div>
    </div>
  );
};
