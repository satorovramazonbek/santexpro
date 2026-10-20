from django.db import models
from django.contrib.auth.models import User
from catalog.models import RadiatorCatalogItem


class Project(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects', verbose_name="Foydalanuvchi")
    name = models.CharField(max_length=200, verbose_name="Loyiha nomi")
    address = models.CharField(max_length=255, blank=True, verbose_name="Obyekt manzili")
    client_name = models.CharField(max_length=150, blank=True, verbose_name="Mijoz ismi / Tashkilot")
    client_phone = models.CharField(max_length=50, blank=True, verbose_name="Telefon raqami")
    outdoor_design_temp = models.FloatField(default=-15.0, verbose_name="Tashqi hisobiy harorat (°C)")
    notes = models.TextField(blank=True, verbose_name="Eslatmalar va texnik topshiriq")
    is_archived = models.BooleanField(default=False, verbose_name="Arxivlangan")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan vaqt")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Tahrirlangan vaqt")

    class Meta:
        verbose_name = "Loyiha"
        verbose_name_plural = "Loyihalar"
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', '-updated_at']),
            models.Index(fields=['user', 'is_archived']),
        ]

    def __str__(self):
        return f"{self.name} ({self.client_name or 'Noma’lum'})"

    @property
    def total_rooms_count(self):
        return self.rooms.count()

    @property
    def total_area_m2(self):
        return sum(room.area for room in self.rooms.all())

    @property
    def total_heat_loss_w(self):
        total = 0.0
        for room in self.rooms.all():
            calc = room.calculation_results.filter(calculation_type='heat_loss').first()
            if calc and 'total_heat_loss_w' in calc.output_results:
                total += calc.output_results.get('total_heat_loss_w', 0.0)
        return round(total, 1)


class Building(models.Model):
    BUILDING_TYPES = [
        ('residential_house', 'Hovli uy / Kottej'),
        ('apartment', 'Ko‘p qavatli bino xonadoni'),
        ('commercial', 'Tijorat / Ofis binosi'),
        ('industrial', 'Sanoat / Ishlab chiqarish binosi'),
    ]

    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name='building', verbose_name="Loyiha")
    building_type = models.CharField(max_length=50, choices=BUILDING_TYPES, default='residential_house', verbose_name="Bino turi")
    floors_count = models.PositiveIntegerField(default=1, verbose_name="Qavatlar soni")
    climate_zone = models.CharField(max_length=100, default="tashkent", blank=True, verbose_name="Iqlim hududi")
    wall_material_description = models.CharField(max_length=200, default="Pishgan g‘isht (38 sm) + penopolistirol (5 sm)", verbose_name="Devor konstruksiyasi")
    ceiling_material_description = models.CharField(max_length=200, default="Temir-beton plita + 10 sm mineral vata", blank=True, verbose_name="Shift konstruksiyasi")
    floor_material_description = models.CharField(max_length=200, default="Beton stiajka + 5 sm penopleks (XPS)", blank=True, verbose_name="Pol konstruksiyasi")
    window_description = models.CharField(max_length=200, default="2-qavatli energiya tejamkor Low-E", blank=True, verbose_name="Oynalar tavsifi")
    wall_base_material = models.CharField(max_length=100, default="brick_380", blank=True, verbose_name="Asosiy devor materiali")
    insulation_material = models.CharField(max_length=100, default="eps", blank=True, verbose_name="Izolyatsiya materiali")
    insulation_thickness_mm = models.PositiveIntegerField(default=50, verbose_name="Devor izolyatsiyasi qalinligi (mm)")
    default_wall_u = models.FloatField(default=0.45, verbose_name="Devor U koeffitsiyenti (Vt/m²·K)")
    default_window_u = models.FloatField(default=1.8, verbose_name="Oyna U koeffitsiyenti (Vt/m²·K)")
    default_door_u = models.FloatField(default=2.0, verbose_name="Eshik U koeffitsiyenti (Vt/m²·K)")
    default_floor_u = models.FloatField(default=0.35, verbose_name="Pol U koeffitsiyenti (Vt/m²·K)")
    default_ceiling_u = models.FloatField(default=0.35, verbose_name="Shift U koeffitsiyenti (Vt/m²·K)")

    class Meta:
        verbose_name = "Bino xususiyati"
        verbose_name_plural = "Bino xususiyatlari"

    def __str__(self):
        return f"{self.project.name} - Bino parametrlari"


