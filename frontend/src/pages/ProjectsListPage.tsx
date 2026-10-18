import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { api } from '../api/client';
import { NumericInput } from '../components/common/NumericInput';
import {
  FolderKanban,
  Plus,
  Search,
  Archive,
  Trash2,
  MapPin,
  User as UserIcon,
  Clock,
  ChevronRight,
  ExternalLink,
  X
} from 'lucide-react';

interface ProjectsListPageProps {
  onOpenProject: (id: number) => void;
  onCreateNew?: () => void;
}

export const ProjectsListPage: React.FC<ProjectsListPageProps> = ({ onOpenProject, onCreateNew }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterArchived, setFilterArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Yangi loyiha yaratish formasi
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    address: '',
    client_name: '',
    client_phone: '',
    outdoor_design_temp: -15.0,
    notes: '',
  });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const created = await api.createProject(newProjectForm);
      setIsCreateOpen(false);
      setNewProjectForm({
        name: '',
        address: '',
        client_name: '',
        client_phone: '',
        outdoor_design_temp: -15.0,
        notes: '',
      });
      onOpenProject(created.id);
    } catch (err: any) {
      alert("Loyiha yaratishda xatolik: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await api.getProjects(filterArchived);
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [filterArchived]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Ushbu loyihani butunlay o‘chirmoqchimisiz?")) return;
    try {
      await api.deleteProject(id);
      loadProjects();
    } catch (err: any) {
      alert("O‘chirishda xatolik: " + err.message);
    }
  };

  const handleToggleArchive = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.toggleArchive(id);
      loadProjects();
    } catch (err: any) {
      alert("Xatolik: " + err.message);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.client_name && p.client_name.toLowerCase().includes(q)) ||
      (p.address && p.address.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Sarlavha va asboblar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Barcha Isitish Loyihalari</h1>
          <p className="text-xs text-slate-500">Mijozlar buyurtmalari va binolar ro‘yxati</p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yangi loyiha yaratish
        </button>
      </div>

      {/* Qidiruv va Filtr */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Loyiha nomi, mijoz yoki manzil bo‘yicha qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setFilterArchived(false)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              !filterArchived ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Faol loyihalar
          </button>
          <button
            onClick={() => setFilterArchived(true)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterArchived ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Arxivlangan
          </button>
        </div>
      </div>

      {/* Loyihalar ro'yxati */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Loyihalar yuklanmoqda...</div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              onClick={() => onOpenProject(p.id)}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-400 cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                    {p.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleToggleArchive(p.id, e)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                      title={p.is_archived ? "Arxivdan chiqarish" : "Arxivlash"}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(p.id, e)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-md"
                      title="O‘chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {p.client_name && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{p.client_name}</span>
                  </div>
                )}

                {p.address && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="line-clamp-1">{p.address}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 py-2.5 border-t border-slate-100 text-xs text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Xonalar</span>
                    <span className="font-bold text-slate-800">{p.total_rooms_count} ta</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Maydon</span>
                    <span className="font-bold text-slate-800">{p.total_area_m2?.toFixed(0)} m²</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Quvvat</span>
                    <span className="font-bold text-blue-600">
                      {(p.total_heat_loss_w / 1000.0).toFixed(1)} kVt
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(p.updated_at).toLocaleDateString('uz-UZ')}
                </span>
                <span className="font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  Loyiha tafsilotlari →
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
          Hech qanday loyiha topilmadi.
        </div>
      )}

      {/* Yangi loyiha yaratish modali */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Yangi isitish loyihasi yaratish</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Loyiha nomi *</label>
                <input
                  type="text"
                  required
                  placeholder="2 qavatli hovli, Chilonzor..."
                  value={newProjectForm.name}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Obyekt manzili</label>
                <input
                  type="text"
                  placeholder="Toshkent sh., Yunusobod tumani..."
                  value={newProjectForm.address}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, address: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Buyurtmachi ismi</label>
                  <input
                    type="text"
                    placeholder="Alisher Valiyev"
                    value={newProjectForm.client_name}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, client_name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Telefon raqami</label>
                  <input
                    type="text"
                    placeholder="+998 90 123 45 67"
                    value={newProjectForm.client_phone}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, client_phone: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Tashqi hisobiy harorat (°C)</label>
                <NumericInput
                  step={0.5}
                  allowNegative={true}
                  value={newProjectForm.outdoor_design_temp}
                  onChange={(val) => setNewProjectForm({ ...newProjectForm, outdoor_design_temp: val })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
                <span className="text-[10px] text-slate-400">Toshkent: -15°C, Samarqand: -12°C, Nukus: -19°C</span>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Eslatma va texnik topshiriq</label>
                <textarea
                  rows={2}
                  placeholder="Kondensatsion qozon, issiq pol va radiatorlar rejimi..."
                  value={newProjectForm.notes}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {creating ? "Yaratilmoqda..." : "Loyihani yaratish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
