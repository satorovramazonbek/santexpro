import { Project, Room, Building, DashboardStats, RadiatorCatalogItem, CatalogProduct, MaterialItem, WindowItem, DoorItem, User } from '../types';


const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('santexpro_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('santexpro_token', token);
    } else {
      localStorage.removeItem('santexpro_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Token ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
      // Trigger auth event or handle logout
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: response.statusText };
      }
      const message = typeof errorData === 'object' ? Object.values(errorData).flat().join(' ') : 'Xatolik yuz berdi';
      throw new Error(message || 'So‘rovda xatolik yuz berdi');
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Auth
  async login(username: string, password: string) {
    const data = await this.request<{ token: string; user: any; message: string }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async register(userData: { username: string; email?: string; first_name?: string; last_name?: string; password: string }) {
    const data = await this.request<{ token: string; user: any; message: string }>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.request<{ user: any }>('/auth/me/');
  }

  async logout() {
    try {
      await this.request('/auth/logout/', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  // Dashboard & Projects
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/projects/projects/dashboard_stats/');
  }

  async getProjects(archived?: boolean): Promise<Project[]> {
    const query = archived !== undefined ? `?archived=${archived}` : '';
    return this.request<Project[]>(`/projects/projects/${query}`);
  }

  async getProject(id: number): Promise<Project> {
    return this.request<Project>(`/projects/projects/${id}/`);
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    return this.request<Project>('/projects/projects/', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async updateProject(id: number, projectData: Partial<Project>): Promise<Project> {
    return this.request<Project>(`/projects/projects/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(projectData),
    });
  }

  async deleteProject(id: number): Promise<void> {
    return this.request<void>(`/projects/projects/${id}/`, {
      method: 'DELETE',
    });
  }

  async toggleArchive(id: number): Promise<{ message: string; is_archived: boolean }> {
    return this.request<{ message: string; is_archived: boolean }>(`/projects/projects/${id}/toggle_archive/`, {
      method: 'POST',
    });
  }

  // Building & Layout
  async getBuilding(projectId: number): Promise<Building> {
    return this.request<Building>(`/projects/projects/${projectId}/building/`);
  }

  async updateBuilding(projectId: number, data: Partial<Building> & { sync_rooms?: boolean }): Promise<Building> {
    return this.request<Building>(`/projects/projects/${projectId}/building/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async saveProjectLayout(projectId: number, rooms: { id: number; position_x: number; position_y: number }[]): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/projects/projects/${projectId}/layout/`, {
      method: 'POST',
      body: JSON.stringify({ rooms }),
    });
  }

  async updateManifold(projectId: number, data: Partial<any>): Promise<any> {
    return this.request<any>(`/projects/projects/${projectId}/manifold/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCircuitsRouting(projectId: number, circuits?: any[]): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/projects/projects/${projectId}/update-circuits-routing/`, {
      method: 'POST',
      body: JSON.stringify({ circuits: circuits || [] }),
    });
  }

  async seedBlueprint(projectId: number): Promise<{ status: string; message: string; data: any }> {
    return this.request<{ status: string; message: string; data: any }>(`/projects/projects/${projectId}/seed-blueprint/`, {
      method: 'POST',
    });
  }

  async getHydraulicsReport(projectId: number): Promise<any> {
    return this.request<any>(`/projects/projects/${projectId}/hydraulics-report/`);
  }

  async updateUnderfloorCircuit(circuitId: number, data: Partial<any>): Promise<any> {
    return this.request<any>(`/projects/underfloor-circuits/${circuitId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Rooms
  async getRoom(id: number): Promise<Room> {
    return this.request<Room>(`/projects/rooms/${id}/`);
  }

  async createRoom(roomData: Partial<Room>): Promise<Room> {
    return this.request<Room>('/projects/rooms/', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  }

  async updateRoom(id: number, roomData: Partial<Room>): Promise<Room> {
    return this.request<Room>(`/projects/rooms/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(roomData),
    });
  }

  async deleteRoom(id: number): Promise<void> {
    return this.request<void>(`/projects/rooms/${id}/`, {
      method: 'DELETE',
    });
  }

  // Windows & Doors
  async createWindow(data: Partial<WindowItem>): Promise<WindowItem> {
    return this.request<WindowItem>('/projects/windows/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteWindow(id: number): Promise<void> {
    return this.request<void>(`/projects/windows/${id}/`, {
      method: 'DELETE',
    });
  }

  async createDoor(data: Partial<DoorItem>): Promise<DoorItem> {
    return this.request<DoorItem>('/projects/doors/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteDoor(id: number): Promise<void> {
    return this.request<void>(`/projects/doors/${id}/`, {
      method: 'DELETE',
    });
  }

  // Calculations
  async calculateHeatLoss(roomId: number) {
    return this.request<any>(`/projects/rooms/${roomId}/calculate_heat_loss/`, {
      method: 'POST',
    });
  }

  async calculateRadiator(roomId: number, data: {
    heat_demand_w?: number;
    catalog_item_id?: number;
    custom_power_w?: number;
    t_supply?: number;
    t_return?: number;
    quantity?: number;
  }) {
    return this.request<any>(`/projects/rooms/${roomId}/calculate_radiator/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async calculateUnderfloor(roomId: number, data: {
    spacing_mm?: number;
    pipe_nominal_dia_mm?: number;
    pipe_wall_thickness_mm?: number;
    pipe_material?: string;
    manifold_distance_m?: number;
    max_circuit_length_m?: number;
    routing_pattern?: 'spiral' | 'serpentine';
    excluded_areas?: Array<{ name: string; width: number; length: number }>;
    custom_num_circuits?: number;
    num_circuits?: number;
  }) {
    return this.request<any>(`/projects/rooms/${roomId}/calculate_underfloor/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async calculateHydraulics(roomId: number, data: {
    heat_power_w?: number;
    t_supply?: number;
    t_return?: number;
    pipe_length_m?: number;
    pipe_nominal_dia_mm?: number;
    pipe_wall_thickness_mm?: number;
    pipe_material?: string;
  }) {
    return this.request<any>(`/projects/rooms/${roomId}/calculate_hydraulics/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Catalog
  async getRadiators(): Promise<RadiatorCatalogItem[]> {
    return this.request<RadiatorCatalogItem[]>('/catalog/radiators/');
  }

  async createRadiator(data: Partial<RadiatorCatalogItem>): Promise<RadiatorCatalogItem> {
    return this.request<RadiatorCatalogItem>('/catalog/radiators/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRadiator(id: number, data: Partial<RadiatorCatalogItem>): Promise<RadiatorCatalogItem> {
    return this.request<RadiatorCatalogItem>(`/catalog/radiators/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteRadiator(id: number): Promise<void> {
    return this.request<void>(`/catalog/radiators/${id}/`, {
      method: 'DELETE',
    });
  }

  async getPipes(): Promise<any[]> {
    return this.request<any[]>('/catalog/pipes/');
  }

  async createPipe(data: Partial<any>): Promise<any> {
    return this.request<any>('/catalog/pipes/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePipe(id: number, data: Partial<any>): Promise<any> {
    return this.request<any>(`/catalog/pipes/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePipe(id: number): Promise<void> {
    return this.request<void>(`/catalog/pipes/${id}/`, {
      method: 'DELETE',
    });
  }

  // Full Engineering Products Catalog (10 Categories)
  async getCatalogProducts(params?: {
    category?: string;
    subcategory?: string;
    manufacturer?: string;
    nominal_size?: string;
    is_verified?: boolean;
    search?: string;
    ordering?: string;
  }): Promise<CatalogProduct[]> {
    let query = '';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const q = searchParams.toString();
      if (q) query = `?${q}`;
    }
    return this.request<CatalogProduct[]>(`/catalog/products/${query}`);
  }

  async getCatalogProduct(id: number): Promise<CatalogProduct> {
    return this.request<CatalogProduct>(`/catalog/products/${id}/`);
  }

  async createCatalogProduct(data: Partial<CatalogProduct>): Promise<CatalogProduct> {
    return this.request<CatalogProduct>('/catalog/products/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCatalogProduct(id: number, data: Partial<CatalogProduct>): Promise<CatalogProduct> {
    return this.request<CatalogProduct>(`/catalog/products/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCatalogProduct(id: number): Promise<void> {
    return this.request<void>(`/catalog/products/${id}/`, {
      method: 'DELETE',
    });
  }

  async addProductToProjectMaterials(
    productId: number,
    projectId: number,
    quantity: number = 1,
    notes?: string
  ): Promise<{ message: string; item: MaterialItem }> {
    return this.request<{ message: string; item: MaterialItem }>(
      `/catalog/products/${productId}/add_to_project_materials/`,
      {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, quantity, notes }),
      }
    );
  }


  // Admin Portal API
  async getAdminUsers(): Promise<User[]> {
    return this.request<User[]>('/auth/admin/users/');
  }

  async updateAdminUser(id: number, data: { is_active?: boolean; is_staff?: boolean }): Promise<User> {
    return this.request<User>(`/auth/admin/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getAdminStats(): Promise<any> {
    return this.request<any>('/auth/admin/stats/');
  }


  // Materials
  async getMaterials(projectId: number): Promise<MaterialItem[]> {
    return this.request<MaterialItem[]>(`/materials/items/?project_id=${projectId}`);
  }

  async createMaterial(data: Partial<MaterialItem>): Promise<MaterialItem> {
    return this.request<MaterialItem>('/materials/items/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateMaterials(projectId: number): Promise<{ message: string; items: MaterialItem[]; total_cost_uzs: number }> {
    return this.request<{ message: string; items: MaterialItem[]; total_cost_uzs: number }>(
      `/materials/items/generate/${projectId}/`,
      { method: 'POST' }
    );
  }

  async updateMaterial(id: number, data: Partial<MaterialItem>): Promise<MaterialItem> {
    return this.request<MaterialItem>(`/materials/items/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteMaterial(id: number): Promise<void> {
    return this.request<void>(`/materials/items/${id}/`, {
      method: 'DELETE',
    });
  }

  // Image Upload
  async uploadImage(file: File): Promise<{ url: string; filename: string; size: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Token ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/catalog/upload-image/`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Rasm yuklashda xatolik yuz berdi");
    }

    return response.json();
  }

  // Material Image Upload (for project materials, accessible by project owners)
  async uploadMaterialImage(file: File): Promise<{ url: string; filename: string; size: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Token ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/materials/items/upload-image/`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Rasm yuklashda xatolik yuz berdi");
    }

    return response.json();
  }

  // PDF
  getPdfDownloadUrl(projectId: number): string {
    return `${API_BASE}/reports/project/${projectId}/pdf/`;
  }

  async downloadPdf(projectId: number, filename: string) {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Token ${this.token}`;
    }
    const response = await fetch(this.getPdfDownloadUrl(projectId), { headers });
    if (!response.ok) {
      throw new Error("PDF yuklab olishda xatolik yuz berdi");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export const api = new ApiClient();
