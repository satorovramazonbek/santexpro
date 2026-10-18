from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve
from .health import health_check_view
from .views import api_root_view

urlpatterns = [
    path('', api_root_view, name='api_root'),
    path('admin/', admin.site.urls),
    path('api/health/', health_check_view, name='health_check'),
    path('api/auth/', include('core.urls')),
    path('api/catalog/', include('catalog.urls')),
    path('api/projects/', include('projects.urls')),
    path('api/materials/', include('materials.urls')),
    path('api/reports/', include('reports.urls')),
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]


