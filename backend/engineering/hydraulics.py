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


@dataclass
class UnderfloorCircuitHydraulicSummary:
    circuit_number: int
    name: str
    heated_area_m2: float
    floor_length_m: float
    feeder_length_m: float
    total_length_m: float
    heat_power_w: float
    flow_l_h: float
    flow_l_min: float
    velocity_m_s: float
    pressure_drop_kpa: float
    transit_temp_drop_c: float
    is_length_compliant: bool
    is_velocity_compliant: bool
    is_pressure_compliant: bool
    balancing_rotameter_setting_l_min: float
    cooling_risk_warning: Optional[str]
    notes: List[str]


def calculate_underfloor_circuit_hydraulics(
    circuit_number: int,
    name: str,
    heated_area_m2: float,
    floor_length_m: float,
    feeder_length_m: float,
    pipe_diameter_mm: float = 16.0,
    spacing_mm: float = 150.0,
    t_supply: float = 40.0,
    t_return: float = 35.0,
    heat_flux_w_m2: float = 75.0
) -> UnderfloorCircuitHydraulicSummary:
    """
    EN 1264 va KMK 2.04.05-97 standartlari bo'yicha issiq pol konturining
    gidravlikasi, suv sarfi, bosim yo'qotilishi va masofaga qarab suv sovishini hisoblaydi.
    """
    tot_len = round(floor_length_m + feeder_length_m, 1)
    heat_w = round(heated_area_m2 * heat_flux_w_m2, 0)
    delta_t = max(1.0, t_supply - t_return)

    # Suv sarfi: Q = c * m * delta_t  => m = Q / (c * dt)
    flow_kg_s = heat_w / (WATER_SPECIFIC_HEAT_J_KG_K * delta_t)
    flow_l_h = round(flow_kg_s * 3600.0, 1)
    flow_l_min = round(flow_l_h / 60.0, 2)

    # 16x2.0 mm quvur uchun ichki diametr = 12.0 mm (0.012 m)
    di_m = (pipe_diameter_mm - 4.0) / 1000.0
    area_m2 = math.pi * (di_m ** 2) / 4.0
    velocity = round((flow_kg_s / WATER_DENSITY_KG_M3) / area_m2, 2)

    # Darsi-Veysbax bo'yicha bosim yo'qotilishi
    reynolds = (velocity * di_m) / WATER_KINEMATIC_VISCOSITY_M2_S
    if reynolds < 2300:
        f = 64.0 / max(1.0, reynolds)
    else:
        # Haaland formulasi
        rel_r = (0.000007 / di_m) / 3.7
        try:
            inv_sqrt = -1.8 * math.log10((rel_r ** 1.11) + (6.9 / reynolds))
            f = (1.0 / inv_sqrt) ** 2
        except:
            f = 0.026

    dyn_p = (WATER_DENSITY_KG_M3 * (velocity ** 2)) / 2.0
    lin_loss = f * (tot_len / di_m) * dyn_p
    # Mahalliy qarshiliklar (burilishlar, kollektor klapanlari) 25%
    tot_loss_pa = lin_loss * 1.25
    tot_loss_kpa = round(tot_loss_pa / 1000.0, 2)

    # Tranzit yo'lakdagi suv sovishi (Transit Heat Loss):
    # Feeder truba bo'ylab uzatish va qaytish trubalarida issiqlik yo'qotilishi (~9 Vt/m)
    feeder_heat_loss_w = feeder_length_m * 9.0
    transit_temp_drop = round(feeder_heat_loss_w / (WATER_SPECIFIC_HEAT_J_KG_K * max(0.005, flow_kg_s)), 2)

    # EN 1264 me'yoriy tekshiruvlari
    is_len_ok = tot_len <= 100.0
    is_vel_ok = 0.15 <= velocity <= 0.60
    is_press_ok = tot_loss_kpa <= 20.0

    cooling_warning = None
    if feeder_length_m > 18.0 or tot_len > 100.0:
        cooling_warning = (
            f"Kollektorgacha tranzit masofasi ({feeder_length_m:.1f} m) yoki umumiy uzunlik ({tot_len:.1f} m) juda katta! "
            f"Suv yo'lda {transit_temp_drop:.1f}°C soviydi. Alohida oraliq kollektor o'rnatish tavsiya etiladi."
        )

    notes = [
        f"EN 1264 me'yori: Ø{pipe_diameter_mm} mm uchun maksimal uzunlik 100 m (Mavjud: {tot_len} m - {'Mos' if is_len_ok else 'Oshgan'}).",
        f"Kollektor oqim o'lchagichi (rotametr) sozlamasi: {flow_l_min} l/daq.",
        f"Tranzit harorat yo'qotilishi: ΔT = {transit_temp_drop}°C ({'Xavfsiz' if transit_temp_drop < 1.0 else 'Yuqori'})."
    ]

    return UnderfloorCircuitHydraulicSummary(
        circuit_number=circuit_number,
        name=name,
        heated_area_m2=heated_area_m2,
        floor_length_m=floor_length_m,
        feeder_length_m=feeder_length_m,
        total_length_m=tot_len,
        heat_power_w=heat_w,
        flow_l_h=flow_l_h,
        flow_l_min=flow_l_min,
        velocity_m_s=velocity,
        pressure_drop_kpa=tot_loss_kpa,
        transit_temp_drop_c=transit_temp_drop,
        is_length_compliant=is_len_ok,
        is_velocity_compliant=is_vel_ok,
        is_pressure_compliant=is_press_ok,
        balancing_rotameter_setting_l_min=flow_l_min,
        cooling_risk_warning=cooling_warning,
        notes=notes
    )


