"""
SantexPro — Professional Arxitektura Chizmasi (Blueprint) bo'yicha loyihani bazaga kiritish.
Ushbu modul va buyruq loyiha uchun haqiqiy Uponor chizmasidagi barcha 7 ta xonani:
- Xona 17 (Mehmonxona / Zal - 3 ta kontur: 41/85m, 42/81m, 43/75m)
- Xona 16 (Tambur - 1 ta kontur: 45/74m, Bosh kirish eshigi bilan)
- Xona 18 (Dahliz / Koridor - 2 ta kontur: 44/60m, 40/57m)
- Zinapoya (Markaziy zinapoya katagi)
- Xona 19 (O'ng pastki xona - 2 ta kontur: 30/52m, 32/76m)
- Xona 21 (O'ng yuqori xona - 1 ta kontur: 33/37m + 'монтаж существующих перегородок')
- Xona 23 (O'ng burchak xona - 1 ta kontur: 34/41m + 'T1-32' ulanishi)
va ikkita kollektorni (Дв-2 va T1-32) to'liq 90-gradusli ortogonal CAD marshrutlari,
gofrali gilzalar (Gofra Ø20) va devorlar bo'ylab tartibli quvur yo'laklari bilan bazaga saqlaydi.
Hech qanday quvur xona chegarasidan chiqib ketmaydi va xonalarni diagonal kesib o'tmaydi.
"""

import math
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from projects.models import (
    Project, Building, Floor, Room, Wall, Window, Door,
    Manifold, Radiator, UnderfloorHeatingCircuit, CalculationResult,
    PipeRoute, PipeSegment, PipeConnection
)
from engineering.router import generate_orthogonal_bifilar_coil, create_clean_cad_feeder_route