class Floor(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='floors', verbose_name="Loyiha")
    floor_number = models.IntegerField(default=1, verbose_name="Qavat raqami")
    name = models.CharField(max_length=100, default="1-qavat", verbose_name="Qavat nomi")
    height_m = models.FloatField(default=3.0, verbose_name="Shift balandligi (m)")
    elevation_m = models.FloatField(default=0.0, verbose_name="Nol sathidan balandligi (m)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Qavat"
        verbose_name_plural = "Qavatlar"
        ordering = ['floor_number']
        unique_together = [['project', 'floor_number']]

    def __str__(self):
        return f"{self.project.name} - {self.name}"


class Room(models.Model):
    HEATING_PREFERENCES = [
        ('combined', 'Aralash (Radiator + Issiq pol)'),
        ('radiator_only', 'Faqat radiator'),
        ('underfloor_only', 'Faqat issiq pol'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='rooms', verbose_name="Loyiha")
    floor = models.ForeignKey(Floor, on_delete=models.SET_NULL, null=True, blank=True, related_name='rooms', verbose_name="Bog'langan qavat")
    name = models.CharField(max_length=150, verbose_name="Xona nomi")
    floor_number = models.IntegerField(default=1, verbose_name="Qavati")
    position_x = models.FloatField(default=0.0, blank=True, verbose_name="X koordinata (m)")
    position_y = models.FloatField(default=0.0, blank=True, verbose_name="Y koordinata (m)")
    length = models.FloatField(default=5.0, verbose_name="Uzunligi (m)")
    width = models.FloatField(default=4.0, verbose_name="Kengligi (m)")
    height = models.FloatField(default=3.0, verbose_name="Shift balandligi (m)")
    area = models.FloatField(default=20.0, verbose_name="Maydoni (m²)")
    volume = models.FloatField(default=60.0, verbose_name="Hajmi (m³)")
    exterior_walls_count = models.IntegerField(default=1, verbose_name="Tashqi devorlar soni")
    desired_temp = models.FloatField(default=22.0, verbose_name="Istalgan harorat (°C)")
    has_heated_above = models.BooleanField(default=True, verbose_name="Yuqori qavat isitiladimi")
    has_heated_below = models.BooleanField(default=True, verbose_name="Pastki qavat isitiladimi")
    air_change_rate = models.FloatField(default=0.8, verbose_name="Havo almashinuvi (marta/soat)")
    wall_u_value = models.FloatField(default=0.45, verbose_name="Devor U koeffitsiyenti (Vt/m²·K)")
    floor_u_value = models.FloatField(default=0.35, verbose_name="Pol U koeffitsiyenti (Vt/m²·K)")
    ceiling_u_value = models.FloatField(default=0.35, verbose_name="Shift U koeffitsiyenti (Vt/m²·K)")
    heating_preference = models.CharField(max_length=30, choices=HEATING_PREFERENCES, default='combined', verbose_name="Isitish usuli")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Xona"
        verbose_name_plural = "Xonalar"
        ordering = ['floor_number', 'name']
        indexes = [
            models.Index(fields=['project', 'floor_number']),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(length__gt=0), name='chk_room_length_gt_0'),
            models.CheckConstraint(condition=models.Q(width__gt=0), name='chk_room_width_gt_0'),
            models.CheckConstraint(condition=models.Q(height__gt=0), name='chk_room_height_gt_0'),
            models.CheckConstraint(condition=models.Q(area__gt=0), name='chk_room_area_gt_0'),
        ]

    def save(self, *args, **kwargs):
        self.area = round(self.length * self.width, 2)
        self.volume = round(self.area * self.height, 2)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.project.name} - {self.name} ({self.area} m²)"


