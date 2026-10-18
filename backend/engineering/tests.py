"""
Unit tests for SantexPro engineering calculation modules.
"""

import unittest
from engineering.heat_loss import (
    HeatLossInput, OpeningElement, calculate_heat_loss
)
from engineering.radiators import (
    RadiatorModelData, RadiatorSelectionInput, calculate_radiator_selection, calculate_effective_delta_t
)
from engineering.underfloor import (
    UnderfloorHeatingInput, ExcludedArea, calculate_underfloor_heating
)
from engineering.hydraulics import (
    HydraulicInput, calculate_hydraulics
)


class EngineeringCalculationsTestCase(unittest.TestCase):

    def test_heat_loss_basic_room(self):
        # 5m x 4m room, 3m height, 1 exterior wall (length 5m)
        # Gross exterior wall = 5 * 3 = 15 m2
        # 1 window 1.5m x 1.4m = 2.1 m2 (U=1.8)
        # Net wall = 15 - 2.1 = 12.9 m2 (U=0.45)
        # Volume = 5 * 4 * 3 = 60 m3
        # Tin = 22, Tout = -15 -> Delta T = 37 K
        win = OpeningElement(name="Oyna 1", element_type="window", width=1.5, height=1.4, u_value=1.8)
        inp = HeatLossInput(
            room_name="Mehmonxona",
            length=5.0,
            width=4.0,
            height=3.0,
            t_inside=22.0,
            t_outside=-15.0,
            exterior_walls_count=1,
            wall_u_value=0.45,
            air_change_rate=0.8,
            has_heated_above=True,
            has_heated_below=True,
            windows=[win]
        )
        res = calculate_heat_loss(inp)

        self.assertEqual(res.area, 20.0)
        self.assertEqual(res.volume, 60.0)
        self.assertEqual(res.delta_t, 37.0)
        self.assertGreater(res.total_heat_loss_w, 0)
        # Check window area
        self.assertAlmostEqual(win.area, 2.1, places=2)
        # Check specific heat loss W/m2
        self.assertEqual(res.specific_heat_loss_w_m2, round(res.total_heat_loss_w / 20.0, 1))
        # Check ventilation
        # Q_vent = 0.34 * 60 * 0.8 * 37 = 603.84 W
        self.assertAlmostEqual(res.ventilation_loss_w, 603.8, delta=1.0)

    def test_heat_loss_interior_door_not_deducted_from_exterior_wall(self):
        # 5m x 4m room, height 3m, 1 exterior wall (wall 0: length 5m -> 15 m2 gross)
        # Interior door on wall 2 (1.0m x 2.0m = 2.0 m2)
        int_door = OpeningElement(
            name="Ichki eshik",
            element_type="door",
            width=1.0,
            height=2.0,
            u_value=2.0,
            wall_id="2",
            is_exterior=False
        )
        inp = HeatLossInput(
            room_name="Yotoqxona",
            length=5.0,
            width=4.0,
            height=3.0,
            t_inside=20.0,
            t_outside=-15.0,
            exterior_walls_count=1,
            wall_u_value=0.5,
            doors=[int_door]
        )
        res = calculate_heat_loss(inp)
        wall_bd = next(b for b in res.elements_breakdown if "Tashqi devorlar" in b['element'])
        door_bd = next(b for b in res.elements_breakdown if "eshik" in b['element'].lower())

        # Net exterior wall area should be full 15 m2, NOT 13 m2
        self.assertEqual(wall_bd['area_m2'], 15.0)
        # Interior door to heated room should have 0 heat loss to outside
        self.assertEqual(door_bd['heat_loss_w'], 0.0)

    def test_heat_loss_exterior_door_deducted_from_exterior_wall(self):
        # Exterior door on wall 0 (1.0m x 2.0m = 2.0 m2)
        ext_door = OpeningElement(
            name="Tashqi eshik",
            element_type="door",
            width=1.0,
            height=2.0,
            u_value=2.0,
            wall_id="0",
            is_exterior=True
        )
        inp = HeatLossInput(
            room_name="Dahliz",
            length=5.0,
            width=4.0,
            height=3.0,
            t_inside=20.0,
            t_outside=-15.0,
            exterior_walls_count=1,
            wall_u_value=0.5,
            doors=[ext_door]
        )
        res = calculate_heat_loss(inp)
        wall_bd = next(b for b in res.elements_breakdown if "Tashqi devorlar" in b['element'])
        door_bd = next(b for b in res.elements_breakdown if "eshik" in b['element'].lower())

        # Net exterior wall area should be 15.0 - 2.0 = 13.0 m2
        self.assertEqual(wall_bd['area_m2'], 13.0)
        # Exterior door heat loss: 2.0 m2 * 2.0 * 35 K = 140 W
        self.assertEqual(door_bd['heat_loss_w'], 140.0)

    def test_radiator_en442_correction(self):
        # Rated: 1500W at 75/65/20 (Delta T = 50K)
        # Actual regime: 65/55/20 -> Tm = 60°C, Delta T = 40K
        # Correction factor: (40 / 50) ^ 1.30 = 0.8 ^ 1.30 ≈ 0.748
        # Actual power: 1500 * 0.748 ≈ 1122 W
        model = RadiatorModelData(
            model_id="radik-22-500-1000",
            manufacturer="Korado",
            model_name="Radik Klasik 22 500x1000",
            radiator_type="panel_22",
            height_mm=500,
            length_mm=1000,
            depth_mm=100,
            rated_power_w=1500.0,
            rated_delta_t=50.0,
            exponent_n=1.30
        )
        inp = RadiatorSelectionInput(
            heat_demand_w=2000.0,
            t_supply=65.0,
            t_return=55.0,
            t_room=20.0,
            selected_model=model
        )
        res = calculate_radiator_selection(inp)

        self.assertAlmostEqual(res.effective_delta_t, 40.0, delta=0.5)
        self.assertAlmostEqual(res.correction_factor, 0.748, delta=0.01)
        self.assertAlmostEqual(res.actual_power_per_unit_w, 1122.0, delta=10.0)
        # Need 2000 W -> 2000 / 1122 = 1.78 -> 2 units
        self.assertEqual(res.recommended_quantity, 2)
        self.assertGreater(res.total_provided_power_w, 2000.0)
        self.assertGreater(res.power_reserve_percent, 0)

    def test_underfloor_circuit_limits_and_lengths(self):
        # 6m x 5m room = 30 m2. Excluded area (cabinets) = 4 m2.
        # Heated area = 26 m2.
        # Spacing = 150 mm (0.15 m).
        # L_floor = 26 / 0.15 * 1.05 ≈ 182 m.
        # Max circuit length = 85 m.
        # Should split into multiple circuits (at least 3 circuits).
        ex = ExcludedArea(name="Garnitur", width=2.0, length=2.0)
        inp = UnderfloorHeatingInput(
            room_length=6.0,
            room_width=5.0,
            spacing_mm=150,
            pipe_nominal_dia_mm=16.0,
            pipe_wall_thickness_mm=2.0,
            manifold_distance_m=5.0,
            max_circuit_length_m=85.0,
            excluded_areas=[ex]
        )
        res = calculate_underfloor_heating(inp)

        self.assertEqual(res.total_room_area, 30.0)
        self.assertEqual(res.excluded_area, 4.0)
        self.assertEqual(res.heated_floor_area, 26.0)
        self.assertGreaterEqual(res.num_circuits, 3)
        self.assertEqual(res.manifold_outlets_needed, res.num_circuits)
        self.assertEqual(len(res.circuits), res.num_circuits)
        # All circuit lengths should be within or near limit
        for c in res.circuits:
            self.assertGreater(c.total_length_m, 0)
            self.assertGreater(len(c.points), 0)

    def test_hydraulics_and_pipe_sizing(self):
        # Power Q = 5000 W (5 kW), 75/65°C (Delta T = 10 K)
        # Mass flow = 5000 / (4186 * 10) = 0.1194 kg/s -> 430 kg/h
        # Volume flow ≈ 435 l/h
        inp = HydraulicInput(
            heat_power_w=5000.0,
            t_supply=75.0,
            t_return=65.0,
            pipe_length_m=20.0,
            pipe_nominal_dia_mm=20.0,
            pipe_wall_thickness_mm=2.0,  # di = 16 mm = 0.016 m
            pipe_material="pex"
        )
        res = calculate_hydraulics(inp)

        self.assertEqual(res.delta_t_k, 10.0)
        self.assertAlmostEqual(res.mass_flow_kg_h, 430.0, delta=5.0)
        self.assertAlmostEqual(res.volume_flow_l_h, 435.0, delta=10.0)
        # Velocity for di=16mm:
        # Area = pi * 0.016^2 / 4 = 2.01e-4 m2
        # v = (0.1194 / 988) / 2.01e-4 ≈ 0.60 m/s (ideal range 0.3 - 0.7 m/s!)
        self.assertAlmostEqual(res.velocity_m_s, 0.60, delta=0.08)
        self.assertGreater(res.reynolds_number, 2300)
        self.assertEqual(res.flow_regime, "Turbulent")
        self.assertGreater(res.total_pressure_loss_kpa, 0)
        self.assertIsNotNone(res.recommended_pipe)


if __name__ == "__main__":
    unittest.main()
