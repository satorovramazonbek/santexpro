from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MaterialItemViewSet

router = DefaultRouter()
router.register(r'items', MaterialItemViewSet, basename='material-item')

urlpatterns = [
    path('', include(router.urls)),
]