def seed_project_with_blueprint(project: Project) -> dict:
    """
    Berilgan loyihaga haqiqiy Uponor blueprint chizmasini to'liq yuklaydi.
    100% deterministik, ortogonal va xona chegaralariga qat'iy rioya qilgan holda.
    """
    # 0. Eski xonalar, konturlar va kollektorlarni tozalash
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
    # Eshik Дв-2 (Zal - Koridor chegarasi, x=8.0, y=11.2)
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
    # Bosh kirish eshigi (Tashqi eshik - quvur o'tishi mutlaqo taqiqlanadi)
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
    # Ichki eshik dahlizga (x=8.0, y=13.5)
    Door.objects.create(
        room=r16,
        name="Dahlizga ichki eshik",
        wall_index=1,
        position_along_wall=0.5,
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
        position_along_wall=3.5,
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
    # Manifold 1: Дв-2 (Room 18 dahliz devorida, x=8.3, y=13.5)
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

    # Manifold 2: T1-32 (O'ng tomon magistral stoyak ulanishi, x=18.0, y=12.0)
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

    # 4. Konturlar spetsifikatsiyasi (Uponor blueprint bo'yicha)
    circuits_config = [
        # ROOM 17: 3 ta kontur (41, 42, 43)
        # Barchasi o'ng devor (x_max=5.85) tomondan ulanadi. Feeder Дв-2 eshigi orqali o'ng devor bo'ylab keladi.
        {
            "room": r17, "manifold": m1, "port": 1, "num": 41, "name": "Uponor 41 / 85m",
            "x_range": (0.3, 5.85), "y_range": (0.3, 3.8), "spacing": 150, "target_len": 85.0, "heated_area": 22.0,
            "side": 'right', "doorway_pos": (8.0, 11.2), "corridor_x": 8.35, "inner_wall_x": 7.85
        },
        {
            "room": r17, "manifold": m1, "port": 2, "num": 42, "name": "Uponor 42 / 81m",
            "x_range": (0.3, 5.85), "y_range": (3.9, 7.5), "spacing": 150, "target_len": 81.0, "heated_area": 22.0,
            "side": 'right', "doorway_pos": (8.0, 11.2), "corridor_x": 8.35, "inner_wall_x": 7.85
        },
        {
            "room": r17, "manifold": m1, "port": 3, "num": 43, "name": "Uponor 43 / 75m",
            "x_range": (0.3, 5.85), "y_range": (7.6, 11.1), "spacing": 150, "target_len": 75.0, "heated_area": 22.0,
            "side": 'right', "doorway_pos": (8.0, 11.2), "corridor_x": 8.35, "inner_wall_x": 7.85
        },

        # ROOM 16: 1 ta kontur (45) - Tambur
        # Ichki eshik (x=8.0, y=13.5) orqali ulanadi; bosh kirish eshigiga mutlaqo bormaydi.
        {
            "room": r16, "manifold": m1, "port": 4, "num": 45, "name": "Uponor 45 / 74m",
            "x_range": (0.3, 5.85), "y_range": (0.3, 2.1), "spacing": 150, "target_len": 74.0, "heated_area": 14.0,
            "side": 'right', "doorway_pos": (8.0, 13.5), "corridor_x": 8.35, "inner_wall_x": 7.85
        },

        # ROOM 18 (Koridor): 2 ta kontur (44, 40)
        # To'g'ridan-to'g'ri koridor ichida, devor bo'ylab Дв-2 kollektoriga ulanadi.
        {
            "room": r18, "manifold": m1, "port": 5, "num": 44, "name": "Uponor 44 / 60m",
            "x_range": (0.3, 2.1), "y_range": (0.3, 4.8), "spacing": 150, "target_len": 60.0, "heated_area": 11.0,
            "side": 'bottom', "doorway_pos": None, "corridor_x": 8.40, "inner_wall_x": None
        },
        {
            "room": r18, "manifold": m1, "port": 6, "num": 40, "name": "Uponor 40 / 57m",
            "x_range": (0.3, 2.1), "y_range": (5.0, 8.2), "spacing": 150, "target_len": 57.0, "heated_area": 11.0,
            "side": 'bottom', "doorway_pos": None, "corridor_x": 8.40, "inner_wall_x": None
        },

        # ROOM 19: 2 ta kontur (30, 32)
        # O'ng tomon devorida joylashgan T1-32 kollektoriga (x=18.0, y=12.0) to'g'ri ulanadi.
        {
            "room": r19, "manifold": m2, "port": 1, "num": 30, "name": "Uponor 30 / 52m",
            "x_range": (0.3, 3.4), "y_range": (0.3, 10.1), "spacing": 200, "target_len": 52.0, "heated_area": 32.0,
            "side": 'right', "doorway_pos": None, "corridor_x": 17.85, "inner_wall_x": None
        },
        {
            "room": r19, "manifold": m2, "port": 2, "num": 32, "name": "Uponor 32 / 76m",
            "x_range": (3.6, 6.7), "y_range": (0.3, 10.1), "spacing": 150, "target_len": 76.0, "heated_area": 32.0,
            "side": 'right', "doorway_pos": None, "corridor_x": 17.85, "inner_wall_x": None
        },

        # ROOM 21: 1 ta kontur (33) - Ishchi xona (Перегородка)
        # T1-32 kollektoridan devor bo'ylab to'g'ri o'tadi
        {
            "room": r21, "manifold": m2, "port": 3, "num": 33, "name": "Uponor 33 / 37m",
            "x_range": (0.3, 7.0), "y_range": (0.3, 3.3), "spacing": 200, "target_len": 37.0, "heated_area": 24.0,
            "side": 'right', "doorway_pos": None, "corridor_x": 18.0, "inner_wall_x": None
        },

        # ROOM 23: 1 ta kontur (34) - Xo'jalik xonasi
        # T1-32 kollektoriga bevosita devordan ulanadi
        {
            "room": r23, "manifold": m2, "port": 4, "num": 34, "name": "Uponor 34 / 41m",
            "x_range": (0.3, 3.7), "y_range": (0.3, 10.1), "spacing": 200, "target_len": 41.0, "heated_area": 35.0,
            "side": 'left', "doorway_pos": None, "corridor_x": 18.25, "inner_wall_x": None
        },
    ]

    circuits_created = 0

    for cdef in circuits_config:
        rm = cdef["room"]
        man = cdef["manifold"]
        sp_m = cdef["spacing"] / 1000.0

        x_r = cdef["x_range"]
        y_r = cdef["y_range"]
        conn_side = cdef["side"]

        # 1. 100% toza ortogonal bifilar chig'anoq konturini yaratish
        sup_coil, ret_coil, full_coil, coil_len = generate_orthogonal_bifilar_coil(
            x_min=x_r[0],
            y_min=y_r[0],
            x_max=x_r[1],
            y_max=y_r[1],
            spacing_m=sp_m,
            connection_side=conn_side
        )

        # Konturning kirish va chiqish global koordinatalari
        entry_global = (round(rm.position_x + sup_coil[0][0], 3), round(rm.position_y + sup_coil[0][1], 3))
        exit_global = (round(rm.position_x + ret_coil[-1][0], 3), round(rm.position_y + ret_coil[-1][1], 3))

        # 2. Toza ortogonal CAD feeder marshrutini yaratish
        feeder_info = create_clean_cad_feeder_route(
            manifold_pos=(man.position_x, man.position_y),
            port_index=cdef["port"],
            entry_global=entry_global,
            exit_global=exit_global,
            corridor_x=cdef["corridor_x"],
            corridor_y_range=(5.0, 15.0),
            doorway_pos=cdef.get("doorway_pos"),
            wall_corridor_channel_x=cdef.get("corridor_x"),
            inner_wall_x=cdef.get("inner_wall_x")
        )

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
            total_length_m=cdef["target_len"],  # Uponor normativ uzunligi
            color_hex="#2563EB",
            path_points=full_coil,
            supply_path_points=sup_coil,
            return_path_points=ret_coil,
            feeder_supply_points=feeder_info["supply_feeder"],
            feeder_return_points=feeder_info["return_feeder"]
        )

        # Graf modeli: PipeRoute va PipeSegmentlarni saqlash
        proute = PipeRoute.objects.create(
            circuit=circuit,
            manifold=man,
            supply_length_m=feeder_info["supply_length_m"],
            return_length_m=feeder_info["return_length_m"],
            total_length_m=cdef["target_len"],
            routing_metadata={"uponor_badge": cdef["name"], "port": cdef["port"]}
        )

        # Segmentlarni saqlash (Uzatish)
        fs = feeder_info["supply_feeder"]
        for s_idx in range(len(fs) - 1):
            p1, p2 = fs[s_idx], fs[s_idx+1]
            seg_len = round(math.hypot(p2[0]-p1[0], p2[1]-p1[1]), 3)
            # Eshikdan o'tayotgan segmentda gofra gilzasi
            is_door_pass = cdef.get("doorway_pos") and abs(p1[0] - cdef["doorway_pos"][0]) < 0.2
            PipeSegment.objects.create(
                route=proute,
                segment_type='feeder_supply',
                start_x_mm=p1[0]*1000,
                start_y_mm=p1[1]*1000,
                end_x_mm=p2[0]*1000,
                end_y_mm=p2[1]*1000,
                diameter_mm=16.0,
                length_m=seg_len,
                has_corrugation_sleeve=bool(is_door_pass),
                sequence_order=s_idx
            )

        # Segmentlarni saqlash (Qaytish)
        fr = feeder_info["return_feeder"]
        for r_idx in range(len(fr) - 1):
            p1, p2 = fr[r_idx], fr[r_idx+1]
            seg_len = round(math.hypot(p2[0]-p1[0], p2[1]-p1[1]), 3)
            is_door_pass = cdef.get("doorway_pos") and abs(p1[0] - cdef["doorway_pos"][0]) < 0.2
            PipeSegment.objects.create(
                route=proute,
                segment_type='feeder_return',
                start_x_mm=p1[0]*1000,
                start_y_mm=p1[1]*1000,
                end_x_mm=p2[0]*1000,
                end_y_mm=p2[1]*1000,
                diameter_mm=16.0,
                length_m=seg_len,
                has_corrugation_sleeve=bool(is_door_pass),
                sequence_order=r_idx
            )

        PipeConnection.objects.create(
            route=proute,
            connection_type='manifold_supply_port',
            position_x_mm=man.position_x * 1000,
            position_y_mm=man.position_y * 1000,
            description=f"{man.name} Chiqish #{cdef['port']}"
        )

        circuits_created += 1

    return {
        "project_id": project.id,
        "project_name": project.name,
        "rooms_count": project.rooms.count(),
        "manifolds_count": project.manifolds.count(),
        "circuits_count": circuits_created,
    }


