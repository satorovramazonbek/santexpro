export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  is_active?: boolean;
  date_joined?: string;
  projects_count?: number;
}

export interface PipeSpecification {
  id: number;
  name: string;
  material: 'pex_a' | 'pe_rt' | 'pert_al_pert' | 'ppr' | 'copper';
  material_display?: string;
  nominal_dia_mm: number;
  wall_thickness_mm: number;
  internal_dia_mm: number;
  roughness_mm: number;
  price_per_meter_uzs: number;
  image?: string | null;
  image_url?: string;
  display_image?: string;
}

export interface AdminSystemStats {
  total_users: number;
  total_projects: number;
  total_rooms: number;
  total_radiators_catalog: number;
  total_pipes_catalog: number;
  total_materials_items: number;
  total_heat_demand_kw: number;
}


export interface Floor {
  id: number;
  project: number;
  floor_number: number;
  name: string;
  height_m: number;
  elevation_m: number;
}

export interface Project {
  id: number;
  name: string;
  address: string;
  client_name: string;
  client_phone: string;
  outdoor_design_temp: number;
  notes: string;
  is_archived: boolean;
  total_rooms_count: number;
  total_area_m2: number;
  total_heat_loss_w: number;
  created_at: string;
  updated_at: string;
  building?: Building;
  floors?: Floor[];
  rooms?: Room[];
  manifolds?: Manifold[];
}

export interface Building {
  id: number;
  building_type: string;
  building_type_display?: string;
  floors_count: number;
  climate_zone?: string;
  wall_material_description: string;
  ceiling_material_description?: string;
  floor_material_description?: string;
  window_description?: string;
  wall_base_material?: string;
  insulation_material?: string;
  insulation_thickness_mm?: number;
  default_wall_u: number;
  default_window_u: number;
  default_door_u: number;
  default_floor_u: number;
  default_ceiling_u: number;
}

export interface WindowItem {
  id?: number;
  room?: number;
  name: string;
  wall_index: number;
  position_along_wall: number;
  width: number;
  height: number;
  glazing_type: string;
  glazing_type_display?: string;
  u_value: number;
  area?: number;
}

export interface DoorItem {
  id?: number;
  room?: number;
  name: string;
  wall_index: number;
  position_along_wall: number;
  width: number;
  height: number;
  door_type: string;
  door_type_display?: string;
  u_value: number;
  area?: number;
}

export interface WallItem {
  id?: number;
  wall_index: number;
  orientation: string;
  orientation_display?: string;
  length: number;
  is_exterior: boolean;
  u_value: number;
}

export interface RadiatorCatalogItem {
  id: number;
  manufacturer: string;
  model_name: string;
  radiator_type: string;
  radiator_type_display?: string;
  height_mm: number;
  length_mm: number;
  depth_mm: number;
  rated_power_w: number;
  rated_delta_t: number;
  exponent_n: number;
  price_uzs: number;
  image?: string | null;
  image_url?: string;
  display_image?: string;
}

export interface CatalogProduct {
  id: number;
  name: string;
  category: string;
  category_display?: string;
  subcategory: string;
  manufacturer: string;
  model_name: string;
  sku: string;
  nominal_size: string;
  connection_type: string;
  material: string;
  pn_bar?: number | null;
  max_temp_c?: number | null;
  kv_value?: number | null;
  power_w?: number | null;
  specifications: Record<string, any>;
  unit: string;
  price_uzs: number;
  is_available: boolean;
  is_verified: boolean;
  datasheet_url?: string;
  image?: string | null;
  image_url?: string;
  display_image?: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}


export interface RadiatorItem {
  id?: number;
  room?: number;
  catalog_item?: number | null;
  catalog_item_details?: RadiatorCatalogItem;
  custom_model_name?: string;
  custom_rated_power_w?: number | null;
  quantity: number;
  wall_index: number;
  position_x: number;
  position_y: number;
  t_supply: number;
  t_return: number;
  calculated_actual_power_w: number;
}

export interface UnderfloorCircuitItem {
  id?: number;
  room?: number;
  manifold?: number | null;
  manifold_port_index?: number | null;
  circuit_number: number;
  name: string;
  heated_area: number;
  spacing_mm: number;
  pipe_diameter_mm: number;
  pipe_wall_mm: number;
  pipe_material: string;
  pattern: 'spiral' | 'serpentine';
  floor_length_m: number;
  manifold_lead_in_m: number;
  total_length_m: number;
  color_hex: string;
  path_points: [number, number][];
  supply_path_points?: [number, number][];
  return_path_points?: [number, number][];
  feeder_supply_points?: [number, number][];
  feeder_return_points?: [number, number][];
  is_locked?: boolean;
}

export interface Manifold {
  id: number;
  name: string;
  room?: number | null;
  floor_number?: number;
  position_x: number;
  position_y: number;
  outlets_count: number;
  pipe_diameter_mm: number;
  model_name?: string;
}

export interface CalculationResult {
  id: number;
  room: number;
  calculation_type: 'heat_loss' | 'radiator' | 'underfloor' | 'hydraulics' | 'full';
  calculation_type_display?: string;
  input_parameters: Record<string, any>;
  output_results: Record<string, any>;
  assumptions: string[];
  warnings: string[];
  calculation_version: string;
  created_at: string;
}

export interface Room {
  id: number;
  project: number;
  name: string;
  floor_number: number;
  position_x?: number;
  position_y?: number;
  length: number;
  width: number;
  height: number;
  area: number;
  volume: number;
  exterior_walls_count: number;
  desired_temp: number;
  has_heated_above: boolean;
  has_heated_below: boolean;
  air_change_rate: number;
  wall_u_value: number;
  floor_u_value: number;
  ceiling_u_value: number;
  heating_preference: 'combined' | 'radiator_only' | 'underfloor_only';
  windows?: WindowItem[];
  doors?: DoorItem[];
  walls?: WallItem[];
  radiators?: RadiatorItem[];
  underfloor_circuits?: UnderfloorCircuitItem[];
  calculation_results?: CalculationResult[];
  manifolds?: Manifold[];
}

export interface MaterialItem {
  id: number;
  project: number;
  category: string;
  category_display?: string;
  name: string;
  unit: string;
  quantity: number;
  unit_price_uzs: number;
  total_price_uzs: number;
  is_auto_generated: boolean;
  notes: string;
  image?: string | null;
  image_url?: string;
  display_image?: string;
}

export interface DashboardStats {
  total_projects: number;
  total_rooms: number;
  total_heat_demand_kw: number;
  recent_projects: Project[];
}
