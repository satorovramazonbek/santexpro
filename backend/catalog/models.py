from django.db import models


class RadiatorCatalogItem(models.Model):
    RADIATOR_TYPES = [
        ('panel_22', 'Panelli 22-tur (2 ta konvektorli)'),
        ('panel_11', 'Panelli 11-tur (1 ta konvektorli)'),
        ('panel_33', 'Panelli 33-tur (3 ta konvektorli)'),
        ('sectional_aluminum', 'Alyuminiy seksiyali'),
        ('sectional_bimetal', 'Bimetall seksiyali'),
        ('tubular', 'Po‘lat quvurli'),
    ]

    manufacturer = models.CharField(max_length=100, verbose_name="Ishlab chiqaruvchi")
    model_name = models.CharField(max_length=150, verbose_name="Model nomi")
    radiator_type = models.CharField(max_length=50, choices=RADIATOR_TYPES, default='panel_22', verbose_name="Radiator turi")
    height_mm = models.IntegerField(verbose_name="Balandligi (mm)")
    length_mm = models.IntegerField(verbose_name="Uzunligi (mm)")
    depth_mm = models.IntegerField(verbose_name="Chuqurligi (mm)")
    rated_power_w = models.FloatField(verbose_name="Nominal quvvati (Vt, ΔT=50K)")
    rated_delta_t = models.FloatField(default=50.0, verbose_name="Nominal ΔT (K)")
    exponent_n = models.FloatField(default=1.30, verbose_name="Eksponent koeffitsiyenti (n)")
    water_volume_l = models.FloatField(default=4.0, verbose_name="Suv sig‘imi (litr)")
    weight_kg = models.FloatField(default=20.0, verbose_name="Vazni (kg)")
    price_uzs = models.DecimalField(max_digits=12, decimal_places=2, default=0.0, verbose_name="Narxi (so‘m)")
    image = models.ImageField(upload_to='radiators/', blank=True, null=True, verbose_name="Rasmi (fayl)")
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
        verbose_name = "Radiator katalogi"
        verbose_name_plural = "Radiatorlar katalogi"
        ordering = ['manufacturer', 'model_name']
        indexes = [
            models.Index(fields=['manufacturer', 'radiator_type']),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(rated_power_w__gt=0), name='chk_rad_rated_power_gt_0'),
            models.CheckConstraint(condition=models.Q(height_mm__gt=0), name='chk_rad_height_gt_0'),
            models.CheckConstraint(condition=models.Q(length_mm__gt=0), name='chk_rad_length_gt_0'),
        ]

    def __str__(self):
        return f"{self.manufacturer} {self.model_name} ({self.rated_power_w} Vt)"


class PipeSpecification(models.Model):
    PIPE_MATERIALS = [
        ('PEX-A', 'PEX-A (tikilgan polietilen)'),
        ('PERT', 'PE-RT (issiqlikka chidamli polietilen)'),
        ('multilayer', 'Metalloplastik (PE-RT/AL/PE-RT)'),
        ('PPR', 'Polipropilen (PPR)'),
        ('copper', 'Mis quvur'),
        ('steel', 'Po‘lat quvur'),
    ]

    name = models.CharField(max_length=100, verbose_name="Quvur nomi")
    material = models.CharField(max_length=50, choices=PIPE_MATERIALS, default='PEX-A', verbose_name="Material turi")
    nominal_dia_mm = models.FloatField(verbose_name="Tashqi nominal diametr (mm)")
    wall_thickness_mm = models.FloatField(verbose_name="Devor qalinligi (mm)")
    internal_dia_mm = models.FloatField(verbose_name="Ichki diametr (mm)")
    roughness_mm = models.FloatField(default=0.007, verbose_name="G‘adir-budurlik (mm)")
    max_temp_c = models.FloatField(default=95.0, verbose_name="Maksimal ishchi harorat (°C)")
    max_pressure_bar = models.FloatField(default=10.0, verbose_name="Maksimal bosim (bar)")
    price_per_meter_uzs = models.DecimalField(max_digits=12, decimal_places=2, default=0.0, verbose_name="Metr narxi (so‘m)")
    image = models.ImageField(upload_to='pipes/', blank=True, null=True, verbose_name="Rasmi (fayl)")
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
        verbose_name = "Quvur xususiyati"
        verbose_name_plural = "Quvurlar spetsifikatsiyasi"
        ordering = ['nominal_dia_mm']
        indexes = [
            models.Index(fields=['material', 'nominal_dia_mm']),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(nominal_dia_mm__gt=0), name='chk_pipe_nom_dia_gt_0'),
            models.CheckConstraint(condition=models.Q(internal_dia_mm__gt=0), name='chk_pipe_int_dia_gt_0'),
        ]

    def __str__(self):
        return f"{self.name} (Ø {self.nominal_dia_mm}x{self.wall_thickness_mm} mm)"


