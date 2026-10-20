"""
SantexPro — Deterministik Quvur Marshrutlash Dvigateli (A* Routing Engine).
Hech qanday AI/LLM ishlatilmaydi: 100% deterministik, matematik aniq algoritmlar.
Devorlar, ichki eshiklar, koridorlar va kollektor chiqishlarini hisobga oladi.
Bosh kirish eshigi oldidan o'tishni qat'iy cheklaydi (yuqori jarima).
"""

import math
import heapq
from typing import List, Tuple, Dict, Any, Optional
from engineering.standards_config import get_standard_param, STANDARDS_REGISTRY


class GridCell:
    OPEN = 0
    CORRIDOR = 1
    DOOR_INTERIOR = 2
    DOOR_EXTERIOR = 3
    WALL = 9


class DeterministicPipeRouter:
    """
    Qavat koordinatalar tizimida (m yoki mm) deterministik A* yo'nalish topuvchi.
    """
    def __init__(self, bounds_x: float, bounds_y: float, cell_size_m: float = 0.1):
        self.bounds_x = bounds_x
        self.bounds_y = bounds_y
        self.cell_size = cell_size_m
        self.cols = int(math.ceil(bounds_x / cell_size_m)) + 1
        self.rows = int(math.ceil(bounds_y / cell_size_m)) + 1
        
        # Grid inicializatsiyasi (Standart: OPEN)
        self.grid = [[GridCell.OPEN for _ in range(self.cols)] for _ in range(self.rows)]
        self.cost_map = [[get_standard_param("routing_cost_open_floor") for _ in range(self.cols)] for _ in range(self.rows)]

    def to_cell(self, x_m: float, y_m: float) -> Tuple[int, int]:
        c = max(0, min(self.cols - 1, int(round(x_m / self.cell_size))))
        r = max(0, min(self.rows - 1, int(round(y_m / self.cell_size))))
        return c, r

    def to_coords(self, c: int, r: int) -> Tuple[float, float]:
        return round(c * self.cell_size, 3), round(r * self.cell_size, 3)

    def mark_corridor_zone(self, x_min: float, y_min: float, x_max: float, y_max: float):
        """Koridor zonasini belgilaydi (marshrutlash narxi 0.5 - afzal ko'riladi)."""
        c_min, r_min = self.to_cell(x_min, y_min)
        c_max, r_max = self.to_cell(x_max, y_max)
        weight = get_standard_param("routing_cost_corridor_preference")
        
        for r in range(r_min, r_max + 1):
            for c in range(c_min, c_max + 1):
                self.grid[r][c] = GridCell.CORRIDOR
                self.cost_map[r][c] = weight

    def mark_wall(self, x1: float, y1: float, x2: float, y2: float, thickness_m: float = 0.2):
        """Devorni to'siq sifatida belgilaydi (cheksiz narx)."""
        dist = math.hypot(x2 - x1, y2 - y1)
        if dist < 1e-4:
            return
        steps = max(1, int(dist / (self.cell_size * 0.5)))
        half_thick_cells = max(1, int(thickness_m / (2 * self.cell_size)))
        wall_cost = get_standard_param("routing_cost_solid_wall_barrier")

        for i in range(steps + 1):
            frac = i / steps
            x = x1 + frac * (x2 - x1)
            y = y1 + frac * (y2 - y1)
            c, r = self.to_cell(x, y)
            for dr in range(-half_thick_cells, half_thick_cells + 1):
                for dc in range(-half_thick_cells, half_thick_cells + 1):
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < self.rows and 0 <= nc < self.cols:
                        self.grid[nr][nc] = GridCell.WALL
                        self.cost_map[nr][nc] = wall_cost

    def open_doorway(self, x_center: float, y_center: float, width_m: float = 0.9, is_interior: bool = True):
        """
        Eshik o'rnini ochadi.
        Ichki eshik: past narx (1.2) - quvur bemalol o'tadi.
        Bosh kirish eshigi (tashqi): yuqori jarima (50.0) - faqat ilojsiz bo'lsagina o'tishi mumkin.
        """
        half_w = width_m / 2.0
        c_min, r_min = self.to_cell(x_center - half_w, y_center - half_w)
        c_max, r_max = self.to_cell(x_center + half_w, y_center + half_w)
        
        cell_type = GridCell.DOOR_INTERIOR if is_interior else GridCell.DOOR_EXTERIOR
        cost = get_standard_param("routing_cost_interior_doorway") if is_interior else get_standard_param("routing_cost_main_entrance_penalty")

        for r in range(r_min, r_max + 1):
            for c in range(c_min, c_max + 1):
                if 0 <= r < self.rows and 0 <= c < self.cols:
                    self.grid[r][c] = cell_type
                    self.cost_map[r][c] = cost

    def find_path(self, start_pos: Tuple[float, float], end_pos: Tuple[float, float]) -> List[Tuple[float, float]]:
        """
        A* algoritmi bilan optimal va deterministik yo'lni topadi.
        """
        start_cell = self.to_cell(start_pos[0], start_pos[1])
        end_cell = self.to_cell(end_pos[0], end_pos[1])

        if start_cell == end_cell:
            return [start_pos, end_pos]

        # Priority queue: (f_score, h_score, cell, path)
        open_set = []
        h_start = math.hypot(end_cell[0] - start_cell[0], end_cell[1] - start_cell[1])
        heapq.heappush(open_set, (h_start, h_start, start_cell, [start_cell]))

        g_score = {start_cell: 0.0}
        visited = set()

        # 4-yo'nalishli (ortogonal) harakat: x va y bo'ylab
        directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]

        best_path_cells = None

        while open_set:
            _, _, current, path = heapq.heappop(open_set)

            if current == end_cell:
                best_path_cells = path
                break

            if current in visited:
                continue
            visited.add(current)

            for dc, dr in directions:
                neighbor = (current[0] + dc, current[1] + dr)
                nc, nr = neighbor

                if not (0 <= nc < self.cols and 0 <= nr < self.rows):
                    continue

                cell_cost = self.cost_map[nr][nc]
                if cell_cost >= 90000.0:  # Devor to'siq
                    continue

                step_cost = self.cell_size * cell_cost
                new_g = g_score[current] + step_cost

                if neighbor not in g_score or new_g < g_score[neighbor]:
                    g_score[neighbor] = new_g
                    h = math.hypot(end_cell[0] - nc, end_cell[1] - nr)
                    f = new_g + h
                    heapq.heappush(open_set, (f, h, neighbor, path + [neighbor]))

        if not best_path_cells:
            # To'siqdan aylanib o'tolmasa, to'g'ri chiziqli zaxira (fallback)
            return [start_pos, end_pos]

        # Koordinatalarga o'tkazish va poliline'ni tekislash (simplify orthogonal segments)
        coords = [self.to_coords(c, r) for c, r in best_path_cells]
        simplified = self.simplify_orthogonal(coords)
        
        # Boshlang'ich va oxirgi nuqtalarni aniq o'rnatish
        if simplified:
            simplified[0] = (round(start_pos[0], 3), round(start_pos[1], 3))
            simplified[-1] = (round(end_pos[0], 3), round(end_pos[1], 3))
        return simplified

    def simplify_orthogonal(self, points: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
        """Bir xil yo'nalishdagi oraliq nuqtalarni birlashtirib, tekis 90-gradusli CAD segmentlarini hosil qiladi."""
        if len(points) <= 2:
            return points

        result = [points[0]]
        for i in range(1, len(points) - 1):
            prev = result[-1]
            curr = points[i]
            nxt = points[i + 1]

            # Agar prev->curr va curr->nxt yo'nalishi bir xil bo'lsa (kollinear), curr tashlab ketiladi
            is_collinear_x = abs(prev[0] - curr[0]) < 1e-4 and abs(curr[0] - nxt[0]) < 1e-4
            is_collinear_y = abs(prev[1] - curr[1]) < 1e-4 and abs(curr[1] - nxt[1]) < 1e-4

            if not (is_collinear_x or is_collinear_y):
                result.append(curr)

        result.append(points[-1])
        return result


def route_circuit_feeder_pair(
    router: DeterministicPipeRouter,
    manifold_pos: Tuple[float, float],
    port_index: int,
    room_entry_pos: Tuple[float, float],
    room_exit_pos: Tuple[float, float],
    port_spacing_m: float = 0.05
) -> Dict[str, Any]:
    """
    Kollektorning aniq chiqishidan xonadagi konturgacha bo'lgan qizil (T11) va ko'k (T12)
    uzatish va qaytish yo'llarini parallel holda marshrutlaydi.
    """
    offset_x = (port_index - 1) * port_spacing_m
    supply_start = (manifold_pos[0] + offset_x, manifold_pos[1])
    return_start = (manifold_pos[0] + offset_x + 0.025, manifold_pos[1])

    supply_path = router.find_path(supply_start, room_entry_pos)
    return_path = router.find_path(room_exit_pos, return_start)

    def calc_length(pts: List[Tuple[float, float]]) -> float:
        l = 0.0
        for i in range(len(pts) - 1):
            l += math.hypot(pts[i+1][0] - pts[i][0], pts[i+1][1] - pts[i][1])
        return round(l, 2)

    sup_len = calc_length(supply_path)
    ret_len = calc_length(return_path)

    return {
        "port_index": port_index,
        "supply_feeder": supply_path,
        "return_feeder": return_path,
        "supply_length_m": sup_len,
        "return_length_m": ret_len,
        "feeder_total_m": round(sup_len + ret_len, 2),
    }
