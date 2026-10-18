/**
 * SantexPro Bino Konstruksiyasi va Issiqlik Himoyasi Qoidalari
 * Me'yoriy asos:
 * - KMK 2.01.04-97 "Qurilish issiqlik texnikasi"
 * - ShNK 2.04.05-97 "Isitish, shamollatish va havoni mo'tadillash"
 * - EN 12831 / ISO 6946 "Building components and elements - Thermal resistance and thermal transmittance"
 */

export interface ClimateZoneInfo {
  id: string;
  name: string;
  t_ext: number; // Tashqi hisobiy harorat (°C)
  r_req_wall: number; // Talab etiladigan issiqlik qarshiligi R_talab (m²·K/Vt)
  r_req_ceiling: number;
  r_req_floor: number;
}

export interface WallMaterialInfo {
  id: string;
  name: string;
  thickness_mm: number;
  lambda: number; // Vt/(m·K)
}

export interface InsulationMaterialInfo {
  id: string;
  name: string;
  lambda: number; // Vt/(m·K)
}

export interface PresetElementInfo {
  id: string;
  name: string;
  u_value: number; // Vt/(m²·K)
  r_value: number; // m²·K/Vt
  description?: string;
}

// O'zbekiston hududlari bo'yicha me'yoriy iqlim ko'rsatkichlari (KMK 2.01.04-97)
export const CLIMATE_ZONES: Record<string, ClimateZoneInfo> = {
  tashkent: {
    id: 'tashkent',
    name: "Toshkent shahri va viloyati",
    t_ext: -15.0,
    r_req_wall: 2.45,
    r_req_ceiling: 3.50,
    r_req_floor: 2.80,
  },
  samarkand: {
    id: 'samarkand',
    name: "Samarqand viloyati",
    t_ext: -12.0,
    r_req_wall: 2.30,
    r_req_ceiling: 3.30,
    r_req_floor: 2.60,
  },
  fergana: {
    id: 'fergana',
    name: "Farg‘ona, Andijon, Namangan viloyatlari",
    t_ext: -13.0,
    r_req_wall: 2.35,
    r_req_ceiling: 3.35,
    r_req_floor: 2.65,
  },
  bukhara: {
    id: 'bukhara',
    name: "Buxoro va Navoiy viloyatlari",
    t_ext: -13.0,
    r_req_wall: 2.35,
    r_req_ceiling: 3.35,
    r_req_floor: 2.65,
  },
  nukus: {
    id: 'nukus',
    name: "Qoraqalpog‘iston Respublikasi (Nukus)",
    t_ext: -19.0,
    r_req_wall: 2.70,
    r_req_ceiling: 3.80,
    r_req_floor: 3.10,
  },
  khorezm: {
    id: 'khorezm',
    name: "Xorazm viloyati (Urganch)",
    t_ext: -16.0,
    r_req_wall: 2.50,
    r_req_ceiling: 3.60,
    r_req_floor: 2.90,
  },
  kashkadarya: {
    id: 'kashkadarya',
    name: "Qashqadaryo va Surxondaryo (Qarshi, Termiz)",
    t_ext: -10.0,
    r_req_wall: 2.15,
    r_req_ceiling: 3.10,
    r_req_floor: 2.40,
  },
  jizzakh: {
    id: 'jizzakh',
    name: "Jizzax va Sirdaryo viloyatlari",
    t_ext: -14.0,
    r_req_wall: 2.40,
    r_req_ceiling: 3.45,
    r_req_floor: 2.75,
  },
};

// Asosiy devor materiallari
export const WALL_BASE_MATERIALS: Record<string, WallMaterialInfo> = {
  brick_380: {
    id: 'brick_380',
    name: "Pishgan qizil g‘isht (380 mm - 1.5 g‘isht)",
    thickness_mm: 380,
    lambda: 0.70,
  },
  brick_510: {
    id: 'brick_510',
    name: "Pishgan qizil g‘isht (510 mm - 2 g‘isht)",
    thickness_mm: 510,
    lambda: 0.70,
  },
  silicate_380: {
    id: 'silicate_380',
    name: "Silikat oq g‘isht (380 mm)",
    thickness_mm: 380,
    lambda: 0.87,
  },
  gas_block_300: {
    id: 'gas_block_300',
    name: "Avtoklav gazoblok D500 (300 mm)",
    thickness_mm: 300,
    lambda: 0.15,
  },
  gas_block_400: {
    id: 'gas_block_400',
    name: "Avtoklav gazoblok D500 (400 mm)",
    thickness_mm: 400,
    lambda: 0.15,
  },
  foam_block_300: {
    id: 'foam_block_300',
    name: "Penoblok D600 (300 mm)",
    thickness_mm: 300,
    lambda: 0.20,
  },
  cinder_block_400: {
    id: 'cinder_block_400',
    name: "Shlakoblok / Beton blok (400 mm)",
    thickness_mm: 400,
    lambda: 0.52,
  },
  adobe_pakhsa_450: {
    id: 'adobe_pakhsa_450',
    name: "Paxsa / Somonli guvalak devor (450 mm)",
    thickness_mm: 450,
    lambda: 0.55,
  },
  concrete_monolith_250: {
    id: 'concrete_monolith_250',
    name: "Monolit temir-beton (250 mm)",
    thickness_mm: 250,
    lambda: 1.92,
  },
};

