import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Package, 
  Layers, 
  Flame, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Settings,
  FolderKanban,
  Upload,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { api } from '../api/client';
import { RadiatorCatalogItem, PipeSpecification, User, AdminSystemStats } from '../types';
import { NumericInput } from '../components/common/NumericInput';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'radiators' | 'pipes' | 'users' | 'settings'>('radiators');
  const [stats, setStats] = useState<AdminSystemStats | null>(null);
  const [radiators, setRadiators] = useState<RadiatorCatalogItem[]>([]);
  const [pipes, setPipes] = useState<PipeSpecification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showRadiatorModal, setShowRadiatorModal] = useState(false);
  const [editingRadiator, setEditingRadiator] = useState<RadiatorCatalogItem | null>(null);

  const [showPipeModal, setShowPipeModal] = useState(false);
  const [editingPipe, setEditingPipe] = useState<PipeSpecification | null>(null);

  // Radiator form state
  const [radForm, setRadForm] = useState({
    manufacturer: '',
    model_name: '',
    radiator_type: 'panel_22',
    height_mm: 500,
    length_mm: 1000,
    depth_mm: 100,
    rated_power_w: 1930,
    rated_delta_t: 50,
    exponent_n: 1.30,
    price_uzs: 1000000,
    image_url: '',
  });

  // Pipe form state
  const [pipeForm, setPipeForm] = useState({
    name: '',
    material: 'pex_a',
    nominal_dia_mm: 16,
    wall_thickness_mm: 2.0,
    internal_dia_mm: 12.0,
    roughness_mm: 0.007,
    price_per_meter_uzs: 9500,
    image_url: '',
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleFileUpload = async (file: File, target: 'radiator' | 'pipe') => {
    try {
      setUploadingImage(true);
      const res = await api.uploadImage(file);
      if (target === 'radiator') {
        setRadForm(prev => ({ ...prev, image_url: res.url }));
      } else {
        setPipeForm(prev => ({ ...prev, image_url: res.url }));
      }
      showNotification("Rasm muvaffaqiyatli yuklandi!");
    } catch (err: any) {
      alert("Rasm yuklashda xatolik yuz berdi: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, radsData, pipesData, usersData] = await Promise.all([
        api.getAdminStats().catch(() => null),
        api.getRadiators(),
        api.getPipes(),
        api.getAdminUsers().catch(() => []),
      ]);

      setStats(statsData);
      setRadiators(radsData);
      setPipes(pipesData);
      setUsers(usersData);
    } catch (err: any) {
      setError(err.message || 'Ma’lumotlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // ---------------- Radiator Actions ----------------
  const handleOpenRadiatorModal = (rad?: RadiatorCatalogItem) => {
    if (rad) {
      setEditingRadiator(rad);
      setRadForm({
        manufacturer: rad.manufacturer,
        model_name: rad.model_name,
        radiator_type: rad.radiator_type,
        height_mm: rad.height_mm,
        length_mm: rad.length_mm,
        depth_mm: rad.depth_mm,
        rated_power_w: rad.rated_power_w,
        rated_delta_t: rad.rated_delta_t,
        exponent_n: rad.exponent_n,
        price_uzs: rad.price_uzs,
        image_url: rad.display_image || rad.image_url || '',
      });
    } else {
      setEditingRadiator(null);
      setRadForm({
        manufacturer: 'Korado',
        model_name: '',
        radiator_type: 'panel_22',
        height_mm: 500,
        length_mm: 1000,
        depth_mm: 100,
        rated_power_w: 1930,
        rated_delta_t: 50,
        exponent_n: 1.30,
        price_uzs: 1100000,
        image_url: '',
      });
    }
    setShowRadiatorModal(true);
  };

  const handleSaveRadiator = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRadiator) {
        await api.updateRadiator(editingRadiator.id, radForm);
        showNotification("Radiator ma'lumotlari muvaffaqiyatli yangilandi");
      } else {
        await api.createRadiator(radForm as any);
        showNotification("Yangi radiator katalogga qo'shildi");
      }
      setShowRadiatorModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Xatolik yuz berdi");
    }
  };

  const handleDeleteRadiator = async (id: number) => {
    if (!window.confirm("Haqiqatan ham ushbu radiatorni katalogdan o'chirmoqchimisiz?")) return;
    try {
      await api.deleteRadiator(id);
      showNotification("Radiator o'chirildi");
      loadData();
    } catch (err: any) {
      alert(err.message || "O'chirishda xatolik yuz berdi");
    }
  };

  // ---------------- Pipe Actions ----------------
  const handleOpenPipeModal = (pipe?: PipeSpecification) => {
    if (pipe) {
      setEditingPipe(pipe);
      setPipeForm({
        name: pipe.name,
        material: pipe.material,
        nominal_dia_mm: pipe.nominal_dia_mm,
        wall_thickness_mm: pipe.wall_thickness_mm,
        internal_dia_mm: pipe.internal_dia_mm,
        roughness_mm: pipe.roughness_mm,
        price_per_meter_uzs: pipe.price_per_meter_uzs,
        image_url: (pipe as any).display_image || (pipe as any).image_url || '',
      });
    } else {
      setEditingPipe(null);
      setPipeForm({
        name: '',
        material: 'pex_a',
        nominal_dia_mm: 16,
        wall_thickness_mm: 2.0,
        internal_dia_mm: 12.0,
        roughness_mm: 0.007,
        price_per_meter_uzs: 9500,
        image_url: '',
      });
    }
    setShowPipeModal(true);
  };

  const handleSavePipe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...pipeForm,
        internal_dia_mm: pipeForm.nominal_dia_mm - (2 * pipeForm.wall_thickness_mm),
      };
      if (editingPipe) {
        await api.updatePipe(editingPipe.id, data);
        showNotification("Quvur ma'lumotlari yangilandi");
      } else {
        await api.createPipe(data);
        showNotification("Yangi quvur spetsifikatsiyasi qo'shildi");
      }
      setShowPipeModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Xatolik yuz berdi");
    }
  };

  const handleDeletePipe = async (id: number) => {
    if (!window.confirm("Ushbu quvur spetsifikatsiyasini o'chirmoqchimisiz?")) return;
    try {
      await api.deletePipe(id);
      showNotification("Quvur o'chirildi");
      loadData();
    } catch (err: any) {
      alert(err.message || "Xatolik yuz berdi");
    }
  };

  // ---------------- User Toggle Status ----------------
  const handleToggleUserActive = async (user: User) => {
    const newStatus = !user.is_active;
    const confirmText = newStatus 
      ? `'${user.username}' foydalanuvchisini faollashtirmoqchimisiz?`
      : `'${user.username}' hisobini bloklamoqchimisiz?`;
    if (!window.confirm(confirmText)) return;

    try {
      await api.updateAdminUser(user.id, { is_active: newStatus });
      showNotification(`Foydalanuvchi holati o'zgartirildi`);
      loadData();
    } catch (err: any) {
      alert(err.message || "Foydalanuvchi holatini o'zgartirishda xatolik");
    }
  };

  // Filtered lists
  const filteredRadiators = radiators.filter(r => 
    r.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPipes = pipes.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.material.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.first_name + ' ' + u.last_name).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="p-2 bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-800/40">
              SantexPro Tizim Boshqaruvi
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Sayt Admin Paneli</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Katalogdagi radiatorlar, quvurlar, narxlar, tizim foydalanuvchilari va muhandislik sozlamalarini bevosita veb-interfeysdan boshqaring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleOpenRadiatorModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-600/30"
          >
            <Plus className="w-4 h-4" /> Radiator qo‘shish
          </button>
          <button 
            onClick={() => handleOpenPipeModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-600/30"
          >
            <Plus className="w-4 h-4" /> Truba qo‘shish
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.total_users}</div>
              <div className="text-xs text-slate-500">Ro‘yxatdan o‘tgan ustalar</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.total_projects}</div>
              <div className="text-xs text-slate-500">Jami hisoblangan loyihalar</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{radiators.length + pipes.length}</div>
              <div className="text-xs text-slate-500">Katalog tovarlari (Radiator/Truba)</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.total_heat_demand_kw} <span className="text-sm font-normal text-slate-500">kVt</span></div>
              <div className="text-xs text-slate-500">Umumiy hisoblangan quvvat</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('radiators')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'radiators' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Radiatorlar katalogi ({radiators.length})
            </button>
            <button
              onClick={() => setActiveTab('pipes')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'pipes' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Trubalar va Quvurlar ({pipes.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'users' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Foydalanuvchilar ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'settings' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tizim sozlamalari
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Tab 1: Radiators */}
        {activeTab === 'radiators' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-16 text-center">Rasm</th>
                  <th className="px-6 py-3.5">Ishlab chiqaruvchi</th>
                  <th className="px-6 py-3.5">Model nomi</th>
                  <th className="px-6 py-3.5">Turi</th>
                  <th className="px-6 py-3.5">O‘lchamlari (BxUxQ)</th>
                  <th className="px-6 py-3.5">Nominal quvvat (ΔT=50K)</th>
                  <th className="px-6 py-3.5">Narxi (so‘m)</th>
                  <th className="px-6 py-3.5 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRadiators.map((rad) => (
                  <tr key={rad.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-center">
                      {rad.display_image || rad.image_url ? (
                        <img
                          src={rad.display_image || rad.image_url}
                          alt={rad.model_name}
                          className="w-12 h-10 object-cover rounded-lg border border-slate-200 bg-white mx-auto shadow-2xs"
                        />
                      ) : (
                        <div className="w-12 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 mx-auto">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{rad.manufacturer}</td>
                    <td className="px-6 py-4">{rad.model_name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-xs font-medium">
                        {rad.radiator_type_display || rad.radiator_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{rad.height_mm}×{rad.length_mm}×{rad.depth_mm} mm</td>
                    <td className="px-6 py-4 font-semibold text-rose-600">{rad.rated_power_w} Vt</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{rad.price_uzs.toLocaleString()} so‘m</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenRadiatorModal(rad)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Tahrirlash"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteRadiator(rad.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRadiators.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">Radiatorlar topilmadi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Pipes */}
        {activeTab === 'pipes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-16 text-center">Rasm</th>
                  <th className="px-6 py-3.5">Nomi</th>
                  <th className="px-6 py-3.5">Material</th>
                  <th className="px-6 py-3.5">Tashqi diametr</th>
                  <th className="px-6 py-3.5">Devor qalinligi</th>
                  <th className="px-6 py-3.5">Ichki diametr ($d_i$)</th>
                  <th className="px-6 py-3.5">Metr narxi</th>
                  <th className="px-6 py-3.5 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPipes.map((pipe) => (
                  <tr key={pipe.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-center">
                      {(pipe as any).display_image || (pipe as any).image_url ? (
                        <img
                          src={(pipe as any).display_image || (pipe as any).image_url}
                          alt={pipe.name}
                          className="w-12 h-10 object-cover rounded-lg border border-slate-200 bg-white mx-auto shadow-2xs"
                        />
                      ) : (
                        <div className="w-12 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 mx-auto">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{pipe.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-medium">
                        {pipe.material_display || pipe.material}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono">{pipe.nominal_dia_mm} mm</td>
                    <td className="px-6 py-4 font-mono">{pipe.wall_thickness_mm} mm</td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-800">{pipe.internal_dia_mm} mm</td>
                    <td className="px-6 py-4 font-semibold text-emerald-700">{pipe.price_per_meter_uzs.toLocaleString()} so‘m/m</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenPipeModal(pipe)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Tahrirlash"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeletePipe(pipe.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Users */}
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Foydalanuvchi</th>
                  <th className="px-6 py-3.5">F.I.Sh</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Loyihalari soni</th>
                  <th className="px-6 py-3.5">Roli</th>
                  <th className="px-6 py-3.5">Holati</th>
                  <th className="px-6 py-3.5 text-right">Boshqaruv</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                        {u.username.substring(0, 2).toUpperCase()}
                      </div>
                      <span>{u.username}</span>
                    </td>
                    <td className="px-6 py-4">{u.first_name || u.last_name ? `${u.first_name} ${u.last_name}` : '—'}</td>
                    <td className="px-6 py-4 text-slate-500">{u.email || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-full text-xs">
                        {u.projects_count ?? 0} ta loyiha
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.is_superuser || u.is_staff ? (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-semibold text-xs border border-indigo-200">
                          Administrator
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium text-xs">
                          Santexnik-usta
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Faol
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span> Bloklangan
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.username !== 'admin' && (
                        <button
                          onClick={() => handleToggleUserActive(u)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                            u.is_active
                              ? 'border-rose-300 text-rose-700 hover:bg-rose-50'
                              : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {u.is_active ? "Bloklash" : "Faollashtirish"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: System Settings */}
        {activeTab === 'settings' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Standart Qurilish Me’yori Koeffitsiyentlari (KMK va EN 12831)</h3>
              <p className="text-sm text-slate-500">Yangi xona va binolar yaratilganda avtomatik taklif etiladigan issiqlik o‘tkazuvchanlik U-qiymatlari:</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs text-slate-500 uppercase font-semibold">Tashqi devor (Standart)</div>
                <div className="text-xl font-bold text-slate-900 mt-1">U = 0.42 <span className="text-xs font-normal text-slate-500">Vt/(m²·K)</span></div>
                <div className="text-xs text-slate-400 mt-1">Pishgan g‘isht 38 sm + 5 sm izolyatsiya</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs text-slate-500 uppercase font-semibold">Standart deraza</div>
                <div className="text-xl font-bold text-slate-900 mt-1">U = 1.80 <span className="text-xs font-normal text-slate-500">Vt/(m²·K)</span></div>
                <div className="text-xs text-slate-400 mt-1">2 qavatli energiya tejamkor Low-E</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs text-slate-500 uppercase font-semibold">Pol (Zamin / Yerto‘la)</div>
                <div className="text-xl font-bold text-slate-900 mt-1">U = 0.35 <span className="text-xs font-normal text-slate-500">Vt/(m²·K)</span></div>
                <div className="text-xs text-slate-400 mt-1">Beton stiajka + 5 sm XPS penopolistirol</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs text-slate-500 uppercase font-semibold">Shift / Tom</div>
                <div className="text-xl font-bold text-slate-900 mt-1">U = 0.32 <span className="text-xs font-normal text-slate-500">Vt/(m²·K)</span></div>
                <div className="text-xs text-slate-400 mt-1">Mineral paxta 10 sm izolyatsiyasi</div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-base font-bold text-slate-900 mb-2">O‘zbekiston Hududlari Bo‘yicha Hisobiy Tashqi Haroratlar (T_tashqi)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-sm">
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg">
                  <div className="text-xs text-slate-500">Toshkent shahri</div>
                  <div className="text-lg font-bold text-blue-900 mt-0.5">-15.0°C</div>
                </div>
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg">
                  <div className="text-xs text-slate-500">Samarqand</div>
                  <div className="text-lg font-bold text-blue-900 mt-0.5">-12.0°C</div>
                </div>
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg">
                  <div className="text-xs text-slate-500">Buxoro</div>
                  <div className="text-lg font-bold text-blue-900 mt-0.5">-10.0°C</div>
                </div>
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg">
                  <div className="text-xs text-slate-500">Andijon / Farg‘ona</div>
                  <div className="text-lg font-bold text-blue-900 mt-0.5">-14.0°C</div>
                </div>
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg">
                  <div className="text-xs text-slate-500">Nukus / Xorazm</div>
                  <div className="text-lg font-bold text-blue-900 mt-0.5">-19.0°C</div>
                </div>
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg">
                  <div className="text-xs text-slate-500">Termiz</div>
                  <div className="text-lg font-bold text-blue-900 mt-0.5">-6.0°C</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------------- Radiator Add/Edit Modal ---------------- */}
      {showRadiatorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {editingRadiator ? "Radiatorni tahrirlash" : "Yangi radiator modelini qo‘shish"}
              </h3>
              <button onClick={() => setShowRadiatorModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRadiator} className="mt-4 space-y-4">
              {/* Rasm yuklash va URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Radiator rasmi (foto)</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {radForm.image_url ? (
                      <img src={radForm.image_url} alt="Radiator" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition">
                        {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        <span>Kompyuterdan rasm tanlash</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'radiator');
                          }}
                        />
                      </label>
                      {radForm.image_url && (
                        <button
                          type="button"
                          onClick={() => setRadForm({ ...radForm, image_url: '' })}
                          className="text-[11px] text-rose-600 hover:underline"
                        >
                          Rasmni olib tashlash
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      value={radForm.image_url}
                      onChange={(e) => setRadForm({ ...radForm, image_url: e.target.value })}
                      placeholder="Yoki rasm URL havolasini kiriting (https://...)"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ishlab chiqaruvchi (Brend)</label>
                  <input
                    type="text"
                    required
                    value={radForm.manufacturer}
                    onChange={(e) => setRadForm({ ...radForm, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Masalan: Korado, Purmo, Global"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Model nomi</label>
                  <input
                    type="text"
                    required
                    value={radForm.model_name}
                    onChange={(e) => setRadForm({ ...radForm, model_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Masalan: Radik 22 500x1000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Radiator turi</label>
                  <select
                    value={radForm.radiator_type}
                    onChange={(e) => setRadForm({ ...radForm, radiator_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="panel_11">Panel 11 (1 panel + 1 konvektor)</option>
                    <option value="panel_21">Panel 21 (2 panel + 1 konvektor)</option>
                    <option value="panel_22">Panel 22 (2 panel + 2 konvektor)</option>
                    <option value="panel_33">Panel 33 (3 panel + 3 konvektor)</option>
                    <option value="sectional_al">Seksiyali alyuminiy</option>
                    <option value="sectional_bi">Bimetall seksiya</option>
                    <option value="tubular">Trubkali dizayn-radiator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal quvvat (Vt, ΔT=50K)</label>
                  <NumericInput
                    min={50}
                    max={10000}
                    fallbackValue={1930}
                    value={radForm.rated_power_w}
                    onChange={(val) => setRadForm({ ...radForm, rated_power_w: val })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-semibold text-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Balandligi (mm)</label>
                  <NumericInput
                    min={100}
                    max={3000}
                    fallbackValue={500}
                    value={radForm.height_mm}
                    onChange={(val) => setRadForm({ ...radForm, height_mm: val })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Uzunligi (mm)</label>
                  <NumericInput
                    min={100}
                    max={5000}
                    fallbackValue={1000}
                    value={radForm.length_mm}
                    onChange={(val) => setRadForm({ ...radForm, length_mm: val })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Qalinligi (mm)</label>
                  <NumericInput
                    min={20}
                    max={500}
                    fallbackValue={100}
                    value={radForm.depth_mm}
                    onChange={(val) => setRadForm({ ...radForm, depth_mm: val })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">EN 442 koeffitsiyenti (n)</label>
                  <NumericInput
                    step={0.01}
                    min={1.0}
                    max={2.0}
                    fallbackValue={1.30}
                    value={radForm.exponent_n}
                    onChange={(val) => setRadForm({ ...radForm, exponent_n: val })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Narxi (so‘m)</label>
                  <NumericInput
                    step={1000}
                    min={0}
                    fallbackValue={1000000}
                    value={radForm.price_uzs}
                    onChange={(val) => setRadForm({ ...radForm, price_uzs: val })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRadiatorModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-sm"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- Pipe Add/Edit Modal ---------------- */}
      {showPipeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPipe ? "Quvurni tahrirlash" : "Yangi truba spetsifikatsiyasini qo‘shish"}
              </h3>
              <button onClick={() => setShowPipeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePipe} className="mt-4 space-y-4">
              {/* Truba rasmi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quvur rasmi (foto)</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {pipeForm.image_url ? (
                      <img src={pipeForm.image_url} alt="Truba" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition">
                        {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        <span>Kompyuterdan rasm tanlash</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'pipe');
                          }}
                        />
                      </label>
                      {pipeForm.image_url && (
                        <button
                          type="button"
                          onClick={() => setPipeForm({ ...pipeForm, image_url: '' })}
                          className="text-[11px] text-rose-600 hover:underline"
                        >
                          Rasmni olib tashlash
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      value={pipeForm.image_url}
                      onChange={(e) => setPipeForm({ ...pipeForm, image_url: e.target.value })}
                      placeholder="Yoki rasm URL havolasini kiriting (https://...)"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quvur nomi va tavsifi</label>
                <input
                  type="text"
                  required
                  value={pipeForm.name}
                  onChange={(e) => setPipeForm({ ...pipeForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Masalan: PEX-A EVOH 16x2.0 mm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Material turi</label>
                  <select
                    value={pipeForm.material}
                    onChange={(e) => setPipeForm({ ...pipeForm, material: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="pex_a">PEX-A (tikilgan polietilen)</option>
                    <option value="pe_rt">PE-RT (issiqlikka chidamli polietilen)</option>
                    <option value="pert_al_pert">Metalloplastik (PE-RT/AL/PE-RT)</option>
                    <option value="ppr">Polipropilen (PPR)</option>
                    <option value="copper">Mis quvur (Copper)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">1 metr narxi (so‘m/m)</label>
                  <NumericInput
                    step={100}
                    min={0}
                    fallbackValue={9500}
                    value={pipeForm.price_per_meter_uzs}
                    onChange={(val) => setPipeForm({ ...pipeForm, price_per_meter_uzs: val })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tashqi diametr (mm)</label>
                  <NumericInput
                    step={0.1}
                    min={5}
                    max={200}
                    fallbackValue={16}
                    value={pipeForm.nominal_dia_mm}
                    onChange={(val) => setPipeForm({ ...pipeForm, nominal_dia_mm: val })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Devor qalinligi (mm)</label>
                  <NumericInput
                    step={0.1}
                    min={0.5}
                    max={50}
                    fallbackValue={2.0}
                    value={pipeForm.wall_thickness_mm}
                    onChange={(val) => setPipeForm({ ...pipeForm, wall_thickness_mm: val })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPipeModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-sm"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
