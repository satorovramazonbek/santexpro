"""
SantexPro PDF Hisobot Generatori (ReportLab)
Loyiha muhandislik hisob-kitoblari, xonalar parametrlari, radiatorlar,
issiq pol konturlari, gidravlika va materiallar smetasini O‘zbek lotin tilida
chiroyli va professional formatda PDF hujjat sifatida shakllantirish.
"""

import io
import math
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.graphics.shapes import Drawing, Rect, Line, Circle, String, Group, PolyLine
from reportlab.pdfgen import canvas

from projects.models import Project, Room, UnderfloorHeatingCircuit, Manifold
from engineering.underfloor import generate_bifilar_spiral_paths


class NumberedCanvas(canvas.Canvas):
    """
    Har bir sahifaga pastki kolontitul (sahifa raqami va sana) qo'shuvchi Canvas.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Yuqori sarlavha (header)
        self.drawString(20 * mm, 285 * mm, "SantexPro — Isitish Tizimlarini Loyihalash va Hisoblash Platformasi")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(20 * mm, 282 * mm, 190 * mm, 282 * mm)

        # Quyi sarlavha (footer)
        page_text = f"Sahifa {self._pageNumber} / {page_count}"
        self.drawRightString(190 * mm, 12 * mm, page_text)
        self.drawString(20 * mm, 12 * mm, f"Chop etilgan sana: {datetime.now().strftime('%d.%m.%Y %H:%M')} | Maxfiy muhandislik hujjati")
        self.line(20 * mm, 16 * mm, 190 * mm, 16 * mm)

        self.restoreState()


def draw_room_underfloor_cad(room: Room, dw_width=470, dw_height=220) -> Drawing:
    """
    Xona uchun haqiqiy Uponor standarti (PDF namuna 5-sahifa) bo'yicha
    vektorli 2D CAD issiq pol chizmasini ReportLab Drawing obyekti sifatida generatsiya qilish.
    """
    d = Drawing(dw_width, dw_height)

    # Scale calculation
    margin_x = 42
    margin_y = 30
    scale = min((dw_width - 2 * margin_x) / max(1.0, float(room.length)), (dw_height - 2 * margin_y) / max(1.0, float(room.width)))
    origin_x = (dw_width - float(room.length) * scale) / 2
    origin_y = (dw_height - float(room.width) * scale) / 2

    def to_x(m): return origin_x + m * scale
    def to_y(m): return origin_y + m * scale

    # 1. Background grid
    d.add(Rect(0, 0, dw_width, dw_height, fillColor=colors.HexColor('#F8FAFC'), strokeColor=colors.HexColor('#E2E8F0'), strokeWidth=0.8, rx=4, ry=4))

    # 2. Floor interior
    d.add(Rect(to_x(0), to_y(0), float(room.length) * scale, float(room.width) * scale, fillColor=colors.HexColor('#FFFFFF'), strokeColor=colors.HexColor('#64748B'), strokeWidth=1.2))

    # 3. Outer Double Walls
    wall_thick = max(6.0, 0.25 * scale)
    # North wall
    d.add(Rect(to_x(0) - wall_thick, to_y(0) - wall_thick, float(room.length) * scale + 2 * wall_thick, wall_thick, fillColor=colors.HexColor('#F1F5F9'), strokeColor=colors.HexColor('#1E293B'), strokeWidth=1.5))
    # South wall
    d.add(Rect(to_x(0) - wall_thick, to_y(float(room.width)), float(room.length) * scale + 2 * wall_thick, wall_thick, fillColor=colors.HexColor('#F1F5F9'), strokeColor=colors.HexColor('#1E293B'), strokeWidth=1.5))
    # West wall
    d.add(Rect(to_x(0) - wall_thick, to_y(0), wall_thick, float(room.width) * scale, fillColor=colors.HexColor('#F1F5F9'), strokeColor=colors.HexColor('#1E293B'), strokeWidth=1.5))
    # East wall
    d.add(Rect(to_x(float(room.length)), to_y(0), wall_thick, float(room.width) * scale, fillColor=colors.HexColor('#F1F5F9'), strokeColor=colors.HexColor('#1E293B'), strokeWidth=1.5))

    # 4. Windows
    windows = list(room.windows.all()) if room.pk else []
    for idx, win in enumerate(windows):
        w_x = to_x(float(win.position_along_wall))
        w_w = float(win.width) * scale
        d.add(Rect(w_x, to_y(0) - wall_thick, w_w, wall_thick, fillColor=colors.white, strokeColor=colors.HexColor('#1E293B'), strokeWidth=1.2))
        d.add(Line(w_x, to_y(0) - wall_thick * 0.4, w_x + w_w, to_y(0) - wall_thick * 0.4, strokeColor=colors.HexColor('#0284C7'), strokeWidth=1.8))
        d.add(Line(w_x, to_y(0) - wall_thick * 0.7, w_x + w_w, to_y(0) - wall_thick * 0.7, strokeColor=colors.HexColor('#0284C7'), strokeWidth=1.8))
        d.add(String(w_x + w_w / 2 - 10, to_y(0) - wall_thick - 7, f"OK-{idx+1}", fontSize=6, fontName='Helvetica-Bold', fillColor=colors.HexColor('#0369A1')))

    # 5. Doors
    doors = list(room.doors.all()) if room.pk else []
    for idx, door in enumerate(doors):
        d_x = to_x(float(door.position_along_wall))
        d_w = float(door.width) * scale
        d.add(Rect(d_x, to_y(float(room.width)), d_w, wall_thick, fillColor=colors.white, strokeColor=colors.HexColor('#1E293B'), strokeWidth=1.2))
        d.add(Line(d_x, to_y(float(room.width)), d_x, to_y(float(room.width)) - d_w, strokeColor=colors.HexColor('#D97706'), strokeWidth=1.5))
        d.add(String(d_x + d_w / 2 - 8, to_y(float(room.width)) + wall_thick + 4, f"D-{idx+1}", fontSize=6, fontName='Helvetica-Bold', fillColor=colors.HexColor('#B45309')))

    # 6. Underfloor Heating Circuits (Bifilar Dual-Color Spirals)
    db_circuits = list(room.underfloor_circuits.all()) if room.pk else []
    num_circuits = len(db_circuits) or (2 if float(room.length) > 4.5 or float(room.area) > 15 else 1)
    spacing_m = (db_circuits[0].spacing_mm / 1000.0) if db_circuits else 0.15
    wall_offset = 0.20
    split_along_x = float(room.length) >= float(room.width)

    # Manifold coords
    manifold_x = to_x(0.60)
    manifold_y = to_y(min(1.8, max(0.6, float(room.width) / 2)))

    r_len = float(room.length)
    r_wid = float(room.width)

    for i in range(num_circuits):
        if split_along_x:
            zone_len = (r_len - 2 * wall_offset) / num_circuits
            zx0 = wall_offset + i * zone_len + (0.04 if i > 0 else 0)
            zx1 = wall_offset + (i + 1) * zone_len - (0.04 if i < num_circuits - 1 else 0)
            zy0 = wall_offset
            zy1 = r_wid - wall_offset
        else:
            zone_w = (r_wid - 2 * wall_offset) / num_circuits
            zx0 = wall_offset
            zx1 = r_len - wall_offset
            zy0 = wall_offset + i * zone_w + (0.04 if i > 0 else 0)
            zy1 = wall_offset + (i + 1) * zone_w - (0.04 if i < num_circuits - 1 else 0)

        supply_pts, return_pts, full_pts = generate_bifilar_spiral_paths(zx0, zy0, zx1, zy1, spacing_m)

        # PolyLine for supply (Red)
        if supply_pts:
            s_flat = []
            for p in supply_pts:
                s_flat.extend([to_x(p[0]), to_y(p[1])])
            d.add(PolyLine(s_flat, strokeColor=colors.HexColor('#EF4444'), strokeWidth=1.3))

        # PolyLine for return (Blue)
        if return_pts:
            r_flat = []
            for p in return_pts:
                r_flat.extend([to_x(p[0]), to_y(p[1])])
            d.add(PolyLine(r_flat, strokeColor=colors.HexColor('#2563EB'), strokeWidth=1.3))

        # Feeder to manifold
        start_pt = supply_pts[0] if supply_pts else (zx0, zy0)
        end_pt = return_pts[-1] if return_pts else start_pt
        feeder_offset = (i - (num_circuits - 1) / 2) * 6
        d.add(Line(manifold_x + feeder_offset - 2, manifold_y, to_x(start_pt[0]), to_y(start_pt[1]), strokeColor=colors.HexColor('#EF4444'), strokeWidth=1, strokeDashArray=[4, 2]))
        d.add(Line(manifold_x + feeder_offset + 2, manifold_y, to_x(end_pt[0]), to_y(end_pt[1]), strokeColor=colors.HexColor('#2563EB'), strokeWidth=1, strokeDashArray=[4, 2]))

        # Calculate circuit pipe length
        calc_len = 0.0
        for k in range(len(full_pts) - 1):
            calc_len += math.hypot(full_pts[k+1][0] - full_pts[k][0], full_pts[k+1][1] - full_pts[k][1])
        total_len_m = round(calc_len + 8.0)

        # Official Uponor Circuit Stamp (Page 5 PDF Standard)
        st_x = to_x(zx0 + 0.35)
        st_y = to_y(zy1 - 0.25) - 24
        stamp = Group()
        stamp.add(Rect(st_x, st_y, 48, 24, fillColor=colors.white, strokeColor=colors.HexColor('#1E40AF'), strokeWidth=1.1, rx=2, ry=2))
        stamp.add(Rect(st_x, st_y + 13, 48, 11, fillColor=colors.HexColor('#1E40AF'), strokeColor=colors.HexColor('#1E40AF'), strokeWidth=0.5, rx=2, ry=2))
        stamp.add(String(st_x + 11, st_y + 15, 'uponor', fontSize=6.5, fontName='Helvetica-Bold', fillColor=colors.white))
        stamp.add(String(st_x + 5, st_y + 7, f'K-{i+1} (S{i+1})', fontSize=5.5, fontName='Helvetica-Bold', fillColor=colors.HexColor('#0F172A')))
        stamp.add(String(st_x + 5, st_y + 1.5, f'{total_len_m} m', fontSize=6, fontName='Helvetica-Bold', fillColor=colors.HexColor('#1D4ED8')))
        d.add(stamp)

    # 7. Manifold Cabinet (ШРВ)
    m_box = Group()
    m_box.add(Rect(manifold_x - 14, manifold_y - 10, 28, 20, fillColor=colors.HexColor('#F8FAFC'), strokeColor=colors.HexColor('#334155'), strokeWidth=1.3, rx=2, ry=2))
    m_box.add(Line(manifold_x - 10, manifold_y + 4, manifold_x + 10, manifold_y + 4, strokeColor=colors.HexColor('#EF4444'), strokeWidth=2))
    m_box.add(Line(manifold_x - 10, manifold_y - 4, manifold_x + 10, manifold_y - 4, strokeColor=colors.HexColor('#2563EB'), strokeWidth=2))
    m_box.add(String(manifold_x - 12, manifold_y - 17, f"ШРВ-{num_circuits}", fontSize=5.5, fontName='Helvetica-Bold', fillColor=colors.HexColor('#0F172A')))
    d.add(m_box)

    # 8. Expansion Joint (Deformatsion chok) if multi-circuit
    if num_circuits > 1:
        if split_along_x:
            mid_line_x = to_x(r_len / 2)
            d.add(Line(mid_line_x, to_y(0), mid_line_x, to_y(r_wid), strokeColor=colors.HexColor('#DC2626'), strokeWidth=1.2, strokeDashArray=[4, 3]))
        else:
            mid_line_y = to_y(r_wid / 2)
            d.add(Line(to_x(0), mid_line_y, to_x(r_len), mid_line_y, strokeColor=colors.HexColor('#DC2626'), strokeWidth=1.2, strokeDashArray=[4, 3]))

    # 9. Center Room Circle Badge (matching reference PDF)
    center_x = to_x(r_len / 2)
    center_y = to_y(r_wid / 2)
    d.add(Circle(center_x, center_y, 10, fillColor=colors.white, strokeColor=colors.HexColor('#64748B'), strokeWidth=1))
    room_num = ''.join(c for c in room.name if c.isdigit()) or str(room.id or 1)
    d.add(String(center_x - 3, center_y - 3, room_num, fontSize=7.5, fontName='Helvetica-Bold', fillColor=colors.HexColor('#0F172A')))

    # 10. Dimension Lines
    # Top width
    d.add(Line(to_x(0), to_y(0) - wall_thick - 12, to_x(r_len), to_y(0) - wall_thick - 12, strokeColor=colors.HexColor('#475569'), strokeWidth=0.8))
    d.add(Line(to_x(0) - 2, to_y(0) - wall_thick - 9, to_x(0) + 2, to_y(0) - wall_thick - 15, strokeColor=colors.HexColor('#0F172A'), strokeWidth=1.2))
    d.add(Line(to_x(r_len) - 2, to_y(0) - wall_thick - 9, to_x(r_len) + 2, to_y(0) - wall_thick - 15, strokeColor=colors.HexColor('#0F172A'), strokeWidth=1.2))
    d.add(String(to_x(r_len / 2) - 10, to_y(0) - wall_thick - 10, f"{r_len:.1f} m", fontSize=6.5, fontName='Helvetica-Bold', fillColor=colors.HexColor('#0F172A')))

    # Side height
    d.add(Line(to_x(0) - wall_thick - 12, to_y(0), to_x(0) - wall_thick - 12, to_y(r_wid), strokeColor=colors.HexColor('#475569'), strokeWidth=0.8))
    d.add(Line(to_x(0) - wall_thick - 15, to_y(0) - 2, to_x(0) - wall_thick - 9, to_y(0) + 2, strokeColor=colors.HexColor('#0F172A'), strokeWidth=1.2))
    d.add(Line(to_x(0) - wall_thick - 15, to_y(r_wid) - 2, to_x(0) - wall_thick - 9, to_y(r_wid) + 2, strokeColor=colors.HexColor('#0F172A'), strokeWidth=1.2))
    d.add(String(to_x(0) - wall_thick - 20, to_y(r_wid / 2) - 3, f"{r_wid:.1f} m", fontSize=6.5, fontName='Helvetica-Bold', fillColor=colors.HexColor('#0F172A')))

    # 11. CAD Drawing Stamp in corner
    stamp_x = dw_width - 125
    stamp_y = 6
    d.add(Rect(stamp_x, stamp_y, 118, 28, fillColor=colors.white, strokeColor=colors.HexColor('#1E293B'), strokeWidth=0.9))
    d.add(Line(stamp_x, stamp_y + 14, stamp_x + 118, stamp_y + 14, strokeColor=colors.HexColor('#1E293B'), strokeWidth=0.5))
    d.add(String(stamp_x + 4, stamp_y + 17, "SantexPro CAD M 1:50", fontSize=6.5, fontName='Helvetica-Bold', fillColor=colors.HexColor('#1E40AF')))
    d.add(String(stamp_x + 4, stamp_y + 4, f"{room.name[:16]} | S={room.area:.1f}m²", fontSize=5.5, fontName='Helvetica', fillColor=colors.HexColor('#475569')))

    return d


def draw_project_master_underfloor_cad(project: Project, dw_width=490, dw_height=270) -> Drawing:
    """
    Butun uyning umumiy me'moriy va issiq pol bosh rejasi (Master Floor Plan CAD).
    Barcha xonalar, konturlar, kollektor shkafi, uzatish (qizil) va qaytish (ko'k) magistrallari.
    """
    d = Drawing(dw_width, dw_height)

    rooms = list(project.rooms.all().prefetch_related('underfloor_circuits', 'windows', 'doors'))
    if not rooms:
        d.add(Rect(0, 0, dw_width, dw_height, fillColor=colors.HexColor('#F8FAFC'), strokeColor=colors.HexColor('#E2E8F0'), strokeWidth=0.8, rx=4, ry=4))
        d.add(String(dw_width / 2 - 40, dw_height / 2, "Xonalar mavjud emas", fontSize=10, fontName='Helvetica-Bold', fillColor=colors.HexColor('#64748B')))
        return d

    max_x = max([float(r.position_x + r.width) for r in rooms] + [12.0])
    max_y = max([float(r.position_y + r.length) for r in rooms] + [8.0])

    margin_x = 24
    margin_y = 24
    scale = min((dw_width - 2 * margin_x) / max(1.0, max_x), (dw_height - 2 * margin_y) / max(1.0, max_y))
    origin_x = margin_x
    origin_y = margin_y

    def to_gx(m): return origin_x + float(m) * scale
    def to_gy(m): return origin_y + float(m) * scale

    # Background
    d.add(Rect(0, 0, dw_width, dw_height, fillColor=colors.HexColor('#0F172A'), strokeColor=colors.HexColor('#334155'), strokeWidth=1, rx=4, ry=4))

    # Draw rooms
    for room in rooms:
        rx = to_gx(room.position_x)
        ry = to_gy(room.position_y)
        rw = float(room.width) * scale
        rh = float(room.length) * scale

        # Room floor fill
        d.add(Rect(rx, ry, rw, rh, fillColor=colors.HexColor('#1E293B'), strokeColor=colors.HexColor('#475569'), strokeWidth=1.2, rx=2, ry=2))
        d.add(Rect(rx + 2, ry + 2, max(0, rw - 4), max(0, rh - 4), fillColor=None, strokeColor=colors.HexColor('#334155'), strokeWidth=0.6))

        # Real underfloor circuits inside room
        circuits = list(room.underfloor_circuits.all())
        
        for c_idx, circ in enumerate(circuits):
            sup_pts = circ.supply_path_points or []
            ret_pts = circ.return_path_points or []
            if not sup_pts and circ.path_points:
                mid_pt = len(circ.path_points) // 2
                sup_pts = circ.path_points[:mid_pt]
                ret_pts = circ.path_points[mid_pt:]

            # Draw supply points in red
            if len(sup_pts) >= 2:
                flat_sup = []
                for pt in sup_pts:
                    flat_sup.extend([rx + float(pt[0]) * scale, ry + float(pt[1]) * scale])
                d.add(PolyLine(flat_sup, strokeColor=colors.HexColor('#EF4444'), strokeWidth=0.85, strokeLineJoin=1))

            # Draw return points in blue
            if len(ret_pts) >= 2:
                flat_ret = []
                for pt in ret_pts:
                    flat_ret.extend([rx + float(pt[0]) * scale, ry + float(pt[1]) * scale])
                d.add(PolyLine(flat_ret, strokeColor=colors.HexColor('#38BDF8'), strokeWidth=0.85, strokeLineJoin=1))

            # Circuit label stamp
            c_tag = f"K-{circ.circuit_number} Ø{circ.pipe_diameter_mm:.0f} L={circ.total_length_m:.0f}m"
            tx = rx + 6
            ty = ry + 6 + c_idx * 10
            d.add(Rect(tx - 2, ty - 2, 70, 9, fillColor=colors.HexColor('#0284C7'), strokeColor=None, rx=1.5, ry=1.5))
            d.add(String(tx, ty + 1, c_tag, fontSize=5.0, fontName='Helvetica-Bold', fillColor=colors.white))

        # Room name
        d.add(String(rx + rw / 2 - 15, ry + rh / 2, f"{room.name}", fontSize=6.5, fontName='Helvetica-Bold', fillColor=colors.HexColor('#F8FAFC')))
        d.add(String(rx + rw / 2 - 12, ry + rh / 2 - 8, f"{float(room.area):.1f} m²", fontSize=5.5, fontName='Helvetica', fillColor=colors.HexColor('#94A3B8')))

    # Manifold and Feeder connections
    manifold = project.manifolds.first()
    if manifold:
        mx = to_gx(manifold.position_x)
        my = to_gy(manifold.position_y)

        # Draw manifold box
        d.add(Rect(mx - 4, my - 6, 28, 14, fillColor=colors.HexColor('#0284C7'), strokeColor=colors.white, strokeWidth=1, rx=2, ry=2))
        d.add(Line(mx, my - 2, mx + 20, my - 2, strokeColor=colors.HexColor('#EF4444'), strokeWidth=1.5))
        d.add(Line(mx, my + 3, mx + 20, my + 3, strokeColor=colors.HexColor('#38BDF8'), strokeWidth=1.5))
        d.add(String(mx + 2, my - 5, "KOLLEKTOR", fontSize=3.5, fontName='Helvetica-Bold', fillColor=colors.white))

        # Draw feeder lines to all circuits
        for circ in UnderfloorHeatingCircuit.objects.filter(room__project=project).select_related('room'):
            if circ.feeder_supply_points and len(circ.feeder_supply_points) >= 2:
                flat_fs = []
                for pt in circ.feeder_supply_points:
                    flat_fs.extend([to_gx(pt[0]), to_gy(pt[1])])
                d.add(PolyLine(flat_fs, strokeColor=colors.HexColor('#EF4444'), strokeWidth=0.9, strokeLineJoin=1))

            if circ.feeder_return_points and len(circ.feeder_return_points) >= 2:
                flat_fr = []
                for pt in circ.feeder_return_points:
                    flat_fr.extend([to_gx(pt[0]), to_gy(pt[1])])
                d.add(PolyLine(flat_fr, strokeColor=colors.HexColor('#38BDF8'), strokeWidth=0.9, strokeLineJoin=1))

    # Technical Legend in bottom-right corner
    leg_x = dw_width - 150
    leg_y = 6
    d.add(Rect(leg_x, leg_y, 144, 46, fillColor=colors.HexColor('#1E293B'), strokeColor=colors.HexColor('#475569'), strokeWidth=0.8, rx=3, ry=3))
    d.add(String(leg_x + 5, leg_y + 36, "SHARTLI BELGILAR (LEGENDA):", fontSize=5.5, fontName='Helvetica-Bold', fillColor=colors.HexColor('#F8FAFC')))
    
    # Red supply
    d.add(Line(leg_x + 6, leg_y + 26, leg_x + 22, leg_y + 26, strokeColor=colors.HexColor('#EF4444'), strokeWidth=1.2))
    d.add(String(leg_x + 26, leg_y + 24, "T11 Uzatish trubasi (Suprimento / 45°C)", fontSize=5.0, fontName='Helvetica', fillColor=colors.HexColor('#CBD5E1')))
    
    # Blue return
    d.add(Line(leg_x + 6, leg_y + 16, leg_x + 22, leg_y + 16, strokeColor=colors.HexColor('#38BDF8'), strokeWidth=1.2))
    d.add(String(leg_x + 26, leg_y + 14, "T12 Qaytish trubasi (Retorno / 35°C)", fontSize=5.0, fontName='Helvetica', fillColor=colors.HexColor('#CBD5E1')))
    
    # Manifold
    d.add(Rect(leg_x + 6, leg_y + 4, 12, 6, fillColor=colors.HexColor('#0284C7'), strokeColor=colors.white, strokeWidth=0.5))
    d.add(String(leg_x + 26, leg_y + 4, "Taqsimlash kollektori (Coletor)", fontSize=5.0, fontName='Helvetica', fillColor=colors.HexColor('#CBD5E1')))

    return d


def build_project_pdf(project: Project) -> io.BytesIO:
    """
    Loyiha uchun to'liq PDF hisobotini generatsiya qilish.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=22 * mm,
        bottomMargin=22 * mm
    )

    styles = getSampleStyleSheet()

    # Maxsus stillar
    primary_color = colors.HexColor("#1E40AF")  # Royal blue
    dark_text = colors.HexColor("#0F172A")
    muted_text = colors.HexColor("#475569")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=6
    )

    h2_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=primary_color,
        spaceBefore=12,
        spaceAfter=6
    )

    h3_style = ParagraphStyle(
        'SubSectionHeading',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=dark_text,
        spaceBefore=6,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=dark_text
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=muted_text
    )

    notice_style = ParagraphStyle(
        'NoticeStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#9A3412")  # Warm warning
    )

    story = []

    # 1. Bosh sarlavha va loyiha passporti
    story.append(Paragraph(f"Muhandislik Hisoboti: {project.name}", title_style))
    story.append(Paragraph("Isitish tizimi, issiqlik yo‘qotilishi, radiatorlar, issiq pol va materiallar smetasi", meta_style))
    story.append(Spacer(1, 8))

    engineer_name = "Xasan Muhandis"
    if project.user:
        full = f"{project.user.first_name} {project.user.last_name}".strip()
        engineer_name = full or project.user.username

    # Loyiha ma'lumotlari jadvali
    info_data = [
        [
            Paragraph("<b>Obyekt manzili:</b>", body_style),
            Paragraph(project.address or "Ko‘rsatilmagan", body_style),
            Paragraph("<b>Hisobiy tashqi harorat:</b>", body_style),
            Paragraph(f"{project.outdoor_design_temp} °C", body_bold)
        ],
        [
            Paragraph("<b>Buyurtmachi / Mijoz:</b>", body_style),
            Paragraph(project.client_name or "Jismoniy shaxs", body_style),
            Paragraph("<b>Aloqa telefoni:</b>", body_style),
            Paragraph(project.client_phone or "—", body_style)
        ],
        [
            Paragraph("<b>Jami xonalar soni:</b>", body_style),
            Paragraph(f"{project.total_rooms_count} ta", body_bold),
            Paragraph("<b>Umumiy isitiladigan maydon:</b>", body_style),
            Paragraph(f"{project.total_area_m2:.1f} m²", body_bold)
        ],
        [
            Paragraph("<b>Jami hisobiy issiqlik quvvati:</b>", body_style),
            Paragraph(f"{project.total_heat_loss_w / 1000.0:.2f} kVt ({project.total_heat_loss_w:.0f} Vt)", body_bold),
            Paragraph("<b>Loyihachi / Usta:</b>", body_style),
            Paragraph(engineer_name, body_bold)
        ]
    ]

    t_info = Table(info_data, colWidths=[40 * mm, 45 * mm, 45 * mm, 40 * mm])
    t_info.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_info)
    story.append(Spacer(1, 10))

    # 2. Xonalar bo'yicha issiqlik yo'qotilishi va uskunalar jadvali
    story.append(Paragraph("1. Xonalar O‘lchamlari va Issiqlik Yo‘qotilishi Xulosasi", h2_style))

    room_headers = ["Xona nomi", "O‘lchamlari (m)", "Maydon / Hajm", "Harorat", "Issiqlik yo‘qotilishi", "Solishtirma"]
    room_rows = [[Paragraph(f"<b>{h}</b>", body_style) for h in room_headers]]

    for room in project.rooms.all():
        calc = room.calculation_results.filter(calculation_type='heat_loss').first()
        heat_w = calc.output_results.get('total_heat_loss_w', 0.0) if calc else 0.0
        spec_w = calc.output_results.get('specific_heat_loss_w_m2', 0.0) if calc else (heat_w / room.area if room.area > 0 else 0)

        room_rows.append([
            Paragraph(room.name, body_style),
            Paragraph(f"{room.length:.1f} x {room.width:.1f} x {room.height:.1f}", body_style),
            Paragraph(f"{room.area:.1f} m² / {room.volume:.1f} m³", body_style),
            Paragraph(f"+{room.desired_temp:.0f} °C", body_style),
            Paragraph(f"<b>{heat_w:.0f} Vt</b>", body_bold),
            Paragraph(f"{spec_w:.1f} Vt/m²", body_style)
        ])

    t_rooms = Table(room_rows, colWidths=[38 * mm, 30 * mm, 32 * mm, 20 * mm, 30 * mm, 20 * mm])
    t_rooms.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#EFF6FF")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#93C5FD")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_rooms)
    story.append(Spacer(1, 10))

    # 3. Radiatorlar va Issiq pol tizimi tafsilotlari
    story.append(Paragraph("2. Isitish Asbob-uskunalari va Konturlar", h2_style))

    eq_headers = ["Xona", "Isitish turi", "Radiator modeli va soni", "Radiator quvvati", "Issiq pol maydoni", "Konturlar / Truba"]
    eq_rows = [[Paragraph(f"<b>{h}</b>", body_style) for h in eq_headers]]

    for room in project.rooms.all():
        rad_calc = room.calculation_results.filter(calculation_type='radiator').first()
        uf_calc = room.calculation_results.filter(calculation_type='underfloor').first()

        rad_name = "—"
        rad_power = "—"
        if rad_calc:
            m_info = rad_calc.output_results.get('model_info', {})
            qty = rad_calc.output_results.get('recommended_quantity', 1)
            tot_w = rad_calc.output_results.get('total_provided_power_w', 0)
            rad_name = f"{m_info.get('manufacturer', '')} {m_info.get('model_name', '')} ({qty} dona)"
            rad_power = f"{tot_w:.0f} Vt"
        elif room.radiators.exists():
            first_rad = room.radiators.first()
            rad_name = f"{first_rad.quantity} dona radiator"
            rad_power = f"{first_rad.calculated_actual_power_w:.0f} Vt"

        uf_area = "—"
        uf_circ = "—"
        if uf_calc:
            h_area = uf_calc.output_results.get('heated_floor_area', 0)
            n_circ = uf_calc.output_results.get('num_circuits', 0)
            tot_len = uf_calc.output_results.get('total_pipe_length_m', 0)
            uf_area = f"{h_area:.1f} m²"
            uf_circ = f"{n_circ} ta kontur ({tot_len:.0f} m)"
        elif room.underfloor_circuits.exists():
            circs = room.underfloor_circuits.all()
            tot_len = sum(c.total_length_m for c in circs)
            uf_area = f"{room.area:.1f} m²"
            uf_circ = f"{circs.count()} ta kontur ({tot_len:.0f} m)"

        pref_map = {
            'combined': 'Aralash (Rad + Pol)',
            'radiator_only': 'Faqat radiator',
            'underfloor_only': 'Faqat issiq pol'
        }

        eq_rows.append([
            Paragraph(room.name, body_style),
            Paragraph(pref_map.get(room.heating_preference, 'Aralash'), body_style),
            Paragraph(rad_name, body_style),
            Paragraph(rad_power, body_style),
            Paragraph(uf_area, body_style),
            Paragraph(uf_circ, body_style)
        ])

    t_eq = Table(eq_rows, colWidths=[30 * mm, 25 * mm, 45 * mm, 25 * mm, 22 * mm, 23 * mm])
    t_eq.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_eq)
    story.append(Spacer(1, 10))

    # 3. Issiq Pol Arxitekturaviy Chizmasi va Rejasi (Uponor CAD Plan)
    uf_rooms = [r for r in project.rooms.all() if r.heating_preference in ['combined', 'underfloor_only'] or r.underfloor_circuits.exists()]
    if uf_rooms:
        story.append(Paragraph("3. Issiq Pol Arxitekturaviy Chizmasi va Rejasi (Uponor CAD Plan)", h2_style))
        story.append(Paragraph("Standart: EN 1264 / KMK 2.04.05-97 | Tizim: Uponor underfloor heating system (T11/T12 bifilyar spiral)", meta_style))
        story.append(Spacer(1, 6))

        # Umumiy bino bo'yicha master reja (Planta Geral de Piso Radiante)
        master_cad = draw_project_master_underfloor_cad(project)
        master_block = [
            Paragraph("<b>Umumiy Bino Issiq Pol Bosh Rejasi (Planta Geral de Piso Radiante)</b>", h3_style),
            Paragraph("Kollektor joylashuvi, barcha xonalar bo'yicha T11 (uzatish/qizil) va T12 (qaytish/ko'k) truba konturlari hamda magistral ulanishlar:", meta_style),
            Spacer(1, 4),
            master_cad,
            Spacer(1, 10),
        ]
        story.append(KeepTogether(master_block))

        for room in uf_rooms:
            cad_drawing = draw_room_underfloor_cad(room)
            
            num_circ = room.underfloor_circuits.count() or (2 if float(room.length) > 4.5 or float(room.area) > 15 else 1)
            spacing_mm = room.underfloor_circuits.first().spacing_mm if room.underfloor_circuits.exists() else 150
            
            sched_headers = ["Kontur №", "Isitiladigan maydon", "Qadam (s)", "Truba uzunligi", "Suv sarfi", "Sozlash (Adj)"]
            sched_rows = [[Paragraph(f"<b>{h}</b>", body_style) for h in sched_headers]]
            
            circ_area = round(float(room.area) / num_circ, 1)
            circ_len = round((float(room.area) / (spacing_mm / 1000.0) * 1.05) / num_circ + 8.0)
            circ_flow = max(25, round(circ_area * 50 * 3600 / (4186 * 10)))
            
            for c_i in range(num_circ):
                c_adj = round(min(5.0, max(1.5, (circ_len / 75.0) * 4.2)), 1)
                sched_rows.append([
                    Paragraph(f"<b>K-{c_i + 1} (S{c_i + 1})</b>", body_style),
                    Paragraph(f"{circ_area:.1f} m²", body_style),
                    Paragraph(f"{spacing_mm} mm", body_style),
                    Paragraph(f"<b>{circ_len} m</b>", body_bold),
                    Paragraph(f"{circ_flow} l/h", body_style),
                    Paragraph(f"{c_adj}", body_style),
                ])
                
            sched_rows.append([
                Paragraph("<b>JAMI:</b>", body_bold),
                Paragraph(f"<b>{float(room.area):.1f} m²</b>", body_bold),
                Paragraph("—", body_style),
                Paragraph(f"<b>{circ_len * num_circ} m</b>", body_bold),
                Paragraph(f"<b>{circ_flow * num_circ} l/h</b>", body_bold),
                Paragraph("—", body_style),
            ])

            t_sched = Table(sched_rows, colWidths=[28 * mm, 32 * mm, 25 * mm, 30 * mm, 30 * mm, 25 * mm])
            t_sched.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#EFF6FF")),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#93C5FD")),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 2.5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
            ]))

            room_block = [
                Paragraph(f"<b>Xona: {room.name}</b> ({float(room.length):.1f} × {float(room.width):.1f} m, S = {float(room.area):.1f} m²)", h3_style),
                cad_drawing,
                Spacer(1, 4),
                Paragraph(f"<b>Uponor Sizing:</b> Truba Uponor pePEX Ø16×2.0 mm | Qadam: {spacing_mm} mm | T11/T12: 45/35 °C | Kollektor: ШРВ-{num_circ}", notice_style),
                Spacer(1, 3),
                t_sched,
                Spacer(1, 10),
            ]
            story.append(KeepTogether(room_block))

    # 4. Gidravlik hisob-kitoblar xulosasi
    story.append(Paragraph("4. Gidravlik Parametrlar va Magistral Trubalar", h2_style))
    hydr_headers = ["Xona / Tarmoq", "Isitish quvvati", "ΔT harorat", "Suv sarfi (l/soat)", "Tavsiya diametr", "Bosim yo‘qotilishi"]
    hydr_rows = [[Paragraph(f"<b>{h}</b>", body_style) for h in hydr_headers]]

    for room in project.rooms.all():
        hydr_calc = room.calculation_results.filter(calculation_type='hydraulics').first()
        if hydr_calc:
            out = hydr_calc.output_results
            hydr_rows.append([
                Paragraph(room.name, body_style),
                Paragraph(f"{out.get('heat_power_w', 0):.0f} Vt", body_style),
                Paragraph(f"{out.get('delta_t_k', 10):.1f} K", body_style),
                Paragraph(f"{out.get('volume_flow_l_h', 0):.1f} l/h", body_style),
                Paragraph(f"<b>{out.get('recommended_pipe', '20 x 2.0 mm')}</b>", body_bold),
                Paragraph(f"{out.get('total_pressure_loss_kpa', 0):.2f} kPa", body_style)
            ])

    if len(hydr_rows) > 1:
        t_hydr = Table(hydr_rows, colWidths=[35 * mm, 25 * mm, 25 * mm, 30 * mm, 30 * mm, 25 * mm])
        t_hydr.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(t_hydr)
        story.append(Spacer(1, 10))

    # 5. Materiallar smetasi
    story.append(Paragraph("4. Materiallar Smetasi va Xarajatlar (Spetsifikatsiya)", h2_style))

    mat_items = project.material_items.all()
    if mat_items.exists():
        mat_headers = ["№", "Material va asbob-uskuna nomi", "Kategoriya", "Birlik", "Miqdori", "Narxi (so‘m)", "Jami (so‘m)"]
        mat_rows = [[Paragraph(f"<b>{h}</b>", body_style) for h in mat_headers]]

        grand_total = 0.0
        for idx, item in enumerate(mat_items, 1):
            tot = float(item.total_price_uzs)
            grand_total += tot
            mat_rows.append([
                Paragraph(str(idx), body_style),
                Paragraph(item.name, body_style),
                Paragraph(item.get_category_display(), body_style),
                Paragraph(item.unit, body_style),
                Paragraph(f"{item.quantity:.1f}", body_style),
                Paragraph(f"{float(item.unit_price_uzs):,.0f}", body_style),
                Paragraph(f"<b>{tot:,.0f}</b>", body_style),
            ])

        # Jami satri
        mat_rows.append([
            Paragraph("", body_style),
            Paragraph("<b>JAMI XARAJATLAR BAHOSI:</b>", body_bold),
            Paragraph("", body_style),
            Paragraph("", body_style),
            Paragraph("", body_style),
            Paragraph("", body_style),
            Paragraph(f"<b>{grand_total:,.0f} so‘m</b>", body_bold),
        ])

        t_mat = Table(mat_rows, colWidths=[8 * mm, 52 * mm, 30 * mm, 15 * mm, 15 * mm, 25 * mm, 25 * mm])
        t_mat.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#EFF6FF")),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#FEF3C7")),  # Amber summary row
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ]))
        story.append(t_mat)
    else:
        story.append(Paragraph("Materiallar smetasi hali shakllantirilmagan. Ilovada 'Smetani shakllantirish' tugmasini bosing.", meta_style))

    story.append(Spacer(1, 12))

    # 6. Muhandislik ogohlantirishi va xavfsizlik eslatmasi
    disclaimer_text = (
        "<b>DIQQAT VA MUHANDISLIK OGOHLANTIRISHI:</b> Mazkur hisobot SantexPro platformasining muhandislik yordamchisi "
        "tomonidan EN 12831, EN 442, EN 1264 va amaldagi KMK me’yorlari asosida dastlabki hisobiy baholash sifatida tuzildi. "
        "Bino konstruksiyalari, issiqlik izolyatsiyasi, devor va oyna koeffitsiyentlari foydalanuvchi tomonidan kiritilgan ma’lumotlarga tayanadi. "
        "Amaliy montaj ishlarini boshlashdan oldin barcha chizma va gidravlik parametrlarni mutaxassis muhandis tomonidan "
        "obyektning haqiqiy sharoitlari va ishlab chiqaruvchi pasportlari bo‘yicha tekshirish qat’iyan tavsiya etiladi."
    )
    story.append(Paragraph(disclaimer_text, notice_style))

    # Documentni qurish
    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer
