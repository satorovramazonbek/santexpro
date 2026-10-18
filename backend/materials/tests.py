from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from projects.models import Project, Room, Radiator, UnderfloorHeatingCircuit, Manifold
from catalog.models import RadiatorCatalogItem, PipeSpecification
from materials.models import MaterialItem
from materials.generator import generate_project_materials


class MaterialsEstimationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(username='usta_ali', password='Password123!')
        self.user2 = User.objects.create_user(username='usta_vali', password='Password123!')

        self.project1 = Project.objects.create(
            user=self.user1,
            name="Ali Kottej",
            address="Toshkent, Sergeli",
            client_name="Ali",
            outdoor_design_temp=-15.0
        )

        self.room1 = Room.objects.create(
            project=self.project1,
            name="Mehmonxona",
            length=6.0,
            width=5.0,
            height=3.0
        )

        self.rad_cat = RadiatorCatalogItem.objects.create(
            manufacturer="Korado",
            model_name="Radik 22 500x1200",
            radiator_type="panel_22",
            height_mm=500,
            length_mm=1200,
            depth_mm=100,
            rated_power_w=2150.0,
            rated_delta_t=50.0,
            exponent_n=1.30,
            price_uzs=1100000.0
        )

        self.radiator1 = Radiator.objects.create(
            room=self.room1,
            catalog_item=self.rad_cat,
            quantity=2,
            calculated_actual_power_w=3800.0
        )

        self.circuit1 = UnderfloorHeatingCircuit.objects.create(
            room=self.room1,
            circuit_number=1,
            total_length_m=75.0,
            floor_length_m=70.0,
            heated_area=15.0,
            spacing_mm=150
        )

        self.manifold1 = Manifold.objects.create(
            project=self.project1,
            room=self.room1,
            name="Kollektor shkafi 1",
            outlets_count=4
        )

    def test_generate_materials_creates_items(self):
        items = generate_project_materials(self.project1)
        self.assertGreater(len(items), 0)

        # Check radiator was added
        rad_items = [i for i in items if i.category == 'radiator']
        self.assertEqual(len(rad_items), 1)
        self.assertEqual(rad_items[0].quantity, 2)
        self.assertEqual(rad_items[0].unit_price_uzs, 1100000.0)
        self.assertEqual(rad_items[0].total_price_uzs, 2200000.0)

        # Check underfloor pipe was added
        pipe_items = [i for i in items if i.category == 'underfloor_pipe']
        self.assertGreaterEqual(len(pipe_items), 1)

    def test_materials_api_generation_endpoint(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(f'/api/materials/items/generate/{self.project1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('items', response.data)
        self.assertGreater(response.data['total_cost_uzs'], 0)

    def test_user_cannot_generate_other_user_materials(self):
        self.client.force_authenticate(user=self.user2)
        response = self.client.post(f'/api/materials/items/generate/{self.project1.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_cannot_add_manual_material_to_other_user_project(self):
        self.client.force_authenticate(user=self.user2)
        response = self.client.post('/api/materials/items/', {
            'project': self.project1.id,
            'name': "O'g'irlangan material",
            'category': 'accessory',
            'quantity': 1,
            'unit_price_uzs': 50000.0
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_add_custom_material(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post('/api/materials/items/', {
            'project': self.project1.id,
            'name': "Maxsus termostat",
            'category': 'accessory',
            'unit': 'dona',
            'quantity': 3,
            'unit_price_uzs': 250000.0
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(float(response.data['total_price_uzs']), 750000.0)