class Wall(models.Model):
    WALL_ORIENTATIONS = [
        ('N', 'Shimoliy (Shimol)'),
        ('E', 'Sharqiy (Sharq)'),
        ('S', 'Janubiy (Janub)'),
        ('W', 'G‘arbiy (G‘arb)'),
    ]

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='walls', verbose_name="Xona")
    shared_with_room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='shared_walls', verbose_name="Umumiy qo‘shni xona")
    wall_index = models.PositiveSmallIntegerField(default=0, verbose_name="Devor indeksi (0-3)")
    orientation = models.CharField(max_length=2, choices=WALL_ORIENTATIONS, default='N', verbose_name="Yo‘nalishi")
    length = models.FloatField(verbose_name="Uzunligi (m)")
    is_exterior = models.BooleanField(default=True, verbose_name="Tashqi devor")
    u_value = models.FloatField(default=0.45, verbose_name="U koeffitsiyenti (Vt/m²·K)")

    class Meta:
        verbose_name = "Devor"
        verbose_name_plural = "Devorlar"
        ordering = ['wall_index']
        indexes = [
            models.Index(fields=['room', 'wall_index']),
        ]


class Window(models.Model):
    GLAZING_CHOICES = [
        ('single', 'Oddiy bir qavatli oyna (U=5.2)'),
        ('double_standard', 'Ikki qavatli standart oynapaket (U=2.2)'),
        ('double_low_e', 'Ikki qavatli energiya tejamkor Low-E (U=1.4)'),
        ('triple', 'Uch qavatli oynapaket (U=1.1)'),
    ]

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='windows', verbose_name="Xona")
    name = models.CharField(max_length=100, default="Deraza 1", verbose_name="Nomi")
    wall_index = models.PositiveSmallIntegerField(default=0, verbose_name="O‘rnatilgan devor (0-3)")
    position_along_wall = models.FloatField(default=1.0, verbose_name="Devor bo‘ylab o‘rni (m)")
    width = models.FloatField(default=1.5, verbose_name="Kengligi (m)")
    height = models.FloatField(default=1.4, verbose_name="Balandligi (m)")
    glazing_type = models.CharField(max_length=50, choices=GLAZING_CHOICES, default='double_standard', verbose_name="Oynapaket turi")
    u_value = models.FloatField(default=1.8, verbose_name="U koeffitsiyenti (Vt/m²·K)")

    @property
    def area(self):
        return round(self.width * self.height, 2)

    class Meta:
        verbose_name = "Deraza"
        verbose_name_plural = "Derazalar"
        indexes = [
            models.Index(fields=['room', 'wall_index']),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(width__gt=0), name='chk_window_width_gt_0'),
            models.CheckConstraint(condition=models.Q(height__gt=0), name='chk_window_height_gt_0'),
        ]


class Door(models.Model):
    DOOR_TYPES = [
        ('exterior_main', 'Bosh kirish eshigi (U=1.8)'),
        ('exterior_insulated', 'Tashqi metall/plastik izolyatsiyalangan eshik (U=1.8)'),
        ('exterior_wood', 'Tashqi yog‘och eshik (U=2.5)'),
        ('balcony_glass', 'Balkon plastik shisha eshigi (U=1.6)'),
        ('interior', 'Ichki xonalararo eshik (U=0.0)'),
    ]

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='doors', verbose_name="Xona")
    name = models.CharField(max_length=100, default="Eshik 1", verbose_name="Nomi")
    wall_index = models.PositiveSmallIntegerField(default=2, verbose_name="O‘rnatilgan devor (0-3)")
    position_along_wall = models.FloatField(default=1.0, verbose_name="Devor bo‘ylab o‘rni (m)")
    width = models.FloatField(default=0.9, verbose_name="Kengligi (m)")
    height = models.FloatField(default=2.1, verbose_name="Balandligi (m)")
    door_type = models.CharField(max_length=50, choices=DOOR_TYPES, default='interior', verbose_name="Eshik turi")
    opening_direction = models.CharField(max_length=30, default='inward_right', blank=True, verbose_name="Ochilish yo‘nalishi")
    u_value = models.FloatField(default=2.0, verbose_name="U koeffitsiyenti (Vt/m²·K)")

    @property
    def area(self):
        return round(self.width * self.height, 2)

    class Meta:
        verbose_name = "Eshik"
        verbose_name_plural = "Eshiklar"
        indexes = [
            models.Index(fields=['room', 'wall_index']),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(width__gt=0), name='chk_door_width_gt_0'),
            models.CheckConstraint(condition=models.Q(height__gt=0), name='chk_door_height_gt_0'),
        ]


