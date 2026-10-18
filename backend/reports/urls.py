from django.urls import path
from .views import ProjectPdfExportView

urlpatterns = [
    path('project/<int:project_id>/pdf/', ProjectPdfExportView.as_view(), name='project_pdf_export'),
]
