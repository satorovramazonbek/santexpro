from rest_framework import serializers
from .models import MaterialItem


class MaterialItemSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    display_image = serializers.ReadOnlyField()

    class Meta:
        model = MaterialItem
        fields = '__all__'
