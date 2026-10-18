from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from projects.models import (
    Project, Building, Room, Wall, Window, Door,
    Manifold, Radiator, UnderfloorHeatingCircuit, CalculationResult
)
from catalog.models import RadiatorCatalogItem
from materials.generator import generate_project_materials
from engineering.heat_loss import calculate_heat_loss, HeatLossInput, OpeningElement
from engineering.radiators import calculate_radiator_selection, RadiatorSelectionInput, RadiatorModelData
from engineering.underfloor import calculate_underfloor_heating, UnderfloorHeatingInput, ExcludedArea
from engineering.hydraulics import calculate_hydraulics, HydraulicInput


class Command(BaseCommand):
    help = "SantexPro uchun to‘liq namuna (demo) loyihani va foydalanuvchini yaratish"

    def handle(self, *args, **options):
        # Agar avvalgi usta_sanjar mavjud bo'lsa, uni usta_xasan ga yangilaymiz
        user = User.objects.filter(username='usta_xasan').first()
        if not user:
            user = User.objects.filter(username='usta_sanjar').first()
            if user:
                user.username = 'usta_xasan'
                user.email = 'xasan@santexpro.uz'
                user.first_name = 'Xasan'
                user.last_name = 'Muhandis'
                user.set_password('santex2026')
                user.save()
            else:
                user = User.objects.create_user(
                    username='usta_xasan',
                    email='xasan@santexpro.uz',
                    first_name='Xasan',
                    last_name='Muhandis',
                    password='santex2026'
                )
        else:
            user.first_name = 'Xasan'
            user.last_name = 'Muhandis'
            user.email = 'xasan@santexpro.uz'
            user.set_password('santex2026')
            user.save()

        # Delete older demo projects for clean re-seed
        Project.objects.filter(user=user, name__contains="Yunusobod").delete()

        project = Project.objects.create(
            user=user,
            name="Yunusobod 14-mavze — 2 qavatli kottej",
            address="Toshkent sh., Yunusobod tumani, 14-mavze, 28-uy",
            client_name="Azizbek Rahimov",
            client_phone="+998 (90) 123-45-67",
            outdoor_design_temp=-15.0,
            notes="Zamonaviy tejamkor isitish: 1-qavatda to‘liq issiq pol + mehmonxonada radiatorlar, 2-qavatda panel radiatorlar."
        )

        Building.objects.create(
            project=project,
            building_type='residential_house',
            floors_count=2,
            wall_material_description="Pishgan g‘isht (38 sm) + 5 sm fasad penopolistirol",
            default_wall_u=0.42,
            default_window_u=1.8,
            default_door_u=1.8,
            default_floor_u=0.35,
            default_ceiling_u=0.32
        )

        # Manifold will be associated with r1 (Mehmonxona) once created

        korado_1200 = RadiatorCatalogItem.objects.filter(model_name__icontains='1200').first()
        purmo_1000 = RadiatorCatalogItem.objects.filter(model_name__icontains='Compact 22 500x1000').first()

        # 1. Mehmonxona
        r1 = Room.objects.create(
            project=project,
            name="Mehmonxona (Zal)",
            floor_number=1,
            length=6.0,
            width=4.5,
            height=3.0,
            exterior_walls_count=2,
            desired_temp=22.0,
            has_heated_above=True,
            has_heated_below=False,  # Pastda zamin
            wall_u_value=0.42,
            floor_u_value=0.35,
            ceiling_u_value=0.32,
            air_change_rate=0.8,
            heating_preference='combined'
        )

        w1 = Window.objects.create(room=r1, name="Katta deraza 1", wall_index=0, position_along_wall=1.2, width=2.0, height=1.6, u_value=1.8)
        w2 = Window.objects.create(room=r1, name="Katta deraza 2", wall_index=0, position_along_wall=3.8, width=1.8, height=1.6, u_value=1.8)
        d1 = Door.objects.create(room=r1, name="Ichki xona eshigi", wall_index=2, position_along_wall=2.0, width=0.9, height=2.1, door_type='interior', u_value=0.0)

        manifold = Manifold.objects.create(
            project=project,
            room=r1,
            name="1-qavat kollektor shkafi",
            position_x=0.55,
            position_y=2.2,
            outlets_count=6,
            pipe_diameter_mm=25.0
        )

        # 2. Oshxona
        r2 = Room.objects.create(
            project=project,
            name="Oshxona va ovqatlanish xonasi",
            floor_number=1,
            length=4.5,
            width=3.5,
            height=3.0,
            exterior_walls_count=1,
            desired_temp=21.0,
            has_heated_above=True,
            has_heated_below=False,
            wall_u_value=0.42,
            floor_u_value=0.35,
            ceiling_u_value=0.32,
            air_change_rate=1.0,
            heating_preference='underfloor_only'
        )
        Window.objects.create(room=r2, name="Oshxona oynasi", wall_index=0, position_along_wall=1.5, width=1.5, height=1.4, u_value=1.8)

        # 3. Yotoqxona
        r3 = Room.objects.create(
            project=project,
            name="Ota-onalar yotoqxonasi",
            floor_number=2,
            length=4.5,
            width=4.0,
            height=2.9,
            exterior_walls_count=2,
            desired_temp=22.0,
            has_heated_above=False,  # Yuqorida cherdak
            has_heated_below=True,   # Pastda 1-qavat
            wall_u_value=0.42,
            floor_u_value=0.35,
            ceiling_u_value=0.32,
            air_change_rate=0.8,
            heating_preference='radiator_only'
        )
        Window.objects.create(room=r3, name="Yotoqxona derazasi", wall_index=0, position_along_wall=1.8, width=1.6, height=1.5, u_value=1.8)

        # Run engineering calculations for all rooms
        for room in [r1, r2, r3]:
            # A. Heat Loss
            wins = [
                OpeningElement(name=w.name, element_type='window', width=w.width, height=w.height, u_value=w.u_value, wall_id=str(w.wall_index))
                for w in room.windows.all()
            ]
            drs = [
                OpeningElement(name=d.name, element_type='door', width=d.width, height=d.height, u_value=d.u_value, wall_id=str(d.wall_index))
                for d in room.doors.all()
            ]

            hl_inp = HeatLossInput(
                room_name=room.name,
                length=room.length,
                width=room.width,
                height=room.height,
                t_inside=room.desired_temp,
                t_outside=project.outdoor_design_temp,
                exterior_walls_count=room.exterior_walls_count,
                wall_u_value=room.wall_u_value,
                floor_u_value=room.floor_u_value,
                ceiling_u_value=room.ceiling_u_value,
                has_heated_above=room.has_heated_above,
                has_heated_below=room.has_heated_below,
                air_change_rate=room.air_change_rate,
                windows=wins,
                doors=drs
            )
            hl_res = calculate_heat_loss(hl_inp)

            CalculationResult.objects.create(
                room=room,
                calculation_type='heat_loss',
                input_parameters={'length': room.length, 'width': room.width, 'height': room.height, 't_in': room.desired_temp, 't_out': project.outdoor_design_temp},
                output_results={
                    'room_name': hl_res.room_name,
                    'area_m2': hl_res.area,
                    'volume_m3': hl_res.volume,
                    'delta_t': hl_res.delta_t,
                    'transmission_loss_w': hl_res.transmission_loss_w,
                    'ventilation_loss_w': hl_res.ventilation_loss_w,
                    'total_heat_loss_w': hl_res.total_heat_loss_w,
                    'specific_heat_loss_w_m2': hl_res.specific_heat_loss_w_m2,
                    'elements_breakdown': hl_res.elements_breakdown
                },
                assumptions=hl_res.assumptions,
                warnings=hl_res.warnings
            )

            # B. Radiator Calculation if preferred
            if room.heating_preference in ['combined', 'radiator_only']:
                catalog_obj = korado_1200 if room.length > 5 else purmo_1000
                m_data = None
                if catalog_obj:
                    m_data = RadiatorModelData(
                        model_id=str(catalog_obj.id),
                        manufacturer=catalog_obj.manufacturer,
                        model_name=catalog_obj.model_name,
                        radiator_type=catalog_obj.radiator_type,
                        height_mm=catalog_obj.height_mm,
                        length_mm=catalog_obj.length_mm,
                        depth_mm=catalog_obj.depth_mm,
                        rated_power_w=catalog_obj.rated_power_w,
                        rated_delta_t=catalog_obj.rated_delta_t,
                        exponent_n=catalog_obj.exponent_n
                    )

                target_w = hl_res.total_heat_loss_w
                if room.heating_preference == 'combined':
                    target_w = target_w * 0.6  # Radiators cover 60% in combined system

                rad_inp = RadiatorSelectionInput(
                    heat_demand_w=target_w,
                    t_supply=75.0,
                    t_return=65.0,
                    t_room=room.desired_temp,
                    selected_model=m_data,
                    user_quantity=2 if room.length > 5 else 1
                )
                rad_res = calculate_radiator_selection(rad_inp)
                first_window = room.windows.first()
                rad_pos_x = round(first_window.position_along_wall + first_window.width / 2.0, 2) if first_window else round(room.length / 2.0, 2)

                Radiator.objects.create(
                    room=room,
                    catalog_item=catalog_obj,
                    quantity=rad_res.recommended_quantity,
                    wall_index=0,
                    position_x=rad_pos_x,
                    position_y=0.15,
                    t_supply=75.0,
                    t_return=65.0,
                    calculated_actual_power_w=rad_res.total_provided_power_w
                )

                CalculationResult.objects.create(
                    room=room,
                    calculation_type='radiator',
                    input_parameters={'heat_demand_w': target_w, 't_supply': 75.0, 't_return': 65.0},
                    output_results={
                        'effective_delta_t': rad_res.effective_delta_t,
                        'correction_factor': rad_res.correction_factor,
                        'actual_power_per_unit_w': rad_res.actual_power_per_unit_w,
                        'recommended_quantity': rad_res.recommended_quantity,
                        'total_provided_power_w': rad_res.total_provided_power_w,
                        'power_reserve_percent': rad_res.power_reserve_percent,
                        'model_info': rad_res.model_info,
                        'estimated_pipe_length_m': rad_res.estimated_pipe_length_m,
                    },
                    assumptions=rad_res.notes,
                    warnings=rad_res.warnings
                )

            # C. Underfloor Calculation if preferred
            if room.heating_preference in ['combined', 'underfloor_only']:
                ex_areas = []
                if room.name.startswith("Oshxona"):
                    ex_areas.append(ExcludedArea(name="Oshxona garnituri", width=3.0, length=0.8))

                uf_inp = UnderfloorHeatingInput(
                    room_length=room.length,
                    room_width=room.width,
                    spacing_mm=150,
                    pipe_nominal_dia_mm=16.0,
                    pipe_wall_thickness_mm=2.0,
                    manifold_distance_m=4.0,
                    max_circuit_length_m=85.0,
                    routing_pattern='spiral',
                    excluded_areas=ex_areas
                )
                uf_res = calculate_underfloor_heating(uf_inp)

                for c in uf_res.circuits:
                    UnderfloorHeatingCircuit.objects.create(
                        room=room,
                        manifold=manifold,
                        circuit_number=c.circuit_index,
                        name=f"{room.name[:8]} {c.name}",
                        heated_area=round(uf_res.heated_floor_area / uf_res.num_circuits, 2),
                        spacing_mm=150,
                        pipe_diameter_mm=16.0,
                        pipe_wall_mm=2.0,
                        pipe_material='PEX-A',
                        pattern='spiral',
                        floor_length_m=c.floor_length_m,
                        manifold_lead_in_m=c.lead_in_length_m,
                        total_length_m=c.total_length_m,
                        color_hex=c.color_hex,
                        path_points=c.points
                    )

                CalculationResult.objects.create(
                    room=room,
                    calculation_type='underfloor',
                    input_parameters={'spacing_mm': 150, 'dia': 16.0},
                    output_results={
                        'total_room_area': uf_res.total_room_area,
                        'excluded_area': uf_res.excluded_area,
                        'heated_floor_area': uf_res.heated_floor_area,
                        'spacing_mm': uf_res.spacing_mm,
                        'pipe_spec': uf_res.pipe_spec,
                        'pipe_internal_dia_mm': uf_res.pipe_internal_dia_mm,
                        'estimated_floor_pipe_length_m': uf_res.estimated_floor_pipe_length_m,
                        'manifold_lead_in_length_m': uf_res.manifold_lead_in_length_m,
                        'total_pipe_length_m': uf_res.total_pipe_length_m,
                        'num_circuits': uf_res.num_circuits,
                        'average_circuit_length_m': uf_res.average_circuit_length_m,
                        'manifold_outlets_needed': uf_res.manifold_outlets_needed,
                        'schematic_data': uf_res.schematic_data
                    },
                    assumptions=uf_res.notes,
                    warnings=uf_res.warnings
                )

            # D. Hydraulics Calculation
            hyd_inp = HydraulicInput(
                heat_power_w=hl_res.total_heat_loss_w,
                t_supply=75.0 if room.heating_preference == 'radiator_only' else 45.0,
                t_return=65.0 if room.heating_preference == 'radiator_only' else 35.0,
                pipe_length_m=20.0,
                pipe_nominal_dia_mm=20.0,
                pipe_wall_thickness_mm=2.0,
                pipe_material='pex'
            )
            hyd_res = calculate_hydraulics(hyd_inp)

            CalculationResult.objects.create(
                room=room,
                calculation_type='hydraulics',
                input_parameters={'power_w': hl_res.total_heat_loss_w},
                output_results={
                    'heat_power_w': hyd_res.heat_power_w,
                    'delta_t_k': hyd_res.delta_t_k,
                    'mass_flow_kg_h': hyd_res.mass_flow_kg_h,
                    'volume_flow_l_h': hyd_res.volume_flow_l_h,
                    'velocity_m_s': hyd_res.velocity_m_s,
                    'recommended_pipe': hyd_res.recommended_pipe,
                    'total_pressure_loss_kpa': hyd_res.total_pressure_loss_kpa,
                    'pipe_options': [
                        {
                            'pipe_name': p.pipe_name,
                            'velocity_m_s': p.velocity_m_s,
                            'total_pressure_loss_kpa': p.total_pressure_loss_kpa,
                            'status': p.status,
                            'comment': p.comment
                        }
                        for p in hyd_res.pipe_options
                    ]
                },
                assumptions=hyd_res.notes,
                warnings=hyd_res.warnings
            )

        # Generate materials bill
        generate_project_materials(project)

        self.stdout.write(self.style.SUCCESS(
            f"Namuna loyiha '{project.name}' va foydalanuvchi 'usta_xasan' (Xasan Muhandis) muvaffaqiyatli yaratildi!"
        ))