class Manifold(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='manifolds', verbose_name="Loyiha")
    floor = models.ForeignKey(Floor, on_delete=models.SET_NULL, null=True, blank=True, related_name='manifolds', verbose_name="Bog'langan qavat")
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='manifolds', verbose_name="O‘rnatilgan xona")
    name = models.CharField(max_length=100, default="Kollektor shkafi 1", verbose_name="Kollektor nomi")
    floor_number = models.IntegerField(default=1, verbose_name="Qavati")
    position_x = models.FloatField(default=0.5, verbose_name="X koordinata (m)")
    position_y = models.FloatField(default=0.5, verbose_name="Y koordinata (m)")
    outlets_count = models.PositiveIntegerField(default=4, verbose_name="Chiqishlar (konturlar) soni")
    pipe_diameter_mm = models.FloatField(default=25.0, verbose_name="Asosiy quvur diametri (mm)")
    model_name = models.CharField(max_length=150, default="Uponor Vario S / Valtec VTc.594", blank=True, verbose_name="Kollektor modeli")

    class Meta:
        verbose_name = "Kollektor"
        verbose_name_plural = "Kollektorlar"

    def __str__(self):
        return f"{self.name} ({self.outlets_count} kontur)"


class Radiator(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='radiators', verbose_name="Xona")
    catalog_item = models.ForeignKey(RadiatorCatalogItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='installations', verbose_name="Katalogdagi model")
    custom_model_name = models.CharField(max_length=150, blank=True, verbose_name="Maxsus model nomi")
    custom_rated_power_w = models.FloatField(null=True, blank=True, verbose_name="Maxsus nominal quvvat (Vt)")
    quantity = models.PositiveIntegerField(default=1, verbose_name="Soni (dona)")
    wall_index = models.PositiveSmallIntegerField(default=0, verbose_name="Devor indeksi")
    position_x = models.FloatField(default=1.5, verbose_name="X koordinata (m)")
    position_y = models.FloatField(default=0.1, verbose_name="Y koordinata (m)")
    t_supply = models.FloatField(default=75.0, verbose_name="Uzatish harorati (°C)")
    t_return = models.FloatField(default=65.0, verbose_name="Qaytish harorati (°C)")
    calculated_actual_power_w = models.FloatField(default=0.0, verbose_name="Hisoblangan haqiqiy quvvati (Vt)")

    class Meta:
        verbose_name = "Xona radiatori"
        verbose_name_plural = "Xona radiatorlari"
        indexes = [
            models.Index(fields=['room', 'wall_index']),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(quantity__gte=1), name='chk_radiator_qty_gte_1'),
        ]


