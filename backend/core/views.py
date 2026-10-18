from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data,
                'message': "Muvaffaqiyatli ro‘yxatdan o‘tdingiz."
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data,
                'message': "Tizimga muvaffaqiyatli kirdingiz."
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'user': UserSerializer(request.user).data
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            request.user.auth_token.delete()
        except Exception:
            pass
        return Response({'message': "Tizimdan muvaffaqiyatli chiqildi."}, status=status.HTTP_200_OK)


class AdminUsersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': "Faqat tizim administratorlari uchun ruxsat berilgan."}, status=status.HTTP_403_FORBIDDEN)
        from django.contrib.auth.models import User
        users = User.objects.all().order_by('-date_joined')
        return Response(UserSerializer(users, many=True).data)

    def patch(self, request, pk=None):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': "Faqat tizim administratorlari uchun ruxsat berilgan."}, status=status.HTTP_403_FORBIDDEN)
        from django.contrib.auth.models import User
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': "Foydalanuvchi topilmadi."}, status=status.HTTP_404_NOT_FOUND)

        if 'is_active' in request.data:
            new_active = bool(request.data['is_active'])
            if user == request.user and not new_active:
                return Response({'error': "Administrator o‘z hisobini bloklay olmaydi."}, status=status.HTTP_400_BAD_REQUEST)
            user.is_active = new_active
        if 'is_staff' in request.data and request.user.is_superuser:
            user.is_staff = bool(request.data['is_staff'])
        user.save()
        return Response(UserSerializer(user).data)


class AdminSystemStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': "Faqat tizim administratorlari uchun ruxsat berilgan."}, status=status.HTTP_403_FORBIDDEN)
        from django.contrib.auth.models import User
        from projects.models import Project, Room
        from catalog.models import RadiatorCatalogItem, PipeSpecification
        from materials.models import MaterialItem

        total_users = User.objects.count()
        total_projects = Project.objects.count()
        total_rooms = Room.objects.count()
        total_radiators = RadiatorCatalogItem.objects.count()
        total_pipes = PipeSpecification.objects.count()
        total_materials = MaterialItem.objects.count()

        total_heat_demand = sum(p.total_heat_loss_w for p in Project.objects.filter(is_archived=False))

        return Response({
            'total_users': total_users,
            'total_projects': total_projects,
            'total_rooms': total_rooms,
            'total_radiators_catalog': total_radiators,
            'total_pipes_catalog': total_pipes,
            'total_materials_items': total_materials,
            'total_heat_demand_kw': round(total_heat_demand / 1000.0, 2),
        })

