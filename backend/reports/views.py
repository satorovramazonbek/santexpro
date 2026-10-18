from django.http import HttpResponse, Http404
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from projects.models import Project
from .pdf_generator import build_project_pdf


class ProjectPdfExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        try:
            project = Project.objects.prefetch_related(
                'rooms', 'rooms__windows', 'rooms__doors',
                'rooms__radiators', 'rooms__underfloor_circuits',
                'rooms__calculation_results', 'material_items'
            ).get(id=project_id, user=request.user)
        except Project.DoesNotExist:
            raise Http404("Loyiha topilmadi.")

        pdf_buffer = build_project_pdf(project)
        filename = f"SantexPro_{project.name.replace(' ', '_')}_{project.id}.pdf"

        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
