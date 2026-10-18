from rest_framework import permissions


class IsProjectOwner(permissions.BasePermission):
    """
    Foydalanuvchi faqat o‘ziga tegishli loyiha va uning xonalariga murojaat qila olishini ta’minlaydi.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        # Agar obyekt to'g'ridan-to'g'ri Project bo'lsa
        if hasattr(obj, 'user'):
            return obj.user == request.user

        # Agar obyekt Room, Manifold yoki MaterialItem bo'lsa
        if hasattr(obj, 'project'):
            return obj.project.user == request.user

        # Agar obyekt Window, Door, Wall, Radiator yoki UnderfloorHeatingCircuit bo'lsa
        if hasattr(obj, 'room'):
            return obj.room.project.user == request.user

        return False
