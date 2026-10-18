from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from projects.models import Project, Room, Window, Door, Radiator, UnderfloorHeatingCircuit
from catalog.models import RadiatorCatalogItem
from materials.models import MaterialItem


class ProjectPdfExportTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(username='sanjar_usta', password='Password123!')
        self.user2 = User.objects.create_user(username='other_user', password='Password123!')

        self.project_empty = Project.objects.create(
            user=self.user1,
            name="Bo'sh Loyiha",
            address="Namangan sh.",
            client_name="Sobir"
        )

        self.project_full = Project.objects.create(
            user=self.user1,
            name="To'liq Kottej",
            address="Toshkent, Yunusobod",
            client_name="Akrom aka",
            outdoor_design_temp=-16.0
        )

        self.room1 = Room.objects.create(
            project=self.project_full,
            name="Mehmonxona",
            length=6.0,
            width=4.0,
            height=3.0,
            desired_temp=22.0
        )

        Window.objects.create(
            room=self.room1,
            name="Deraza 1",
            wall_index=0,
            width=2.0,
            height=1.5
        )

        Door.objects.create(
            room=self.room1,
            name="Eshik 1",
            wall_index=2,
            width=0.9,
            height=2.1,
            door_type='interior'
        )

        rad_cat = RadiatorCatalogItem.objects.create(
            manufacturer="Korado",
            model_name="Radik 22 500x1000",
            radiator_type="panel_22",
            height_mm=500,
            length_mm=1000,
            depth_mm=100,
            rated_power_w=1930.0,
            price_uzs=1000000.0
        )

        Radiator.objects.create(
            room=self.room1,
            catalog_item=rad_cat,
            quantity=2,
            calculated_actual_power_w=3800.0
        )

        UnderfloorHeatingCircuit.objects.create(
            room=self.room1,
            circuit_number=1,
            total_length_m=72.0,
            floor_length_m=68.0,
            heated_area=12.0,
            spacing_mm=150
        )

        MaterialItem.objects.create(
            project=self.project_full,
            name="Radiator Korado",
            category="radiator",
            unit="dona",
            quantity=2,
            unit_price_uzs=1000000.0
        )

    def test_pdf_export_unauthenticated_fails(self):
        response = self.client.get(f'/api/reports/project/{self.project_full.id}/pdf/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_pdf_export_empty_project_succeeds(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f'/api/reports/project/{self.project_empty.id}/pdf/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertTrue(response.content.startswith(b'%PDF-'))

    def test_pdf_export_full_project_succeeds(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f'/api/reports/project/{self.project_full.id}/pdf/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertTrue(response.content.startswith(b'%PDF-'))
        self.assertGreater(len(response.content), 2000)

    def test_pdf_export_user_isolation(self):
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(f'/api/reports/project/{self.project_full.id}/pdf/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
