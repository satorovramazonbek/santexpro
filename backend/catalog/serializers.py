from rest_framework import serializers
from .models import RadiatorCatalogItem, PipeSpecification, CatalogProduct


class RadiatorCatalogItemSerializer(serializers.ModelSerializer):
    radiator_type_display = serializers.CharField(source='get_radiator_type_display', read_only=True)
    display_image = serializers.ReadOnlyField()

    class Meta:
        model = RadiatorCatalogItem
        fields = '__all__'


class PipeSpecificationSerializer(serializers.ModelSerializer):
    material_display = serializers.CharField(source='get_material_display', read_only=True)
    display_image = serializers.ReadOnlyField()

    class Meta:
        model = PipeSpecification
        fields = '__all__'


class CatalogProductSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    display_image = serializers.ReadOnlyField()

    class Meta:
        model = CatalogProduct
        fields = '__all__'

