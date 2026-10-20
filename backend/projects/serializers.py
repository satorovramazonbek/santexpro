from rest_framework import serializers
from .models import (
    Project, Building, Floor, Room, Wall, Window, Door,
    Manifold, Radiator, UnderfloorHeatingCircuit, CalculationResult,
    PipeRoute, PipeSegment, PipeConnection, RoutingWaypoint
)
from catalog.serializers import RadiatorCatalogItemSerializer


class FloorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Floor
        fields = '__all__'


class PipeSegmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipeSegment
        fields = '__all__'


class PipeConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipeConnection
        fields = '__all__'


class RoutingWaypointSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoutingWaypoint
        fields = '__all__'


class PipeRouteSerializer(serializers.ModelSerializer):
    segments = PipeSegmentSerializer(many=True, read_only=True)
    connections = PipeConnectionSerializer(many=True, read_only=True)
    waypoints = RoutingWaypointSerializer(many=True, read_only=True)

    class Meta:
        model = PipeRoute
        fields = '__all__'


class WindowSerializer(serializers.ModelSerializer):
    area = serializers.FloatField(read_only=True)
    glazing_type_display = serializers.CharField(source='get_glazing_type_display', read_only=True)

    class Meta:
        model = Window
        fields = '__all__'

    def validate(self, attrs):
        width = attrs.get('width', getattr(self.instance, 'width', None))
        height = attrs.get('height', getattr(self.instance, 'height', None))
        pos = attrs.get('position_along_wall', getattr(self.instance, 'position_along_wall', None))
        u_val = attrs.get('u_value', getattr(self.instance, 'u_value', None))
        if width is not None and width <= 0:
            raise serializers.ValidationError({'width': "Deraza kengligi noldan katta bo‘lishi kerak."})
        if height is not None and height <= 0:
            raise serializers.ValidationError({'height': "Deraza balandligi noldan katta bo‘lishi kerak."})
        if pos is not None and pos < 0:
            raise serializers.ValidationError({'position_along_wall': "Deraza joylashuvi manfiy bo‘lishi mumkin emas."})
        if u_val is not None and u_val <= 0:
            raise serializers.ValidationError({'u_value': "U-koeffitsiyenti noldan katta bo‘lishi kerak."})
        return attrs


class DoorSerializer(serializers.ModelSerializer):
    area = serializers.FloatField(read_only=True)
    door_type_display = serializers.CharField(source='get_door_type_display', read_only=True)

    class Meta:
        model = Door
        fields = '__all__'

    def validate(self, attrs):
        width = attrs.get('width', getattr(self.instance, 'width', None))
        height = attrs.get('height', getattr(self.instance, 'height', None))
        pos = attrs.get('position_along_wall', getattr(self.instance, 'position_along_wall', None))
        if width is not None and width <= 0:
            raise serializers.ValidationError({'width': "Eshik kengligi noldan katta bo‘lishi kerak."})
        if height is not None and height <= 0:
            raise serializers.ValidationError({'height': "Eshik balandligi noldan katta bo‘lishi kerak."})
        if pos is not None and pos < 0:
            raise serializers.ValidationError({'position_along_wall': "Eshik joylashuvi manfiy bo‘lishi mumkin emas."})
        return attrs


class WallSerializer(serializers.ModelSerializer):
    orientation_display = serializers.CharField(source='get_orientation_display', read_only=True)

    class Meta:
        model = Wall
        fields = '__all__'


class RadiatorSerializer(serializers.ModelSerializer):
    catalog_item_details = RadiatorCatalogItemSerializer(source='catalog_item', read_only=True)

    class Meta:
        model = Radiator
        fields = '__all__'


class UnderfloorHeatingCircuitSerializer(serializers.ModelSerializer):
    pattern_display = serializers.CharField(source='get_pattern_display', read_only=True)
    route = PipeRouteSerializer(read_only=True)

    class Meta:
        model = UnderfloorHeatingCircuit
        fields = '__all__'


class ManifoldSerializer(serializers.ModelSerializer):
    circuits = UnderfloorHeatingCircuitSerializer(many=True, read_only=True)

    class Meta:
        model = Manifold
        fields = '__all__'


class CalculationResultSerializer(serializers.ModelSerializer):
    calculation_type_display = serializers.CharField(source='get_calculation_type_display', read_only=True)

    class Meta:
        model = CalculationResult
        fields = '__all__'


class RoomSerializer(serializers.ModelSerializer):
    windows = WindowSerializer(many=True, read_only=True)
    doors = DoorSerializer(many=True, read_only=True)
    walls = WallSerializer(many=True, read_only=True)
    radiators = RadiatorSerializer(many=True, read_only=True)
    underfloor_circuits = UnderfloorHeatingCircuitSerializer(many=True, read_only=True)
    calculation_results = CalculationResultSerializer(many=True, read_only=True)
    manifolds = ManifoldSerializer(many=True, read_only=True)

    class Meta:
        model = Room
        fields = '__all__'

    def validate(self, attrs):
        length = attrs.get('length', getattr(self.instance, 'length', None))
        width = attrs.get('width', getattr(self.instance, 'width', None))
        height = attrs.get('height', getattr(self.instance, 'height', None))
        if length is not None and length <= 0:
            raise serializers.ValidationError({'length': "Xona uzunligi noldan katta bo‘lishi kerak."})
        if width is not None and width <= 0:
            raise serializers.ValidationError({'width': "Xona kengligi noldan katta bo‘lishi kerak."})
        if height is not None and height <= 0:
            raise serializers.ValidationError({'height': "Xona balandligi noldan katta bo‘lishi kerak."})
        ext_walls = attrs.get('exterior_walls_count', getattr(self.instance, 'exterior_walls_count', None))
        if ext_walls is not None and (ext_walls < 1 or ext_walls > 4):
            raise serializers.ValidationError({'exterior_walls_count': "Tashqi devorlar soni 1 dan 4 gacha bo‘lishi kerak."})
        temp = attrs.get('desired_temp', getattr(self.instance, 'desired_temp', None))
        if temp is not None and (temp < 5 or temp > 45):
            raise serializers.ValidationError({'desired_temp': "Istalgan xona harorati 5°C dan 45°C gacha bo‘lishi kerak."})
        return attrs


class BuildingSerializer(serializers.ModelSerializer):
    building_type_display = serializers.CharField(source='get_building_type_display', read_only=True)

    class Meta:
        model = Building
        fields = '__all__'


class ProjectListSerializer(serializers.ModelSerializer):
    total_rooms_count = serializers.IntegerField(read_only=True)
    total_area_m2 = serializers.FloatField(read_only=True)
    total_heat_loss_w = serializers.FloatField(read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'address', 'client_name', 'client_phone',
            'outdoor_design_temp', 'notes', 'is_archived',
            'total_rooms_count', 'total_area_m2', 'total_heat_loss_w',
            'created_at', 'updated_at'
        ]


class ProjectDetailSerializer(serializers.ModelSerializer):
    building = BuildingSerializer(read_only=True)
    floors = FloorSerializer(many=True, read_only=True)
    rooms = RoomSerializer(many=True, read_only=True)
    manifolds = ManifoldSerializer(many=True, read_only=True)
    total_rooms_count = serializers.IntegerField(read_only=True)
    total_area_m2 = serializers.FloatField(read_only=True)
    total_heat_loss_w = serializers.FloatField(read_only=True)

    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['user']
