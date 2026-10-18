"""
SantexPro Gidravlik Hisoblash Moduli (Hydraulic Engine)
Isitish tizimlari (radiator va issiq pol) uchun suv sarfi, oqim tezligi,
Darsi-Veysbax bo'yicha bosim yo'qotilishi va optimal truba diametrini hisoblash.
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import math


# Suvning termodinamik xossalari (o'rtacha 50-60°C haroratda)
WATER_SPECIFIC_HEAT_J_KG_K = 4186.0  # J/(kg*K)
WATER_DENSITY_KG_M3 = 988.0  # kg/m3 (55°C da)
WATER_KINEMATIC_VISCOSITY_M2_S = 0.55e-6  # m2/s (55°C da)

# Quvurlar g'adir-budurligi (roughness epsilon, metrda)
ROUGHNESS_MAP = {
    'pex': 0.000007,  # PEX / PERT (0.007 mm)
    'pert': 0.000007,
    'multilayer': 0.000007,  # Metalloplastik
    'ppr': 0.000010,  # Polipropilen (0.01 mm)
    'copper': 0.0000015,  # Mis (0.0015 mm)
    'steel': 0.000045,  # Po'lat (0.045 mm)
}

# Standart quvurlar katalogi (tashqi x devor qalinligi -> ichki diametr)
STANDARD_PIPES = [
    {'name': "16 x 2.0 mm", 'nominal_mm': 16.0, 'wall_mm': 2.0, 'internal_mm': 12.0},
    {'name': "20 x 2.0 mm", 'nominal_mm': 20.0, 'wall_mm': 2.0, 'internal_mm': 16.0},
    {'name': "25 x 2.3 mm", 'nominal_mm': 25.0, 'wall_mm': 2.3, 'internal_mm': 20.4},
    {'name': "32 x 2.9 mm", 'nominal_mm': 32.0, 'wall_mm': 2.9, 'internal_mm': 26.2},
    {'name': "40 x 3.7 mm", 'nominal_mm': 40.0, 'wall_mm': 3.7, 'internal_mm': 32.6},
]


@dataclass
class HydraulicInput:
    heat_power_w: float  # Isitish quvvati Q (Vt)
    t_supply: float  # Uzatish harorati (°C), masalan 75°C yoki 45°C
    t_return: float  # Qaytish harorati (°C), masalan 65°C yoki 35°C
    pipe_length_m: float  # Quvurning umumiy uzunligi (uzatish + qaytish, m)
    pipe_nominal_dia_mm: float = 20.0  # Tashqi diametr (mm)
    pipe_internal_dia_mm: Optional[float] = None  # Ichki diametr (agar berilmagan bo'lsa devordan hisoblanadi)
    pipe_wall_thickness_mm: float = 2.0  # Devor qalinligi (mm)
    pipe_material: str = "pex"  # 'pex', 'pert', 'multilayer', 'ppr', 'steel', 'copper'
    local_loss_coefficient: float = 0.25  # Mahalliy qarshiliklar ulushi (25% standart)


@dataclass
class PipeOptionEvaluation:
    pipe_name: str
    nominal_dia_mm: float
    internal_dia_mm: float
    velocity_m_s: float
    reynolds_number: float
    friction_factor: float
    pressure_loss_per_meter_pa_m: float
    total_pressure_loss_kpa: float
    status: str  # 'optimal', 'too_small', 'too_large'
    comment: str


@dataclass
class HydraulicResult:
    heat_power_w: float
    delta_t_k: float
    mass_flow_kg_h: float
    volume_flow_l_h: float
    volume_flow_m3_h: float
    selected_pipe_name: str
    selected_internal_dia_mm: float
    velocity_m_s: float
    reynolds_number: float
    flow_regime: str  # 'Laminar' yoki 'Turbulent'
    friction_factor: float
    linear_pressure_loss_pa: float
    local_pressure_loss_pa: float
    total_pressure_loss_pa: float
    total_pressure_loss_kpa: float
    total_pressure_loss_mbar: float
    pressure_loss_per_meter_pa_m: float
    recommended_pipe: Optional[str]
    pipe_options: List[PipeOptionEvaluation]
    warnings: List[str]
    notes: List[str]


def calculate_hydraulics(inp: HydraulicInput) -> HydraulicResult:
    """
    To'liq gidravlik hisoblashni amalga oshirish.
    m_dot = Q / (cp * Delta_T)
    v = 4 * V_dot / (pi * d_i^2)
    Re = v * d_i / nu
    Colebrook-White / Haaland bo'yicha f va Darsi-Veysbax bo'yicha Delta P
    """
    warnings: List[str] = []
    notes: List[str] = []

    if inp.heat_power_w <= 0:
        raise ValueError("Isitish quvvati (Q) noldan katta bo'lishi kerak.")

    delta_t = inp.t_supply - inp.t_return
    if delta_t <= 0:
        raise ValueError(
            f"Uzatish harorati ({inp.t_supply}°C) qaytish haroratidan ({inp.t_return}°C) yuqori bo'lishi kerak. "
            f"Delta T = {delta_t} K xato."
        )

    # 1. Suvning massaviy va hajmiy sarfi
    # m_dot (kg/s) = Q / (cp * delta_t)
    mass_flow_kg_s = inp.heat_power_w / (WATER_SPECIFIC_HEAT_J_KG_K * delta_t)
    mass_flow_kg_h = mass_flow_kg_s * 3600.0

    # V_dot (m3/s) = m_dot / rho
    vol_flow_m3_s = mass_flow_kg_s / WATER_DENSITY_KG_M3
    vol_flow_m3_h = vol_flow_m3_s * 3600.0
    vol_flow_l_h = vol_flow_m3_h * 1000.0

    # 2. Tanlangan trubaning ichki diametri
    if inp.pipe_internal_dia_mm and inp.pipe_internal_dia_mm > 0:
        di_mm = inp.pipe_internal_dia_mm
    else:
        di_mm = inp.pipe_nominal_dia_mm - (2.0 * inp.pipe_wall_thickness_mm)

    if di_mm <= 0:
        raise ValueError("Quvurning ichki diametri noldan katta bo'lishi shart.")

    di_m = di_mm / 1000.0
    area_m2 = math.pi * (di_m ** 2) / 4.0

    # 3. Oqim tezligi
    velocity = vol_flow_m3_s / area_m2

    # 4. Reynolds soni
    reynolds = (velocity * di_m) / WATER_KINEMATIC_VISCOSITY_M2_S
    flow_regime = "Turbulent" if reynolds >= 2300 else "Laminar"

    # 5. G'adir-budurlik va gidravlik ishqalanish koeffitsiyenti (f)
    epsilon_m = ROUGHNESS_MAP.get(inp.pipe_material.lower(), 0.000007)

    if reynolds < 2300:
        # Laminar oqim: Poiseuille qonuni
        friction_factor = 64.0 / max(1.0, reynolds)
    else:
        # Turbulent oqim: Haaland formulasi (Colebrook-White ning yuqori aniqlikdagi ifodasi)
        rel_roughness = (epsilon_m / di_m) / 3.7
        try:
            inv_sqrt_f = -1.8 * math.log10((rel_roughness ** 1.11) + (6.9 / reynolds))
            friction_factor = (1.0 / inv_sqrt_f) ** 2
        except (ValueError, ZeroDivisionError):
            friction_factor = 0.025

    # 6. Darsi-Veysbax bo'yicha bosim yo'qotilishi
    # Delta P_lin = f * (L / d_i) * (rho * v^2 / 2)
    dynamic_pressure = (WATER_DENSITY_KG_M3 * (velocity ** 2)) / 2.0
    length_m = max(0.5, inp.pipe_length_m)

    linear_loss_pa = friction_factor * (length_m / di_m) * dynamic_pressure
    local_loss_pa = linear_loss_pa * inp.local_loss_coefficient
    total_loss_pa = linear_loss_pa + local_loss_pa

    total_loss_kpa = total_loss_pa / 1000.0
    total_loss_mbar = total_loss_pa / 100.0
    loss_per_meter = linear_loss_pa / length_m

    # Tezlik me'yori bo'yicha tekshiruv
    if velocity < 0.2:
        warnings.append(
            f"Oqim tezligi past ({velocity:.2f} m/s). Minimal tavsiya etilgan tezlik 0.25-0.30 m/s. "
            "Tizimda havo pufakchalari (problar) to'planish xavfi bor."
        )
    elif velocity > 0.8:
        warnings.append(
            f"Oqim tezligi me'yordan yuqori ({velocity:.2f} m/s). Maksimal tavsiya etilgan tezlik 0.7-0.8 m/s. "
            "Quvurda gidravlik shovqin paydo bo'lishi va nasos bosimi yetishmasligi mumkin."
        )

    # 7. Standart quvurlar variantlarini solishtirish
    pipe_evaluations: List[PipeOptionEvaluation] = []
    best_pipe_name: Optional[str] = None

    for pipe in STANDARD_PIPES:
        p_di_m = pipe['internal_mm'] / 1000.0
        p_area = math.pi * (p_di_m ** 2) / 4.0
        p_vel = vol_flow_m3_s / p_area
        p_re = (p_vel * p_di_m) / WATER_KINEMATIC_VISCOSITY_M2_S

        if p_re < 2300:
            p_f = 64.0 / max(1.0, p_re)
        else:
            p_rel_r = (epsilon_m / p_di_m) / 3.7
            try:
                p_inv = -1.8 * math.log10((p_rel_r ** 1.11) + (6.9 / p_re))
                p_f = (1.0 / p_inv) ** 2
            except (ValueError, ZeroDivisionError):
                p_f = 0.025

        p_dyn = (WATER_DENSITY_KG_M3 * (p_vel ** 2)) / 2.0
        p_lin_loss = p_f * (length_m / p_di_m) * p_dyn
        p_tot_kpa = (p_lin_loss * (1.0 + inp.local_loss_coefficient)) / 1000.0
        p_loss_m = p_lin_loss / length_m

        if 0.3 <= p_vel <= 0.7:
            status = "optimal"
            comment = f"Optimal o'lcham ({p_vel:.2f} m/s, shovqinsiz va iqtisodiy)"
            if not best_pipe_name:
                best_pipe_name = pipe['name']
        elif p_vel > 0.7:
            status = "too_small"
            comment = f"Tor diametr ({p_vel:.2f} m/s, qarshilik yuqori)"
        else:
            status = "too_large"
            comment = f"Katta diametr ({p_vel:.2f} m/s, qimmat va sekin)"

        pipe_evaluations.append(PipeOptionEvaluation(
            pipe_name=pipe['name'],
            nominal_dia_mm=pipe['nominal_mm'],
            internal_dia_mm=pipe['internal_mm'],
            velocity_m_s=round(p_vel, 2),
            reynolds_number=round(p_re, 0),
            friction_factor=round(p_f, 4),
            pressure_loss_per_meter_pa_m=round(p_loss_m, 1),
            total_pressure_loss_kpa=round(p_tot_kpa, 2),
            status=status,
            comment=comment
        ))

    notes.append(
        f"Hisobiy quvvat: {inp.heat_power_w} Vt, harorat rejimi: {inp.t_supply}/{inp.t_return}°C (ΔT = {delta_t:.1f} K)."
    )
    notes.append(
        f"Suv sarfi: {vol_flow_l_h:.1f} l/soat ({vol_flow_m3_h:.3f} m³/soat). "
        f"Ichki diametr: {di_mm:.1f} mm, oqim tezligi: {velocity:.2f} m/s."
    )

    selected_pipe_name = f"{inp.pipe_nominal_dia_mm:.0f}x{inp.pipe_wall_thickness_mm:.1f} mm (ichki {di_mm:.1f} mm)"

    return HydraulicResult(
        heat_power_w=inp.heat_power_w,
        delta_t_k=delta_t,
        mass_flow_kg_h=round(mass_flow_kg_h, 1),
        volume_flow_l_h=round(vol_flow_l_h, 1),
        volume_flow_m3_h=round(vol_flow_m3_h, 3),
        selected_pipe_name=selected_pipe_name,
        selected_internal_dia_mm=round(di_mm, 2),
        velocity_m_s=round(velocity, 2),
        reynolds_number=round(reynolds, 0),
        flow_regime=flow_regime,
        friction_factor=round(friction_factor, 4),
        linear_pressure_loss_pa=round(linear_loss_pa, 1),
        local_pressure_loss_pa=round(local_loss_pa, 1),
        total_pressure_loss_pa=round(total_loss_pa, 1),
        total_pressure_loss_kpa=round(total_loss_kpa, 2),
        total_pressure_loss_mbar=round(total_loss_mbar, 1),
        pressure_loss_per_meter_pa_m=round(loss_per_meter, 1),
        recommended_pipe=best_pipe_name or "20 x 2.0 mm",
        pipe_options=pipe_evaluations,
        warnings=warnings,
        notes=notes
    )