class CatalogProduct(models.Model):
    """
    Профессиональный каталог инженерной сантехники и отопительного оборудования SantexPro.
    Включает 10 ключевых категорий с заводскими техническими характеристиками, артикулами
    производителей (Valtec, Uponor, Rehau, Grundfos, Danfoss, Purmo, Ostendorf и др.)
    и нормативными параметрами (ГОСТ, EN).
    """
    CATEGORY_CHOICES = [
        ('pipes', 'Трубы (PPR, PEX-A, PE-RT, Металлопластик, Канализация)'),
        ('fittings', 'Фитинги и монтажные узлы (пресс, резьба, надвижные гильзы)'),
        ('manifolds', 'Коллекторы, смесительные узлы и шкафы (ШРВ/ШРН)'),
        ('underfloor', 'Оборудование для водяного тёплого пола (плиты, скобы, лента)'),
        ('radiators', 'Радиаторы отопления и комплектующие (панельные, биметалл)'),
        ('valves', 'Запорно-регулирующая арматура (краны, клапаны, фильтры, редукторы)'),
        ('pumps_boilers', 'Насосы и котельное оборудование (циркуляционные, баки, гидрострелки)'),
        ('water_drainage', 'Водоснабжение и канализация (трапы, сифоны, фасонные части)'),
        ('automation', 'Автоматика и управление (термостаты, сервоприводы, контроллеры)'),
        ('insulation_mounting', 'Теплоизоляция и крепёжные изделия (трубки, хомуты, герметики)'),
    ]

    name = models.CharField(max_length=255, verbose_name="Полное наименование")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, db_index=True, verbose_name="Категория")
    subcategory = models.CharField(max_length=100, blank=True, db_index=True, verbose_name="Подкатегория")
    manufacturer = models.CharField(max_length=100, db_index=True, verbose_name="Производитель (бренд)")
    model_name = models.CharField(max_length=150, verbose_name="Серия / Модель")
    sku = models.CharField(max_length=100, db_index=True, verbose_name="Артикул производителя (SKU)")

    nominal_size = models.CharField(max_length=100, blank=True, default='', verbose_name="Номинальный размер (DN/OD)")
    connection_type = models.CharField(max_length=100, blank=True, default='', verbose_name="Тип присоединения")
    material = models.CharField(max_length=150, blank=True, default='', verbose_name="Материал изделия")

    pn_bar = models.FloatField(null=True, blank=True, verbose_name="Номинальное давление PN (бар)")
    max_temp_c = models.FloatField(null=True, blank=True, verbose_name="Максимальная рабочая температура (°C)")
    kv_value = models.FloatField(null=True, blank=True, verbose_name="Пропускная способность Kv (м³/ч)")
    power_w = models.FloatField(null=True, blank=True, verbose_name="Тепловая мощность (Вт, ΔT=50K)")

    specifications = models.JSONField(default=dict, blank=True, verbose_name="Заводские характеристики (JSON)")
    unit = models.CharField(max_length=20, default='шт', verbose_name="Единица измерения")
    price_uzs = models.DecimalField(max_digits=14, decimal_places=2, default=0.0, verbose_name="Ориентировочная цена (сум)")

    is_available = models.BooleanField(default=True, verbose_name="Доступен к заказу")
    is_verified = models.BooleanField(default=True, verbose_name="Подтверждено паспортом производителя")
    datasheet_url = models.CharField(max_length=500, blank=True, default='', verbose_name="Ссылка на техпаспорт / PDF")

    image = models.ImageField(upload_to='products/', blank=True, null=True, verbose_name="Фотография изделия")
    image_url = models.CharField(max_length=500, blank=True, default='', verbose_name="URL изображения")
    description = models.TextField(blank=True, default='', verbose_name="Техническое описание и область применения")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата добавления")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")

    @property
    def display_image(self):
        if self.image:
            try:
                return self.image.url
            except Exception:
                pass
        return self.image_url or ''

    class Meta:
        verbose_name = "Товар каталога"
        verbose_name_plural = "Каталог продукции"
        ordering = ['category', 'manufacturer', 'model_name']
        indexes = [
            models.Index(fields=['category', 'manufacturer']),
            models.Index(fields=['category', 'subcategory']),
            models.Index(fields=['sku']),
        ]

    def __str__(self):
        return f"[{self.manufacturer}] {self.name} (Арт. {self.sku})"

