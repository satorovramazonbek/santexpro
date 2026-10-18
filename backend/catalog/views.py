from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import RadiatorCatalogItem, PipeSpecification, CatalogProduct
from .serializers import (
    RadiatorCatalogItemSerializer, 
    PipeSpecificationSerializer, 
    CatalogProductSerializer
)
from projects.models import Project
from materials.models import MaterialItem
from materials.serializers import MaterialItemSerializer


class IsAdminUserOrReadOnly(permissions.BasePermission):
    """
    Ruxsat klassi: Faqat tizim admini (is_staff) ma'lumotlarni o'zgartira yoki o'chira oladi.
    Boshqa barcha foydalanuvchilar faqat o'qishi (GET, HEAD, OPTIONS) mumkin.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class RadiatorCatalogViewSet(viewsets.ModelViewSet):
    queryset = RadiatorCatalogItem.objects.all()
    serializer_class = RadiatorCatalogItemSerializer
    permission_classes = [IsAdminUserOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['model_name', 'manufacturer']

    def get_queryset(self):
        qs = super().get_queryset()
        mfg = self.request.query_params.get('manufacturer')
        rad_type = self.request.query_params.get('radiator_type')
        if mfg:
            qs = qs.filter(manufacturer__iexact=mfg)
        if rad_type:
            qs = qs.filter(radiator_type=rad_type)
        return qs


class PipeSpecificationViewSet(viewsets.ModelViewSet):
    queryset = PipeSpecification.objects.all()
    serializer_class = PipeSpecificationSerializer
    permission_classes = [IsAdminUserOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        mat = self.request.query_params.get('material')
        if mat:
            qs = qs.filter(material=mat)
        return qs


class CatalogProductViewSet(viewsets.ModelViewSet):
    """
    API эндпоинт для профессионального каталога сантехники и отопления SantexPro.
    Поддерживает фильтрацию по 10 категориям, брендам, размерам, поиску по артикулу (SKU)
    и прямое добавление выбранного товара в смету материалов проекта пользователя.
    """
    serializer_class = CatalogProductSerializer
    permission_classes = [IsAdminUserOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'sku', 'manufacturer', 'model_name', 'material', 'nominal_size', 'description']
    ordering_fields = ['price_uzs', 'name', 'manufacturer', 'created_at']
    ordering = ['category', 'manufacturer', 'name']

    def get_queryset(self):
        qs = CatalogProduct.objects.all()
        params = self.request.query_params

        category = params.get('category')
        if category and category != 'all':
            qs = qs.filter(category=category)

        subcategory = params.get('subcategory')
        if subcategory:
            qs = qs.filter(subcategory=subcategory)

        manufacturer = params.get('manufacturer')
        if manufacturer:
            qs = qs.filter(manufacturer__iexact=manufacturer)

        nominal_size = params.get('nominal_size')
        if nominal_size:
            qs = qs.filter(nominal_size__icontains=nominal_size)

        is_verified = params.get('is_verified')
        if is_verified is not None:
            if is_verified.lower() in ('true', '1'):
                qs = qs.filter(is_verified=True)
            elif is_verified.lower() in ('false', '0'):
                qs = qs.filter(is_verified=False)

        is_available = params.get('is_available')
        if is_available is not None:
            if is_available.lower() in ('true', '1'):
                qs = qs.filter(is_available=True)
            elif is_available.lower() in ('false', '0'):
                qs = qs.filter(is_available=False)

        return qs


    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def add_to_project_materials(self, request, pk=None):
        """
        Добавление позиции из каталога напрямую в спецификацию/смету выбранного проекта пользователя.
        """
        product = self.get_object()
        project_id = request.data.get('project_id')
        try:
            quantity = float(request.data.get('quantity', 1.0))
            if quantity <= 0:
                quantity = 1.0
        except (ValueError, TypeError):
            quantity = 1.0

        if not project_id:
            return Response({'error': 'Не указан ID проекта (project_id)'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            project = Project.objects.get(id=project_id, user=request.user)
        except Project.DoesNotExist:
            return Response({'error': 'Проект не найден или у вас нет прав доступа к нему'}, status=status.HTTP_404_NOT_FOUND)

        # Сопоставление категории каталога с категорией сметы
        category_map = {
            'pipes': 'radiator_pipe',
            'fittings': 'fittings',
            'manifolds': 'manifold',
            'underfloor': 'insulation',
            'radiators': 'radiator',
            'valves': 'valve',
            'pumps_boilers': 'accessory',
            'water_drainage': 'accessory',
            'automation': 'valve',
            'insulation_mounting': 'insulation',
        }
        target_category = category_map.get(product.category, 'accessory')

        custom_notes = request.data.get('notes') or f"Каталог SantexPro: {product.manufacturer} (Арт. {product.sku})"

        material = MaterialItem.objects.create(
            project=project,
            category=target_category,
            name=product.name,
            unit=product.unit,
            quantity=quantity,
            unit_price_uzs=product.price_uzs,
            image_url=product.display_image,
            is_auto_generated=False,
            notes=custom_notes
        )

        return Response({
            'message': f"Товар '{product.name}' успешно добавлен в смету проекта.",
            'item': MaterialItemSerializer(material).data
        }, status=status.HTTP_201_CREATED)



from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.storage import default_storage
from django.conf import settings
import uuid


class ImageUploadView(APIView):
    """
    Rasm yuklash API: Santexnika jihozlari, radiatorlar, quvurlar rasmini yuklash (Faqat admin uchun)
    """
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file') or request.FILES.get('image')
        if not file_obj:
            return Response({'error': "Fayl topilmadi ('file' yoki 'image' parametri kutilmoqda)"}, status=400)

        # Rasm kengaytmasini tekshirish
        ext = file_obj.name.split('.')[-1].lower() if '.' in file_obj.name else ''
        if ext not in ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif']:
            return Response({'error': "Faqat rasm fayllari (jpg, png, webp, svg) qabul qilinadi"}, status=400)

        from django.utils.text import get_valid_filename
        clean_name = get_valid_filename(file_obj.name) or "catalog_image.jpg"
        filename = f"uploads/{uuid.uuid4().hex[:12]}_{clean_name}"
        saved_path = default_storage.save(filename, file_obj)
        image_url = f"{settings.MEDIA_URL}{saved_path}"

        return Response({
            'url': image_url,
            'filename': clean_name,
            'size': file_obj.size
        })
