from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import RadiatorCatalogItem, PipeSpecification


class CatalogPermissionsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.regular_user = User.objects.create_user(username='installer1', password='Password123!', is_staff=False)
        self.admin_user = User.objects.create_user(username='admin1', password='AdminPassword123!', is_staff=True)

        self.radiator = RadiatorCatalogItem.objects.create(
            manufacturer="Korado",
            model_name="Radik 22 500x1000",
            radiator_type="panel_22",
            height_mm=500,
            length_mm=1000,
            depth_mm=100,
            rated_power_w=1930.0,
            rated_delta_t=50.0,
            exponent_n=1.30,
            price_uzs=1000000.0
        )

        self.pipe = PipeSpecification.objects.create(
            name="PEX-A 16x2.0",
            material="PEX-A",
            nominal_dia_mm=16.0,
            wall_thickness_mm=2.0,
            internal_dia_mm=12.0,
            roughness_mm=0.007,
            max_temp_c=95.0,
            max_pressure_bar=10.0,
            price_per_meter_uzs=8500.0
        )

    def test_unauthenticated_can_read_catalog(self):
        response = self.client.get('/api/catalog/radiators/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_regular_user_cannot_create_radiator(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post('/api/catalog/radiators/', {
            'manufacturer': "Hacker",
            'model_name': "Malicious Rad",
            'radiator_type': "panel_22",
            'height_mm': 500,
            'length_mm': 1000,
            'depth_mm': 100,
            'rated_power_w': 2000.0,
            'rated_delta_t': 50.0,
            'exponent_n': 1.30
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_user_cannot_delete_radiator(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.delete(f'/api/catalog/radiators/{self.radiator.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(RadiatorCatalogItem.objects.filter(id=self.radiator.id).exists())

    def test_regular_user_cannot_create_pipe(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post('/api/catalog/pipes/', {
            'name': "Fake Pipe",
            'material': "PEX-A",
            'nominal_dia_mm': 20.0,
            'wall_thickness_mm': 2.0,
            'internal_dia_mm': 16.0
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_radiator(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/catalog/radiators/', {
            'manufacturer': "Purmo",
            'model_name': "Compact 22 500x1200",
            'radiator_type': "panel_22",
            'height_mm': 500,
            'length_mm': 1200,
            'depth_mm': 102,
            'rated_power_w': 2300.0,
            'rated_delta_t': 50.0,
            'exponent_n': 1.31,
            'price_uzs': 1200000.0
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['manufacturer'], "Purmo")

    def test_admin_can_delete_radiator(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/catalog/radiators/{self.radiator.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(RadiatorCatalogItem.objects.filter(id=self.radiator.id).exists())

    def test_regular_user_cannot_upload_image(self):
        self.client.force_authenticate(user=self.regular_user)
        test_file = SimpleUploadedFile("test.jpg", b"fake-jpg-content", content_type="image/jpeg")
        response = self.client.post('/api/catalog/upload-image/', {'file': test_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_upload_image_extension_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        bad_file = SimpleUploadedFile("script.sh", b"#!/bin/bash echo hacked", content_type="text/x-shellscript")
        response = self.client.post('/api/catalog/upload-image/', {'file': bad_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


class CatalogProductTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='engineer1', password='Password123!', is_staff=False)
        self.other_user = User.objects.create_user(username='other_user', password='Password123!', is_staff=False)

        from projects.models import Project
        self.project = Project.objects.create(
            user=self.user,
            name="Проект Коттеджа",
            address="Ташкент, Мирзо-Улугбекский р-н"
        )
        self.other_project = Project.objects.create(
            user=self.other_user,
            name="Чужой Проект"
        )

        from .models import CatalogProduct
        self.product = CatalogProduct.objects.create(
            name='Кран шаровой Valtec BASE VT.214.N 1/2"',
            category='valves',
            subcategory='ball_valves',
            manufacturer='Valtec',
            model_name='BASE',
            sku='VT.214.N.04',
            nominal_size='1/2"',
            pn_bar=40.0,
            max_temp_c=150.0,
            unit='шт',
            price_uzs=42000.0,
            is_verified=True,
            image_url='https://example.com/vt214.jpg'
        )

    def test_unauthenticated_can_list_products(self):
        response = self.client.get('/api/catalog/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_filter_products_by_category(self):
        response = self.client.get('/api/catalog/products/?category=valves')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for item in response.data:
            self.assertEqual(item['category'], 'valves')

    def test_search_products_by_sku(self):
        response = self.client.get('/api/catalog/products/?search=VT.214.N.04')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['sku'], 'VT.214.N.04')

    def test_add_product_to_project_materials(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/catalog/products/{self.product.id}/add_to_project_materials/', {
            'project_id': self.project.id,
            'quantity': 4,
            'notes': 'На вводной узел'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        from materials.models import MaterialItem
        mat = MaterialItem.objects.filter(project=self.project, name=self.product.name).first()
        self.assertIsNotNone(mat)
        self.assertEqual(mat.quantity, 4)
        self.assertEqual(float(mat.unit_price_uzs), 42000.0)
        self.assertEqual(float(mat.total_price_uzs), 168000.0)
        self.assertFalse(mat.is_auto_generated)

    def test_cannot_add_product_to_other_user_project(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/catalog/products/{self.product.id}/add_to_project_materials/', {
            'project_id': self.other_project.id,
            'quantity': 2
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

