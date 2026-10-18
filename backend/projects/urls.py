from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProjectViewSet, RoomViewSet, WindowViewSet, DoorViewSet,
    WallViewSet, RadiatorViewSet, UnderfloorCircuitViewSet, ManifoldViewSet
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'windows', WindowViewSet, basename='window')
router.register(r'doors', DoorViewSet, basename='door')
router.register(r'walls', WallViewSet, basename='wall')
router.register(r'radiators', RadiatorViewSet, basename='radiator')
router.register(r'underfloor-circuits', UnderfloorCircuitViewSet, basename='underfloor-circuit')
router.register(r'manifolds', ManifoldViewSet, basename='manifold')

urlpatterns = [
    path('', include(router.urls)),
]
