from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RadiatorCatalogViewSet, PipeSpecificationViewSet, CatalogProductViewSet, ImageUploadView

router = DefaultRouter()
router.register(r'radiators', RadiatorCatalogViewSet, basename='radiator-catalog')
router.register(r'pipes', PipeSpecificationViewSet, basename='pipe-specification')
router.register(r'products', CatalogProductViewSet, basename='catalog-product')

urlpatterns = [
    path('upload-image/', ImageUploadView.as_view(), name='catalog-upload-image'),
    path('', include(router.urls)),
]

