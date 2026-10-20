import React, { useState, useEffect } from 'react';
import { DashboardStats, Project } from '../types';
import { api } from '../api/client';
import {
  FolderKanban,
  Layers,
  Flame,
  Plus,
  Calculator,
  FileSpreadsheet,
  ArrowRight,
  Clock,
  MapPin,
  User as UserIcon,
  Sparkles
} from 'lucide-react';
import { NumericInput } from '../components/common/NumericInput';

interface DashboardPageProps {
  onOpenProject: (id: number) => void;
  onOpenProjectsList: () => void;
  onOpenQuickCalc: () => void;
  onOpenCatalog: () => void;
  onCreateProjectSuccess: (id: number) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenProject,
  onOpenProjectsList,
  onOpenQuickCalc,
  onOpenCatalog,
  onCreateProjectSuccess,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Yangi loyiha yaratish formasi
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    address: '',
    client_name: '',
    client_phone: '',
    outdoor_design_temp: -15.0,
    notes: '',
  });

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createProject(newProjectForm);
      setIsCreateOpen(false);
      onCreateProjectSuccess(created.id);
    } catch (err: any) {
      alert("Loyiha yaratishda xatolik: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner / Xush kelibsiz */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-blue-100 text-xs font-semibold mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            SantexPro Muhandislik Tizimi
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Xonalarni Isitish Tizimlarini Aniq va Tezkor Loyihalang
          </h1>
          <p className="text-sm text-blue-100 mt-2 leading-relaxed">
            EN 12831, EN 442 va EN 1264 standartlari asosida issiqlik yo‘qotilishi,
            radiatorlar, issiq pol trubalari, gidravlika va materiallar smetasini hisoblang.
          </p>

          <div className="flex items-center gap-3 mt-6 flex-wrap">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Yangi loyiha yaratish
            </button>
            <button
              onClick={() => onOpenProject(15)}
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-blue-800" />
              Uponor Namunaviy Loyihasi (7 xona)
            </button>
            <button
              onClick={onOpenQuickCalc}
              className="flex items-center gap-2 bg-blue-800/60 hover:bg-blue-800 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all border border-white/20"
            >
              <Calculator className="w-4 h-4" />
              Tezkor hisoblagich
            </button>
          </div>
        </div>
      </div>

      {/* Statistik ko'rsatkichlar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Loyihalar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500">Jami loyihalar</span>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {stats?.total_projects || 0} <span className="text-xs font-normal text-slate-400">ta</span>
            </div>
          </div>
        </div>

        {/* Xonalar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500">Hisoblangan xonalar</span>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {stats?.total_rooms || 0} <span className="text-xs font-normal text-slate-400">ta</span>
            </div>
          </div>
        </div>

        {/* Issiqlik quvvati */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500">Jami hisobiy quvvat</span>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {stats?.total_heat_demand_kw?.toFixed(1) || 0} <span className="text-xs font-normal text-slate-400">kVt</span>
            </div>
          </div>
        </div>
      </div>

      {/* So'nggi tahrirlangan loyihalar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">So‘nggi loyihalar</h2>
            <p className="text-xs text-slate-500">Yaqinda ochilgan yoki tahrirlangan obyektlar</p>
          </div>
          <button
            onClick={onOpenProjectsList}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            Barchasini ko‘rish
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {stats?.recent_projects && stats.recent_projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.recent_projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => onOpenProject(proj.id)}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-400 cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">
                      {proj.name}
                    </h3>
                    {(proj.id === 15 || proj.total_rooms_count === 7) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 shrink-0">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Uponor Blueprint
                      </span>
                    )}
                  </div>

                  {proj.client_name && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{proj.client_name}</span>
                    </div>
                  )}

                  {proj.address && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="line-clamp-1">{proj.address}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 py-2.5 border-t border-slate-100 text-xs text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Xonalar</span>
                      <span className="font-bold text-slate-800">{proj.total_rooms_count} ta</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Maydon</span>
                      <span className="font-bold text-slate-800">{proj.total_area_m2?.toFixed(0)} m²</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Quvvat</span>
                      <span className="font-bold text-blue-600">
                        {(proj.total_heat_loss_w / 1000.0).toFixed(1)} kVt
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(proj.updated_at).toLocaleDateString('uz-UZ')}
                  </span>
                  <span className="font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Ochish →
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
            Hozircha loyihalar mavjud emas. Yuqoridagi "Yangi loyiha yaratish" tugmasini bosing.
          </div>
        )}
      </div>

      {/* Yangi loyiha yaratish modali */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="font-bold text-slate-900 text-base mb-4">Yangi isitish loyihasi yaratish</h3>
            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Loyiha nomi</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Chilonzor 9-mavze, 2 qavatli hovli"
                  value={newProjectForm.name}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Obyekt manzili</label>
                <input
                  type="text"
                  placeholder="Toshkent sh., Chilonzor tumani..."
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Loyihani yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
