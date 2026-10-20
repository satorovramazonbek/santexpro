"""
SantexPro — Professional Deterministik Quvur va Kontur Marshrutlash Dvigateli (CAD Routing Engine).
Hech qanday AI/LLM API chaqirilmaydi: 100% deterministik, matematik aniq muhandislik algoritmlari.
Xona chegaralaridan chiqib ketishni (overflow), diagonal kesib o'tishlarni va xonalararo
tartibsiz quvurlarni bartaraf etadi. Barcha trubalar devorlar bo'ylab, 90-gradusli ortogonal
CAD uslubida, koridor va eshik o'rni orqali gofrali gilza (Gofra Ø20) bilan yotqiziladi.
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
        
        self.grid = [[GridCell.OPEN for _ in range(self.cols)] for _ in range(self.rows)]
        self.cost_map = [[get_standard_param("routing_cost_open_floor") for _ in range(self.cols)] for _ in range(self.rows)]

    def to_cell(self, x_m: float, y_m: float) -> Tuple[int, int]:
        c = max(0, min(self.cols - 1, int(round(x_m / self.cell_size))))
        r = max(0, min(self.rows - 1, int(round(y_m / self.cell_size))))
        return c, r

    def to_coords(self, c: int, r: int) -> Tuple[float, float]:
        return round(c * self.cell_size, 3), round(r * self.cell_size, 3)

    def mark_corridor_zone(self, x_min: float, y_min: float, x_max: float, y_max: float):
        c_min, r_min = self.to_cell(x_min, y_min)
        c_max, r_max = self.to_cell(x_max, y_max)
        weight = get_standard_param("routing_cost_corridor_preference")
        
        for r in range(r_min, r_max + 1):
            for c in range(c_min, c_max + 1):
                self.grid[r][c] = GridCell.CORRIDOR
                self.cost_map[r][c] = weight

    def mark_wall(self, x1: float, y1: float, x2: float, y2: float, thickness_m: float = 0.2):
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
        start_cell = self.to_cell(start_pos[0], start_pos[1])
        end_cell = self.to_cell(end_pos[0], end_pos[1])

        if start_cell == end_cell:
            return [start_pos, end_pos]

        open_set = []
        h_start = math.hypot(end_cell[0] - start_cell[0], end_cell[1] - start_cell[1])
        heapq.heappush(open_set, (h_start, h_start, start_cell, [start_cell]))

        g_score = {start_cell: 0.0}
        visited = set()
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
                if cell_cost >= 90000.0:
                    continue

                step_cost = self.cell_size * cell_cost
                new_g = g_score[current] + step_cost

                if neighbor not in g_score or new_g < g_score[neighbor]:
                    g_score[neighbor] = new_g
                    h = math.hypot(end_cell[0] - nc, end_cell[1] - nr)
                    f = new_g + h
                    heapq.heappush(open_set, (f, h, neighbor, path + [neighbor]))

        if not best_path_cells:
            return [start_pos, end_pos]

        coords = [self.to_coords(c, r) for c, r in best_path_cells]
        simplified = self.simplify_orthogonal(coords)
        if simplified:
            simplified[0] = (round(start_pos[0], 3), round(start_pos[1], 3))
            simplified[-1] = (round(end_pos[0], 3), round(end_pos[1], 3))
        return simplified

    def simplify_orthogonal(self, points: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
        if len(points) <= 2:
            return points

        result = [points[0]]
        for i in range(1, len(points) - 1):
            prev = result[-1]
            curr = points[i]
            nxt = points[i + 1]

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
        "supply_feeder": [[round(p[0], 3), round(p[1], 3)] for p in supply_path],
        "return_feeder": [[round(p[0], 3), round(p[1], 3)] for p in return_path],
        "supply_length_m": sup_len,
        "return_length_m": ret_len,
        "feeder_total_m": round(sup_len + ret_len, 2),
    }


def generate_orthogonal_bifilar_coil(
    x_min: float,
    y_min: float,
    x_max: float,
    y_max: float,
    spacing_m: float = 0.15,
    connection_side: str = 'right'
) -> Tuple[List[List[float]], List[List[float]], List[List[float]], float]:
    """
    Xona chegarasidan chiqmaydigan, toza bifilar (chig'anoq / spiral) issiq pol konturini yaratadi.
    connection_side: 'right' | 'left' | 'top' | 'bottom' — kollektor/koridorga qaragan tomon.
    Uzatish (T11) va qaytish (T12) uchlari aynan shu tomondan chiqadi.
    """
    step = spacing_m * 2.0
    supply: List[List[float]] = []
    return_pts: List[List[float]] = []

    l = round(x_min, 3)
    t = round(y_min, 3)
    r = round(x_max, 3)
    b = round(y_max, 3)

    if connection_side == 'right':
        while (r - l) >= 2.2 * spacing_m and (b - t) >= 2.2 * spacing_m:
            supply.append([round(r, 3), round(t, 3)])
            supply.append([round(l, 3), round(t, 3)])
            supply.append([round(l, 3), round(b, 3)])
            supply.append([round(r - step, 3), round(b, 3)])
            supply.append([round(r - step, 3), round(t + step, 3)])

            return_pts.insert(0, [round(r - spacing_m, 3), round(t + spacing_m, 3)])
            return_pts.insert(0, [round(l + spacing_m, 3), round(t + spacing_m, 3)])
            return_pts.insert(0, [round(l + spacing_m, 3), round(b - spacing_m, 3)])
            return_pts.insert(0, [round(r - step - spacing_m, 3), round(b - spacing_m, 3)])

            l += step
            t += step
            r -= step
            b -= step

    elif connection_side == 'left':
        while (r - l) >= 2.2 * spacing_m and (b - t) >= 2.2 * spacing_m:
            supply.append([round(l, 3), round(t, 3)])
            supply.append([round(r, 3), round(t, 3)])
            supply.append([round(r, 3), round(b, 3)])
            supply.append([round(l + step, 3), round(b, 3)])
            supply.append([round(l + step, 3), round(t + step, 3)])

            return_pts.insert(0, [round(l + spacing_m, 3), round(t + spacing_m, 3)])
            return_pts.insert(0, [round(r - spacing_m, 3), round(t + spacing_m, 3)])
            return_pts.insert(0, [round(r - spacing_m, 3), round(b - spacing_m, 3)])
            return_pts.insert(0, [round(l + step + spacing_m, 3), round(b - spacing_m, 3)])

            l += step
            t += step
            r -= step
            b -= step

    elif connection_side == 'bottom':
        while (r - l) >= 2.2 * spacing_m and (b - t) >= 2.2 * spacing_m:
            supply.append([round(l, 3), round(b, 3)])
            supply.append([round(l, 3), round(t, 3)])
            supply.append([round(r, 3), round(t, 3)])
            supply.append([round(r, 3), round(b - step, 3)])
            supply.append([round(l + step, 3), round(b - step, 3)])

            return_pts.insert(0, [round(l + spacing_m, 3), round(b - spacing_m, 3)])
            return_pts.insert(0, [round(l + spacing_m, 3), round(t + spacing_m, 3)])
            return_pts.insert(0, [round(r - spacing_m, 3), round(t + spacing_m, 3)])
            return_pts.insert(0, [round(r - spacing_m, 3), round(b - step - spacing_m, 3)])

            l += step
            t += step
            r -= step
            b -= step
    else:  # top
        while (r - l) >= 2.2 * spacing_m and (b - t) >= 2.2 * spacing_m:
            supply.append([round(l, 3), round(t, 3)])
            supply.append([round(l, 3), round(b, 3)])
            supply.append([round(r, 3), round(b, 3)])
            supply.append([round(r, 3), round(t + step, 3)])
            supply.append([round(l + step, 3), round(t + step, 3)])

            return_pts.insert(0, [round(l + spacing_m, 3), round(t + spacing_m, 3)])
            return_pts.insert(0, [round(l + spacing_m, 3), round(b - spacing_m, 3)])
            return_pts.insert(0, [round(r - spacing_m, 3), round(b - spacing_m, 3)])
            return_pts.insert(0, [round(r - spacing_m, 3), round(t + step + spacing_m, 3)])

            l += step
            t += step
            r -= step
            b -= step

    if supply and return_pts:
        mid_pt = [
            round((supply[-1][0] + return_pts[0][0]) / 2.0, 3),
            round((supply[-1][1] + return_pts[0][1]) / 2.0, 3)
        ]
        supply.append(mid_pt)
        return_pts.insert(0, mid_pt)

    full_path = supply + return_pts

    total_len = 0.0
    for i in range(len(full_path) - 1):
        total_len += math.hypot(full_path[i+1][0] - full_path[i][0], full_path[i+1][1] - full_path[i][1])

    return supply, return_pts, full_path, round(total_len, 2)


def create_clean_cad_feeder_route(
    manifold_pos: Tuple[float, float],
    port_index: int,
    entry_global: Tuple[float, float],
    exit_global: Tuple[float, float],
    corridor_x: float,
    corridor_y_range: Tuple[float, float],
    doorway_pos: Optional[Tuple[float, float]] = None,
    wall_corridor_channel_x: Optional[float] = None,
    inner_wall_x: Optional[float] = None
) -> Dict[str, Any]:
    """
    To'liq 90-gradusli ortogonal, devor va koridor yo'lagi bo'ylab tartibli o'tuvchi magistral trassa.
    Qizil (T11 uzatish) va ko'k (T12 qaytish) quvurlar 25-30 mm parallel masofada, xonani
    kesib o'tmasdan va devorlardan tashqariga chiqmasdan yotqiziladi.
    Har bir port uchun alohida parallel yo'lak (lane offset) ajratiladi.
    """
    port_spacing = 0.035  # 35 mm portlararo oraliq
    pair_spacing = 0.024  # 24 mm ta'minot va qaytish quvurlari oraliq masofasi

    port_offset_y = (port_index - 1) * 0.04
    port_sup = (round(manifold_pos[0], 3), round(manifold_pos[1] + port_offset_y, 3))
    port_ret = (round(manifold_pos[0], 3), round(manifold_pos[1] + port_offset_y + pair_spacing, 3))

    base_chan_x = wall_corridor_channel_x if wall_corridor_channel_x is not None else corridor_x
    # Koridordagi har bir portning o'z vertikal chizig'i
    chan_sup_x = round(base_chan_x + (port_index - 1) * port_spacing - pair_spacing / 2.0, 3)
    chan_ret_x = round(base_chan_x + (port_index - 1) * port_spacing + pair_spacing / 2.0, 3)

    sup_path: List[Tuple[float, float]] = [port_sup]
    ret_path: List[Tuple[float, float]] = [port_ret]

    if doorway_pos:
        dw_x, dw_y = doorway_pos
        door_y_off = (port_index - 1) * 0.03

        # 1. Kollektordan koridor bo'ylab eshikkacha
        sup_path.append((chan_sup_x, port_sup[1]))
        sup_path.append((chan_sup_x, round(dw_y + door_y_off - pair_spacing / 2.0, 3)))

        ret_path.append((chan_ret_x, port_ret[1]))
        ret_path.append((chan_ret_x, round(dw_y + door_y_off + pair_spacing / 2.0, 3)))

        # 2. Eshik o'rni (Gofra Ø20) orqali xonaga o'tish
        sup_path.append((round(dw_x, 3), round(dw_y + door_y_off - pair_spacing / 2.0, 3)))
        ret_path.append((round(dw_x, 3), round(dw_y + door_y_off + pair_spacing / 2.0, 3)))

        # 3. Xona ichidagi devor bo'yicha trassa (inner wall channel)
        if inner_wall_x is not None:
            in_w_sup = round(inner_wall_x - (port_index - 1) * port_spacing - pair_spacing / 2.0, 3)
            in_w_ret = round(inner_wall_x - (port_index - 1) * port_spacing + pair_spacing / 2.0, 3)

            sup_path.append((in_w_sup, round(dw_y + door_y_off - pair_spacing / 2.0, 3)))
            ret_path.append((in_w_ret, round(dw_y + door_y_off + pair_spacing / 2.0, 3)))

            if abs(entry_global[1] - dw_y) > 0.05:
                sup_path.append((in_w_sup, round(entry_global[1], 3)))
                ret_path.append((in_w_ret, round(exit_global[1], 3)))

        else:
            if abs(entry_global[1] - dw_y) > 0.05:
                sup_path.append((round(dw_x - 0.15, 3), round(entry_global[1], 3)))
                ret_path.append((round(dw_x - 0.15 + pair_spacing, 3), round(exit_global[1], 3)))

        # 4. Kontur kirish va chiqish nuqtalariga to'g'ri burchak ostida ulanish
        sup_path.append((round(entry_global[0], 3), round(entry_global[1], 3)))
        ret_path.append((round(exit_global[0], 3), round(exit_global[1], 3)))

    else:
        # Eshiksiz to'g'ridan-to'g'ri kanal (masalan, koridorning o'zida yoki devor yo'lida)
        sup_path.append((chan_sup_x, port_sup[1]))
        sup_path.append((chan_sup_x, round(entry_global[1], 3)))
        sup_path.append((round(entry_global[0], 3), round(entry_global[1], 3)))

        ret_path.append((chan_ret_x, port_ret[1]))
        ret_path.append((chan_ret_x, round(exit_global[1], 3)))
        ret_path.append((round(exit_global[0], 3), round(exit_global[1], 3)))

    def calc_len(pts: List[Tuple[float, float]]) -> float:
        l = 0.0
        for i in range(len(pts) - 1):
            l += math.hypot(pts[i+1][0] - pts[i][0], pts[i+1][1] - pts[i][1])
        return round(l, 2)

    sup_len = calc_len(sup_path)
    ret_len = calc_len(ret_path)

    return {
        "port_index": port_index,
        "supply_feeder": [[round(p[0], 3), round(p[1], 3)] for p in sup_path],
        "return_feeder": [[round(p[0], 3), round(p[1], 3)] for p in ret_path],
        "supply_length_m": sup_len,
        "return_length_m": ret_len,
        "feeder_total_m": round(sup_len + ret_len, 2),
    }
