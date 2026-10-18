from django.db import models
from projects.models import Project


class MaterialItem(models.Model):
    CATEGORIES = [
        ('radiator', 'Radiatorlar va kranlar'),
        ('underfloor_pipe', 'Issiq pol trubalari'),
        ('radiator_pipe', 'Isitish magistral trubalari'),
        ('manifold', 'Kollektorlar va shkaflar'),
        ('valve', 'Ventillar va termoregulyatorlar'),
        ('fittings', 'Fitinglar va ulovchilar'),
        ('insulation', 'Issiqlik izolyatsiyasi va dempfer lenta'),
        ('accessory', 'Qo‘shimcha montaj elementlari'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='material_items', verbose_name="Loyiha")
    category = models.CharField(max_length=50, choices=CATEGORIES, default='accessory', verbose_name="Kategoriya")
    name = models.CharField(max_length=200, verbose_name="Material nomi")
    unit = models.CharField(max_length=30, default='dona', verbose_name="O‘lchov birligi")
    quantity = models.FloatField(default=1.0, verbose_name="Miqdori")
    unit_price_uzs = models.DecimalField(max_digits=14, decimal_places=2, default=0.0, verbose_name="Birlik narxi (so‘m)")
    total_price_uzs = models.DecimalField(max_digits=14, decimal_places=2, default=0.0, verbose_name="Umumiy summasi (so‘m)")
    is_auto_generated = models.BooleanField(default=True, verbose_name="Avtomatik shakllantirilgan")
    notes = models.CharField(max_length=255, blank=True, verbose_name="Izoh")
    image = models.ImageField(upload_to='materials/', blank=True, null=True, verbose_name="Rasmi (fayl)")
    image_url = models.CharField(max_length=500, blank=True, default='', verbose_name="Rasm havolasi (URL)")

    @property
    def display_image(self):
        if self.image:
            try:
                return self.image.url
            except Exception:
                pass
        return self.image_url or ''

    class Meta:
        verbose_name = "Materiallar smetasi elementi"
        verbose_name_plural = "Materiallar smetasi"
        ordering = ['category', 'name']
        indexes = [
            models.Index(fields=['project', 'category']),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(quantity__gte=0), name='chk_mat_qty_gte_0'),
            models.CheckConstraint(condition=models.Q(unit_price_uzs__gte=0), name='chk_mat_unit_price_gte_0'),
        ]

    def save(self, *args, **kwargs):
        self.total_price_uzs = round(self.quantity * float(self.unit_price_uzs), 2)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} - {self.quantity} {self.unit} ({self.total_price_uzs} so‘m)"
