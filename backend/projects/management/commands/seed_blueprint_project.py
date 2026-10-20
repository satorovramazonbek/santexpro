"""
SantexPro — Professional Arxitektura Chizmasi (Blueprint) bo'yicha loyihani bazaga kiritish.
Ushbu buyruq Project 15 (va yangi loyiha) uchun haqiqiy Uponor chizmasidagi barcha xonalarni:
- Xona 17 (Mehmonxona / Zal - 3 ta kontur: 41/85m, 42/81m, 43/75m)
- Xona 16 (Tambur - 1 ta kontur: 45/74m, Bosh kirish eshigi bilan)
- Xona 18 (Dahliz / Koridor - 2 ta kontur: 44/60m, 40/57m)
- Zinapoya (Markaziy zinapoya katagi)
- Xona 19 (O'ng pastki xona - 2 ta kontur: 30/52m, 32/76m)
- Xona 21 (O'ng yuqori xona - 1 ta kontur: 33/37m + 'монтаж существующих перегородок')
- Xona 23 (O'ng burchak xona - 1 ta kontur: 34/41m + 'T1-32' ulanishi)
va ikkita kollektorni (Дв-2 va T1-32) to'liq koordinatalar, devorlar, eshiklar bilan bazaga saqlaydi.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from projects.models import (
    Project, Building, Floor, Room, Wall, Window, Door,
    Manifold, Radiator, UnderfloorHeatingCircuit, CalculationResult,
    PipeRoute, PipeSegment, PipeConnection
)
from engineering.router import DeterministicPipeRouter, route_circuit_feeder_pair


def generate_bifilar_coil(x_min, y_min, x_max, y_max, spacing=0.15):
    """Bifilar (chig'anoq / ilon izi) truba koordinatalarini hisoblaydi."""
    step = spacing * 2.0
    supply = []
    return_pts = []

    l = x_min
    t = y_min
    r = x_max
    b = y_max

    while (r - l) >= 2.2 * spacing and (b - t) >= 2.2 * spacing:
        supply.append([round(l, 3), round(t, 3)])
        supply.append([round(r, 3), round(t, 3)])
        supply.append([round(r, 3), round(b, 3)])
        supply.append([round(l + step, 3), round(b, 3)])
        supply.append([round(l + step, 3), round(t + step, 3)])

        return_pts.insert(0, [round(l + spacing, 3), round(t + spacing, 3)])
        return_pts.insert(0, [round(r - spacing, 3), round(t + spacing, 3)])
        return_pts.insert(0, [round(r - spacing, 3), round(b - spacing, 3)])
        return_pts.insert(0, [round(l + step + spacing, 3), round(b - spacing, 3)])

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
    return supply, return_pts, full_path


class Command(BaseCommand):
    help = "Haqiqiy Uponor chizmasi bo'yicha loyiha ma'lumotlarini bazaga kiritadi"

    def handle(self, *args, **options):
        user = User.objects.filter(username='usta_xasan').first()
        if not user:
            user = User.objects.first()

        # Project 15 ni yangilaymiz yoki yangi professional loyiha yaratamiz
        project = Project.objects.filter(id=15).first()
        if not project:
            project = Project.objects.filter(name__icontains="Yunusobod").first()
        if not project:
            project = Project.objects.create(
                user=user,
                name="Yunusobod 14-mavze — 2 qavatli kottej (Uponor Loyihasi)",
                address="Toshkent sh., Yunusobod tumani, 14-mavze",
                client_name="Azizbek Rahimov",
                client_phone="+998 (90) 123-45-67",
                outdoor_design_temp=-15.0,
                notes="EN 1264 va Uponor standartlari asosidagi professional issiq pol chizmasi."
            )

        self.stdout.write(f"Loyihani yangilash boshlandi: ID {project.id} - {project.name}")

        # Eski xonalar, konturlar va kollektorlarni tozalash (Project 15 doirasida)
        project.rooms.all().delete()
        project.manifolds.all().delete()
        project.floors.all().delete()

        # 1. Qavat (Floor) yaratish
        floor1 = Floor.objects.create(
            project=project,
            floor_number=1,
            name="1-Qavat (Asosiy qavat)",
            height_m=3.2,
            elevation_m=0.0
        )

        # 2. Xonalarni yaratish
        # R17: Katta Mehmonxona (Zal) - Chap qism
        r17 = Room.objects.create(
            project=project,
            floor=floor1,
            floor_number=1,
            name="17 - Katta Mehmonxona (Zal)",
            position_x=1.8,
            position_y=1.4,
            width=6.2,
            length=11.4,
            height=3.2,
            desired_temp=22.0,
            heating_preference='underfloor_only'
        )
        Door.objects.create(
            room=r17,
            name="Дв-2 (Zal - Koridor eshigi)",
            wall_index=1,
            position_along_wall=9.5,
            width=1.0,
            height=2.2,
            door_type='interior',
            opening_direction='inward_right',
            u_value=0.0
        )
        Window.objects.create(room=r17, name="Zal vitraj oynasi 1", wall_index=3, position_along_wall=2.0, width=2.4, height=1.8, u_value=1.4)
        Window.objects.create(room=r17, name="Zal vitraj oynasi 2", wall_index=3, position_along_wall=6.0, width=2.4, height=1.8, u_value=1.4)

        # R16: Tambur / Bosh Kirish - Chap pastki qism
        r16 = Room.objects.create(
            project=project,
            floor=floor1,
            floor_number=1,
            name="16 - Tambur (Kirish xonasi)",
            position_x=1.8,
            position_y=13.0,
            width=6.2,
            length=2.4,
            height=3.0,
            desired_temp=18.0,
            heating_preference='underfloor_only'
        )
        # Bosh kirish eshigi (Tashqi eshik - quvur o'tishi taqiqlanadi)
        Door.objects.create(
            room=r16,
            name="Bosh kirish eshigi",
            wall_index=2,
            position_along_wall=2.6,
            width=1.2,
            height=2.2,
            door_type='exterior_main',
            opening_direction='outward_right',
            u_value=1.8
        )
        # Ichki eshik dahlizga
        Door.objects.create(
            room=r16,
            name="Dahlizga ichki eshik",
            wall_index=1,
            position_along_wall=1.0,
            width=0.9,
            height=2.1,
            door_type='interior',
            opening_direction='inward_left',
            u_value=0.0
        )

        # R18: Dahliz / Koridor - Markaziy o'tish qismi
        r18 = Room.objects.create(
            project=project,
            floor=floor1,
            floor_number=1,
            name="18 - Dahliz va Koridor",
            position_x=8.2,
            position_y=5.0,
            width=2.4,
            length=10.4,
            height=3.0,
            desired_temp=20.0,
            heating_preference='underfloor_only'
        )

        # Zinapoya katagi (Staircase)
        staircase = Room.objects.create(
            project=project,
            floor=floor1,
            floor_number=1,
            name="Zinapoya katagi (2-qavatga)",
            position_x=8.2,
            position_y=1.4,
            width=2.8,
            length=3.6,
            height=3.2,
            desired_temp=18.0,
            heating_preference='radiator_only'
        )

        # R19: O'ng pastki katta xona
        r19 = Room.objects.create(
            project=project,
            floor=floor1,
            floor_number=1,
            name="19 - Yotoqxona / Mehmonxona 2",
            position_x=11.0,
            position_y=5.0,
            width=7.0,
            length=10.4,
            height=3.0,
            desired_temp=22.0,
            heating_preference='underfloor_only'
        )
        Door.objects.create(
            room=r19,
            name="Xona 19 eshigi",
            wall_index=0,
            position_along_wall=1.2,
            width=0.9,
            height=2.1,
            door_type='interior',
            opening_direction='inward_left',
            u_value=0.0
        )
        Window.objects.create(room=r19, name="Xona 19 oynasi", wall_index=2, position_along_wall=3.0, width=2.0, height=1.6, u_value=1.4)

        # R21: O'ng yuqori xona (Mavjud to'siq devorlar bilan)
        r21 = Room.objects.create(
            project=project,
            floor=floor1,
            floor_number=1,
            name="21 - Ishchi xona / Oshxona (Перегородка)",
            position_x=11.0,
            position_y=1.4,
            width=11.2,
            length=3.6,
            height=3.0,
            desired_temp=21.0,
            heating_preference='underfloor_only'
        )
        Door.objects.create(
            room=r21,
            name="Xona 21 eshigi",
            wall_index=2,
            position_along_wall=1.5,
            width=0.9,
            height=2.1,
            door_type='interior',
            opening_direction='inward_right',
            u_value=0.0
        )

        # R23: O'ng burchak xona
        r23 = Room.objects.create(
            project=project,
            floor=floor1,
            floor_number=1,
            name="23 - Oshxona / Xo'jalik xonasi",
            position_x=18.2,
            position_y=5.0,
            width=4.0,
            length=10.4,
            height=3.0,
            desired_temp=20.0,
            heating_preference='underfloor_only'
        )

        # 3. Kollektorlarni yaratish
        # Manifold 1: Дв-2 (Room 18 dahliz devorida)
        m1 = Manifold.objects.create(
            project=project,
            floor=floor1,
            room=r18,
            name="Kollektor shkafi Дв-2",
            floor_number=1,
            position_x=8.3,
            position_y=13.5,
            outlets_count=8,
            pipe_diameter_mm=25.0,
            model_name="Uponor Vario S 8-outlets"
        )

        # Manifold 2: T1-32 (O'ng tomon magistral stoyak ulanishi)
        m2 = Manifold.objects.create(
            project=project,
            floor=floor1,
            room=r23,
            name="Magistral ulanishi T1-32",
            floor_number=1,
            position_x=18.0,
            position_y=12.0,
            outlets_count=4,
            pipe_diameter_mm=32.0,
            model_name="Uponor T1-32 Riser Node"
        )

        # 4. A* Router yordamida deterministik marshrutlarni hisoblash
        router = DeterministicPipeRouter(bounds_x=24.0, bounds_y=18.0, cell_size_m=0.1)
        # Koridor zonasini ochish (afzal yo'l)
        router.mark_corridor_zone(x_min=8.0, y_min=4.8, x_max=10.8, y_max=15.6)

        # 5. Konturlarni yaratish (Uponor chizmasi bo'yicha)
        circuits_def = [
            # ROOM 17: 3 ta kontur (41, 42, 43)
            {
                "room": r17, "manifold": m1, "port": 1, "num": 41, "name": "Uponor 41 / 85m",
                "y_range": (0.3, 3.8), "spacing": 150, "target_len": 85.0, "heated_area": 22.0
            },
            {
                "room": r17, "manifold": m1, "port": 2, "num": 42, "name": "Uponor 42 / 81m",
                "y_range": (3.9, 7.5), "spacing": 150, "target_len": 81.0, "heated_area": 22.0
            },
            {
                "room": r17, "manifold": m1, "port": 3, "num": 43, "name": "Uponor 43 / 75m",
                "y_range": (7.6, 11.1), "spacing": 150, "target_len": 75.0, "heated_area": 22.0
            },

            # ROOM 16: 1 ta kontur (45)
            {
                "room": r16, "manifold": m1, "port": 4, "num": 45, "name": "Uponor 45 / 74m",
                "y_range": (0.3, 2.1), "spacing": 150, "target_len": 74.0, "heated_area": 14.0
            },

            # ROOM 18 (Koridor): 2 ta kontur (44, 40)
            {
                "room": r18, "manifold": m1, "port": 5, "num": 44, "name": "Uponor 44 / 60m",
                "y_range": (0.3, 5.0), "spacing": 150, "target_len": 60.0, "heated_area": 11.0
            },
            {
                "room": r18, "manifold": m1, "port": 6, "num": 40, "name": "Uponor 40 / 57m",
                "y_range": (5.2, 10.1), "spacing": 150, "target_len": 57.0, "heated_area": 11.0
            },

            # ROOM 19: 2 ta kontur (30, 32)
            {
                "room": r19, "manifold": m2, "port": 1, "num": 30, "name": "Uponor 30 / 52m",
                "x_range": (0.3, 3.4), "y_range": (0.3, 10.1), "spacing": 200, "target_len": 52.0, "heated_area": 32.0
            },
            {
                "room": r19, "manifold": m2, "port": 2, "num": 32, "name": "Uponor 32 / 76m",
                "x_range": (3.6, 6.7), "y_range": (0.3, 10.1), "spacing": 150, "target_len": 76.0, "heated_area": 32.0
            },

            # ROOM 21: 1 ta kontur (33)
            {
                "room": r21, "manifold": m2, "port": 3, "num": 33, "name": "Uponor 33 / 37m",
                "x_range": (0.3, 7.5), "y_range": (0.3, 3.3), "spacing": 200, "target_len": 37.0, "heated_area": 24.0
            },

            # ROOM 23: 1 ta kontur (34)
            {
                "room": r23, "manifold": m2, "port": 4, "num": 34, "name": "Uponor 34 / 41m",
                "x_range": (0.3, 3.7), "y_range": (0.3, 10.1), "spacing": 200, "target_len": 41.0, "heated_area": 35.0
            },
        ]

        for cdef in circuits_def:
            rm = cdef["room"]
            man = cdef["manifold"]
            sp = cdef["spacing"] / 1000.0  # m

            x_r = cdef.get("x_range", (0.3, rm.width - 0.3))
            y_r = cdef.get("y_range", (0.3, rm.length - 0.3))

            sup_coil, ret_coil, full_coil = generate_bifilar_coil(
                x_min=x_r[0], y_min=y_r[0], x_max=x_r[1], y_max=y_r[1], spacing=sp
            )

            # Pol ichidagi uzunlik
            coil_len = 0.0
            for i in range(len(full_coil) - 1):
                p1, p2 = full_coil[i], full_coil[i+1]
                import math
                coil_len += math.hypot(p2[0] - p1[0], p2[1] - p1[1])

            # Global nuqtalar
            entry_global = (round(rm.position_x + sup_coil[0][0], 3), round(rm.position_y + sup_coil[0][1], 3))
            exit_global = (round(rm.position_x + ret_coil[-1][0], 3), round(rm.position_y + ret_coil[-1][1], 3))

            # A* router bilan magistral ulanishlarni hisoblash
            feeder_info = route_circuit_feeder_pair(
                router=router,
                manifold_pos=(man.position_x, man.position_y),
                port_index=cdef["port"],
                room_entry_pos=entry_global,
                room_exit_pos=exit_global
            )

            tot_len = round(coil_len + feeder_info["feeder_total_m"], 1)

            circuit = UnderfloorHeatingCircuit.objects.create(
                room=rm,
                manifold=man,
                manifold_port_index=cdef["port"],
                circuit_number=cdef["num"],
                name=cdef["name"],
                heated_area=cdef["heated_area"],
                spacing_mm=cdef["spacing"],
                pipe_diameter_mm=16.0,
                pipe_wall_mm=2.0,
                pipe_material="Uponor PEX-a",
                pattern="spiral",
                floor_length_m=round(coil_len, 1),
                manifold_lead_in_m=feeder_info["feeder_total_m"],
                total_length_m=cdef["target_len"],  # Blueprint dagi aniq Uponor qiymati
                color_hex="#2563EB",
                path_points=full_coil,
                supply_path_points=sup_coil,
                return_path_points=ret_coil,
                feeder_supply_points=feeder_info["supply_feeder"],
                feeder_return_points=feeder_info["return_feeder"]
            )

            # Graf modeli: PipeRoute va PipeSegmentlarni yaratish
            proute = PipeRoute.objects.create(
                circuit=circuit,
                manifold=man,
                supply_length_m=feeder_info["supply_length_m"],
                return_length_m=feeder_info["return_length_m"],
                total_length_m=cdef["target_len"],
                routing_metadata={"uponor_badge": cdef["name"], "port": cdef["port"]}
            )

            # Segmentlarni saqlash
            # 1. Feeder supply
            fs = feeder_info["supply_feeder"]
            for s_idx in range(len(fs) - 1):
                p1, p2 = fs[s_idx], fs[s_idx+1]
                seg_len = round(math.hypot(p2[0]-p1[0], p2[1]-p1[1]), 3)
                PipeSegment.objects.create(
                    route=proute,
                    segment_type='feeder_supply',
                    start_x_mm=p1[0]*1000,
                    start_y_mm=p1[1]*1000,
                    end_x_mm=p2[0]*1000,
                    end_y_mm=p2[1]*1000,
                    diameter_mm=16.0,
                    length_m=seg_len,
                    has_corrugation_sleeve=True,
                    sequence_order=s_idx
                )

            # Ulanish nuqtalari
            PipeConnection.objects.create(
                route=proute,
                connection_type='manifold_supply_port',
                position_x_mm=man.position_x * 1000,
                position_y_mm=man.position_y * 1000,
                description=f"{man.name} Chiqish #{cdef['port']}"
            )

            self.stdout.write(f"  + Kontur #{cdef['num']} ({cdef['name']}) muvaffaqiyatli yaratildi. Umumiy uzunlik: {circuit.total_length_m} m")

        self.stdout.write(self.style.SUCCESS(
            f"Loyiha {project.id} ({project.name}) muvaffaqiyatli yangilandi! "
            f"Xonalar: {project.rooms.count()}, Kollektorlar: {project.manifolds.count()}"
        ))
