"""
SantexPro — Isitish tizimlari va issiq pol normativ me'yorlar konfiguratsiyasi.
Barcha qiymatlar xalqaro (EN 1264, EN 12831) va milliy (ShNK/KMK 2.04.05-97)
standartlar asosida qat'iy belgilangan.
"""

from typing import Dict, Any, List

# EN 1264 va KMK 2.04.05-97 bo'yicha normativ parametrlar reyestri
STANDARDS_REGISTRY: Dict[str, Dict[str, Any]] = {
    # 1. Quvur qadami (Spacing / Shag ukladki)
    "allowed_pipe_spacings_mm": {
        "value": [100, 150, 200, 250, 300],
        "default": 150,
        "unit": "mm",
        "standard": "EN 1264-2 / KMK 2.04.05-97",
        "comment": "Chegara zonalarda 100-150 mm, asosiy yashash xonalarida 150-200 mm, kam faol zonalarda 250-300 mm"
    },
    
    # 2. Maksimal kontur uzunligi (Max circuit length)
    "max_circuit_length_16mm": {
        "value": 100.0,
        "unit": "m",
        "standard": "EN 1264-4 / Uponor Design Guide",
        "comment": "16x2.0 mm quvur uchun gidravlik qarshilik 20 kPa dan oshmasligi uchun tavsiya etilgan maksimal uzunlik"
    },
    "max_circuit_length_20mm": {
        "value": 120.0,
        "unit": "m",
        "standard": "EN 1264-4 / Uponor Design Guide",
        "comment": "20x2.0 mm quvur uchun tavsiya etilgan maksimal uzunlik"
    },
    
    # 3. Devordan chekinish masofasi (Edge clearance)
    "wall_edge_clearance_mm": {
        "value": 150,
        "min": 100,
        "max": 200,
        "unit": "mm",
        "standard": "EN 1264-4 §4.2.2",
        "comment": "Tashqi va ichki devorlardan trubagacha bo'lgan minimal masofa"
    },
    
    # 4. Pol yuzasi harorat chegaralari (Floor surface temperatures)
    "max_surface_temp_living": {
        "value": 29.0,
        "unit": "°C",
        "standard": "EN 1264-2 / KMK 2.04.05-97",
        "comment": "Doimiy odamlar bo'ladigan xonalar (zal, yotoqxona) uchun maksimal ruxsat etilgan pol yuzasi harorati"
    },
    "max_surface_temp_bathroom": {
        "value": 33.0,
        "unit": "°C",
        "standard": "EN 1264-2",
        "comment": "Vanna va sanuzellar uchun maksimal pol yuzasi harorati"
    },
    "max_surface_temp_perimeter": {
        "value": 35.0,
        "unit": "°C",
        "standard": "EN 1264-2",
        "comment": "Tashqi devor bo'yidagi 1 metrlik chegara (marginal) zona uchun maksimal harorat"
    },
    
    # 5. Suv tezligi va gidravlika (Fluid velocity & pressure drop)
    "fluid_velocity_min": {
        "value": 0.15,
        "unit": "m/s",
        "standard": "KMK 2.04.05-97",
        "comment": "Havoni quvurdan chiqarib yuborish (havosizlantirish) uchun minimal oqim tezligi"
    },
    "fluid_velocity_max": {
        "value": 0.60,
        "unit": "m/s",
        "standard": "EN 1264 / KMK 2.04.05-97",
        "comment": "Shovqin paydo bo'lishining oldini olish uchun maksimal oqim tezligi"
    },
    "max_circuit_pressure_drop_kpa": {
        "value": 20.0,
        "unit": "kPa",
        "standard": "EN 1264-3 / Uponor Design Guide",
        "comment": "Bitta konturdagi maksimal ruxsat etilgan gidravlik bosim yo'qotilishi"
    },
    
    # 6. Harorat grafigi (Supply & return design delta T)
    "design_delta_t_underfloor": {
        "value": 5.0,
        "min": 5.0,
        "max": 10.0,
        "unit": "°C",
        "standard": "EN 1264-2 (T_supply=40°C, T_return=35°C yoki 45/35°C)",
        "comment": "Issiq pol uzatish va qaytish harorati o'rtasidagi hisobiy farq"
    },
    
    # 7. Marshrutlash vazn koeffitsiyentlari (A* Routing Cost Weights)
    "routing_cost_open_floor": {
        "value": 1.0,
        "unit": "weight",
        "standard": "SantexPro Routing Engine",
        "comment": "Ochiq pol orqali to'g'ri o'tish bazaviy narxi"
    },
    "routing_cost_corridor_preference": {
        "value": 0.5,
        "unit": "weight",
        "standard": "SantexPro Routing Engine",
        "comment": "Koridor va magistral yo'laklardan o'tishni afzal ko'rish (pastroq narx)"
    },
    "routing_cost_interior_doorway": {
        "value": 1.2,
        "unit": "weight",
        "standard": "SantexPro Routing Engine",
        "comment": "Ichki xona eshik o'rni orqali o'tish (gofrali himoya gilzasi bilan)"
    },
    "routing_cost_main_entrance_penalty": {
        "value": 50.0,
        "unit": "weight",
        "standard": "SantexPro Routing Engine",
        "comment": "Bosh kirish eshigi (tashqi eshik) oldidan quvur o'tishini qat'iy cheklash uchun jarima"
    },
    "routing_cost_solid_wall_barrier": {
        "value": 99999.0,
        "unit": "weight",
        "standard": "SantexPro Routing Engine",
        "comment": "Eshiksiz pishiq devor orqali quvur o'tishi taqiqlanadi (cheksiz qarshilik)"
    },
    "corrugated_sleeve_diameter_mm": {
        "value": 20.0,
        "unit": "mm",
        "standard": "EN 1264-4 / Uponor Installation Manual",
        "comment": "Devor va deformatsion choklardan o'tishda 'Gofra Ø20' himoya gilzasi qo'llaniladi"
    }
}


def get_standard_param(param_name: str) -> Any:
    """Normativ parametr qiymatini qaytaradi."""
    if param_name not in STANDARDS_REGISTRY:
        raise KeyError(f"Normativ parametr topilmadi: {param_name}")
    return STANDARDS_REGISTRY[param_name]["value"]


def validate_circuit_length(length_m: float, diameter_mm: float = 16.0) -> Dict[str, Any]:
    """Kontur uzunligining normaga mosligini tekshiradi."""
    max_len = get_standard_param("max_circuit_length_20mm") if diameter_mm >= 20.0 else get_standard_param("max_circuit_length_16mm")
    is_valid = length_m <= max_len
    return {
        "is_valid": is_valid,
        "length_m": round(length_m, 2),
        "max_allowed_m": max_len,
        "difference_m": round(length_m - max_len, 2) if not is_valid else 0.0,
        "standard": "EN 1264-4",
        "status": "OK" if is_valid else "Tekshirilishi kerak: maksimal uzunlikdan oshgan"
    }