class UnderfloorHeatingCircuit(models.Model):
    PATTERNS = [
        ('spiral', 'Chig‘anoq (spiral / улитка)'),
        ('serpentine', 'Ilon izi (serpentine / змейка)'),
    ]

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='underfloor_circuits', verbose_name="Xona")
    manifold = models.ForeignKey(Manifold, on_delete=models.SET_NULL, null=True, blank=True, related_name='circuits', verbose_name="Ulanadigan kollektor")
    manifold_port_index = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name="Kollektor chiqishi raqami")
    circuit_number = models.PositiveIntegerField(default=1, verbose_name="Kontur tartib raqami")
    name = models.CharField(max_length=100, default="1-kontur", verbose_name="Kontur nomi")
    heated_area = models.FloatField(default=20.0, verbose_name="Isitiladigan maydon (m²)")
    spacing_mm = models.IntegerField(default=150, verbose_name="Truba qadami (mm)")
    pipe_diameter_mm = models.FloatField(default=16.0, verbose_name="Quvur tashqi diametri (mm)")
    pipe_wall_mm = models.FloatField(default=2.0, verbose_name="Devor qalinligi (mm)")
    pipe_material = models.CharField(max_length=50, default='PEX-A', verbose_name="Quvur materiali")
    pattern = models.CharField(max_length=30, choices=PATTERNS, default='spiral', verbose_name="Sxema turi")
    floor_length_m = models.FloatField(default=120.0, verbose_name="Pol ichidagi uzunligi (m)")
    manifold_lead_in_m = models.FloatField(default=6.0, verbose_name="Kollektorgacha uzatish/qaytish (m)")
    total_length_m = models.FloatField(default=126.0, verbose_name="Umumiy truba uzunligi (m)")
    color_hex = models.CharField(max_length=20, default='#2563EB', verbose_name="Chizmadagi rangi")
    path_points = models.JSONField(default=list, blank=True, verbose_name="2D truba koordinatalari")
    supply_path_points = models.JSONField(default=list, blank=True, verbose_name="Qizil uzatish trubasi (T11)")
    return_path_points = models.JSONField(default=list, blank=True, verbose_name="Ko‘k qaytish trubasi (T12)")
    feeder_supply_points = models.JSONField(default=list, blank=True, verbose_name="Kollektordan uzatish yo‘li (T11)")
    feeder_return_points = models.JSONField(default=list, blank=True, verbose_name="Kollektorga qaytish yo‘li (T12)")
    is_locked = models.BooleanField(default=False, verbose_name="Bloklangan")

    class Meta:
        verbose_name = "Issiq pol konturi"
        verbose_name_plural = "Issiq pol konturlari"
        ordering = ['circuit_number']
        indexes = [
            models.Index(fields=['room', 'circuit_number']),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(total_length_m__gte=0), name='chk_circuit_length_gte_0'),
        ]


class PipeRoute(models.Model):
    circuit = models.OneToOneField(UnderfloorHeatingCircuit, on_delete=models.CASCADE, related_name='route', verbose_name="Kontur")
    manifold = models.ForeignKey(Manifold, on_delete=models.SET_NULL, null=True, blank=True, related_name='pipe_routes', verbose_name="Kollektor")
    supply_length_m = models.FloatField(default=0.0, verbose_name="Uzatish trubasi uzunligi (m)")
    return_length_m = models.FloatField(default=0.0, verbose_name="Qaytish trubasi uzunligi (m)")
    total_length_m = models.FloatField(default=0.0, verbose_name="Umumiy uzunlik (m)")
    is_manual_override = models.BooleanField(default=False, verbose_name="Qo‘lda tahrirlangan")
    routing_metadata = models.JSONField(default=dict, blank=True, verbose_name="Qo‘shimcha marshrut ma'lumotlari")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Quvur marshruti"
        verbose_name_plural = "Quvur marshrutlari"

    def __str__(self):
        return f"{self.circuit.name} marshruti ({self.total_length_m} m)"


class PipeSegment(models.Model):
    SEGMENT_TYPES = [
        ('coil_supply', 'Pol ichidagi uzatish (T11)'),
        ('coil_return', 'Pol ichidagi qaytish (T12)'),
        ('feeder_supply', 'Kollektordan uzatish magistrali'),
        ('feeder_return', 'Kollektorga qaytish magistrali'),
        ('conduit_sleeve', 'Gofrali himoya gilzasi (Gofra Ø20)'),
    ]

    route = models.ForeignKey(PipeRoute, on_delete=models.CASCADE, related_name='segments', verbose_name="Marshrut")
    segment_type = models.CharField(max_length=30, choices=SEGMENT_TYPES, default='coil_supply', verbose_name="Segment turi")
    start_x_mm = models.FloatField(verbose_name="Boshlanish X (mm)")
    start_y_mm = models.FloatField(verbose_name="Boshlanish Y (mm)")
    end_x_mm = models.FloatField(verbose_name="Tugash X (mm)")
    end_y_mm = models.FloatField(verbose_name="Tugash Y (mm)")
    diameter_mm = models.FloatField(default=16.0, verbose_name="Quvur tashqi diametri (mm)")
    length_m = models.FloatField(default=0.0, verbose_name="Uzunligi (m)")
    has_corrugation_sleeve = models.BooleanField(default=False, verbose_name="Himoya gofrasi bormi")
    sequence_order = models.PositiveIntegerField(default=0, verbose_name="Tartib raqami")

    class Meta:
        verbose_name = "Quvur segmenti"
        verbose_name_plural = "Quvur segmentlari"
        ordering = ['sequence_order']


