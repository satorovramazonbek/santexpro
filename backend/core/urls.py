from django.urls import path
from .views import RegisterView, LoginView, MeView, LogoutView, AdminUsersView, AdminSystemStatsView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('me/', MeView.as_view(), name='me'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('admin/users/', AdminUsersView.as_view(), name='admin_users'),
    path('admin/users/<int:pk>/', AdminUsersView.as_view(), name='admin_user_detail'),
    path('admin/stats/', AdminSystemStatsView.as_view(), name='admin_stats'),
]