// Izolyatsiya materiallari
export const INSULATION_MATERIALS: Record<string, InsulationMaterialInfo> = {
  none: {
    id: 'none',
    name: "Izolyatsiyasiz (faqat qora/oq suvoq)",
    lambda: 0.80,
  },
  eps: {
    id: 'eps',
    name: "Penopolistirol (Penoplast / EPS-25)",
    lambda: 0.039,
  },
  xps: {
    id: 'xps',
    name: "Ekstrudirovanniy penopolistirol (Penopleks / XPS)",
    lambda: 0.031,
  },
  mineral_wool: {
    id: 'mineral_wool',
    name: "Bazalt mineral vatasi (Rockwool)",
    lambda: 0.038,
  },
  ppu: {
    id: 'ppu',
    name: "Purkama penopoliuretan (PPU)",
    lambda: 0.026,
  },
};

// Tom / Shift konstruksiyalari
export const CEILING_PRESETS: Record<string, PresetElementInfo> = {
  concrete_slab_wool_100: {
    id: 'concrete_slab_wool_100',
    name: "Temir-beton plita + 100 mm mineral vata",
    u_value: 0.35,
    r_value: 2.85,
    description: "Zamonaviy ko‘p qavatli va kottejlar uchun standart issiq shift",
  },
  concrete_slab_wool_150: {
    id: 'concrete_slab_wool_150',
    name: "Temir-beton plita + 150 mm mineral vata",
    u_value: 0.24,
    r_value: 4.16,
    description: "A+ Energiya tejamkor tom yopmasi (KMK me'yoridan yuqori)",
  },
  wood_beam_wool_100: {
    id: 'wood_beam_wool_100',
    name: "Yog‘och to‘sinli shift + 100 mm bazalt vata",
    u_value: 0.36,
    r_value: 2.77,
    description: "Hovli uylarda to‘sinli orayopma uchun optimal izolyatsiya",
  },
  wood_beam_clay_straw: {
    id: 'wood_beam_clay_straw',
    name: "An’anaviy yog‘och shift + loy-somon to‘shama",
    u_value: 0.75,
    r_value: 1.33,
    description: "Eski hovli uylar (qo‘shimcha izolyatsiya tavsiya etiladi)",
  },
  mansard_wool_150: {
    id: 'mansard_wool_150',
    name: "Mansarda tomi (cherepitsa + 150 mm bazalt vata)",
    u_value: 0.25,
    r_value: 4.00,
    description: "Isitiladigan mansarda qavati tomi",
  },
  concrete_slab_uninsulated: {
    id: 'concrete_slab_uninsulated',
    name: "Izolyatsiyasiz temir-beton plita",
    u_value: 1.85,
    r_value: 0.54,
    description: "Sovuq beton shift (katta issiqlik yo‘qotilishi)",
  },
};

// Pol / Poydevor konstruksiyalari
export const FLOOR_PRESETS: Record<string, PresetElementInfo> = {
  ground_slab_xps_50: {
    id: 'ground_slab_xps_50',
    name: "Zamin usti beton styajka + 50 mm penopleks XPS",
    u_value: 0.34,
    r_value: 2.94,
    description: "Issiq pol (Tyoply pol) uchun rasmiy me'yoriy asos (EN 1264, KMK)",
  },
  ground_slab_xps_30: {
    id: 'ground_slab_xps_30',
    name: "Zamin usti beton styajka + 30 mm penopleks XPS",
    u_value: 0.48,
    r_value: 2.08,
    description: "Issiq pol uchun minimal ruxsat etilgan izolyatsiya",
  },
  unheated_basement_wool_50: {
    id: 'unheated_basement_wool_50',
    name: "Isitilmaydigan podval usti orayopma + 50 mm izolyatsiya",
    u_value: 0.38,
    r_value: 2.63,
    description: "Podvalli kottejlarda 1-qavat poli",
  },
  ground_slab_uninsulated: {
    id: 'ground_slab_uninsulated',
    name: "Zamin ustidagi izolyatsiyasiz beton styajka",
    u_value: 0.85,
    r_value: 1.17,
    description: "Izolyatsiyasiz pol (yerga katta issiqlik ketishi)",
  },
};

