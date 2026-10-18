"""
SantexPro Radiator Hisoblash Moduli (Radiator Engine)
EN 442 standartiga binoan radiatorning nominal quvvatini haqiqiy harorat rejimiga
moslab qayta hisoblash va xonaga mos radiatorlarni tanlash.
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import math


@dataclass
class RadiatorModelData:
    model_id: str
    manufacturer: str  # masalan: Korado, Purmo, Global, Fondital
    model_name: str  # masalan: Radik Klasik 22 500x1000
    radiator_type: str  # 'panel_22', 'panel_11', 'sectional_aluminum', 'sectional_bimetal'
    height_mm: int  # mm
    length_mm: int  # mm
    depth_mm: int  # mm
    rated_power_w: float  # Nominal quvvat Vt (odatda 75/65/20 rejimda, Delta T = 50K)
    rated_delta_t: float = 50.0  # K (standart EN 442 bo'yicha 50K)
    exponent_n: float = 1.30  # Radiator koeffitsiyenti (panel uchun ~1.30, alyuminiy uchun ~1.32)
    water_volume_l: float = 5.0  # Radiator ichidagi suv hajmi (litr)
    weight_kg: float = 25.0


@dataclass
class RadiatorSelectionInput:
    heat_demand_w: float  # Xonaning hisobiy issiqlik ehtiyoji (Vt)
    t_supply: float = 75.0  # Qozondan uzatish harorati (°C)
    t_return: float = 65.0  # Qaytish harorati (°C)
    t_room: float = 22.0  # Xona ichki harorati (°C)
    selected_model: Optional[RadiatorModelData] = None
    custom_rated_power_w: Optional[float] = None  # Agar katalogdan tanlanmagan bo'lsa
    custom_exponent_n: float = 1.30
    user_quantity: Optional[int] = None  # Foydalanuvchi belgilagan soni
    distance_to_riser_m: float = 3.5  # Truba o'tish masofasi (metr)


@dataclass
class RadiatorCalculationResult:
    heat_demand_w: float
    effective_delta_t: float  # Haqiqiy harorat farqi (K)
    correction_factor: float  # Quvvatni qayta hisoblash koeffitsiyenti
    actual_power_per_unit_w: float  # Bitta radiatorning haqiqiy quvvati
    recommended_quantity: int  # Tavsiya etiladigan soni
    total_provided_power_w: float  # Radiatorlarning umumiy haqiqiy quvvati
    power_reserve_percent: float  # Zaxira foizi
    model_info: Dict[str, Any]
    estimated_pipe_length_m: float  # Uzatish va qaytish trubasi umumiy uzunligi
    is_catalog_item: bool
    warnings: List[str]
    notes: List[str]


def calculate_effective_delta_t(t_supply: float, t_return: float, t_room: float) -> float:
    """
    O'rtacha logarifmik yoki arifmetik harorat farqi (K).
    EN 442 bo'yicha logarifmik Delta T ishlatiladi agar (t_s - t_r) katta bo'lsa,
    yoki arifmetik Delta T: ((t_s + t_r) / 2) - t_room.
    """
    dt_supply = t_supply - t_room
    dt_return = t_return - t_room

    if dt_supply <= 0 or dt_return <= 0:
        return 0.0

    # Agar uzatish va qaytish harorati teng bo'lsa
    if abs(dt_supply - dt_return) < 0.1:
        return dt_supply

    # Logarifmik harorat farqi EN 442 formulasi
    try:
        ln_dt = (dt_supply - dt_return) / math.log(dt_supply / dt_return)
        return round(ln_dt, 2)
    except (ValueError, ZeroDivisionError):
        return round(((t_supply + t_return) / 2.0) - t_room, 2)


def calculate_radiator_selection(inp: RadiatorSelectionInput) -> RadiatorCalculationResult:
    """
    Radiator quvvatini harorat rejimiga qarab hisoblash va xonaga moslash.
    """
    warnings: List[str] = []
    notes: List[str] = []

    if inp.heat_demand_w <= 0:
        raise ValueError("Xonaning issiqlik ehtiyoji noldan katta bo'lishi kerak.")

    delta_t = calculate_effective_delta_t(inp.t_supply, inp.t_return, inp.t_room)
    if delta_t <= 0:
        warnings.append(
            f"Isitish suvi harorati ({inp.t_supply}/{inp.t_return}°C) xona haroratidan ({inp.t_room}°C) past yoki teng! "
            "Radiator issiqlik bera olmaydi."
        )
        delta_t = 1.0

    rated_delta_t = inp.selected_model.rated_delta_t if inp.selected_model else 50.0
    exponent_n = inp.selected_model.exponent_n if inp.selected_model else inp.custom_exponent_n

    # Korreksiya koeffitsiyenti: k = (Delta_T_actual / Delta_T_rated) ^ n
    correction_factor = (delta_t / rated_delta_t) ** exponent_n
    correction_factor = round(correction_factor, 4)

    is_catalog = inp.selected_model is not None
    if is_catalog and inp.selected_model:
        rated_w = inp.selected_model.rated_power_w
        model_info = {
            'manufacturer': inp.selected_model.manufacturer,
            'model_name': inp.selected_model.model_name,
            'radiator_type': inp.selected_model.radiator_type,
            'dimensions_mm': f"{inp.selected_model.length_mm}x{inp.selected_model.height_mm}x{inp.selected_model.depth_mm}",
            'rated_power_w': rated_w,
            'rated_regime': f"ΔT = {rated_delta_t}K (75/65/20°C)",
        }
    else:
        rated_w = inp.custom_rated_power_w or 1000.0
        model_info = {
            'manufacturer': "Foydalanuvchi kiritgan",
            'model_name': "Maxsus radiator",
            'radiator_type': "Standart",
            'dimensions_mm': "Noma'lum",
            'rated_power_w': rated_w,
            'rated_regime': f"ΔT = {rated_delta_t}K",
        }
        notes.append("Katalogdan tashqari maxsus radiator parametri kiritildi. Natija dastlabki hisobiy baholash hisoblanadi.")

    actual_power_per_unit = round(rated_w * correction_factor, 1)

    if actual_power_per_unit <= 0:
        actual_power_per_unit = 1.0

    # Kerakli radiatorlar soni
    auto_qty = math.ceil(inp.heat_demand_w / actual_power_per_unit)
    quantity = inp.user_quantity if inp.user_quantity and inp.user_quantity > 0 else max(1, auto_qty)

    total_provided_power = round(quantity * actual_power_per_unit, 1)
    reserve_percent = round(((total_provided_power - inp.heat_demand_w) / inp.heat_demand_w) * 100, 1)

    if total_provided_power < inp.heat_demand_w:
        deficit = round(inp.heat_demand_w - total_provided_power, 1)
        warnings.append(
            f"Tanlangan radiatorlar quvvati yetarli emas! Yetishmayotgan quvvat: {deficit} Vt "
            f"({abs(reserve_percent):.1f}% kamchilik). Radiatorlar sonini yoki hajmini oshiring."
        )
    elif reserve_percent > 30:
        notes.append(f"Radiatorlar quvvati ehtiyojdan {reserve_percent}% ga ortiq (zaxira yuqori).")

    notes.append(
        f"EN 442 bo'yicha harorat ko'rsatkichi: ΔT_hisob = {delta_t:.1f} K. "
        f"Haqiqiy quvvat koeffitsiyenti: {correction_factor:.3f} "
        f"(nominal {rated_w} Vt -> haqiqiy {actual_power_per_unit} Vt)."
    )

    # Truba o'tish masofasi (uzatish + qaytish): 2 * masofa * radiatorlar soni
    est_pipe_length = round(2.0 * inp.distance_to_riser_m * quantity, 1)

    return RadiatorCalculationResult(
        heat_demand_w=inp.heat_demand_w,
        effective_delta_t=delta_t,
        correction_factor=correction_factor,
        actual_power_per_unit_w=actual_power_per_unit,
        recommended_quantity=quantity,
        total_provided_power_w=total_provided_power,
        power_reserve_percent=reserve_percent,
        model_info=model_info,
        estimated_pipe_length_m=est_pipe_length,
        is_catalog_item=is_catalog,
        warnings=warnings,
        notes=notes
    )
