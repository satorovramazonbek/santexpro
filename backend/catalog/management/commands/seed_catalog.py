from django.core.management.base import BaseCommand
from catalog.models import RadiatorCatalogItem, PipeSpecification, CatalogProduct


class Command(BaseCommand):
    help = "SantexPro: заполнение базы данных сертифицированной продукцией по 10 инженерным категориям"

    def handle(self, *args, **options):
        # 1. Радиаторы (Legacy модель для обратной совместимости)
        radiators_data = [
            {
                'manufacturer': 'Korado',
                'model_name': 'Radik Klasik 22 500x800',
                'radiator_type': 'panel_22',
                'height_mm': 500,
                'length_mm': 800,
                'depth_mm': 100,
                'rated_power_w': 1544.0,
                'rated_delta_t': 50.0,
                'exponent_n': 1.30,
                'water_volume_l': 4.3,
                'weight_kg': 22.5,
                'price_uzs': 850000.0,
                'image_url': 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=400&auto=format&fit=crop&q=80',
            },
            {
                'manufacturer': 'Korado',
                'model_name': 'Radik Klasik 22 500x1000',
                'radiator_type': 'panel_22',
                'height_mm': 500,
                'length_mm': 1000,
                'depth_mm': 100,
                'rated_power_w': 1930.0,
                'rated_delta_t': 50.0,
                'exponent_n': 1.30,
                'water_volume_l': 5.4,
                'weight_kg': 28.1,
                'price_uzs': 1050000.0,
                'image_url': 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=400&auto=format&fit=crop&q=80',
            },
            {
                'manufacturer': 'Korado',
                'model_name': 'Radik Klasik 22 500x1200',
                'radiator_type': 'panel_22',
                'height_mm': 500,
                'length_mm': 1200,
                'depth_mm': 100,
                'rated_power_w': 2316.0,
                'rated_delta_t': 50.0,
                'exponent_n': 1.30,
                'water_volume_l': 6.5,
                'weight_kg': 33.7,
                'price_uzs': 1250000.0,
                'image_url': 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=400&auto=format&fit=crop&q=80',
            },
            {
                'manufacturer': 'Korado',
                'model_name': 'Radik Klasik 11 500x1000',
                'radiator_type': 'panel_11',
                'height_mm': 500,
                'length_mm': 1000,
                'depth_mm': 63,
                'rated_power_w': 1032.0,
                'rated_delta_t': 50.0,
                'exponent_n': 1.28,
                'water_volume_l': 2.8,
                'weight_kg': 15.6,
                'price_uzs': 720000.0,
                'image_url': 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=400&auto=format&fit=crop&q=80',
            },
            {
                'manufacturer': 'Purmo',
                'model_name': 'Compact 22 500x1000',
                'radiator_type': 'panel_22',
                'height_mm': 500,
                'length_mm': 1000,
                'depth_mm': 102,
                'rated_power_w': 1907.0,
                'rated_delta_t': 50.0,
                'exponent_n': 1.31,
                'water_volume_l': 5.2,
                'weight_kg': 27.8,
                'price_uzs': 1100000.0,
                'image_url': 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=400&auto=format&fit=crop&q=80',
            },
            {
                'manufacturer': 'Purmo',
                'model_name': 'Compact 22 500x1400',
                'radiator_type': 'panel_22',
                'height_mm': 500,
                'length_mm': 1400,
                'depth_mm': 102,
                'rated_power_w': 2670.0,
                'rated_delta_t': 50.0,
                'exponent_n': 1.31,
                'water_volume_l': 7.3,
                'weight_kg': 39.0,
                'price_uzs': 1500000.0,
                'image_url': 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=400&auto=format&fit=crop&q=80',
            },
            {
                'manufacturer': 'Global',
                'model_name': 'VOX EXTRA 500 (10 seksiya)',
                'radiator_type': 'sectional_aluminum',
                'height_mm': 590,
                'length_mm': 800,
                'depth_mm': 95,
                'rated_power_w': 1930.0,
                'rated_delta_t': 50.0,
                'exponent_n': 1.32,
                'water_volume_l': 4.4,
                'weight_kg': 14.5,
                'price_uzs': 1400000.0,
                'image_url': 'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?w=400&auto=format&fit=crop&q=80',
            },
            {
                'manufacturer': 'Global',
                'model_name': 'Style Plus 500 Bimetall (10 seksiya)',
                'radiator_type': 'sectional_bimetal',
                'height_mm': 575,
                'length_mm': 800,
                'depth_mm': 95,
                'rated_power_w': 1850.0,
                'rated_delta_t': 50.0,
                'exponent_n': 1.31,
                'water_volume_l': 1.9,
                'weight_kg': 19.5,
                'price_uzs': 1750000.0,
                'image_url': 'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?w=400&auto=format&fit=crop&q=80',
            },
            {
                'manufacturer': 'Shivaki',
                'model_name': 'Prestige 500 Bimetall (10 seksiya)',
                'radiator_type': 'sectional_bimetal',
                'height_mm': 565,
                'length_mm': 800,
                'depth_mm': 80,
                'rated_power_w': 1780.0,
                'rated_delta_t': 50.0,
                'exponent_n': 1.30,
                'water_volume_l': 2.1,
                'weight_kg': 18.0,
                'price_uzs': 1350000.0,
                'image_url': 'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?w=400&auto=format&fit=crop&q=80',
            },
            {
                'manufacturer': 'Royal Thermo',
                'model_name': 'Revolution Bimetall 500 (10 секций)',
                'radiator_type': 'sectional_bimetal',
                'height_mm': 570,
                'length_mm': 800,
                'depth_mm': 80,
                'rated_power_w': 1680.0,
                'rated_delta_t': 50.0,
                'exponent_n': 1.31,
                'water_volume_l': 2.05,
                'weight_kg': 17.5,
                'price_uzs': 1550000.0,
                'image_url': 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=400&auto=format&fit=crop&q=80',
            },
        ]

        for item in radiators_data:
            RadiatorCatalogItem.objects.update_or_create(
                manufacturer=item['manufacturer'],
                model_name=item['model_name'],
                defaults=item
            )

        # 2. Трубы (Legacy модель)
        pipes_data = [
            {
                'name': 'PEX-A kislorod to‘siqli (EVOH) 16x2.0 mm',
                'material': 'PEX-A',
                'nominal_dia_mm': 16.0,
                'wall_thickness_mm': 2.0,
                'internal_dia_mm': 12.0,
                'roughness_mm': 0.007,
                'max_temp_c': 95.0,
                'max_pressure_bar': 10.0,
                'price_per_meter_uzs': 9500.0,
                'image_url': 'https://images.unsplash.com/photo-1542013936693-884638332954?w=400&auto=format&fit=crop&q=80',
            },
            {
                'name': 'PE-RT II avlod 16x2.0 mm issiq pol trubasi',
                'material': 'PERT',
                'nominal_dia_mm': 16.0,
                'wall_thickness_mm': 2.0,
                'internal_dia_mm': 12.0,
                'roughness_mm': 0.007,
                'max_temp_c': 90.0,
                'max_pressure_bar': 8.0,
                'price_per_meter_uzs': 7500.0,
                'image_url': 'https://images.unsplash.com/photo-1542013936693-884638332954?w=400&auto=format&fit=crop&q=80',
            },
            {
                'name': 'PEX-A kislorod to‘siqli 20x2.0 mm',
                'material': 'PEX-A',
                'nominal_dia_mm': 20.0,
                'wall_thickness_mm': 2.0,
                'internal_dia_mm': 16.0,
                'roughness_mm': 0.007,
                'max_temp_c': 95.0,
                'max_pressure_bar': 10.0,
                'price_per_meter_uzs': 14500.0,
                'image_url': 'https://images.unsplash.com/photo-1542013936693-884638332954?w=400&auto=format&fit=crop&q=80',
            },
            {
                'name': 'Metalloplastik PE-RT/AL/PE-RT 26x3.0 mm',
                'material': 'multilayer',
                'nominal_dia_mm': 26.0,
                'wall_thickness_mm': 3.0,
                'internal_dia_mm': 20.0,
                'roughness_mm': 0.007,
                'max_temp_c': 95.0,
                'max_pressure_bar': 10.0,
                'price_per_meter_uzs': 22000.0,
                'image_url': 'https://images.unsplash.com/photo-1542013936693-884638332954?w=400&auto=format&fit=crop&q=80',
            },
            {
                'name': 'Polipropilen (PPR) shisha tolali 32x4.4 mm magistral',
                'material': 'PPR',
                'nominal_dia_mm': 32.0,
                'wall_thickness_mm': 4.4,
                'internal_dia_mm': 23.2,
                'roughness_mm': 0.010,
                'max_temp_c': 90.0,
                'max_pressure_bar': 20.0,
                'price_per_meter_uzs': 18000.0,
                'image_url': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&auto=format&fit=crop&q=80',
            },
        ]

        for item in pipes_data:
            PipeSpecification.objects.update_or_create(
                name=item['name'],
                defaults=item
            )

        # 3. Полный профессиональный каталог инженерной сантехники SantexPro (10 категорий)
        products_data = [
            # ==========================================
            # 1. ТРУБЫ (pipes)
            # ==========================================
            {
                'name': 'Труба из сшитого полиэтилена Valtec PEX-EVOH 16x2.0 мм',
                'category': 'pipes',
                'subcategory': 'pex_pipe',
                'manufacturer': 'Valtec',
                'model_name': 'PEX-EVOH',
                'sku': 'VP1620.3',
                'nominal_size': 'Ø16×2.0 мм',
                'connection_type': 'Пресс / Надвижная гильза / Евроконус',
                'material': 'Сшитый полиэтилен PE-Xb с антидиффузионным слоем EVOH',
                'pn_bar': 10.0,
                'max_temp_c': 95.0,
                'unit': 'м',
                'price_uzs': 9200.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VP1620.pdf',
                'image_url': 'https://images.unsplash.com/photo-1542013936693-884638332954?w=400&auto=format&fit=crop&q=80',
                'description': 'Труба предназначена для систем водяного теплого пола и радиаторного отопления. Кислородный барьер EVOH предотвращает коррозию котлового оборудования.',
                'specifications': {
                    'standard': 'ГОСТ 32415-2013 / EN ISO 15875',
                    'inner_diameter_mm': 12.0,
                    'roughness_mm': 0.007,
                    'linear_expansion_coeff': '0.00015 1/°C',
                    'coil_length_m': 200,
                    'warranty_years': 10
                }
            },
            {
                'name': 'Труба Uponor Comfort Pipe PLUS PE-Xa 16x2.0 мм',
                'category': 'pipes',
                'subcategory': 'pex_pipe',
                'manufacturer': 'Uponor',
                'model_name': 'Comfort Pipe PLUS',
                'sku': '1062044',
                'nominal_size': 'Ø16×2.0 мм',
                'connection_type': 'Uponor Q&E / Евроконус G 3/4"',
                'material': 'Сшитый полиэтилен высокой плотности PE-Xa',
                'pn_bar': 6.0,
                'max_temp_c': 90.0,
                'unit': 'м',
                'price_uzs': 14800.0,
                'is_verified': True,
                'datasheet_url': 'https://www.uponor.com/technical/comfort-pipe-plus',
                'image_url': 'https://images.unsplash.com/photo-1542013936693-884638332954?w=400&auto=format&fit=crop&q=80',
                'description': 'Премиальная труба с памятью формы (эффект термической памяти Энгеля). Предназначена для напольного и панельного отопления.',
                'specifications': {
                    'standard': 'EN ISO 15875-2 / DIN 4726',
                    'density_g_cm3': 0.938,
                    'crosslinking_degree': '> 70%',
                    'bend_radius_min_mm': 80,
                    'coil_length_m': 240
                }
            },
            {
                'name': 'Универсальная труба Rehau RAUTITAN flex 16x2.2 мм',
                'category': 'pipes',
                'subcategory': 'pex_pipe',
                'manufacturer': 'Rehau',
                'model_name': 'RAUTITAN flex',
                'sku': '130121-002',
                'nominal_size': 'Ø16×2.2 мм',
                'connection_type': 'Соединение на надвижной гильзе RAUTITAN PX',
                'material': 'Сшитый полиэтилен PE-Xa пероксидной сшивки',
                'pn_bar': 10.0,
                'max_temp_c': 90.0,
                'unit': 'м',
                'price_uzs': 18500.0,
                'is_verified': True,
                'datasheet_url': 'https://www.rehau.com/rautitan-flex-technical',
                'image_url': 'https://images.unsplash.com/photo-1542013936693-884638332954?w=400&auto=format&fit=crop&q=80',
                'description': 'Универсальная полимерная труба для систем радиаторного отопления и питьевого водоснабжения без применения уплотнительных колец.',
                'specifications': {
                    'standard': 'DIN EN ISO 15875',
                    'color': 'Серебристый RAL 9006',
                    'inner_diameter_mm': 11.6,
                    'coil_length_m': 100
                }
            },
            {
                'name': 'Металлополимерная труба Valtec PEX-AL-PEX 20x2.0 мм',
                'category': 'pipes',
                'subcategory': 'multilayer_pipe',
                'manufacturer': 'Valtec',
                'model_name': 'PEX-AL-PEX',
                'sku': 'V1620',
                'nominal_size': 'Ø20×2.0 мм',
                'connection_type': 'Пресс / Обжим',
                'material': 'Пятислойная труба PE-Xb/AL/PE-Xb со сплошным алюминиевым слоем',
                'pn_bar': 10.0,
                'max_temp_c': 95.0,
                'unit': 'м',
                'price_uzs': 14200.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/V1620.pdf',
                'image_url': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&auto=format&fit=crop&q=80',
                'description': 'Металлопластиковая труба со 100% кислородонепроницаемостью и минимальным температурным удлинением. Держит форму при изгибе.',
                'specifications': {
                    'standard': 'ГОСТ Р 53630-2015',
                    'aluminum_thickness_mm': 0.25,
                    'bend_radius_manual_mm': 100,
                    'inner_diameter_mm': 16.0
                }
            },
            {
                'name': 'Труба полипропиленовая PP-R 100 армированная стекловолокном Valtec 25x3.5 мм',
                'category': 'pipes',
                'subcategory': 'ppr_pipe',
                'manufacturer': 'Valtec',
                'model_name': 'VTp.700.FB20',
                'sku': 'VTp.700.FB20.25',
                'nominal_size': 'Ø25×3.5 мм',
                'connection_type': 'Полифузионная сварка (раструбная)',
                'material': 'Полипропилен PP-R 100 / Glass Fiber / PP-R',
                'pn_bar': 20.0,
                'max_temp_c': 90.0,
                'unit': 'м',
                'price_uzs': 13500.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VTp700.pdf',
                'image_url': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&auto=format&fit=crop&q=80',
                'description': 'Не требует зачистки при сварке. Стекловолоконный компаунд снижает температурное линейное расширение в 3 раза по сравнению со стандартным PPR.',
                'specifications': {
                    'standard': 'ГОСТ 32415-2013',
                    'length_per_bar_m': 4.0,
                    'inner_diameter_mm': 18.0
                }
            },
            {
                'name': 'Труба бесшумная канализационная Ostendorf Skolan SAFE DN 110/1000 мм',
                'category': 'pipes',
                'subcategory': 'sewer_pipe',
                'manufacturer': 'Ostendorf',
                'model_name': 'Skolan SAFE',
                'sku': '335030',
                'nominal_size': 'DN 110 (L=1000 мм)',
                'connection_type': 'Раструбное с двухлепестковым уплотнителем',
                'material': 'Минерализованный полипропилен высокой плотности PP-MD',
                'pn_bar': 0.5,
                'max_temp_c': 95.0,
                'unit': 'шт',
                'price_uzs': 115000.0,
                'is_verified': True,
                'datasheet_url': 'https://ostendorf-kunststoffe.com/skolan-safe',
                'image_url': 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&auto=format&fit=crop&q=80',
                'description': 'Толстостенная бесшумная труба звукоизолирующей внутренней канализации. Уровень шума не превышает 17 дБ при расходе 4 л/с.',
                'specifications': {
                    'standard': 'DIN EN 14366 / DIN EN 1451-1',
                    'wall_thickness_mm': 5.3,
                    'sound_level_db': '17 dB(A)',
                    'density_g_cm3': 1.6
                }
            },

            # ==========================================
            # 2. ФИТИНГИ И МОНТАЖ (fittings)
            # ==========================================
            {
                'name': 'Тройник равнопроходной пресс Valtec VTm.231.N 16x16x16 мм',
                'category': 'fittings',
                'subcategory': 'press_fittings',
                'manufacturer': 'Valtec',
                'model_name': 'VTm.231.N',
                'sku': 'VTm.231.N.001616',
                'nominal_size': '16×16×16 мм',
                'connection_type': 'Пресс-клещи профиль TH',
                'material': 'Латунь сантехническая никелированная CW617N, гильза AISI 304',
                'pn_bar': 25.0,
                'max_temp_c': 115.0,
                'unit': 'шт',
                'price_uzs': 38000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VTm231.pdf',
                'image_url': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80',
                'description': 'Пресс-тройник для металлополимерных и полимерных труб PEX. Оборудован пластиковым фиксирующим кольцом и двумя уплотнительными кольцами EPDM.',
                'specifications': {
                    'profile': 'TH',
                    'ring_material': 'EPDM ShA 70',
                    'standard': 'ГОСТ 32415-2013'
                }
            },
            {
                'name': 'Муфта соединительная с надвижной гильзой Rehau RAUTITAN PX 16-16',
                'category': 'fittings',
                'subcategory': 'axial_fittings',
                'manufacturer': 'Rehau',
                'model_name': 'RAUTITAN PX',
                'sku': '11600111001',
                'nominal_size': '16×16 мм',
                'connection_type': 'Аксиальная запрессовка с надвижной гильзой',
                'material': 'Полимер высокопрочный PVDF',
                'pn_bar': 10.0,
                'max_temp_c': 95.0,
                'unit': 'шт',
                'price_uzs': 29000.0,
                'is_verified': True,
                'datasheet_url': 'https://www.rehau.com/rautitan-fittings',
                'image_url': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80',
                'description': 'Неразъемное фитинговое соединение с гильзой без уплотнительных резинок. Разрешено к замоноличиванию в бетонные стяжки и стены.',
                'specifications': {
                    'material_body': 'Поливинилиденфторид (PVDF)',
                    'certificate': 'DVGW DW-8501AU2335',
                    'flow_resistance_reduced': True
                }
            },
            {
                'name': 'Угольник пресс 90° с наружной резьбой Valtec VTm.253.N 16x1/2"',
                'category': 'fittings',
                'subcategory': 'press_fittings',
                'manufacturer': 'Valtec',
                'model_name': 'VTm.253.N',
                'sku': 'VTm.253.N.001604',
                'nominal_size': '16 мм × 1/2" HP',
                'connection_type': 'Пресс TH / Наружная цилиндрическая трубная резьба G',
                'material': 'Латунь CW617N никелированная',
                'pn_bar': 25.0,
                'max_temp_c': 115.0,
                'unit': 'шт',
                'price_uzs': 34000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VTm253.pdf',
                'image_url': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80',
                'description': 'Переходной пресс-уголок для подсоединения полимерных трубопроводов к радиаторным узлам и коллекторам.',
                'specifications': {
                    'thread_standard': 'ГОСТ 6357-81 / ISO 228',
                    'body': 'Кованая латунь CW617N'
                }
            },
            {
                'name': 'Фитинг Евроконус Valtec VT.4410.NE для труб PEX 16x2.0 мм',
                'category': 'fittings',
                'subcategory': 'compression_fittings',
                'manufacturer': 'Valtec',
                'model_name': 'VT.4410.NE',
                'sku': 'VT.4410.NE.16',
                'nominal_size': '16×2.0 мм — 3/4" Евроконус',
                'connection_type': 'Накидная гайка Eurocone G 3/4" конусное уплотнение',
                'material': 'Латунь CW617N с кольцом EPDM и обжимным разрезным кольцом',
                'pn_bar': 10.0,
                'max_temp_c': 110.0,
                'unit': 'шт',
                'price_uzs': 24000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VT4410.pdf',
                'image_url': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80',
                'description': 'Специализированный соединитель для подключения петель теплого пола к штуцерам распределительного коллектора.',
                'specifications': {
                    'thread': 'G 3/4" Eurokonus',
                    'seal': 'Двойное EPDM'
                }
            },

            # ==========================================
            # 3. КОЛЛЕКТОРЫ И ШКАФЫ (manifolds)
            # ==========================================
            {
                'name': 'Коллекторный блок из нержавеющей стали с расходомерами Valtec VTc.505.SS 1" на 4 выхода',
                'category': 'manifolds',
                'subcategory': 'manifold_block',
                'manufacturer': 'Valtec',
                'model_name': 'VTc.505.SS',
                'sku': 'VTc.505.SS.0604',
                'nominal_size': '1" ВР × 4 выхода 3/4" Евроконус',
                'connection_type': 'Внутренняя резьба G 1" / Выходы Eurocone 3/4"',
                'material': 'Нержавеющая аустенитная сталь AISI 304',
                'pn_bar': 10.0,
                'max_temp_c': 90.0,
                'kv_value': 2.75,
                'unit': 'компл',
                'price_uzs': 720000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VTc505SS.pdf',
                'image_url': 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=400&auto=format&fit=crop&q=80',
                'description': 'Коллекторная пара в сборе: подающий коллектор с регулировочными ротаметрами (0.5–5 л/мин), обратный коллектор с термостатическими клапанами под сервоприводы M30x1.5, кронштейны со звукоизолирующими прокладками.',
                'specifications': {
                    'ports_count': 4,
                    'center_distance_mm': 210,
                    'flowmeter_range_l_min': '0.5 - 5.0',
                    'actuator_thread': 'M30x1.5'
                }
            },
            {
                'name': 'Коллекторный блок из нержавеющей стали с расходомерами Uponor Vario S 1" на 6 выходов',
                'category': 'manifolds',
                'subcategory': 'manifold_block',
                'manufacturer': 'Uponor',
                'model_name': 'Vario S',
                'sku': '1086576',
                'nominal_size': '1" ВР × 6 выходов 3/4" Евроконус',
                'connection_type': 'Резьба G 1" ВР / G 3/4" HP Eurocone',
                'material': 'Нержавеющая сталь марки EN 1.4301',
                'pn_bar': 6.0,
                'max_temp_c': 70.0,
                'unit': 'компл',
                'price_uzs': 1180000.0,
                'is_verified': True,
                'datasheet_url': 'https://www.uponor.com/vario-s-datasheet',
                'image_url': 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=400&auto=format&fit=crop&q=80',
                'description': 'Премиальный блок для теплого пола с высокоточными балансировочными расходомерами и ручными клапанами регулировки контуров.',
                'specifications': {
                    'ports_count': 6,
                    'port_spacing_mm': 50,
                    'warranty_years': 5
                }
            },
            {
                'name': 'Насосно-смесительный узел для тёплого пола Valtec COMBIMIX с насосом Grundfos',
                'category': 'manifolds',
                'subcategory': 'mixing_unit',
                'manufacturer': 'Valtec',
                'model_name': 'COMBIMIX',
                'sku': 'VT.COMBI.0.180',
                'nominal_size': 'Подключение 1" НР, монтажная база насоса 180 мм',
                'connection_type': 'Наружная трубная резьба G 1"',
                'material': 'Латунь сантехническая никелированная CW617N',
                'pn_bar': 10.0,
                'max_temp_c': 90.0,
                'power_w': 15000.0,
                'unit': 'компл',
                'price_uzs': 2450000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VT_COMBI.pdf',
                'image_url': 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=400&auto=format&fit=crop&q=80',
                'description': 'Обеспечивает поддержание пониженной температуры теплоносителя в диапазоне 20–60 °С для контуров теплого пола при высокотемпературном котловом источнике. Тепловая мощность до 15–20 кВт.',
                'specifications': {
                    'temperature_control_range_c': '20 - 60',
                    'pump_base_mm': 180,
                    'max_area_served_m2': 180,
                    'thermometer_dials_count': 2
                }
            },
            {
                'name': 'Шкаф коллекторный встроенный ШРВ-2 (750x670x120 мм)',
                'category': 'manifolds',
                'subcategory': 'manifold_cabinet',
                'manufacturer': 'Valtec',
                'model_name': 'ШРВ-2',
                'sku': 'VT.542.N.02',
                'nominal_size': '750×670×120 мм (Ш×В×Г)',
                'connection_type': 'Монтаж в стеновую нишу с регулировкой по высоте и глубине',
                'material': 'Оцинкованная листовая сталь 0.8 мм с порошковой покраской RAL 9016',
                'unit': 'шт',
                'price_uzs': 380000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VT542.pdf',
                'image_url': 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=400&auto=format&fit=crop&q=80',
                'description': 'Встраиваемый шкаф для скрытого размещения распределительных гребенок на 4–7 выходов и смесительного узла. Оснащен замком.',
                'specifications': {
                    'width_mm': 750,
                    'height_mm': 670,
                    'depth_adjustable_mm': '120 - 180',
                    'coating': 'Порошковая эмаль полиэфирная'
                }
            },

            # ==========================================
            # 4. ТЁПЛЫЙ ПОЛ ОБОРУДОВАНИЕ (underfloor)
            # ==========================================
            {
                'name': 'Теплоизоляционная плита с бобышками для тёплого пола EPS-30 (1000x500x45 мм)',
                'category': 'underfloor',
                'subcategory': 'insulation_board',
                'manufacturer': 'Valtec',
                'model_name': 'VT.FT.01',
                'sku': 'VT.FT.01.1005',
                'nominal_size': '1000×500 мм (S=0.5 м²), толщина основания 20 мм, полная 45 мм',
                'connection_type': 'Замковое соединение «шип-паз» по периметру',
                'material': 'Пенополистирол формованный высокой плотности EPS-30 с пленочным гидробарьером',
                'unit': 'м²',
                'price_uzs': 68000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VT_FT01.pdf',
                'image_url': 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&auto=format&fit=crop&q=80',
                'description': 'Плита с бобышками обеспечивает точный шаг укладки труб 16 и 20 мм (шаг 50 мм, прямолинейная и диагональная раскладка) без применения скоб и сетки.',
                'specifications': {
                    'pipe_diameters_mm': '16, 20',
                    'grid_pitch_mm': 50,
                    'thermal_conductivity_w_mk': 0.034,
                    'compressive_strength_kpa': 150
                }
            },
            {
                'name': 'Лента демпферная пристенная с полиэтиленовым фартуком 8x150 мм (25 м)',
                'category': 'underfloor',
                'subcategory': 'damper_tape',
                'manufacturer': 'Valtec',
                'model_name': 'VT.DE.150',
                'sku': 'VT.DE.150.25',
                'nominal_size': 'Ширина 150 мм, толщина 8 мм, рулон 25 м',
                'connection_type': 'Пристенный монтаж с самоклеящейся полосой',
                'material': 'Вспененный полиэтилен (НПЭ) с защитным фартуком',
                'unit': 'м',
                'price_uzs': 4500.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VT_DE.pdf',
                'image_url': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&auto=format&fit=crop&q=80',
                'description': 'Компенсирует температурные расширения бетонной стяжки теплого пола, предотвращая растрескивание плитки и штукатурки. Фартук герметизирует стык со стеной.',
                'specifications': {
                    'roll_length_m': 25,
                    'apron_width_mm': 100,
                    'adhesive_layer': True
                }
            },
            {
                'name': 'Скобы гарпунные якорные для такера 42 мм (упаковка 1000 шт)',
                'category': 'underfloor',
                'subcategory': 'tacker_clips',
                'manufacturer': 'Uponor',
                'model_name': 'Tacker Clip',
                'sku': '1086529',
                'nominal_size': 'Длина 42 мм, под трубы Ø14–20 мм',
                'connection_type': 'Монтаж с помощью монтажного такера-пистолета',
                'material': 'Ударопрочный полипропилен с двойным боковым зацепом',
                'unit': 'упак',
                'price_uzs': 120000.0,
                'is_verified': True,
                'datasheet_url': 'https://www.uponor.com/tacker-clips-datasheet',
                'image_url': 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=400&auto=format&fit=crop&q=80',
                'description': 'Скобы скреплены в ленты по 25–50 штук под стандартный такер. Надежно фиксируют трубу к теплоизоляционному слою до заливки раствора.',
                'specifications': {
                    'pack_quantity': 1000,
                    'clip_length_mm': 42,
                    'pullout_resistance_n': '> 45 N'
                }
            },

            # ==========================================
            # 5. РАДИАТОРЫ И КОМПЛЕКТУЮЩИЕ (radiators)
            # ==========================================
            {
                'name': 'Радиатор стальной панельный Korado Radik Klasik 22 500x1000 мм',
                'category': 'radiators',
                'subcategory': 'panel_radiators',
                'manufacturer': 'Korado',
                'model_name': 'Radik Klasik 22',
                'sku': '22050100-50-0010',
                'nominal_size': 'Высота 500 мм, длина 1000 мм, глубина 100 мм',
                'connection_type': 'Боковое подключение 4 × G 1/2" ВР',
                'material': 'Высококачественная листовая сталь толщиной 1.25 мм',
                'pn_bar': 10.0,
                'max_temp_c': 110.0,
                'power_w': 1930.0,
                'unit': 'шт',
                'price_uzs': 1050000.0,
                'is_verified': True,
                'datasheet_url': 'https://www.korado.cz/produkty/radik/radik-klasik.html',
                'image_url': 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=400&auto=format&fit=crop&q=80',
                'description': 'Двухпанельный стальной радиатор с двумя конвекторами типа 22. Проверен на испытательном давлении 13 бар по европейскому стандарту EN 442.',
                'specifications': {
                    'standard': 'EN 442 / ГОСТ 31311-2005',
                    'power_delta_t_50k_w': 1930.0,
                    'water_volume_l': 5.4,
                    'weight_kg': 28.1,
                    'color': 'Белый RAL 9016'
                }
            },
            {
                'name': 'Радиатор биметаллический секционный Global Style Plus 500 (10 секций)',
                'category': 'radiators',
                'subcategory': 'bimetal_radiators',
                'manufacturer': 'Global',
                'model_name': 'Style Plus 500',
                'sku': 'GLB-SP500-10',
                'nominal_size': 'Высота 575 мм, межосевое 500 мм, длина 800 мм',
                'connection_type': 'Боковое резьбовое 1" ВР с паронитовыми прокладками',
                'material': 'Внутренний цельный стальной сердечник, наружное оребрение из алюминия',
                'pn_bar': 35.0,
                'max_temp_c': 110.0,
                'power_w': 1850.0,
                'unit': 'компл',
                'price_uzs': 1750000.0,
                'is_verified': True,
                'datasheet_url': 'https://globalradiatori.it/style-plus',
                'image_url': 'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?w=400&auto=format&fit=crop&q=80',
                'description': 'Премиальный итальянский 100% биметаллический радиатор. Идеален для систем центрального и автономного отопления с высоким давлением и гидроударами.',
                'specifications': {
                    'sections_count': 10,
                    'power_per_section_w': 185.0,
                    'burst_pressure_bar': '> 100 bar',
                    'country_of_origin': 'Италия'
                }
            },
            {
                'name': 'Комплект радиаторный термостатический угловой Danfoss RTR-N 1/2" + термоголовка Panda',
                'category': 'radiators',
                'subcategory': 'radiator_valves',
                'manufacturer': 'Danfoss',
                'model_name': 'RTR-N / Panda',
                'sku': '013G2184',
                'nominal_size': 'DN 15 (1/2") угловое исполнение',
                'connection_type': 'Резьба внутренняя/наружная с накидной гайкой 1/2" конус',
                'material': 'Латунь сантехническая никелированная',
                'pn_bar': 10.0,
                'max_temp_c': 120.0,
                'kv_value': 0.90,
                'unit': 'компл',
                'price_uzs': 210000.0,
                'is_verified': True,
                'datasheet_url': 'https://store.danfoss.com/013G2184',
                'image_url': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&auto=format&fit=crop&q=80',
                'description': 'Включает термостатический клапан с предварительной настройкой пропускной способности RTR-N, термостатический элемент прямого действия Panda с газовым наполнением и запорный клапан RLV-S.',
                'specifications': {
                    'setting_range_c': '8 - 28 °C',
                    'reaction_time_min': 8,
                    'frost_protection': True
                }
            },

            # ==========================================
            # 6. ЗАПОРНО-РЕГУЛИРУЮЩАЯ АРМАТУРА (valves)
            # ==========================================
            {
                'name': 'Кран шаровой полнопроходной Valtec BASE VT.214.N 1/2" ВР-ВР с рычагом',
                'category': 'valves',
                'subcategory': 'ball_valves',
                'manufacturer': 'Valtec',
                'model_name': 'BASE VT.214.N',
                'sku': 'VT.214.N.04',
                'nominal_size': 'DN 15 (1/2")',
                'connection_type': 'Резьба трубная цилиндрическая ВР-ВР (ISO 228/1)',
                'material': 'Латунь горячепрессованная CW617N никелированная, шар хромированный',
                'pn_bar': 40.0,
                'max_temp_c': 150.0,
                'kv_value': 17.0,
                'unit': 'шт',
                'price_uzs': 42000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VT214.pdf',
                'image_url': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&auto=format&fit=crop&q=80',
                'description': 'Усиленный полнопроходной кран промышленного класса. Седельные кольца из термостойкого тефлона PTFE с добавлением углеволокна. Ресурс 55 000 циклов.',
                'specifications': {
                    'standard': 'ГОСТ 21345-2005 / ГОСТ 28338-89',
                    'bore_type': 'Полнопроходной 100%',
                    'stem_seal': 'Регулируемый сальник PTFE + EPDM',
                    'handle': 'Стальной рычаг в пластиковой оболочке красного цвета'
                }
            },
            {
                'name': 'Кран шаровой с полусгоном (американка) Valtec BASE VT.227.N 3/4" угловой',
                'category': 'valves',
                'subcategory': 'ball_valves',
                'manufacturer': 'Valtec',
                'model_name': 'BASE VT.227.N',
                'sku': 'VT.227.N.05',
                'nominal_size': 'DN 20 (3/4")',
                'connection_type': 'Угловой, внутренняя резьба — накидная гайка с полусгоном',
                'material': 'Латунь CW617N с никелированным покрытием',
                'pn_bar': 40.0,
                'max_temp_c': 130.0,
                'kv_value': 18.5,
                'unit': 'шт',
                'price_uzs': 68000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VT227.pdf',
                'image_url': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&auto=format&fit=crop&q=80',
                'description': 'Предназначен для быстроразъемного присоединения радиаторов, котлов, коллекторов без демонтажа подводящего трубопровода.',
                'specifications': {
                    'semi_union_seal': 'Кольцо EPDM',
                    'handle': 'Алюминиевая бабочка'
                }
            },
            {
                'name': 'Фильтр механической очистки косой сетчатый Valtec VT.192.N 3/4"',
                'category': 'valves',
                'subcategory': 'strainers',
                'manufacturer': 'Valtec',
                'model_name': 'VT.192.N',
                'sku': 'VT.192.N.05',
                'nominal_size': 'DN 20 (3/4")',
                'connection_type': 'Внутренняя цилиндрическая резьба ВР-ВР',
                'material': 'Латунь CW617N, фильтрующая сетка AISI 316',
                'pn_bar': 20.0,
                'max_temp_c': 150.0,
                'unit': 'шт',
                'price_uzs': 48000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VT192.pdf',
                'image_url': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80',
                'description': 'Улавливает механические примеси (песок, окалину, ржавчину) размером более 300 мкм, защищая циркуляционные насосы и термостатические клапаны.',
                'specifications': {
                    'mesh_size_mkm': 300,
                    'plug_seal': 'Тефлон PTFE',
                    'serviceable': True
                }
            },
            {
                'name': 'Редуктор давления мембранный с манометром Valtec VT.085.N 1/2"',
                'category': 'valves',
                'subcategory': 'pressure_regulators',
                'manufacturer': 'Valtec',
                'model_name': 'VT.085.N',
                'sku': 'VT.085.N.04',
                'nominal_size': 'DN 15 (1/2")',
                'connection_type': 'Внутренняя резьба G 1/2" + штуцер под манометр 1/4"',
                'material': 'Латунь CW617N никелированная, мембрана EPDM',
                'pn_bar': 25.0,
                'max_temp_c': 80.0,
                'unit': 'шт',
                'price_uzs': 285000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VT085.pdf',
                'image_url': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&auto=format&fit=crop&q=80',
                'description': 'Стабилизирует давление в квартирной системе ХВС/ГВС на заданном уровне (1.5–7 бар), защищая бойлеры и смесители от гидроударов и избыточного давления.',
                'specifications': {
                    'outlet_pressure_range_bar': '1.5 - 7.0',
                    'factory_setting_bar': 3.0,
                    'filter_grid_mkm': 200
                }
            },

            # ==========================================
            # 7. НАСОСЫ И КОТЕЛЬНОЕ ОБОРУДОВАНИЕ (pumps_boilers)
            # ==========================================
            {
                'name': 'Циркуляционный насос с мокрым ротором Grundfos UPS 25-60 180',
                'category': 'pumps_boilers',
                'subcategory': 'circulating_pumps',
                'manufacturer': 'Grundfos',
                'model_name': 'UPS 25-60 180',
                'sku': '96281477',
                'nominal_size': 'DN 25 (G 1 1/2" резьба корпуса), монтажная длина 180 мм',
                'connection_type': 'Наружная резьба G 1 1/2" под накидные гайки',
                'material': 'Чугун серый EN-JL 1030, рабочее колесо композит PES 30% GF',
                'pn_bar': 10.0,
                'max_temp_c': 110.0,
                'power_w': 60.0,
                'unit': 'шт',
                'price_uzs': 980000.0,
                'is_verified': True,
                'datasheet_url': 'https://product-selection.grundfos.com/product/96281477',
                'image_url': 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=400&auto=format&fit=crop&q=80',
                'description': 'Легендарный трехскоростной циркуляционный насос для систем закрытого отопления. Высота напора до 6 м водяного столба, подача до 3.8 м³/ч.',
                'specifications': {
                    'speeds_count': 3,
                    'electric_power_w': '45 / 55 / 60 Вт',
                    'max_head_m': 6.0,
                    'max_flow_m3_h': 3.8,
                    'protection_class': 'IP44',
                    'voltage': '230 В / 50 Гц'
                }
            },
            {
                'name': 'Энергоэффективный циркуляционный насос Grundfos ALPHA1 L 25-60 180',
                'category': 'pumps_boilers',
                'subcategory': 'circulating_pumps',
                'manufacturer': 'Grundfos',
                'model_name': 'ALPHA1 L 25-60 180',
                'sku': '99160584',
                'nominal_size': 'DN 25, база 180 мм',
                'connection_type': 'Резьбовое G 1 1/2"',
                'material': 'Чугунный корпус с катафорезным покрытием',
                'pn_bar': 10.0,
                'max_temp_c': 95.0,
                'power_w': 45.0,
                'unit': 'шт',
                'price_uzs': 1850000.0,
                'is_verified': True,
                'datasheet_url': 'https://product-selection.grundfos.com/product/99160584',
                'image_url': 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=400&auto=format&fit=crop&q=80',
                'description': 'Насос класса энергоэффективности A (EEI <= 0.20) с электронным управлением, режимами пропорционального и постоянного перепада давления для теплых полов.',
                'specifications': {
                    'eei_index': '<= 0.20',
                    'modes': 'Теплый пол, радиаторы, 3 фиксированные скорости, PWM сигнал',
                    'min_power_w': 4.0,
                    'max_head_m': 6.0
                }
            },
            {
                'name': 'Мембранный расширительный бак для отопления Reflex NG 25/6',
                'category': 'pumps_boilers',
                'subcategory': 'expansion_vessels',
                'manufacturer': 'Reflex',
                'model_name': 'NG 25/6',
                'sku': '8206301',
                'nominal_size': 'Объем 25 литров, подключение G 3/4" HP',
                'connection_type': 'Наружная резьба G 3/4"',
                'material': 'Высокопрочная сталь с эпоксидным покрытием, незаменяемая мембрана',
                'pn_bar': 6.0,
                'max_temp_c': 120.0,
                'unit': 'шт',
                'price_uzs': 420000.0,
                'is_verified': True,
                'datasheet_url': 'https://www.reflex-winkelmann.com/products/reflex-ng-25',
                'image_url': 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=400&auto=format&fit=crop&q=80',
                'description': 'Компенсирует температурное расширение воды в закрытых системах отопления. Предотвращает превышение аварийного давления.',
                'specifications': {
                    'nominal_volume_l': 25,
                    'pre_charge_pressure_bar': 1.5,
                    'max_membrane_temp_c': 70.0,
                    'color': 'Серый RAL 7040'
                }
            },
            {
                'name': 'Группа безопасности котла Valtec VT.460.0 в сборе до 50 кВт',
                'category': 'pumps_boilers',
                'subcategory': 'safety_groups',
                'manufacturer': 'Valtec',
                'model_name': 'VT.460.0',
                'sku': 'VT.460.0.0',
                'nominal_size': 'Подключение к котлу 1" ВР',
                'connection_type': 'Нижнее подключение 1" ВР на стальной консоли',
                'material': 'Консоль стальная оцинкованная, арматура латунь CW617N',
                'pn_bar': 10.0,
                'max_temp_c': 120.0,
                'power_w': 50000.0,
                'unit': 'компл',
                'price_uzs': 260000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VT460.pdf',
                'image_url': 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=400&auto=format&fit=crop&q=80',
                'description': 'Комплексный блок защиты: предохранительный клапан на 3.0 бар, автоматический воздухоотводчик и радиальный манометр 0–6 бар.',
                'specifications': {
                    'safety_valve_bar': 3.0,
                    'manometer_scale_bar': '0 - 6',
                    'air_vent_auto': True,
                    'max_boiler_power_kw': 50
                }
            },

            # ==========================================
            # 8. ВОДОСНАБЖЕНИЕ И КАНАЛИЗАЦИЯ (water_drainage)
            # ==========================================
            {
                'name': 'Душевой лоток из нержавеющей стали с сухим затвором AlcaPlast APZ12-750 мм',
                'category': 'water_drainage',
                'subcategory': 'drain_channels',
                'manufacturer': 'AlcaPlast',
                'model_name': 'APZ12',
                'sku': 'APZ12-750',
                'nominal_size': 'Длина 750 мм, выход DN 40',
                'connection_type': 'Раструбное соединение со сливной трубой 40 мм',
                'material': 'Нержавеющая сталь AISI 304, полипропилен',
                'unit': 'компл',
                'price_uzs': 850000.0,
                'is_verified': True,
                'datasheet_url': 'https://www.alcadrain.com/ru/shower-drains/apz12-750',
                'image_url': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80',
                'description': 'Низкопрофильный трап с комбинированным затвором SMART (мокрый гидрозатвор + сухие механические створки от запаха при пересыхании). Пропускная способность 32 л/мин.',
                'specifications': {
                    'flow_rate_l_min': 32.0,
                    'mounting_height_min_mm': 64,
                    'grate_style': 'Перфорированная нержавеющая сталь',
                    'load_class': 'K3 (до 300 кг)'
                }
            },
            {
                'name': 'Распределительный коллектор для ХВС/ГВС с отсекающими кранами Valtec VTc.560.N 3/4" на 3 выхода 1/2"',
                'category': 'water_drainage',
                'subcategory': 'water_manifolds',
                'manufacturer': 'Valtec',
                'model_name': 'VTc.560.N',
                'sku': 'VTc.560.N.0503',
                'nominal_size': 'Магистраль 3/4" ВР-НР × 3 отвода 1/2" НР',
                'connection_type': 'Резьбовое трубное с плоским уплотнением',
                'material': 'Латунь сантехническая никелированная CW617N',
                'pn_bar': 10.0,
                'max_temp_c': 110.0,
                'unit': 'шт',
                'price_uzs': 210000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VTc560.pdf',
                'image_url': 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=400&auto=format&fit=crop&q=80',
                'description': 'Лучевая разводка водоснабжения без скачков давления и температуры при одновременном включении нескольких потребителей.',
                'specifications': {
                    'ports_count': 3,
                    'valve_type': 'Встроенные шаровые краны со сменными флажками',
                    'center_distance_mm': 36
                }
            },
            {
                'name': 'Отвод канализационный полипропиленовый Ostendorf HTSafe 110/87°',
                'category': 'water_drainage',
                'subcategory': 'sewer_fittings',
                'manufacturer': 'Ostendorf',
                'model_name': 'HTSafe',
                'sku': '175220',
                'nominal_size': 'DN 110, угол 87° (88.5°)',
                'connection_type': 'Раструбное соединение с заводским манжетным уплотнением',
                'material': 'Трудновоспламеняемый полипропилен PP-H',
                'max_temp_c': 95.0,
                'unit': 'шт',
                'price_uzs': 18000.0,
                'is_verified': True,
                'datasheet_url': 'https://ostendorf-kunststoffe.com/htsafe',
                'image_url': 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&auto=format&fit=crop&q=80',
                'description': 'Отвод внутренней канализации с гладкими стенками и сантиметровой линейкой на теле фитинга для быстрого монтажа.',
                'specifications': {
                    'standard': 'DIN EN 1451-1',
                    'fire_rating': 'DIN 4102 B1'
                }
            },

            # ==========================================
            # 9. АВТОМАТИКА И УПРАВЛЕНИЕ (automation)
            # ==========================================
            {
                'name': 'Электронный комнатный термостат Valtec VT.AC710 с датчиком температуры пола',
                'category': 'automation',
                'subcategory': 'thermostats',
                'manufacturer': 'Valtec',
                'model_name': 'VT.AC710',
                'sku': 'VT.AC710.0',
                'nominal_size': 'Монтаж в стандартный подрозетник Ø68 мм',
                'connection_type': 'Винтовые клеммы 230 В, релейный выход 16 А',
                'material': 'Огнестойкий поликарбонат белый глянец',
                'unit': 'шт',
                'price_uzs': 280000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VT_AC710.pdf',
                'image_url': 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=400&auto=format&fit=crop&q=80',
                'description': 'Программируемый недельный термостат (5+2 дня, 6 периодов в сутки) с ЖК-дисплеем и подсветкой. Контролирует температуру воздуха и защищает пол от перегрева.',
                'specifications': {
                    'control_range_c': '5 - 50 °C',
                    'accuracy_c': 0.5,
                    'sensor_type': 'NTC 10 кОм (длина кабеля 3 м)',
                    'max_relay_load_a': 16
                }
            },
            {
                'name': 'Сервопривод электротермический Valtec VT.TE3040.0.230 нормально закрытый (NC)',
                'category': 'automation',
                'subcategory': 'actuators',
                'manufacturer': 'Valtec',
                'model_name': 'VT.TE3040',
                'sku': 'VT.TE3040.0.230',
                'nominal_size': 'Резьба адаптера M30×1.5, ход штока 4.5 мм',
                'connection_type': 'Накидная гайка M30x1.5 на термостатический клапан коллектора',
                'material': 'Пластиковый негорючий корпус, сильфон с толуолом',
                'unit': 'шт',
                'price_uzs': 145000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VT_TE3040.pdf',
                'image_url': 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=400&auto=format&fit=crop&q=80',
                'description': 'Открывает и закрывает циркуляцию в петлях теплого пола по сигналу от комнатного термостата. Время полного открытия 3–4 минуты.',
                'specifications': {
                    'voltage': '230 В переменного тока (50 Гц)',
                    'type': 'Нормально закрытый (NC)',
                    'power_consumption_w': 2.0,
                    'cable_length_m': 1.0,
                    'protection_class': 'IP54'
                }
            },
            {
                'name': 'Коммутационный контроллер для тёплого пола Valtec VT.ZC8 на 8 зон управления',
                'category': 'automation',
                'subcategory': 'zone_controllers',
                'manufacturer': 'Valtec',
                'model_name': 'VT.ZC8',
                'sku': 'VT.ZC8.0',
                'nominal_size': 'Монтаж на DIN-рейку в коллекторном шкафу',
                'connection_type': 'Самозажимные клеммные колодки',
                'material': 'Пластик ABS ударопрочный',
                'unit': 'шт',
                'price_uzs': 690000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VT_ZC8.pdf',
                'image_url': 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=400&auto=format&fit=crop&q=80',
                'description': 'Связывает до 8 комнатных термостатов и до 32 сервоприводов. Оборудован реле автоматического включения циркуляционного насоса и котла с задержкой 2 минуты.',
                'specifications': {
                    'zones_count': 8,
                    'pump_relay_delay_min': 2,
                    'max_actuators_per_zone': 4
                }
            },

            # ==========================================
            # 10. ИЗОЛЯЦИЯ И КРЕПЁЖ (insulation_mounting)
            # ==========================================
            {
                'name': 'Трубная теплоизоляция из синтетического каучука K-Flex ST 18x09 мм (2 м)',
                'category': 'insulation_mounting',
                'subcategory': 'pipe_insulation',
                'manufacturer': 'K-Flex',
                'model_name': 'ST 18x09',
                'sku': 'ST018009',
                'nominal_size': 'Внутренний диаметр 18 мм, толщина стенки 9 мм',
                'connection_type': 'Натяжка на трубу или продольный разрез с клеем K-Flex K 414',
                'material': 'Вспененный синтетический каучук с закрытыми порами',
                'max_temp_c': 110.0,
                'unit': 'м',
                'price_uzs': 12500.0,
                'is_verified': True,
                'datasheet_url': 'https://k-flex.com/products/k-flex-st',
                'image_url': 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&auto=format&fit=crop&q=80',
                'description': 'Профессиональная изоляция для систем отопления, кондиционирования и водоснабжения. Препятствует конденсации и потерям тепла в стенах и стяжках.',
                'specifications': {
                    'thermal_conductivity_w_mk': '0.033 при 0°C',
                    'diffusion_resistance_factor_mu': '> 10000',
                    'fire_class': 'Г1 (слабогорючий, самозатухающий)'
                }
            },
            {
                'name': 'Хомут трубный сантехнический с резиновым виброгасителем Valtec 1" (31-36 мм)',
                'category': 'insulation_mounting',
                'subcategory': 'pipe_clamps',
                'manufacturer': 'Valtec',
                'model_name': 'VTp.782',
                'sku': 'VTp.782.0.032',
                'nominal_size': 'Диапазон зажима 31–36 мм (под трубу 1")',
                'connection_type': 'Шпилька-саморез М8×80 мм + дюбель Ø10×50 мм',
                'material': 'Оцинкованная углеродистая сталь, профиль EPDM',
                'unit': 'шт',
                'price_uzs': 11000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VTp782.pdf',
                'image_url': 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=400&auto=format&fit=crop&q=80',
                'description': 'Двухвинтовой хомут для жесткого и скользящего крепления вертикальных и горизонтальных трубопроводов к кирпичу и бетону. Снижает передачу шума до 18 дБ.',
                'specifications': {
                    'load_capacity_n': 1200,
                    'acoustic_insulation_db': 18,
                    'zinc_coating_mkm': 10
                }
            },
            {
                'name': 'Профессиональная уплотнительная фторопластовая лента ФУМ Valtec 19 мм x 0.2 мм x 15 м',
                'category': 'insulation_mounting',
                'subcategory': 'thread_sealants',
                'manufacturer': 'Valtec',
                'model_name': 'VT.FUM.19',
                'sku': 'VT.FUM.19.15',
                'nominal_size': 'Ширина 19 мм, толщина 0.2 мм, намотка 15 метров',
                'connection_type': 'Намотка на резьбу конических и цилиндрических фитингов',
                'material': '100% чистый политетрафторэтилен (PTFE)',
                'pn_bar': 40.0,
                'max_temp_c': 200.0,
                'unit': 'шт',
                'price_uzs': 16000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/VT_FUM.pdf',
                'image_url': 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=400&auto=format&fit=crop&q=80',
                'description': 'Плотная профессиональная лента высокой прочности. Химически инертна, не подвержена старению, обеспечивает герметичность резьбовых соединений при высоких температурах.',
                'specifications': {
                    'density_g_cm3': 0.7,
                    'ph_range': '0 - 14'
                }
            },
            {
                'name': 'Анаэробный резьбовой гель-герметик средней фиксации Siseal (флакон 50 г)',
                'category': 'insulation_mounting',
                'subcategory': 'thread_sealants',
                'manufacturer': 'Valtec',
                'model_name': 'Siseal',
                'sku': 'VT.SISEAL.50',
                'nominal_size': 'Флакон с узким носиком 50 грамм',
                'connection_type': 'Нанесение на резьбовую поверхность 1/2"–2"',
                'material': 'Диметакрилат полиэфирный анаэробного отверждения',
                'pn_bar': 50.0,
                'max_temp_c': 150.0,
                'unit': 'шт',
                'price_uzs': 65000.0,
                'is_verified': True,
                'datasheet_url': 'https://valtec.ru/document/passport/Siseal.pdf',
                'image_url': 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=400&auto=format&fit=crop&q=80',
                'description': 'Позволяет производить точную юстировку шаровых кранов и манометров без риска течи. Полимеризуется без доступа кислорода в зазорах резьбы за 15–20 минут.',
                'specifications': {
                    'initial_strength_min': 15,
                    'full_cure_hours': 24,
                    'max_thread_diameter': '2"'
                }
            }
        ]

        for item in products_data:
            CatalogProduct.objects.update_or_create(
                sku=item['sku'],
                defaults=item
            )

        self.stdout.write(self.style.SUCCESS(
            f"Каталог SantexPro успешно наполнен! Загружено {len(products_data)} сертифицированных позиций "
            f"по всем 10 категориям оборудования."
        ))