class Command(BaseCommand):
    help = "Haqiqiy Uponor chizmasi bo'yicha loyiha ma'lumotlarini bazaga kiritadi"

    def add_arguments(self, parser):
        parser.add_argument(
            '--project-id',
            type=int,
            help='Loyihaning ID raqami (agar ko\'rsatilmasa, Project 15 va mavjud bo\'sh loyihalar yangilanadi)'
        )

    def handle(self, *args, **options):
        user = User.objects.filter(username='usta_xasan').first()
        if not user:
            user = User.objects.first()

        target_id = options.get('project_id')
        if target_id:
            projects = Project.objects.filter(id=target_id)
        else:
            # Project 15 ni topamiz yoki yaratamiz
            p15 = Project.objects.filter(id=15).first()
            if not p15:
                p15 = Project.objects.filter(name__icontains="Yunusobod").first()
            if not p15:
                p15 = Project.objects.create(
                    id=15,
                    user=user,
                    name="Yunusobod 14-mavze — 2 qavatli kottej (Uponor Loyihasi)",
                    address="Toshkent sh., Yunusobod tumani, 14-mavze, 28-uy",
                    client_name="Azizbek Rahimov",
                    client_phone="+998 (90) 123-45-67",
                    outdoor_design_temp=-15.0,
                    notes="EN 1264 va Uponor standartlari asosidagi professional issiq pol chizmasi."
                )
            projects = [p15]

            # Shuningdek, Project 16 ("aaa") yoki boshqa bo'sh loyihalar bo'lsa, ularni ham namunaviy chizma bilan to'ldirish
            p16 = Project.objects.filter(id=16).first()
            if p16 and p16.rooms.count() == 0:
                projects.append(p16)

        for proj in projects:
            self.stdout.write(f"Loyihani yangilash boshlandi: ID {proj.id} - {proj.name}")
            result = seed_project_with_blueprint(proj)
            self.stdout.write(self.style.SUCCESS(
                f"Loyiha {result['project_id']} ({result['project_name']}) muvaffaqiyatli yangilandi! "
                f"Xonalar: {result['rooms_count']}, Kollektorlar: {result['manifolds_count']}, Konturlar: {result['circuits_count']}"
            ))
