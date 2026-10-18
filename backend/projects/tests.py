from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from projects.models import Project, Room, Window, Door
from catalog.models import RadiatorCatalogItem, PipeSpecification
from materials.models import MaterialItem


class SantexProApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.user2 = User.objects.create_user(username='user2', password='password123')

        # Create project for user1
        self.project1 = Project.objects.create(
            user=self.user1,
            name="User1 Hovli Uyi",
            address="Toshkent, Chilonzor",
            client_name="Ali Valiyev",
            outdoor_design_temp=-15.0
        )

        self.room1 = Room.objects.create(
            project=self.project1,
            name="Mehmonxona",
            length=6.0,
            width=4.0,
            height=3.0,
            desired_temp=22.0
        )

        self.window1 = Window.objects.create(
            room=self.room1,
            name="Oyna 1",
            wall_index=0,
            position_along_wall=1.0,
            width=2.0,
            height=1.5,
            u_value=1.8
        )

        # Radiator in catalog
        self.rad_cat = RadiatorCatalogItem.objects.create(
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

    def test_authentication_required(self):
        # Unauthenticated request should fail
        response = self.client.get('/api/projects/projects/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_isolation(self):
        # User2 should not see User1's projects
        self.client.force_authenticate(user=self.user2)
        response = self.client.get('/api/projects/projects/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        # User1 sees their project
        self.client.force_authenticate(user=self.user1)
        response = self.client.get('/api/projects/projects/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], "User1 Hovli Uyi")

    def test_room_area_volume_persistence(self):
        self.client.force_authenticate(user=self.user1)
        # Create room via API
        response = self.client.post('/api/projects/rooms/', {
            'project': self.project1.id,
            'name': "Oshxona",
            'length': 5.0,
            'width': 3.0,
            'height': 2.8,
            'desired_temp': 20.0
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['area'], 15.0)
        self.assertEqual(response.data['volume'], 42.0)

    def test_heat_loss_calculation_endpoint(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(f'/api/projects/rooms/{self.room1.id}/calculate_heat_loss/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        out = response.data['output_results']
        self.assertEqual(out['area_m2'], 24.0)
        self.assertGreater(out['total_heat_loss_w'], 0)
        self.assertIn('elements_breakdown', out)

    def test_radiator_calculation_endpoint(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(f'/api/projects/rooms/{self.room1.id}/calculate_radiator/', {
            'heat_demand_w': 2500.0,
            'catalog_item_id': self.rad_cat.id,
            't_supply': 75.0,
            't_return': 65.0
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        out = response.data['output_results']
        self.assertGreaterEqual(out['recommended_quantity'], 1)
        self.assertGreater(out['total_provided_power_w'], 2000.0)

    def test_underfloor_calculation_endpoint(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(f'/api/projects/rooms/{self.room1.id}/calculate_underfloor/', {
            'spacing_mm': 150,
            'pipe_nominal_dia_mm': 16.0,
            'max_circuit_length_m': 85.0
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        out = response.data['output_results']
        self.assertGreater(out['num_circuits'], 0)
        self.assertGreater(out['total_pipe_length_m'], 0)

    def test_hydraulics_calculation_endpoint(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(f'/api/projects/rooms/{self.room1.id}/calculate_hydraulics/', {
            'heat_power_w': 3500.0,
            't_supply': 75.0,
            't_return': 65.0,
            'pipe_length_m': 25.0
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        out = response.data['output_results']
        self.assertIn('velocity_m_s', out)
        self.assertIn('recommended_pipe', out)

    def test_materials_generation_endpoint(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(f'/api/materials/items/generate/{self.project1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('items', response.data)

    def test_pdf_export_endpoint(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f'/api/reports/project/{self.project1.id}/pdf/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertTrue(len(response.content) > 1000)

    def test_user_cannot_access_other_user_room_calculations(self):
        self.client.force_authenticate(user=self.user2)
        response = self.client.post(f'/api/projects/rooms/{self.room1.id}/calculate_heat_loss/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_cannot_export_other_user_pdf(self):
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(f'/api/reports/project/{self.project1.id}/pdf/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_cannot_create_room_in_other_user_project(self):
        self.client.force_authenticate(user=self.user2)
        response = self.client.post('/api/projects/rooms/', {
            'project': self.project1.id,
            'name': "Ruxsatsiz xona",
            'length': 4.0,
            'width': 3.0,
            'height': 2.8,
            'desired_temp': 20.0
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_cannot_delete_other_user_project(self):
        self.client.force_authenticate(user=self.user2)
        response = self.client.delete(f'/api/projects/projects/{self.project1.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_cannot_create_circuit_in_other_user_room(self):
        self.client.force_authenticate(user=self.user2)
        response = self.client.post('/api/projects/underfloor-circuits/', {
            'room': self.room1.id,
            'circuit_number': 1,
            'total_length_m': 60.0
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_cannot_create_wall_in_other_user_room(self):
        self.client.force_authenticate(user=self.user2)
        response = self.client.post('/api/projects/walls/', {
            'room': self.room1.id,
            'wall_index': 4,
            'length': 4.0,
            'orientation': 'N'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_project_without_user_in_payload(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post('/api/projects/projects/', {
            'name': "Yangi Sinov Loyihasi",
            'address': "Samarqand sh.",
            'client_name': "Vali Aliyev",
            'outdoor_design_temp': -18.0
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], "Yangi Sinov Loyihasi")
        self.assertEqual(response.data['user'], self.user1.id)

    def test_room_detail_includes_manifolds(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f'/api/projects/rooms/{self.room1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('manifolds', response.data)

    def test_get_and_update_building_construction(self):
        self.client.force_authenticate(user=self.user1)
        # GET building
        res_get = self.client.get(f'/api/projects/projects/{self.project1.id}/building/')
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertEqual(res_get.data['building_type'], 'residential_house')

        # PATCH building with sync_rooms
        res_patch = self.client.patch(f'/api/projects/projects/{self.project1.id}/building/', {
            'building_type': 'residential_house',
            'floors_count': 2,
            'wall_material_description': "Gazoblok D500 (30 sm) + penoplast (5 sm)",
            'default_wall_u': 0.38,
            'sync_rooms': True
        })
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.data['default_wall_u'], 0.38)
        self.assertEqual(res_patch.data['floors_count'], 2)

        # Check room updated with sync_rooms
        self.room1.refresh_from_db()
        self.assertEqual(self.room1.wall_u_value, 0.38)

    def test_save_project_layout(self):
        self.client.force_authenticate(user=self.user1)
        res = self.client.post(f'/api/projects/projects/{self.project1.id}/layout/', {
            'rooms': [
                {'id': self.room1.id, 'position_x': 4.5, 'position_y': 2.0}
            ]
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.room1.refresh_from_db()
        self.assertEqual(self.room1.position_x, 4.5)
        self.assertEqual(self.room1.position_y, 2.0)

    def test_save_manifold_and_expand_outlets(self):
        self.client.force_authenticate(user=self.user1)
        res = self.client.post(f'/api/projects/projects/{self.project1.id}/manifold/', {
            'position_x': 8.5,
            'position_y': 1.2,
            'outlets_count': 8,
            'name': "Asosiy Kollektor SHRV-8"
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['position_x'], 8.5)
        self.assertEqual(res.data['position_y'], 1.2)
        self.assertEqual(res.data['outlets_count'], 8)
        self.assertEqual(res.data['name'], "Asosiy Kollektor SHRV-8")

    def test_underfloor_calculation_and_feeder_routing(self):
        self.client.force_authenticate(user=self.user1)
        # 1. Underfloor calculation for room
        calc_res = self.client.post(f'/api/projects/rooms/{self.room1.id}/calculate_underfloor/', {
            'spacing_mm': 150,
            'pipe_nominal_dia_mm': 16.0,
            'routing_pattern': 'spiral',
            'boundary_offset_m': 0.15,
            'custom_num_circuits': 2
        }, format='json')
        self.assertEqual(calc_res.status_code, status.HTTP_200_OK)
        circuits = list(self.room1.underfloor_circuits.all())
        self.assertEqual(len(circuits), 2)
        c1 = circuits[0]
        self.assertGreater(len(c1.supply_path_points or []), 0)
        self.assertGreater(len(c1.return_path_points or []), 0)
        self.assertGreater(len(c1.feeder_supply_points or []), 0)
        self.assertGreater(len(c1.feeder_return_points or []), 0)
        self.assertEqual(c1.manifold_port_index, 1)

        # 2. Recalculate routing across all project circuits
        route_res = self.client.post(f'/api/projects/projects/{self.project1.id}/update-circuits-routing/', format='json')
        self.assertEqual(route_res.status_code, status.HTTP_200_OK)
        self.assertEqual(route_res.data['status'], 'success')

    def test_project_master_pdf_generation_with_underfloor_cad(self):
        self.client.force_authenticate(user=self.user1)
        # Create underfloor circuits for room1
        self.client.post(f'/api/projects/rooms/{self.room1.id}/calculate_underfloor/', {
            'spacing_mm': 150,
            'pipe_nominal_dia_mm': 16.0,
            'routing_pattern': 'spiral',
            'custom_num_circuits': 1
        }, format='json')

        # Download project PDF
        pdf_res = self.client.get(f'/api/reports/project/{self.project1.id}/pdf/')
        self.assertEqual(pdf_res.status_code, status.HTTP_200_OK)
        self.assertEqual(pdf_res['Content-Type'], 'application/pdf')
        self.assertTrue(pdf_res.content.startswith(b'%PDF'))

