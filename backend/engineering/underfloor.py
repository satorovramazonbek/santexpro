"""
SantexPro Issiq Pol Hisoblash Moduli (Underfloor Heating Engine)
EN 1264 standarti va amaliy montaj qoidalari asosida issiq pol trubalari uzunligi,
konturlar soni, kollektor chiqishlari va 2D sxematik yo'nalishlarni hisoblash.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Tuple, Optional
import math


@dataclass
class ExcludedArea:
    name: str  # masalan: oshxona garnituri, shkaf, dush kabinasi
    width: float  # m
    length: float  # m

    @property
    def area(self) -> float:
        return round(self.width * self.length, 2)


@dataclass
class UnderfloorHeatingInput:
    room_length: float  # m
    room_width: float  # m
    spacing_mm: int = 150  # Truba qadami mm (100, 150, 200, 250, 300 mm)
    pipe_nominal_dia_mm: float = 16.0  # Tashqi diametr (16 mm)
    pipe_wall_thickness_mm: float = 2.0  # Devor qalinligi (2.0 mm -> ichki 12 mm)
    pipe_material: str = "PEX-A"  # PEX-A, PERT, Multilayer (PE-RT/AL/PE-RT)
    manifold_distance_m: float = 4.0  # Kollektorgacha bo'lgan masofa (metr)
    max_circuit_length_m: float = 85.0  # Bitta konturning maksimal ruxsat etilgan uzunligi (m)
    routing_pattern: str = "spiral"  # 'spiral' (chig'anoq) yoki 'serpentine' (ilon izi)
    excluded_areas: List[ExcludedArea] = field(default_factory=list)
    boundary_offset_m: float = 0.15  # Devordan chekinish masofasi (10-20 sm)
    custom_num_circuits: Optional[int] = None  # Foydalanuvchi tanlagan konturlar soni (agar ko'rsatilgan bo'lsa)


@dataclass
class CircuitInfo:
    circuit_index: int
    name: str
    floor_length_m: float
    lead_in_length_m: float
    total_length_m: float
    color_hex: str
    points: List[Tuple[float, float]]  # 2D koordinatalar (m)
    supply_points: List[Tuple[float, float]] = field(default_factory=list)
    return_points: List[Tuple[float, float]] = field(default_factory=list)


@dataclass
class UnderfloorHeatingResult:
    total_room_area: float
    excluded_area: float
    heated_floor_area: float
    spacing_mm: int
    pipe_spec: str
    pipe_internal_dia_mm: float
    estimated_floor_pipe_length_m: float
    manifold_lead_in_length_m: float
    total_pipe_length_m: float
    num_circuits: int
    average_circuit_length_m: float
    manifold_outlets_needed: int
    circuits: List[CircuitInfo]
    schematic_data: Dict[str, Any]
    warnings: List[str]
    notes: List[str]


CIRCUIT_COLORS = [
    "#2563EB",  # Moviy (Royal Blue)
    "#DC2626",  # Qizil (Crimson)
    "#059669",  # Yashil (Emerald)
    "#D97706",  # To'q sariq (Amber)
    "#7C3AED",  # Binafsha (Purple)
    "#0891B2",  # Moviy feruza (Cyan)
    "#BE185D",  # To'q pushti (Pink)
    "#4B5563",  # Kulrang (Slate)
]


def generate_serpentine_path(
    x_min: float, y_min: float, x_max: float, y_max: float, spacing_m: float
) -> List[Tuple[float, float]]:
    """
    Ilon izi (serpentine) shaklidagi truba koordinatalarini hosil qilish.
    """
    points: List[Tuple[float, float]] = []
    current_x = x_min
    going_up = True

    while current_x <= x_max:
        if going_up:
            points.append((round(current_x, 3), round(y_min, 3)))
            points.append((round(current_x, 3), round(y_max, 3)))
        else:
            points.append((round(current_x, 3), round(y_max, 3)))
            points.append((round(current_x, 3), round(y_min, 3)))
        current_x += spacing_m
        going_up = not going_up

    return points


def generate_bifilar_spiral_paths(
    x_min: float, y_min: float, x_max: float, y_max: float, spacing_m: float
) -> Tuple[List[Tuple[float, float]], List[Tuple[float, float]], List[Tuple[float, float]]]:
    """
    Bifilar spiral (supply qizil va return ko'k) yo'llarini hisoblash (Uponor standarti).
    """
    step = spacing_m * 2.0
    supply: List[Tuple[float, float]] = []
    return_pts: List[Tuple[float, float]] = []

    left, top = x_min, y_min
    right, bottom = x_max, y_max

    while (right - left) >= 2.5 * spacing_m and (bottom - top) >= 2.5 * spacing_m:
        supply.append((round(left, 3), round(top, 3)))
        supply.append((round(right, 3), round(top, 3)))
        supply.append((round(right, 3), round(bottom, 3)))
        supply.append((round(left + step, 3), round(bottom, 3)))
        supply.append((round(left + step, 3), round(top + step, 3)))

        return_pts.insert(0, (round(left + spacing_m, 3), round(top + spacing_m, 3)))
        return_pts.insert(0, (round(right - spacing_m, 3), round(top + spacing_m, 3)))
        return_pts.insert(0, (round(right - spacing_m, 3), round(bottom - spacing_m, 3)))
        return_pts.insert(0, (round(left + step + spacing_m, 3), round(bottom - spacing_m, 3)))

        left += step
        top += step
        right -= step
        bottom -= step

    if supply and return_pts:
        last_s = supply[-1]
        first_r = return_pts[0]
        mid = (round((last_s[0] + first_r[0]) / 2, 3), round((last_s[1] + first_r[1]) / 2, 3))
        supply.append(mid)
        return_pts.insert(0, mid)

    full = supply + return_pts
    return supply, return_pts, full


def generate_spiral_path(
    x_min: float, y_min: float, x_max: float, y_max: float, spacing_m: float
) -> List[Tuple[float, float]]:
    """
    Chig'anoq (spiral / улитка) shaklidagi truba koordinatalarini hosil qilish.
    """
    _, _, full = generate_bifilar_spiral_paths(x_min, y_min, x_max, y_max, spacing_m)
    return full


def calculate_underfloor_heating(inp: UnderfloorHeatingInput) -> UnderfloorHeatingResult:
    """
    Issiq pol tizimi hisob-kitoblarini bajarish.
    """
    warnings: List[str] = []
    notes: List[str] = []

    if inp.room_length <= 0 or inp.room_width <= 0:
        raise ValueError("Xona o'lchamlari noldan katta bo'lishi kerak.")

    total_room_area = round(inp.room_length * inp.room_width, 2)
    excluded_sum = sum(e.area for e in inp.excluded_areas)
    heated_floor_area = round(max(0.5, total_room_area - excluded_sum), 2)

    spacing_m = inp.spacing_mm / 1000.0
    if spacing_m <= 0.05 or spacing_m > 0.4:
        warnings.append(f"Belgilangan truba qadami ({inp.spacing_mm} mm) noodatiy. Odatda 100-200 mm oralig'ida qo'llaniladi.")

    pipe_internal_dia = round(inp.pipe_nominal_dia_mm - (2.0 * inp.pipe_wall_thickness_mm), 2)
    pipe_spec = f"{inp.pipe_material} {inp.pipe_nominal_dia_mm:.0f}x{inp.pipe_wall_thickness_mm:.1f} mm (ichki Ø {pipe_internal_dia} mm)"

    # Geometrik formula: L_pol ~= A / s
    # Burilishlar va devor chekinishlarini hisobga oluvchi koeffitsiyent k_bend = 1.05
    k_bend = 1.05
    estimated_floor_pipe_length = round((heated_floor_area / spacing_m) * k_bend, 1)

    # Kollektorgacha bo'lgan umumiy uzatish va qaytish masofasi har bir kontur uchun: 2 * masofa
    lead_in_per_circuit = round(2.0 * inp.manifold_distance_m, 1)

    # Maksimal ruxsat etilgan uzunlik bo'yicha hisobiy minimal konturlar sonini aniqlash
    effective_max_floor_per_circuit = inp.max_circuit_length_m - lead_in_per_circuit
    if effective_max_floor_per_circuit <= 20:
        effective_max_floor_per_circuit = inp.max_circuit_length_m * 0.75
        warnings.append("Kollektorgacha masofa juda uzoq! Truba uzunligi sarfi oshadi.")

    calculated_min_circuits = max(1, math.ceil(estimated_floor_pipe_length / effective_max_floor_per_circuit))

    if inp.custom_num_circuits and inp.custom_num_circuits > 0:
        num_circuits = int(inp.custom_num_circuits)
        if num_circuits < calculated_min_circuits:
            warnings.append(
                f"DIQQAT: Tanlangan {num_circuits} ta kontur me'yoriy minimal sondan ({calculated_min_circuits} ta) kam! "
                f"Bunda har bir kontur uzunligi tavsiya etilgan me'yordan oshib, gidravlik qarshilik kuchayishi mumkin."
            )
        notes.append(f"Konturlar soni foydalanuvchi tomonidan qo‘lda tanlandi: {num_circuits} ta.")
    else:
        num_circuits = calculated_min_circuits

    manifold_total_lead_in = round(num_circuits * lead_in_per_circuit, 1)
    total_pipe_length = round(estimated_floor_pipe_length + manifold_total_lead_in, 1)

    avg_circuit_length = round(total_pipe_length / num_circuits, 1)

    if avg_circuit_length > inp.max_circuit_length_m:
        warnings.append(
            f"DIQQAT: Konturning o'rtacha uzunligi ({avg_circuit_length} m) belgilangan me'yordan "
            f"({inp.max_circuit_length_m} m) oshib ketdi! Gidravlik qarshilik juda yuqori bo'ladi. "
            f"Konturlar sonini kamida {max(calculated_min_circuits, num_circuits + 1)} taga oshiring."
        )

    # 16 mm truba uchun 85-90 m dan oshsa ogohlantirish
    if inp.pipe_nominal_dia_mm <= 16 and avg_circuit_length > 90:
        warnings.append(
            f"16 mm li PEX/PERT trubalar uchun kontur uzunligini 80-90 metrdan oshirmaslik tavsiya etiladi. "
            f"Hozirgi uzunlik: {avg_circuit_length} m."
        )

    notes.append(
        f"Isitiladigan pol maydoni: {heated_floor_area} m² (umumiy {total_room_area} m², chiqarilgan {excluded_sum} m²). "
        f"Truba qadami: {inp.spacing_mm} mm. Sxema turi: {'Chigʻanoq (spiral)' if inp.routing_pattern == 'spiral' else 'Ilon izi (serpentine)'}."
    )
    notes.append(
        f"Har bir kontur uchun kollektorga ulanish trubasi: {lead_in_per_circuit} m (uzatish + qaytish). "
        f"Kollektorda {num_circuits} ta chiqish (juft) talab etiladi."
    )

    # Xona maydonini konturlar bo'yicha bo'laklarga ajratish va 2D sxemasini chizish
    circuits: List[CircuitInfo] = []
    split_along_length = inp.room_length >= inp.room_width

    for i in range(num_circuits):
        if split_along_length:
            strip_len = (inp.room_length - 2 * inp.boundary_offset_m) / num_circuits
            c_xmin = inp.boundary_offset_m + i * strip_len
            c_xmax = c_xmin + strip_len
            c_ymin = inp.boundary_offset_m
            c_ymax = inp.room_width - inp.boundary_offset_m
        else:
            strip_w = (inp.room_width - 2 * inp.boundary_offset_m) / num_circuits
            c_xmin = inp.boundary_offset_m
            c_xmax = inp.room_length - inp.boundary_offset_m
            c_ymin = inp.boundary_offset_m + i * strip_w
            c_ymax = c_ymin + strip_w

        if inp.routing_pattern == "serpentine":
            supply_pts = generate_serpentine_path(c_xmin, c_ymin, c_xmax, c_ymax, spacing_m)
            return_pts = []
            pts = supply_pts
        else:
            supply_pts, return_pts, pts = generate_bifilar_spiral_paths(c_xmin, c_ymin, c_xmax, c_ymax, spacing_m)

        # Real coiled floor length calculated directly from geometric vertices
        real_floor_len = 0.0
        for pt_i in range(len(pts) - 1):
            real_floor_len += math.hypot(pts[pt_i + 1][0] - pts[pt_i][0], pts[pt_i + 1][1] - pts[pt_i][1])
        c_floor_len = round(real_floor_len, 1)
        c_total_len = round(c_floor_len + lead_in_per_circuit, 1)
        color = CIRCUIT_COLORS[i % len(CIRCUIT_COLORS)]

        circuits.append(CircuitInfo(
            circuit_index=i + 1,
            name=f"{i + 1}-kontur",
            floor_length_m=c_floor_len,
            lead_in_length_m=lead_in_per_circuit,
            total_length_m=c_total_len,
            color_hex=color,
            points=pts,
            supply_points=supply_pts,
            return_points=return_pts
        ))

    schematic_data = {
        'room_length': inp.room_length,
        'room_width': inp.room_width,
        'spacing_m': spacing_m,
        'boundary_offset_m': inp.boundary_offset_m,
        'pattern': inp.routing_pattern,
        'circuits_count': num_circuits,
    }

    return UnderfloorHeatingResult(
        total_room_area=total_room_area,
        excluded_area=excluded_sum,
        heated_floor_area=heated_floor_area,
        spacing_mm=inp.spacing_mm,
        pipe_spec=pipe_spec,
        pipe_internal_dia_mm=pipe_internal_dia,
        estimated_floor_pipe_length_m=estimated_floor_pipe_length,
        manifold_lead_in_length_m=manifold_total_lead_in,
        total_pipe_length_m=total_pipe_length,
        num_circuits=num_circuits,
        average_circuit_length_m=avg_circuit_length,
        manifold_outlets_needed=num_circuits,
        circuits=circuits,
        schematic_data=schematic_data,
        warnings=warnings,
        notes=notes
    )
