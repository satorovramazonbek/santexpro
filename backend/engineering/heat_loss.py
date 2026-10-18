"""
SantexPro Muhandislik Hisoblash Moduli (Engineering Engine)
Barcha hisob-kitoblar fizika qonunlari va xalqaro/mahalliy me'yorlar (EN 12831, EN 442, EN 1264, KMK 2.01.04-97)
asosida bajariladi.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import math


@dataclass
class WallElement:
    name: str
    area: float  # m2
    u_value: float  # W/(m2*K)
    is_exterior: bool = True
    temp_difference: Optional[float] = None  # Delta T in K. If None, uses (t_inside - t_outside)


@dataclass
class OpeningElement:
    name: str
    element_type: str  # 'window' or 'door'
    width: float  # m
    height: float  # m
    u_value: float  # W/(m2*K)
    wall_id: Optional[str] = None
    is_exterior: bool = True

    @property
    def area(self) -> float:
        return round(self.width * self.height, 4)


@dataclass
class HeatLossInput:
    room_name: str
    length: float  # m
    width: float  # m
    height: float  # m
    t_inside: float  # °C (masalan: +22°C)
    t_outside: float  # °C (masalan: -15°C Toshkent uchun)
    exterior_walls_count: int = 1
    wall_u_value: float = 0.45  # W/(m2*K) standart g'isht + izolyatsiya
    floor_u_value: float = 0.35  # W/(m2*K)
    ceiling_u_value: float = 0.35  # W/(m2*K)
    has_heated_above: bool = True  # Yuqorida isitiladigan xona bormi
    has_heated_below: bool = True  # Pastda isitiladigan xona bormi
    air_change_rate: float = 0.8  # 1/soat (havo almashinuv me'yori)
    windows: List[OpeningElement] = field(default_factory=list)
    doors: List[OpeningElement] = field(default_factory=list)


@dataclass
class HeatLossResult:
    room_name: str
    area: float  # m2
    volume: float  # m3
    delta_t: float  # K
    transmission_loss_w: float  # Vt
    ventilation_loss_w: float  # Vt
    total_heat_loss_w: float  # Vt
    specific_heat_loss_w_m2: float  # Vt/m2
    elements_breakdown: List[Dict[str, Any]]
    assumptions: List[str]
    warnings: List[str]


def calculate_heat_loss(inp: HeatLossInput) -> HeatLossResult:
    """
    Xonaning umumiy issiqlik yo'qotilishini hisoblash.
    Q = sum(U * A * Delta_T) + Q_ventilation
    """
    warnings: List[str] = []
    assumptions: List[str] = []

    # Geometrik tekshiruvlar
    if inp.length <= 0 or inp.width <= 0 or inp.height <= 0:
        raise ValueError("Xona o'lchamlari (uzunlik, kenglik, balandlik) noldan katta bo'lishi shart.")

    area = round(inp.length * inp.width, 2)
    volume = round(area * inp.height, 2)

    delta_t = inp.t_inside - inp.t_outside
    if delta_t <= 0:
        warnings.append(
            f"Ichki harorat ({inp.t_inside}°C) tashqi haroratdan ({inp.t_outside}°C) kichik yoki teng. "
            "Isitish talab qilinmaydi."
        )
        delta_t = 0.0

    assumptions.append(f"Hisobiy ichki harorat: +{inp.t_inside}°C, tashqi harorat: {inp.t_outside}°C (ΔT = {delta_t:.1f} K).")
    assumptions.append(f"Havo almashinuvi koeffitsiyenti: n = {inp.air_change_rate} marta/soat (KMK va EN 12831 tavsiyasi).")

    # 4 ta devor perimetri bo'yicha:
    # 2 ta uzun devor: length * height, 2 ta qisqa devor: width * height
    # exterior_walls_count ga qarab tashqi devorlar aniqlanadi
    wall_lengths = [inp.length, inp.width, inp.length, inp.width]
    ext_count = min(max(1, inp.exterior_walls_count), 4)

    gross_exterior_wall_area = sum(wall_lengths[:ext_count]) * inp.height

    def is_element_exterior(element: OpeningElement) -> bool:
        if not getattr(element, 'is_exterior', True):
            return False
        if element.wall_id is not None:
            try:
                w_idx = int(element.wall_id)
                return w_idx < ext_count
            except ValueError:
                pass
        return getattr(element, 'is_exterior', True)

    exterior_windows = [w for w in inp.windows if is_element_exterior(w)]
    exterior_doors = [d for d in inp.doors if is_element_exterior(d)]

    exterior_windows_area = sum(w.area for w in exterior_windows)
    exterior_doors_area = sum(d.area for d in exterior_doors)

    # Opaque (sof devor) maydoni: umumiy tashqi devor maydonidan faqat tashqi deraza va eshiklar ayirib tashlanadi
    net_exterior_wall_area = gross_exterior_wall_area - exterior_windows_area - exterior_doors_area
    if net_exterior_wall_area < 0:
        warnings.append("Tashqi deraza va eshiklar maydoni tashqi devor maydonidan oshib ketdi! Iltimos, o'lchamlarni tekshiring.")
        net_exterior_wall_area = 0.0

    breakdown = []
    trans_loss = 0.0

    # 1. Tashqi devorlar
    q_wall = net_exterior_wall_area * inp.wall_u_value * delta_t
    trans_loss += q_wall
    breakdown.append({
        'element': "Tashqi devorlar (sof maydon)",
        'area_m2': round(net_exterior_wall_area, 2),
        'u_value': inp.wall_u_value,
        'delta_t': delta_t,
        'heat_loss_w': round(q_wall, 1)
    })
    assumptions.append(f"Tashqi devor issiqlik o'tkazuvchanligi U = {inp.wall_u_value} Vt/(m²·K).")

    # 2. Derazalar
    for idx, w in enumerate(inp.windows, 1):
        is_ext = is_element_exterior(w)
        elem_dt = delta_t if is_ext else 0.0
        q_win = w.area * w.u_value * elem_dt
        trans_loss += q_win
        breakdown.append({
            'element': f"{'Tashqi' if is_ext else 'Ichki'} deraza {idx} ({w.name or f'{w.width}x{w.height} m'})",
            'area_m2': round(w.area, 2),
            'u_value': w.u_value,
            'delta_t': elem_dt,
            'heat_loss_w': round(q_win, 1)
        })
    if inp.windows:
        assumptions.append(f"Jami {len(inp.windows)} ta deraza, umumiy maydoni: {sum(w.area for w in inp.windows):.2f} m².")

    # 3. Eshiklar
    for idx, d in enumerate(inp.doors, 1):
        is_ext = is_element_exterior(d)
        elem_dt = delta_t if is_ext else 0.0
        q_door = d.area * d.u_value * elem_dt
        trans_loss += q_door
        breakdown.append({
            'element': f"{'Tashqi' if is_ext else 'Ichki'} eshik {idx} ({d.name or f'{d.width}x{d.height} m'})",
            'area_m2': round(d.area, 2),
            'u_value': d.u_value,
            'delta_t': elem_dt,
            'heat_loss_w': round(q_door, 1)
        })

    # 4. Pol orqali yo'qotilish
    if not inp.has_heated_below:
        # Isitilmaydigan yerto'la yoki yer usti zamin (Delta T kamroq, odatda 0.5 * delta_t yoki tuproq haroratiga bog'liq)
        # Me'yor bo'yicha reduksiya koeffitsiyenti b_u = 0.6..0.8
        ground_delta_t = delta_t * 0.7
        q_floor = area * inp.floor_u_value * ground_delta_t
        trans_loss += q_floor
        breakdown.append({
            'element': "Pol (pastda isitilmaydigan zamin/yerto'la)",
            'area_m2': area,
            'u_value': inp.floor_u_value,
            'delta_t': round(ground_delta_t, 1),
            'heat_loss_w': round(q_floor, 1)
        })
        assumptions.append(f"Pastdagi xona isitilmaydi: pol orqali yo'qotilish U = {inp.floor_u_value} Vt/(m²·K).")
    else:
        breakdown.append({
            'element': "Pol (pastda isitiladigan xona)",
            'area_m2': area,
            'u_value': 0.0,
            'delta_t': 0.0,
            'heat_loss_w': 0.0
        })

    # 5. Shift orqali yo'qotilish
    if not inp.has_heated_above:
        # Isitilmaydigan cherdak yoki tom (b_u = 0.8..0.9)
        roof_delta_t = delta_t * 0.85
        q_ceiling = area * inp.ceiling_u_value * roof_delta_t
        trans_loss += q_ceiling
        breakdown.append({
            'element': "Shift / Tom (yuqorida cherdak/ochiq tom)",
            'area_m2': area,
            'u_value': inp.ceiling_u_value,
            'delta_t': round(roof_delta_t, 1),
            'heat_loss_w': round(q_ceiling, 1)
        })
        assumptions.append(f"Yuqoridagi qavat isitilmaydi: shift/tom U = {inp.ceiling_u_value} Vt/(m²·K).")
    else:
        breakdown.append({
            'element': "Shift (yuqorida isitiladigan xona)",
            'area_m2': area,
            'u_value': 0.0,
            'delta_t': 0.0,
            'heat_loss_w': 0.0
        })

    # 6. Shamollatish (Ventilyatsiya) yo'qotilishi
    # Q_vent = c_p * rho * V * n * Delta_T / 3600
    # c_p * rho ~= 1206 J/(m3*K) = 0.335 W*h/(m3*K) ~= 0.34 W/(m3*K)
    q_vent = 0.34 * volume * inp.air_change_rate * delta_t
    breakdown.append({
        'element': f"Tabiiy havo almashinuvi (Ventilyatsiya, {inp.air_change_rate} marta/soat)",
        'area_m2': volume,  # bu yerda hajm m3 sifatida ko'rsatiladi
        'u_value': round(0.34 * inp.air_change_rate, 3),
        'delta_t': delta_t,
        'heat_loss_w': round(q_vent, 1)
    })

    total_heat_loss = trans_loss + q_vent
    specific_loss = total_heat_loss / area if area > 0 else 0.0

    if specific_loss > 180:
        warnings.append(
            f"Solishtirma issiqlik yo'qotilishi yuqori ({specific_loss:.1f} Vt/m²). "
            "Bino izolyatsiyasini kuchaytirish yoki qalinroq oynapaket o'rnatish tavsiya etiladi."
        )
    elif specific_loss < 40 and delta_t > 25:
        warnings.append(
            f"Solishtirma issiqlik yo'qotilishi juda past ({specific_loss:.1f} Vt/m²). "
            "Kiritilgan ma'lumotlar to'g'riligini qayta tekshiring."
        )

    return HeatLossResult(
        room_name=inp.room_name,
        area=area,
        volume=volume,
        delta_t=round(delta_t, 1),
        transmission_loss_w=round(trans_loss, 1),
        ventilation_loss_w=round(q_vent, 1),
        total_heat_loss_w=round(total_heat_loss, 1),
        specific_heat_loss_w_m2=round(specific_loss, 1),
        elements_breakdown=breakdown,
        assumptions=assumptions,
        warnings=warnings
    )