// Oynalar turlari
export const WINDOW_PRESETS: Record<string, PresetElementInfo> = {
  double_low_e: {
    id: 'double_low_e',
    name: "2-qavatli energiya tejamkor Low-E (4-16Ar-4i)",
    u_value: 1.4,
    r_value: 0.71,
    description: "Zamonaviy imzo/akfa oynapaketlar (gaz to‘ldirilgan)",
  },
  double_standard: {
    id: 'double_standard',
    name: "2-qavatli standart oynapaket (4-16-4)",
    u_value: 2.0,
    r_value: 0.50,
    description: "Standart plastik deraza romlari",
  },
  triple_low_e: {
    id: 'triple_low_e',
    name: "3-qavatli energiya tejamkor Low-E (4-10Ar-4-10Ar-4i)",
    u_value: 1.0,
    r_value: 1.00,
    description: "Yuqori energiya samaradorlik sinfi",
  },
  single_glass: {
    id: 'single_glass',
    name: "1-qavatli oddiy shisha (eski yog‘och rom)",
    u_value: 5.2,
    r_value: 0.19,
    description: "Eski romlar (almashtirish talab etiladi)",
  },
};

// Eshiklar turlari
export const DOOR_PRESETS: Record<string, PresetElementInfo> = {
  insulated_metal: {
    id: 'insulated_metal',
    name: "Tashqi metall/plastik termo-eshik (izolyatsiyalangan)",
    u_value: 1.8,
    r_value: 0.55,
    description: "Mineral vata yoki penopoliuretan bilan to‘ldirilgan eshik",
  },
  wood_exterior: {
    id: 'wood_exterior',
    name: "Tashqi qattiq yog‘och eshik",
    u_value: 2.2,
    r_value: 0.45,
    description: "Klassik yog‘och kirish eshigi",
  },
  standard_metal: {
    id: 'standard_metal',
    name: "Standart metall eshik (yupqa izolyatsiya)",
    u_value: 2.8,
    r_value: 0.35,
    description: "Ko‘p qavatli uy kirish eshiklari",
  },
  balcony_pvc: {
    id: 'balcony_pvc',
    name: "Balkon shisha-plastik eshigi",
    u_value: 1.6,
    r_value: 0.62,
    description: "Oynapaketli balkon chiqish eshigi",
  },
};

/**
 * KMK 2.01.04-97 bo'yicha devorning to'liq issiqlik qarshiligi va U-koeffitsiyentini hisoblash
 * R_0 = R_si + R_devor + R_izolyatsiya + R_suvoq + R_se
 * U = 1 / R_0
 */
export function calculateWallThermalProperties(
  baseMaterialId: string,
  insulationMaterialId: string,
  insulationThicknessMm: number
): {
  r_value: number; // m²·K/Vt
  u_value: number; // Vt/(m²·K)
  description: string;
} {
  const R_si = 0.115; // Ichki sirt issiqlik qabul qilish qarshiligi (KMK)
  const R_se = 0.043; // Tashqi sirt issiqlik berish qarshiligi (KMK)

  const baseMat = WALL_BASE_MATERIALS[baseMaterialId] || WALL_BASE_MATERIALS.brick_380;
  const insulMat = INSULATION_MATERIALS[insulationMaterialId] || INSULATION_MATERIALS.eps;

  // Asosiy devor qatlami qarshiligi: delta / lambda
  const r_base = (baseMat.thickness_mm / 1000.0) / baseMat.lambda;

  // Izolyatsiya qatlami qarshiligi
  let r_insul = 0.0;
  if (insulationMaterialId !== 'none' && insulationThicknessMm > 0) {
    r_insul = (insulationThicknessMm / 1000.0) / insulMat.lambda;
  }

  // Ichki va tashqi suvoq (jami ~40 mm sement-qum/gips suvoq, lambda ~0.80)
  const r_plaster = 0.04 / 0.80; // ~0.05 m²·K/Vt

  const r_total = R_si + r_base + r_insul + r_plaster + R_se;
  const u_value = Number((1.0 / r_total).toFixed(2));
  const r_rounded = Number(r_total.toFixed(2));

  let desc = baseMat.name;
  if (insulationMaterialId !== 'none' && insulationThicknessMm > 0) {
    desc += ` + ${insulMat.name} (${insulationThicknessMm} mm)`;
  } else {
    desc += " (izolyatsiyasiz)";
  }

  return {
    r_value: r_rounded,
    u_value: u_value,
    description: desc,
  };
}
