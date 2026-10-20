from django.contrib import admin
from .models import (
    Project, Building, Floor, Room, Wall, Window, Door,
    Manifold, Radiator, UnderfloorHeatingCircuit, CalculationResult,
    PipeRoute, PipeSegment, PipeConnection, RoutingWaypoint
)

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'client_name', 'client_phone', 'updated_at')
    search_fields = ('name', 'client_name', 'address')

@admin.register(Floor)
class FloorAdmin(admin.ModelAdmin):
    list_display = ('id', 'project', 'floor_number', 'name', 'height_m')
    list_filter = ('floor_number',)

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('id', 'project', 'floor_number', 'name', 'length', 'width', 'area')
    list_filter = ('floor_number', 'project')

@admin.register(Manifold)
class ManifoldAdmin(admin.ModelAdmin):
    list_display = ('id', 'project', 'name', 'floor_number', 'outlets_count', 'position_x', 'position_y')

@admin.register(UnderfloorHeatingCircuit)
class CircuitAdmin(admin.ModelAdmin):
    list_display = ('id', 'room', 'circuit_number', 'name', 'heated_area', 'total_length_m')

@admin.register(PipeRoute)
class PipeRouteAdmin(admin.ModelAdmin):
    list_display = ('id', 'circuit', 'manifold', 'supply_length_m', 'return_length_m', 'total_length_m')

admin.site.register(Building)
admin.site.register(Wall)
admin.site.register(Window)
admin.site.register(Door)
admin.site.register(Radiator)
admin.site.register(CalculationResult)
admin.site.register(PipeSegment)
admin.site.register(PipeConnection)
admin.site.register(RoutingWaypoint)
