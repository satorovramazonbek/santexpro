from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction
from django.core.files.storage import default_storage
from django.conf import settings
import uuid
from .models import MaterialItem
from .serializers import MaterialItemSerializer
from .generator import generate_project_materials
from projects.models import Project
from projects.permissions import IsProjectOwner


class MaterialItemViewSet(viewsets.ModelViewSet):
    serializer_class = MaterialItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectOwner]

    def get_queryset(self):
        project_id = self.request.query_params.get('project_id')
        queryset = MaterialItem.objects.filter(project__user=self.request.user)
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset

    def perform_create(self, serializer):
        project = serializer.validated_data.get('project')
        if project.user != self.request.user:
            raise PermissionDenied("Siz ushbu loyiha smetasiga element qo‘sha olmaysiz.")
        serializer.save()

    @action(detail=False, methods=['post'], url_path='generate/(?P<project_id>[^/.]+)')
    @transaction.atomic
    def generate(self, request, project_id=None):
        try:
            project = Project.objects.get(id=project_id, user=request.user)
        except Project.DoesNotExist:
            return Response({'error': "Loyiha topilmadi."}, status=status.HTTP_404_NOT_FOUND)

        items = generate_project_materials(project)
        serializer = MaterialItemSerializer(items, many=True)
        return Response({
            'message': "Materiallar smetasi avtomatik shakllantirildi.",
            'items': serializer.data,
            'total_cost_uzs': sum(float(i.total_price_uzs) for i in items)
        })

    @action(detail=False, methods=['post'], url_path='upload-image', parser_classes=[MultiPartParser, FormParser])
    def upload_image(self, request):
        file_obj = request.FILES.get('file') or request.FILES.get('image')
        if not file_obj:
            return Response({'error': "Fayl topilmadi ('file' yoki 'image' parametri kutilmoqda)"}, status=status.HTTP_400_BAD_REQUEST)

        ext = file_obj.name.split('.')[-1].lower() if '.' in file_obj.name else ''
        if ext not in ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif']:
            return Response({'error': "Faqat rasm fayllari (jpg, png, webp, svg) qabul qilinadi"}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils.text import get_valid_filename
        clean_name = get_valid_filename(file_obj.name) or "material_image.jpg"
        filename = f"materials/{uuid.uuid4().hex[:12]}_{clean_name}"
        saved_path = default_storage.save(filename, file_obj)
        image_url = f"{settings.MEDIA_URL}{saved_path}"

        return Response({
            'url': image_url,
            'filename': clean_name,
            'size': file_obj.size
        })
