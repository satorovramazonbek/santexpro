from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db import transaction

from .models import (
    Project, Building, Room, Wall, Window, Door,
    Manifold, Radiator, UnderfloorHeatingCircuit, CalculationResult
)
from .serializers import (
    ProjectListSerializer, ProjectDetailSerializer, BuildingSerializer,
    RoomSerializer, WallSerializer, WindowSerializer, DoorSerializer,
    RadiatorSerializer, UnderfloorHeatingCircuitSerializer, ManifoldSerializer,
    CalculationResultSerializer
)
from .permissions import IsProjectOwner
from engineering.heat_loss import (
    HeatLossInput, OpeningElement, calculate_heat_loss
)
from engineering.radiators import (
    RadiatorSelectionInput, RadiatorModelData, calculate_radiator_selection
)
from engineering.underfloor import (
    UnderfloorHeatingInput, ExcludedArea, calculate_underfloor_heating
)
from engineering.hydraulics import (
    HydraulicInput, calculate_hydraulics
)
from catalog.models import RadiatorCatalogItem


def compute_feeder_points_via_corridor(manifold, room, port_index, entry_pt, exit_pt, corridor_y=None):
    """
    Computes feeder supply (T11 red) and return (T12 blue) routes running
    neatly along the corridor floor and entering the room strictly through its doorway.
    Prevents intersecting walls or crossing loops.
    """
    rx = float(room.position_x or 0.0)
    ry = float(room.position_y or 0.0)
    rw = float(room.width or 4.0)
    rl = float(room.length or 5.0)

    # 1. Locate the doorway connecting room to the corridor
    door = room.doors.filter(wall_index=2).first() or room.doors.first()
    if door:
        if door.wall_index == 2 or door.wall_index == 0:
            door_gx = round(rx + float(door.position_along_wall) + float(door.width or 0.9) / 2.0, 2)
            door_gy = round(ry + (rl if door.wall_index == 2 else 0.0), 2)
        else:
            door_gx = round(rx + (rw if door.wall_index == 1 else 0.0), 2)
            door_gy = round(ry + float(door.position_along_wall) + float(door.width or 0.9) / 2.0, 2)
    else:
        # Default doorway on bottom wall
        door_gx = round(rx + rw / 2.0, 2)
        door_gy = round(ry + rl, 2)

    gx_in = round(rx + float(entry_pt[0]), 2)
    gy_in = round(ry + float(entry_pt[1]), 2)
    gx_out = round(rx + float(exit_pt[0]), 2)
    gy_out = round(ry + float(exit_pt[1]), 2)

    # 2. Corridor trunk lane
    if corridor_y is None:
        all_rooms = room.project.rooms.all()
        max_bottom = max((float(r.position_y or 0.0) + float(r.length or 5.0) for r in all_rooms), default=6.0)
        corridor_y = round(max_bottom + 0.8, 2)

    trunk_lane_y = round(corridor_y + (port_index - 1) * 0.04, 2)
    port_off_x = (port_index - 1) * 0.06
    m_sup_x = round(float(manifold.position_x) + port_off_x, 2)
    m_ret_x = round(float(manifold.position_x) + port_off_x + 0.03, 2)

    # Supply feeder: Manifold port -> Corridor lane -> Door threshold -> Circuit start
    feeder_sup = [
        [m_sup_x, round(float(manifold.position_y), 2)],
        [m_sup_x, trunk_lane_y],
        [round(door_gx - 0.04, 2), trunk_lane_y],
        [round(door_gx - 0.04, 2), door_gy],
        [gx_in, round(door_gy - 0.15, 2)],
        [gx_in, gy_in],
    ]

    # Return feeder: Circuit end -> Door threshold -> Corridor lane -> Manifold port
    feeder_ret = [
        [gx_out, gy_out],
        [gx_out, round(door_gy - 0.15, 2)],
        [round(door_gx + 0.04, 2), door_gy],
        [round(door_gx + 0.04, 2), trunk_lane_y],
        [m_ret_x, trunk_lane_y],
        [m_ret_x, round(float(manifold.position_y), 2)],
    ]

    lead_in_len = round(
        abs(m_sup_x - (door_gx - 0.04)) + abs(trunk_lane_y - float(manifold.position_y)) + abs(door_gy - trunk_lane_y) +
        abs(gx_in - door_gx) + abs(gy_in - door_gy) + abs(gx_out - door_gx) + abs(gy_out - door_gy) +
        abs(door_gy - trunk_lane_y) + abs(m_ret_x - (door_gx + 0.04)) + abs(trunk_lane_y - float(manifold.position_y)),
        1
    )

    return feeder_sup, feeder_ret, lead_in_len


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsProjectOwner]

    def get_queryset(self):
        user = self.request.user
        queryset = Project.objects.filter(user=user)
        is_archived = self.request.query_params.get('archived')
        if is_archived is not None:
            queryset = queryset.filter(is_archived=(is_archived.lower() == 'true'))
        if self.action != 'list':
            queryset = queryset.select_related('building').prefetch_related(
                'rooms', 'rooms__windows', 'rooms__doors', 'rooms__walls',
                'rooms__radiators', 'rooms__radiators__catalog_item',
                'rooms__underfloor_circuits', 'rooms__calculation_results',
                'rooms__manifolds', 'manifolds', 'manifolds__circuits'
            )
        return queryset

    def get_serializer_class(self):
        if self.action in ['list']:
            return ProjectListSerializer
        return ProjectDetailSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        project = serializer.save(user=self.request.user)
        Building.objects.create(project=project)
        Manifold.objects.create(project=project, name="Asosiy kollektor 1", outlets_count=6)

    @action(detail=True, methods=['post'])
    def toggle_archive(self, request, pk=None):
        project = self.get_object()
        project.is_archived = not project.is_archived
        project.save(update_fields=['is_archived', 'updated_at'])
        status_text = "arxivlandi" if project.is_archived else "faollashtirildi"
        return Response({'message': f"Loyiha muvaffaqiyatli {status_text}.", 'is_archived': project.is_archived})

    @action(detail=True, methods=['get', 'patch', 'put'], url_path='building')
    def building(self, request, pk=None):
        project = self.get_object()
        building, _ = Building.objects.get_or_create(project=project)
        if request.method == 'GET':
            serializer = BuildingSerializer(building)
            return Response(serializer.data)

        serializer = BuildingSerializer(building, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_building = serializer.save()

        sync_rooms = request.data.get('sync_rooms', False)
        if sync_rooms:
            project.rooms.update(
                wall_u_value=updated_building.default_wall_u,
                floor_u_value=updated_building.default_floor_u,
                ceiling_u_value=updated_building.default_ceiling_u,
            )
            Wall.objects.filter(room__project=project, is_exterior=True).update(
                u_value=updated_building.default_wall_u
            )

        return Response(BuildingSerializer(updated_building).data)

    @action(detail=True, methods=['post'], url_path='layout')
    def save_layout(self, request, pk=None):
        project = self.get_object()
        rooms_data = request.data.get('rooms', [])
        for r_item in rooms_data:
            r_id = r_item.get('id')
            pos_x = r_item.get('position_x')
            pos_y = r_item.get('position_y')
            if r_id and pos_x is not None and pos_y is not None:
                project.rooms.filter(id=r_id).update(
                    position_x=float(pos_x),
                    position_y=float(pos_y)
                )
        return Response({'status': 'success', 'message': "Xonalar joylashuvi saqlandi."})

    @action(detail=True, methods=['post'], url_path='manifold')
    def save_manifold(self, request, pk=None):
        project = self.get_object()
        manifold_id = request.data.get('manifold_id') or request.data.get('id')
        if manifold_id:
            manifold = project.manifolds.filter(id=manifold_id).first()
        else:
            manifold = project.manifolds.first()

        if not manifold:
            manifold = Manifold.objects.create(project=project)

        pos_x = request.data.get('position_x')
        pos_y = request.data.get('position_y')
        room_id = request.data.get('room_id')
        outlets = request.data.get('outlets_count')
        name = request.data.get('name')

        if pos_x is not None:
            manifold.position_x = float(pos_x)
        if pos_y is not None:
            manifold.position_y = float(pos_y)
        if room_id is not None:
            manifold.room = project.rooms.filter(id=room_id).first()
        if outlets is not None:
            manifold.outlets_count = int(outlets)
        if name:
            manifold.name = str(name)
        manifold.save()

        return Response(ManifoldSerializer(manifold).data)



    @action(detail=True, methods=['post'], url_path='update-circuits-routing')
    def update_circuits_routing(self, request, pk=None):
        project = self.get_object()
        manifold = project.manifolds.first()
        if not manifold:
            manifold = Manifold.objects.create(project=project, name="Asosiy kollektor 1", outlets_count=6)

        circuits_payload = request.data.get('circuits', [])
        if circuits_payload:
            for item in circuits_payload:
                c_id = item.get('id')
                if not c_id:
                    continue
                circuit = UnderfloorHeatingCircuit.objects.filter(room__project=project, id=c_id).first()
                if not circuit or circuit.is_locked:
                    continue
                if 'manifold_port_index' in item:
                    circuit.manifold_port_index = item['manifold_port_index']
                if 'feeder_supply_points' in item:
                    circuit.feeder_supply_points = item['feeder_supply_points']
                if 'feeder_return_points' in item:
                    circuit.feeder_return_points = item['feeder_return_points']
                if 'is_locked' in item:
                    circuit.is_locked = bool(item['is_locked'])
                circuit.save()
        else:
            all_circuits = UnderfloorHeatingCircuit.objects.filter(room__project=project).select_related('room')
            all_rooms = project.rooms.all()
            max_bottom = max((float(r.position_y or 0.0) + float(r.length or 5.0) for r in all_rooms), default=6.0)
            corridor_y = round(max_bottom + 0.8, 2)

            # Move manifold out of room into corridor if needed
            if float(manifold.position_y) < max_bottom - 0.2:
                manifold.position_x = 0.8
                manifold.position_y = round(max_bottom + 0.2, 2)
                manifold.save(update_fields=['position_x', 'position_y'])

            port_num = 1
            for circ in all_circuits:
                if circ.is_locked:
                    continue
                circ.manifold = manifold
                circ.manifold_port_index = port_num
                port_num += 1

                pts = circ.path_points or [[0.5, 0.5]]
                ent = pts[0]
                ext = pts[-1] if len(pts) > 1 else ent

                sup_pts, ret_pts, lead_len = compute_feeder_points_via_corridor(
                    manifold=manifold,
                    room=circ.room,
                    port_index=circ.manifold_port_index,
                    entry_pt=ent,
                    exit_pt=ext,
                    corridor_y=corridor_y
                )

                circ.feeder_supply_points = sup_pts
                circ.feeder_return_points = ret_pts
                circ.manifold_lead_in_m = lead_len
                circ.total_length_m = round(circ.floor_length_m + circ.manifold_lead_in_m, 1)
                circ.save()

            if port_num - 1 > manifold.outlets_count:
                manifold.outlets_count = port_num - 1
                manifold.save(update_fields=['outlets_count'])

        return Response({'status': 'success', 'message': "Konturlar va kollektor magistral yo‘llari yangilandi."})

    @action(detail=True, methods=['post'], url_path='seed-blueprint')
    def seed_blueprint(self, request, pk=None):
        """
        Loyihaga professional Uponor namuna blueprint qavat chizmasini
        (7 xona, 10 kontur, 2 kollektor, 90-gradusli toza ortogonal quvurlar) yuklaydi.
        """
        project = self.get_object()
        from projects.management.commands.seed_blueprint_project import seed_project_with_blueprint
        res = seed_project_with_blueprint(project)
        return Response({
            'status': 'success',
            'message': f"Namunaviy Uponor qavat loyihasi muvaffaqiyatli yuklandi ({res['circuits_count']} ta kontur, {res['rooms_count']} ta xona).",
            'data': res
        })

    @action(detail=True, methods=['get'], url_path='hydraulics-report')
    def hydraulics_report(self, request, pk=None):
        """
        Loyihadagi har bir issiq pol konturi uchun batafsil gidravlik hisob,
        suv sarfi, oqim tezligi, bosim yo'qotilishi va 2 ta kollektor zaruriyati tahlilini qaytaradi.
        """
        project = self.get_object()
        from engineering.hydraulics import (
            calculate_underfloor_circuit_hydraulics,
            evaluate_two_manifold_architecture_necessity
        )
        circuits_report = []
        all_circuits = UnderfloorHeatingCircuit.objects.filter(room__project=project).select_related('room', 'manifold')

        tot_flow_l_h = 0.0
        max_pressure_drop_kpa = 0.0

        for circ in all_circuits:
            rep = calculate_underfloor_circuit_hydraulics(
                circuit_number=circ.circuit_number,
                name=circ.name,
                heated_area_m2=float(circ.heated_area or circ.room.area or 15.0),
                floor_length_m=float(circ.floor_length_m or 50.0),
                feeder_length_m=float(circ.manifold_lead_in_m or 5.0),
                pipe_diameter_mm=float(circ.pipe_diameter_mm or 16.0),
                spacing_mm=float(circ.spacing_mm or 150.0),
                t_supply=40.0,
                t_return=35.0
            )
            circuits_report.append({
                "circuit_id": circ.id,
                "circuit_number": circ.circuit_number,
                "name": circ.name,
                "room_name": circ.room.name,
                "manifold_name": circ.manifold.name if circ.manifold else "Дв-2",
                "manifold_port": circ.manifold_port_index,
                "floor_length_m": rep.floor_length_m,
                "feeder_length_m": rep.feeder_length_m,
                "total_length_m": rep.total_length_m,
                "heat_power_w": rep.heat_power_w,
                "flow_l_h": rep.flow_l_h,
                "flow_l_min": rep.flow_l_min,
                "velocity_m_s": rep.velocity_m_s,
                "pressure_drop_kpa": rep.pressure_drop_kpa,
                "transit_temp_drop_c": rep.transit_temp_drop_c,
                "is_length_compliant": rep.is_length_compliant,
                "is_velocity_compliant": rep.is_velocity_compliant,
                "is_pressure_compliant": rep.is_pressure_compliant,
                "balancing_setting_l_min": rep.balancing_rotameter_setting_l_min,
                "cooling_risk_warning": rep.cooling_risk_warning,
                "notes": rep.notes
            })
            tot_flow_l_h += rep.flow_l_h
            if rep.pressure_drop_kpa > max_pressure_drop_kpa:
                max_pressure_drop_kpa = rep.pressure_drop_kpa

        two_manifold_analysis = evaluate_two_manifold_architecture_necessity()

        return Response({
            "status": "success",
            "project_id": project.id,
            "project_name": project.name,
            "circuits_count": len(circuits_report),
            "total_flow_l_h": round(tot_flow_l_h, 1),
            "total_flow_m3_h": round(tot_flow_l_h / 1000.0, 3),
            "max_circuit_pressure_drop_kpa": max_pressure_drop_kpa,
            "recommended_circulation_pump": "Grundfos UPM3 AUTO 25-70 130 yoki Wilo Para 25/6 SC (25 W)",
            "circuits": circuits_report,
            "manifold_architecture_analysis": two_manifold_analysis
        })

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        user = self.request.user
        projects = Project.objects.filter(user=user)
        total_projects = projects.count()
        total_rooms = Room.objects.filter(project__user=user).count()
        recent_projects = projects.order_by('-updated_at')[:5]

        total_heat_demand = 0.0
        for p in projects.filter(is_archived=False):
            total_heat_demand += p.total_heat_loss_w

        return Response({
            'total_projects': total_projects,
            'total_rooms': total_rooms,
            'total_heat_demand_kw': round(total_heat_demand / 1000.0, 2),
            'recent_projects': ProjectListSerializer(recent_projects, many=True).data
        })


class RoomViewSet(viewsets.ModelViewSet):
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectOwner]

    def get_queryset(self):
        project_id = self.request.query_params.get('project_id')
        queryset = Room.objects.filter(project__user=self.request.user).prefetch_related(
            'windows', 'doors', 'walls', 'radiators', 'radiators__catalog_item',
            'underfloor_circuits', 'calculation_results', 'manifolds'
        )
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        project = serializer.validated_data.get('project')
        if project.user != self.request.user:
            raise PermissionDenied("Siz boshqa foydalanuvchining loyihasiga xona qo‘sha olmaysiz.")

        room = serializer.save()
        # Default 4 walls
        orientations = ['N', 'E', 'S', 'W']
        lengths = [room.length, room.width, room.length, room.width]
        ext_count = min(max(1, room.exterior_walls_count), 4)

        for i in range(4):
            Wall.objects.create(
                room=room,
                wall_index=i,
                orientation=orientations[i],
                length=lengths[i],
                is_exterior=(i < ext_count),
                u_value=room.wall_u_value
            )

    @transaction.atomic
    def perform_update(self, serializer):
        room = serializer.save()
        orientations = ['N', 'E', 'S', 'W']
        lengths = [room.length, room.width, room.length, room.width]
        ext_count = min(max(1, room.exterior_walls_count), 4)

        for i in range(4):
            Wall.objects.update_or_create(
                room=room,
                wall_index=i,
                defaults={
                    'orientation': orientations[i],
                    'length': lengths[i],
                    'is_exterior': (i < ext_count),
                    'u_value': room.wall_u_value
                }
            )

    @action(detail=True, methods=['post'])
    def calculate_heat_loss(self, request, pk=None):
        room = self.get_object()
        project = room.project

        ext_count = min(max(1, room.exterior_walls_count), 4)

        windows = [
            OpeningElement(
                name=w.name,
                element_type='window',
                width=w.width,
                height=w.height,
                u_value=w.u_value,
                wall_id=str(w.wall_index),
                is_exterior=(w.wall_index < ext_count)
            )
            for w in room.windows.all()
        ]

        doors = [
            OpeningElement(
                name=d.name,
                element_type='door',
                width=d.width,
                height=d.height,
                u_value=d.u_value,
                wall_id=str(d.wall_index),
                is_exterior=(d.door_type.startswith('exterior') or d.wall_index < ext_count)
            )
            for d in room.doors.all()
        ]

        inp = HeatLossInput(
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
            windows=windows,
            doors=doors
        )

        try:
            res = calculate_heat_loss(inp)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        calc_result, _ = CalculationResult.objects.update_or_create(
            room=room,
            calculation_type='heat_loss',
            defaults={
                'input_parameters': {
                    'length': room.length,
                    'width': room.width,
                    'height': room.height,
                    't_inside': room.desired_temp,
                    't_outside': project.outdoor_design_temp,
                    'wall_u_value': room.wall_u_value,
                    'floor_u_value': room.floor_u_value,
                    'ceiling_u_value': room.ceiling_u_value,
                    'has_heated_above': room.has_heated_above,
                    'has_heated_below': room.has_heated_below,
                    'air_change_rate': room.air_change_rate,
                    'exterior_walls_count': room.exterior_walls_count,
                },
                'output_results': {
                    'room_name': res.room_name,
                    'area_m2': res.area,
                    'volume_m3': res.volume,
                    'delta_t': res.delta_t,
                    'transmission_loss_w': res.transmission_loss_w,
                    'ventilation_loss_w': res.ventilation_loss_w,
                    'total_heat_loss_w': res.total_heat_loss_w,
                    'specific_heat_loss_w_m2': res.specific_heat_loss_w_m2,
                    'elements_breakdown': res.elements_breakdown,
                },
                'assumptions': res.assumptions,
                'warnings': res.warnings,
                'calculation_version': '1.0.0'
            }
        )

        return Response(CalculationResultSerializer(calc_result).data)

    @action(detail=True, methods=['post'])
    def calculate_radiator(self, request, pk=None):
        room = self.get_object()
        try:
            heat_loss_calc = room.calculation_results.filter(calculation_type='heat_loss').first()
            raw_heat_demand = request.data.get('heat_demand_w')
            if raw_heat_demand is not None and str(raw_heat_demand).strip() != '':
                heat_demand = float(raw_heat_demand)
            elif heat_loss_calc:
                heat_demand = float(heat_loss_calc.output_results.get('total_heat_loss_w', 1500.0))
            else:
                heat_demand = 1500.0

            catalog_item_id = request.data.get('catalog_item_id')
            custom_power_w = request.data.get('custom_power_w')
            t_supply = float(request.data.get('t_supply', 75.0))
            t_return = float(request.data.get('t_return', 65.0))
            t_room = float(request.data.get('t_room', room.desired_temp))
            user_qty = request.data.get('quantity')
            if user_qty:
                user_qty = int(user_qty)

            model_data = None
            catalog_obj = None
            if catalog_item_id:
                try:
                    catalog_obj = RadiatorCatalogItem.objects.get(id=catalog_item_id)
                    model_data = RadiatorModelData(
                        model_id=str(catalog_obj.id),
                        manufacturer=catalog_obj.manufacturer,
                        model_name=catalog_obj.model_name,
                        radiator_type=catalog_obj.radiator_type,
                        height_mm=catalog_obj.height_mm,
                        length_mm=catalog_obj.length_mm,
                        depth_mm=catalog_obj.depth_mm,
                        rated_power_w=catalog_obj.rated_power_w,
                        rated_delta_t=catalog_obj.rated_delta_t,
                        exponent_n=catalog_obj.exponent_n,
                    )
                except RadiatorCatalogItem.DoesNotExist:
                    pass

            inp = RadiatorSelectionInput(
                heat_demand_w=heat_demand,
                t_supply=t_supply,
                t_return=t_return,
                t_room=t_room,
                selected_model=model_data,
                custom_rated_power_w=float(custom_power_w) if custom_power_w else None,
                user_quantity=user_qty
            )
            res = calculate_radiator_selection(inp)
        except (ValueError, TypeError) as e:
            return Response({'error': f"Noto‘g‘ri parametr kiritildi: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            radiator_instance = Radiator.objects.filter(room=room).first()
            if not radiator_instance:
                radiator_instance = Radiator(room=room)
            radiator_instance.catalog_item = catalog_obj
            radiator_instance.t_supply = t_supply
            radiator_instance.t_return = t_return
            radiator_instance.quantity = res.recommended_quantity
            radiator_instance.calculated_actual_power_w = res.total_provided_power_w
            radiator_instance.save()

            calc_result, _ = CalculationResult.objects.update_or_create(
                room=room,
                calculation_type='radiator',
                defaults={
                    'input_parameters': {
                        'heat_demand_w': heat_demand,
                        't_supply': t_supply,
                        't_return': t_return,
                        't_room': t_room,
                        'catalog_item_id': catalog_item_id,
                        'user_quantity': user_qty,
                    },
                    'output_results': {
                        'effective_delta_t': res.effective_delta_t,
                        'correction_factor': res.correction_factor,
                        'actual_power_per_unit_w': res.actual_power_per_unit_w,
                        'recommended_quantity': res.recommended_quantity,
                        'total_provided_power_w': res.total_provided_power_w,
                        'power_reserve_percent': res.power_reserve_percent,
                        'model_info': res.model_info,
                        'estimated_pipe_length_m': res.estimated_pipe_length_m,
                        'is_catalog_item': res.is_catalog_item,
                    },
                    'assumptions': res.notes,
                    'warnings': res.warnings,
                    'calculation_version': '1.0.0'
                }
            )

        return Response(CalculationResultSerializer(calc_result).data)

    @action(detail=True, methods=['post'])
    def calculate_underfloor(self, request, pk=None):
        room = self.get_object()
        try:
            spacing_mm = int(request.data.get('spacing_mm', 150))
            pipe_nominal_dia_mm = float(request.data.get('pipe_nominal_dia_mm', 16.0))
            pipe_wall_thickness_mm = float(request.data.get('pipe_wall_thickness_mm', 2.0))
            pipe_material = request.data.get('pipe_material', 'PEX-A')
            manifold_distance_m = float(request.data.get('manifold_distance_m', 4.0))
            max_circuit_length_m = float(request.data.get('max_circuit_length_m', 85.0))
            routing_pattern = request.data.get('routing_pattern', 'spiral')

            custom_num_circuits_raw = request.data.get('custom_num_circuits') or request.data.get('num_circuits')
            custom_num_circuits = None
            if custom_num_circuits_raw is not None:
                val = int(custom_num_circuits_raw)
                if val > 0:
                    custom_num_circuits = val

            excluded_data = request.data.get('excluded_areas', [])
            excluded_areas = [
                ExcludedArea(name=e.get('name', 'Mebel'), width=float(e.get('width', 1.0)), length=float(e.get('length', 1.0)))
                for e in excluded_data
            ]

            inp = UnderfloorHeatingInput(
                room_length=room.length,
                room_width=room.width,
                spacing_mm=spacing_mm,
                pipe_nominal_dia_mm=pipe_nominal_dia_mm,
                pipe_wall_thickness_mm=pipe_wall_thickness_mm,
                pipe_material=pipe_material,
                manifold_distance_m=manifold_distance_m,
                max_circuit_length_m=max_circuit_length_m,
                routing_pattern=routing_pattern,
                excluded_areas=excluded_areas,
                custom_num_circuits=custom_num_circuits,
            )
            res = calculate_underfloor_heating(inp)
        except (ValueError, TypeError) as e:
            return Response({'error': f"Noto‘g‘ri parametr kiritildi: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            room.underfloor_circuits.all().delete()
            manifold = room.project.manifolds.first()
            if not manifold:
                manifold = Manifold.objects.create(project=room.project, name="Asosiy kollektor 1", outlets_count=6)

            existing_ports = set(
                UnderfloorHeatingCircuit.objects.filter(manifold=manifold)
                .exclude(room=room)
                .values_list('manifold_port_index', flat=True)
            )

            m_pos_x = manifold.position_x
            m_pos_y = manifold.position_y
            r_pos_x = room.position_x
            r_pos_y = room.position_y

            port_counter = 1
            for c in res.circuits:
                while port_counter in existing_ports:
                    port_counter += 1
                assigned_port = port_counter
                port_counter += 1

                entry_pt = c.points[0] if c.points else (0.5, 0.5)
                exit_pt = c.points[-1] if c.points else (0.5, 0.5)

                global_entry_x = round(r_pos_x + entry_pt[0], 2)
                global_entry_y = round(r_pos_y + entry_pt[1], 2)
                global_exit_x = round(r_pos_x + exit_pt[0], 2)
                global_exit_y = round(r_pos_y + exit_pt[1], 2)

                feeder_sup, feeder_ret, lead_in_len = compute_feeder_points_via_corridor(
                    manifold=manifold,
                    room=room,
                    port_index=assigned_port,
                    entry_pt=entry_pt,
                    exit_pt=exit_pt
                )

                # Update manifold outlets if needed
                if assigned_port > manifold.outlets_count:
                    manifold.outlets_count = assigned_port
                    manifold.save(update_fields=['outlets_count'])

                UnderfloorHeatingCircuit.objects.create(
                    room=room,
                    manifold=manifold,
                    manifold_port_index=assigned_port,
                    circuit_number=c.circuit_index,
                    name=c.name,
                    heated_area=round(res.heated_floor_area / res.num_circuits, 2),
                    spacing_mm=spacing_mm,
                    pipe_diameter_mm=pipe_nominal_dia_mm,
                    pipe_wall_mm=pipe_wall_thickness_mm,
                    pipe_material=pipe_material,
                    pattern=routing_pattern,
                    floor_length_m=c.floor_length_m,
                    manifold_lead_in_m=c.lead_in_length_m,
                    total_length_m=c.total_length_m,
                    color_hex=c.color_hex,
                    path_points=c.points,
                    supply_path_points=getattr(c, 'supply_points', []),
                    return_path_points=getattr(c, 'return_points', []),
                    feeder_supply_points=feeder_sup,
                    feeder_return_points=feeder_ret,
                )

            circuits_summary = [
                {
                    'index': c.circuit_index,
                    'name': c.name,
                    'floor_length_m': c.floor_length_m,
                    'lead_in_length_m': c.lead_in_length_m,
                    'total_length_m': c.total_length_m,
                    'color_hex': c.color_hex,
                    'points': c.points
                }
                for c in res.circuits
            ]

            calc_result, _ = CalculationResult.objects.update_or_create(
                room=room,
                calculation_type='underfloor',
                defaults={
                    'input_parameters': {
                        'spacing_mm': spacing_mm,
                        'pipe_nominal_dia_mm': pipe_nominal_dia_mm,
                        'pipe_wall_thickness_mm': pipe_wall_thickness_mm,
                        'pipe_material': pipe_material,
                        'manifold_distance_m': manifold_distance_m,
                        'max_circuit_length_m': max_circuit_length_m,
                        'routing_pattern': routing_pattern,
                        'custom_num_circuits': custom_num_circuits,
                    },
                    'output_results': {
                        'total_room_area': res.total_room_area,
                        'excluded_area': res.excluded_area,
                        'heated_floor_area': res.heated_floor_area,
                        'spacing_mm': res.spacing_mm,
                        'pipe_spec': res.pipe_spec,
                        'pipe_internal_dia_mm': res.pipe_internal_dia_mm,
                        'estimated_floor_pipe_length_m': res.estimated_floor_pipe_length_m,
                        'manifold_lead_in_length_m': res.manifold_lead_in_length_m,
                        'total_pipe_length_m': res.total_pipe_length_m,
                        'num_circuits': res.num_circuits,
                        'average_circuit_length_m': res.average_circuit_length_m,
                        'manifold_outlets_needed': res.manifold_outlets_needed,
                        'circuits': circuits_summary,
                        'schematic_data': res.schematic_data
                    },
                    'assumptions': res.notes,
                    'warnings': res.warnings,
                    'calculation_version': '1.0.0'
                }
            )

        return Response(CalculationResultSerializer(calc_result).data)

    @action(detail=True, methods=['post'])
    def calculate_hydraulics(self, request, pk=None):
        room = self.get_object()
        try:
            heat_loss_calc = room.calculation_results.filter(calculation_type='heat_loss').first()
            default_power = heat_loss_calc.output_results.get('total_heat_loss_w', 2000.0) if heat_loss_calc else 2000.0

            heat_power_w = float(request.data.get('heat_power_w', default_power))
            t_supply = float(request.data.get('t_supply', 75.0))
            t_return = float(request.data.get('t_return', 65.0))
            pipe_length_m = float(request.data.get('pipe_length_m', 20.0))
            pipe_nominal_dia_mm = float(request.data.get('pipe_nominal_dia_mm', 20.0))
            pipe_wall_thickness_mm = float(request.data.get('pipe_wall_thickness_mm', 2.0))
            pipe_material = str(request.data.get('pipe_material', 'pex'))

            inp = HydraulicInput(
                heat_power_w=heat_power_w,
                t_supply=t_supply,
                t_return=t_return,
                pipe_length_m=pipe_length_m,
                pipe_nominal_dia_mm=pipe_nominal_dia_mm,
                pipe_wall_thickness_mm=pipe_wall_thickness_mm,
                pipe_material=pipe_material
            )
            res = calculate_hydraulics(inp)
        except (ValueError, TypeError) as e:
            return Response({'error': f"Noto‘g‘ri parametr kiritildi: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        pipe_options_data = [
            {
                'pipe_name': p.pipe_name,
                'nominal_dia_mm': p.nominal_dia_mm,
                'internal_dia_mm': p.internal_dia_mm,
                'velocity_m_s': p.velocity_m_s,
                'reynolds_number': p.reynolds_number,
                'friction_factor': p.friction_factor,
                'pressure_loss_per_meter_pa_m': p.pressure_loss_per_meter_pa_m,
                'total_pressure_loss_kpa': p.total_pressure_loss_kpa,
                'status': p.status,
                'comment': p.comment,
            }
            for p in res.pipe_options
        ]

        calc_result, _ = CalculationResult.objects.update_or_create(
            room=room,
            calculation_type='hydraulics',
            defaults={
                'input_parameters': {
                    'heat_power_w': heat_power_w,
                    't_supply': t_supply,
                    't_return': t_return,
                    'pipe_length_m': pipe_length_m,
                    'pipe_nominal_dia_mm': pipe_nominal_dia_mm,
                    'pipe_wall_thickness_mm': pipe_wall_thickness_mm,
                    'pipe_material': pipe_material,
                },
                'output_results': {
                    'heat_power_w': res.heat_power_w,
                    'delta_t_k': res.delta_t_k,
                    'mass_flow_kg_h': res.mass_flow_kg_h,
                    'volume_flow_l_h': res.volume_flow_l_h,
                    'volume_flow_m3_h': res.volume_flow_m3_h,
                    'selected_pipe_name': res.selected_pipe_name,
                    'selected_internal_dia_mm': res.selected_internal_dia_mm,
                    'velocity_m_s': res.velocity_m_s,
                    'reynolds_number': res.reynolds_number,
                    'flow_regime': res.flow_regime,
                    'friction_factor': res.friction_factor,
                    'linear_pressure_loss_pa': res.linear_pressure_loss_pa,
                    'local_pressure_loss_pa': res.local_pressure_loss_pa,
                    'total_pressure_loss_pa': res.total_pressure_loss_pa,
                    'total_pressure_loss_kpa': res.total_pressure_loss_kpa,
                    'total_pressure_loss_mbar': res.total_pressure_loss_mbar,
                    'pressure_loss_per_meter_pa_m': res.pressure_loss_per_meter_pa_m,
                    'recommended_pipe': res.recommended_pipe,
                    'pipe_options': pipe_options_data,
                },
                'assumptions': res.notes,
                'warnings': res.warnings,
                'calculation_version': '1.0.0'
            }
        )

        return Response(CalculationResultSerializer(calc_result).data)


class WindowViewSet(viewsets.ModelViewSet):
    serializer_class = WindowSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectOwner]

    def get_queryset(self):
        return Window.objects.filter(room__project__user=self.request.user)

    def perform_create(self, serializer):
        room = serializer.validated_data.get('room')
        if room.project.user != self.request.user:
            raise PermissionDenied("Siz ushbu xonaga deraza qo‘sha olmaysiz.")
        serializer.save()


class DoorViewSet(viewsets.ModelViewSet):
    serializer_class = DoorSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectOwner]

    def get_queryset(self):
        return Door.objects.filter(room__project__user=self.request.user)

    def perform_create(self, serializer):
        room = serializer.validated_data.get('room')
        if room.project.user != self.request.user:
            raise PermissionDenied("Siz ushbu xonaga eshik qo‘sha olmaysiz.")
        serializer.save()


class WallViewSet(viewsets.ModelViewSet):
    serializer_class = WallSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectOwner]

    def get_queryset(self):
        return Wall.objects.filter(room__project__user=self.request.user)

    def perform_create(self, serializer):
        room = serializer.validated_data.get('room')
        if room.project.user != self.request.user:
            raise PermissionDenied("Siz ushbu xonaga devor qo‘sha olmaysiz.")
        serializer.save()


class RadiatorViewSet(viewsets.ModelViewSet):
    serializer_class = RadiatorSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectOwner]

    def get_queryset(self):
        return Radiator.objects.filter(room__project__user=self.request.user)

    def perform_create(self, serializer):
        room = serializer.validated_data.get('room')
        if room.project.user != self.request.user:
            raise PermissionDenied("Siz ushbu xonaga radiator o‘rnata olmaysiz.")
        serializer.save()


class UnderfloorCircuitViewSet(viewsets.ModelViewSet):
    serializer_class = UnderfloorHeatingCircuitSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectOwner]

    def get_queryset(self):
        return UnderfloorHeatingCircuit.objects.filter(room__project__user=self.request.user)

    def perform_create(self, serializer):
        room = serializer.validated_data.get('room')
        if room.project.user != self.request.user:
            raise PermissionDenied("Siz ushbu xonaga issiq pol konturini qo‘sha olmaysiz.")
        serializer.save()


class ManifoldViewSet(viewsets.ModelViewSet):
    serializer_class = ManifoldSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectOwner]

    def get_queryset(self):
        return Manifold.objects.filter(project__user=self.request.user)

    def perform_create(self, serializer):
        project = serializer.validated_data.get('project')
        if project.user != self.request.user:
            raise PermissionDenied("Siz ushbu loyihaga kollektor qo‘sha olmaysiz.")
        serializer.save()