class PipeConnection(models.Model):
    CONNECTION_TYPES = [
        ('manifold_supply_port', 'Kollektor uzatish chiqishi'),
        ('manifold_return_port', 'Kollektor qaytish chiqishi'),
        ('circuit_inlet', 'Kontur kirish nuqtasi'),
        ('circuit_outlet', 'Kontur chiqish nuqtasi'),
        ('doorway_pass', 'Eshik o‘rni orqali o‘tish'),
        ('wall_penetration', 'Devor orqali o‘tish gilzasi'),
    ]

    route = models.ForeignKey(PipeRoute, on_delete=models.CASCADE, related_name='connections', verbose_name="Marshrut")
    connection_type = models.CharField(max_length=40, choices=CONNECTION_TYPES, verbose_name="Ulanish turi")
    position_x_mm = models.FloatField(verbose_name="X koordinata (mm)")
    position_y_mm = models.FloatField(verbose_name="Y koordinata (mm)")
    description = models.CharField(max_length=150, blank=True, verbose_name="Izoh / Markirovka")

    class Meta:
        verbose_name = "Quvur ulanish nuqtasi"
        verbose_name_plural = "Quvur ulanish nuqtalari"


class RoutingWaypoint(models.Model):
    route = models.ForeignKey(PipeRoute, on_delete=models.CASCADE, related_name='waypoints', verbose_name="Marshrut")
    x_mm = models.FloatField(verbose_name="X koordinata (mm)")
    y_mm = models.FloatField(verbose_name="Y koordinata (mm)")
    order = models.PositiveIntegerField(default=0, verbose_name="Tartib")
    is_locked = models.BooleanField(default=False, verbose_name="Qulflangan nuqta")
    point_type = models.CharField(max_length=20, default='feeder_supply', verbose_name="Nuqta turi")

    class Meta:
        verbose_name = "Marshrut oraliq nuqtasi"
        verbose_name_plural = "Marshrut oraliq nuqtalari"
        ordering = ['order']


class CalculationResult(models.Model):
    CALC_TYPES = [
        ('heat_loss', 'Issiqlik yo‘qotilishi'),
        ('radiator', 'Radiator quvvati va tanlovi'),
        ('underfloor', 'Issiq pol hisobi'),
        ('hydraulics', 'Gidravlik hisob'),
        ('full', 'To‘liq xona hisobi'),
    ]

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='calculation_results', verbose_name="Xona")
    calculation_type = models.CharField(max_length=50, choices=CALC_TYPES, verbose_name="Hisob turi")
    input_parameters = models.JSONField(verbose_name="Kiritilgan parametrlar")
    output_results = models.JSONField(verbose_name="Hisoblash natijalari")
    assumptions = models.JSONField(default=list, verbose_name="Qabul qilingan farazlar va me’yorlar")
    warnings = models.JSONField(default=list, verbose_name="Ogohlantirishlar va tavsiyalar")
    calculation_version = models.CharField(max_length=20, default='1.0.0', verbose_name="Hisob algoritmi versiyasi")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Hisoblangan vaqt")

    class Meta:
        verbose_name = "Hisoblash natijasi"
        verbose_name_plural = "Hisoblash natijalari"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['room', 'calculation_type', '-created_at']),
        ]
