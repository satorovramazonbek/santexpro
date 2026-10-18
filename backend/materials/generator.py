"""
SantexPro Materiallar Smetasini Avtomatik Shakllantirish Moduli.
Loyihaning barcha xonalari, radiatorlari, issiq pol konturlari va kollektorlaridan
foydalanib to‘liq xarajatlar smetasini hisoblaydi.
"""

from typing import List, Dict, Any
from projects.models import Project
from materials.models import MaterialItem
from catalog.models import PipeSpecification


def generate_project_materials(project: Project) -> List[MaterialItem]:
    """
    Loyiha uchun materiallar smetasini to'liq yangilab shakllantirish.
    Eski avtomatik shakllantirilgan materiallar o'chiriladi, yangilari yaratiladi.
    """
    # Avtomatik yaratilganlarni tozalash (foydalanuvchi qo'lda qo'shganlari saqlanadi)
    project.material_items.filter(is_auto_generated=True).delete()

    created_items = []

    rooms = project.rooms.all().prefetch_related('radiators', 'underfloor_circuits', 'radiators__catalog_item')

    # 1. Radiatorlar va ularning komplektlari
    radiator_counts: Dict[str, Dict[str, Any]] = {}
    total_radiator_units = 0

    for room in rooms:
        for rad in room.radiators.all():
            qty = rad.quantity
            total_radiator_units += qty
            if rad.catalog_item:
                key = f"cat_{rad.catalog_item.id}"
                name = f"Radiator {rad.catalog_item.manufacturer} {rad.catalog_item.model_name}"
                price = float(rad.catalog_item.price_uzs) or 950000.0
                img = rad.catalog_item.display_image or 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=300&auto=format&fit=crop&q=80'
            else:
                key = f"cust_{rad.custom_model_name or 'custom'}"
                name = f"Radiator {rad.custom_model_name or 'Bimetall/Alyuminiy standart'}"
                price = 850000.0
                img = 'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?w=300&auto=format&fit=crop&q=80'

            if key not in radiator_counts:
                radiator_counts[key] = {'name': name, 'qty': 0, 'price': price, 'image_url': img}
            radiator_counts[key]['qty'] += qty

    for item in radiator_counts.values():
        created_items.append(MaterialItem.objects.create(
            project=project,
            category='radiator',
            name=item['name'],
            unit='dona',
            quantity=item['qty'],
            unit_price_uzs=item['price'],
            image_url=item['image_url'],
            is_auto_generated=True,
            notes="Xonalar hisobidan tanlangan"
        ))

    # Radiator ulanish komplektlari (har bir radiator uchun kranlar jufti + termogalovka)
    if total_radiator_units > 0:
        created_items.append(MaterialItem.objects.create(
            project=project,
            category='valve',
            name="Radiator uchun termostatik kran va qaytish klapani to‘plami (1/2\")",
            unit='to‘plam',
            quantity=total_radiator_units,
            unit_price_uzs=165000.0,
            image_url='https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&auto=format&fit=crop&q=80',
            is_auto_generated=True,
            notes="To‘g‘ri yoki burchakli radiator ventillari"
        ))
        created_items.append(MaterialItem.objects.create(
            project=project,
            category='radiator_pipe',
            name="Radiatorlarga ulanish quvuri PEX-A 16x2.0 mm (izolyatsiyada)",
            unit='metr',
            quantity=round(total_radiator_units * 8.0, 1),  # O'rtacha 8m har bir radiatorga
            unit_price_uzs=11500.0,
            image_url='https://images.unsplash.com/photo-1542013936693-884638332954?w=600&auto=format&fit=crop&q=80',
            is_auto_generated=True,
            notes="Uzatish va qaytish magistral trubasi"
        ))

    # 2. Issiq pol trubalari va izolyatsiyasi
    total_floor_pipe_m = 0.0
    total_heated_area_m2 = 0.0
    total_circuits = 0
    total_perimeter_m = 0.0

    for room in rooms:
        total_perimeter_m += 2 * (room.length + room.width)
        circuits = room.underfloor_circuits.all()
        for circ in circuits:
            total_circuits += 1
            total_floor_pipe_m += circ.total_length_m
            total_heated_area_m2 += circ.heated_area

    if total_floor_pipe_m > 0:
        # PEX truba metr narxi
        pipe_price = 8500.0
        created_items.append(MaterialItem.objects.create(
            project=project,
            category='underfloor_pipe',
            name="Issiq pol quvuri PEX-A / PE-RT 16x2.0 mm (kislorod to‘siqli EVOH)",
            unit='metr',
            quantity=round(total_floor_pipe_m * 1.05, 1),  # 5% qirqim zaxirasi
            unit_price_uzs=pipe_price,
            image_url='https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80',
            is_auto_generated=True,
            notes="5% montaj va kesim zaxirasi bilan"
        ))

        # Penopolistirol pol izolyatsiyasi
        created_items.append(MaterialItem.objects.create(
            project=project,
            category='insulation',
            name="Issiq pol uchun bossli izolyatsiya plitasi (penopolistirol EPS-30)",
            unit='m²',
            quantity=round(total_heated_area_m2 * 1.05, 1),
            unit_price_uzs=65000.0,
            image_url='https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&auto=format&fit=crop&q=80',
            is_auto_generated=True,
            notes="Truba mahkamlovchi pufakli qoplama"
        ))

        # Dempfer lenta (perimetr bo'yicha)
        created_items.append(MaterialItem.objects.create(
            project=project,
            category='insulation',
            name="Dempfer (chekka) lenta 8x150 mm",
            unit='metr',
            quantity=round(total_perimeter_m * 1.1, 1),
            unit_price_uzs=5000.0,
            image_url='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80',
            is_auto_generated=True,
            notes="Devor va styajka orasi kengayish kompensatori"
        ))

        # Yevrokonus fitinglar (har bir konturga 2 ta)
        created_items.append(MaterialItem.objects.create(
            project=project,
            category='fittings',
            name="Yevrokonus fiting 16 x 3/4\" (kollektorga ulovchi)",
            unit='dona',
            quantity=total_circuits * 2,
            unit_price_uzs=25000.0,
            image_url='https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80',
            is_auto_generated=True,
            notes="Uzatish va qaytish konturlariga"
        ))

        # Garpoon skobalar
        created_items.append(MaterialItem.objects.create(
            project=project,
            category='accessory',
            name="Truba mahkamlovchi plastmassa takel (skoba)",
            unit='dona',
            quantity=round(total_floor_pipe_m * 2.5),
            unit_price_uzs=250.0,
            image_url='https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=600&auto=format&fit=crop&q=80',
            is_auto_generated=True,
            notes="Trubani izolyatsiyaga qadash uchun"
        ))

    # 3. Kollektor guruhi
    if total_circuits > 0:
        created_items.append(MaterialItem.objects.create(
            project=project,
            category='manifold',
            name=f"Issiq pol taqsimlash kollektori {total_circuits} ta chiqishli (sarf o‘lchagichlar bilan)",
            unit='to‘plam',
            quantity=1,
            unit_price_uzs=180000.0 * total_circuits,
            image_url='https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=600&auto=format&fit=crop&q=80',
            is_auto_generated=True,
            notes="Rotametr va balansirovka ventillari bilan"
        ))
        created_items.append(MaterialItem.objects.create(
            project=project,
            category='manifold',
            name="Ichki o‘rnatiladigan kollektor shkafi (ShRV)",
            unit='dona',
            quantity=1,
            unit_price_uzs=350000.0,
            image_url='https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=600&auto=format&fit=crop&q=80',
            is_auto_generated=True,
            notes="Metall korpus qulfli"
        ))
        created_items.append(MaterialItem.objects.create(
            project=project,
            category='valve',
            name="Aralashtirish uzeli va aylanma nasos (nasosno-smesitelniy uzel)",
            unit='to‘plam',
            quantity=1,
            unit_price_uzs=1850000.0,
            image_url='https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=600&auto=format&fit=crop&q=80',
            is_auto_generated=True,
            notes="Issiq pol past haroratli suvini tayyorlash uchun"
        ))

    return created_items