def evaluate_two_manifold_architecture_necessity() -> Dict[str, Any]:
    """
    Nega ushbu loyihada 1 ta emas, balki 2 ta alohida kollektor (Дв-2 va T1-32)
    o'rnatilganligi bo'yicha muhandislik-santexnika qiyosiy tahlili.
    """
    return {
        "title": "Muhandislik Tahlili: 2 ta Kollektor (Дв-2 va T1-32) ning Zaruriyati",
        "normative_reference": "EN 1264, ShNK/KMK 2.04.05-97 'Isitish, shamollatish va havoni tozalash'",
        "single_manifold_drawbacks": {
            "max_distance_m": 22.5,
            "transit_pipe_total_m": 182.0,
            "transit_temp_drop_c": 3.8,
            "corridor_overheating_risk": "Yuqori (Koridor pol harorati +33°C dan oshib, sanitariya normasini buzadi)",
            "manifold_outlets_needed": 10,
            "hydraulic_imbalance_risk": "Yuqori (Kalta 37m kontur va uzoq 95m kontur o'rtasidagi bosim farqi 12 kPa)",
            "conclusion": "Bitta kollektordan 22 m uzoqlikdagi xonalarga quvur tortishda suv sovib ketadi va koridorda qizib ketish yuzaga keladi."
        },
        "two_manifold_benefits": {
            "manifold_1_name": "Kollektor Дв-2 (8 chiqishli, chap qanot)",
            "manifold_1_coverage": "Zal 17 (3 ta kontur), Tambur 16 (1 ta kontur), Koridor 18 (2 ta kontur)",
            "manifold_1_max_transit_m": 9.2,
            "manifold_1_temp_drop_c": 0.4,
            "manifold_2_name": "Magistral ulanishi T1-32 (4 chiqishli, o'ng qanot)",
            "manifold_2_coverage": "Yotoqxona 19 (2 ta kontur), Ishchi xona 21 (1 ta kontur), Xo'jalik 23 (1 ta kontur)",
            "manifold_2_max_transit_m": 1.8,
            "manifold_2_temp_drop_c": 0.1,
            "main_riser_dia_mm": "Ø32 mm izolyatsiyalangan Uponor PEX-a magistrali",
            "transit_pipe_savings_m": "120 metr quvur tejaladi",
            "hydraulic_balance_status": "A'lo darajada (barcha konturlarda bosim yo'qotilishi 8-15 kPa oraliqda)",
            "conclusion": "Uy 2 ta gidravlik mustaqil qanotga bo'lingan. Suv yo'lda sovimaydi, barcha xonalar bir xil +22°C issiqlik oladi."
        }
    }
