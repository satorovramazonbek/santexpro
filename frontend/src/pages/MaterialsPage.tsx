import React, { useState, useEffect } from 'react';
import { MaterialItem, Project } from '../types';
import { api } from '../api/client';
import { NumericInput } from '../components/common/NumericInput';
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  Save,
  Check,
  Upload,
  Image as ImageIcon,
  Loader2,
  ZoomIn,
  X,
  Flame,
  Layers,
  Sliders,
  Wrench,
  Shield,
  Package,
  ExternalLink,
  Info
} from 'lucide-react';

interface MaterialsPageProps {
  projectId: number;
  onBack: () => void;
}

// Category icon helper
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'radiator':
      return { Icon: Flame, bg: 'bg-rose-50 text-rose-600 border-rose-200' };
    case 'underfloor_pipe':
      return { Icon: Layers, bg: 'bg-amber-50 text-amber-600 border-amber-200' };
    case 'radiator_pipe':
      return { Icon: Layers, bg: 'bg-blue-50 text-blue-600 border-blue-200' };
    case 'manifold':
      return { Icon: Sliders, bg: 'bg-indigo-50 text-indigo-600 border-indigo-200' };
    case 'valve':
      return { Icon: Sliders, bg: 'bg-teal-50 text-teal-600 border-teal-200' };
    case 'fittings':
      return { Icon: Wrench, bg: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
    case 'insulation':
      return { Icon: Shield, bg: 'bg-sky-50 text-sky-600 border-sky-200' };
    default:
      return { Icon: Package, bg: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
};

// 64x64 px table thumbnail with error fallback & click-to-zoom
const MaterialThumbnail: React.FC<{
  item: MaterialItem;
  onClick: () => void;
}> = ({ item, onClick }) => {
  const [imageError, setImageError] = useState(false);
  const imageUrl = item.display_image || item.image_url;
  const { Icon, bg } = getCategoryIcon(item.category);

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  const hasValidImage = !!imageUrl && !imageError;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-16 h-16 min-w-[64px] min-h-[64px] rounded-xl border border-slate-200 bg-white p-1 shadow-2xs hover:border-blue-400 hover:shadow-md transition-all duration-200 flex items-center justify-center overflow-hidden cursor-pointer"
      title={`${item.name} rasmini kattalashtirib ko‘rish`}
    >
      {hasValidImage ? (
        <img
          src={imageUrl}
          alt={item.name}
          onError={() => setImageError(true)}
          className="w-full h-full object-contain rounded-lg transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className={`w-full h-full rounded-lg flex flex-col items-center justify-center border ${bg} transition-colors`}>
          <Icon className="w-5 h-5 mb-0.5 opacity-90" />
          <span className="text-[9px] font-semibold uppercase tracking-tight scale-90 opacity-75">
            {item.category === 'underfloor_pipe'
              ? 'TRUBA'
              : item.category === 'manifold'
              ? 'KOLLEKTOR'
              : item.category === 'radiator'
              ? 'RADIK'
              : item.category === 'fittings'
              ? 'FITING'
              : 'DETAL'}
          </span>
        </div>
      )}

      {/* Hover Zoom Overlay */}
      <div className="absolute inset-0 bg-slate-900/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[1px]">
        <ZoomIn className="w-5 h-5 drop-shadow-md" />
      </div>
    </button>
  );
};

// Lightbox Modal for Full View
const ImageLightboxModal: React.FC<{
  item: MaterialItem | null;
  onClose: () => void;
  onEdit: (item: MaterialItem) => void;
}> = ({ item, onClose, onEdit }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [item?.id, item?.display_image, item?.image_url]);

  useEffect(() => {
    if (!item) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [item, onClose]);

  if (!item) return null;

  const imageUrl = item.display_image || item.image_url;
  const hasValidImage = !!imageUrl && !imgError;
  const { Icon, bg } = getCategoryIcon(item.category);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {item.category_display || item.category}
            </span>
            <span className="text-xs text-slate-400">№ {item.id}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title="Yopish (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Image Area */}
        <div className="flex-1 bg-gradient-to-b from-slate-100/60 to-slate-50 p-6 flex items-center justify-center min-h-[260px] sm:min-h-[360px] overflow-hidden">
          {hasValidImage ? (
            <img
              src={imageUrl}
              alt={item.name}
              onError={() => setImgError(true)}
              className="max-h-[50vh] w-auto max-w-full object-contain rounded-2xl drop-shadow-lg transition-transform hover:scale-102"
            />
          ) : (
            <div className={`w-40 h-40 rounded-3xl flex flex-col items-center justify-center border-2 border-dashed ${bg} p-4 text-center`}>
              <Icon className="w-16 h-16 mb-2 opacity-80" />
              <div className="text-xs font-bold text-slate-700">{item.name}</div>
              <div className="text-[11px] text-slate-500 mt-1">Rasm mavjud emas</div>
            </div>
          )}
        </div>

        {/* Modal Body / Info */}
        <div className="p-5 sm:p-6 bg-white border-t border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-snug">{item.name}</h2>
              {item.notes ? (
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{item.notes}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">Spetsifikatsiya yoki model ko‘rsatilmagan</p>
              )}
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Umumiy qiymat</span>
              <div className="text-xl font-extrabold text-blue-700">
                {Number(item.total_price_uzs).toLocaleString('uz-UZ')} <span className="text-xs font-normal">so‘m</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
            <div>
              <div className="text-[11px] text-slate-400">Kerakli miqdor</div>
              <div className="font-bold text-slate-800 mt-0.5">
                {item.quantity} {item.unit}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Birlik narxi</div>
              <div className="font-bold text-slate-800 mt-0.5">
                {Number(item.unit_price_uzs).toLocaleString('uz-UZ')} so‘m
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Holat</div>
              <div className="font-bold text-slate-800 mt-0.5">
                {item.is_auto_generated ? 'Avtomatik hisob' : 'Qo‘lda kiritilgan'}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {hasValidImage ? (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Asl rasmni ko‘rish
              </a>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Tahrirlash / Rasm almashtirish
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Edit Material Modal
const EditMaterialModal: React.FC<{
  item: MaterialItem | null;
  onClose: () => void;
  onSave: (updatedItem: MaterialItem) => void;
}> = ({ item, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: '',
    category: 'accessory',
    unit: 'dona',
    quantity: 1,
    unit_price_uzs: 0,
    notes: '',
    image_url: '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: item.quantity,
        unit_price_uzs: Number(item.unit_price_uzs),
        notes: item.notes || '',
        image_url: item.display_image || item.image_url || '',
      });
    }
  }, [item]);

  if (!item) return null;

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      const res = await api.uploadMaterialImage(file);
      setForm((prev) => ({ ...prev, image_url: res.url }));
    } catch (err: any) {
      alert('Rasm yuklashda xatolik: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await api.updateMaterial(item.id, {
        name: form.name,
        category: form.category,
        unit: form.unit,
        quantity: form.quantity,
        unit_price_uzs: form.unit_price_uzs,
        notes: form.notes,
        image_url: form.image_url,
      });
      onSave(updated);
      onClose();
    } catch (err: any) {
      alert('Materialni saqlashda xatolik: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="font-bold text-slate-900 text-base">Material ma'lumotlarini tahrirlash</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Material nomi</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-600 mb-1">Kategoriya</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-xl bg-white text-xs"
              >
                <option value="radiator">Radiatorlar va kranlar</option>
                <option value="underfloor_pipe">Issiq pol trubalari</option>
                <option value="radiator_pipe">Magistral trubalar</option>
                <option value="manifold">Kollektor va shkaflar</option>
                <option value="valve">Ventillar va termoregulyatorlar</option>
                <option value="fittings">Fitinglar va ulovchilar</option>
                <option value="insulation">Izolyatsiya va lenta</option>
                <option value="accessory">Qo‘shimcha montaj detallari</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Birlik</label>
              <input
                type="text"
                required
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Rasm qismi */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <label className="block font-semibold text-slate-700 mb-2">Material rasmi (foto)</label>
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                {form.image_url ? (
                  <img src={form.image_url} alt="Preview" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-300" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 shadow-2xs transition">
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>Yangi rasm yuklash</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                  </label>
                  {form.image_url && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, image_url: '' })}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1"
                    >
                      Rasmni tozalash
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="Yoki to‘g‘ridan-to‘g‘ri rasm havolasini kiriting (https://...)"
                  className="w-full p-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-600 mb-1">Miqdori</label>
              <NumericInput
                min={0.1}
                fallbackValue={1}
                value={form.quantity}
                onChange={(val) => setForm({ ...form, quantity: val })}
                className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Birlik narxi (so‘m)</label>
              <NumericInput
                step={1000}
                min={0}
                fallbackValue={0}
                value={form.unit_price_uzs}
                onChange={(val) => setForm({ ...form, unit_price_uzs: val })}
                className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-600 mb-1">Izoh / Model / Spetsifikatsiya</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="O‘lcham, ishlab chiqaruvchi brend..."
              className="w-full p-2 border border-slate-300 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-500 font-medium">
              Jami:{' '}
              <b className="text-slate-900 font-bold">
                {(form.quantity * form.unit_price_uzs).toLocaleString('uz-UZ')} so‘m
              </b>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Saqlash</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export const MaterialsPage: React.FC<MaterialsPageProps> = ({ projectId, onBack }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lightbox & Edit Modals
  const [lightboxItem, setLightboxItem] = useState<MaterialItem | null>(null);
  const [editingItem, setEditingItem] = useState<MaterialItem | null>(null);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);

  // Inline Quick Edit state
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editQuantity, setEditQuantity] = useState<number>(0);

  // Yangi material shakli
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    category: 'accessory',
    unit: 'dona',
    quantity: 1,
    unit_price_uzs: 10000,
    notes: '',
    image_url: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleFileUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      const res = await api.uploadMaterialImage(file);
      setNewItemForm((prev) => ({ ...prev, image_url: res.url }));
    } catch (err: any) {
      alert('Rasm yuklashda xatolik: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [projData, mats] = await Promise.all([
        api.getProject(projectId),
        api.getMaterials(projectId),
      ]);
      setProject(projData);
      setItems(mats);
    } catch (err: any) {
      setError(err.message || 'Materiallar yuklanmadi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await api.generateMaterials(projectId);
      setItems(res.items);
    } catch (err: any) {
      alert('Smeta shakllantirishda xatolik: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const startInlineEdit = (item: MaterialItem) => {
    setInlineEditingId(item.id);
    setEditPrice(Number(item.unit_price_uzs));
    setEditQuantity(Number(item.quantity));
  };

  const saveInlineEdit = async (id: number) => {
    try {
      const updated = await api.updateMaterial(id, {
        unit_price_uzs: editPrice,
        quantity: editQuantity,
      });
      setItems(items.map((i) => (i.id === id ? updated : i)));
      setInlineEditingId(null);
    } catch (err: any) {
      alert('Saqlashda xatolik: ' + err.message);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Ushbu materialni smetadan o‘chirmoqchimisiz?')) return;
    try {
      await api.deleteMaterial(id);
      setItems(items.filter((i) => i.id !== id));
      if (lightboxItem?.id === id) setLightboxItem(null);
      if (editingItem?.id === id) setEditingItem(null);
    } catch (err: any) {
      alert('O‘chirishda xatolik: ' + err.message);
    }
  };

  const handleCreateCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMaterial({
        project: projectId,
        ...newItemForm,
        is_auto_generated: false,
      });
      setIsAddItemOpen(false);
      setNewItemForm({
        name: '',
        category: 'accessory',
        unit: 'dona',
        quantity: 1,
        unit_price_uzs: 10000,
        notes: '',
        image_url: '',
      });
      loadData();
    } catch (err: any) {
      alert('Qo‘shishda xatolik: ' + err.message);
    }
  };

  const totalCost = items.reduce((acc, curr) => acc + Number(curr.total_price_uzs), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500 text-sm">Materiallar smetasi yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sarlavha paneli */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
              title="Loyiha sahifasiga qaytish"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">Materiallar Smetasi va Xarajatlar</h1>
                <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                  {items.length} turdagi mahsulot
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Loyiha: <b>{project?.name}</b> • Barcha narxlar so‘mda
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200 shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Hisoblanmoqda...' : 'Smetani qayta shakllantirish'}
            </button>

            <button
              onClick={() => setIsAddItemOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Yangi material qo‘shish
            </button>
          </div>
        </div>

        {/* Jami hisob kartochkasi */}
        <div className="mt-5 p-4 bg-gradient-to-r from-slate-900 to-blue-950 rounded-xl text-white flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs text-blue-200 uppercase font-semibold tracking-wider">Jami xarajatlar bahosi</span>
            <div className="text-2xl sm:text-3xl font-extrabold mt-0.5 text-white">
              {totalCost.toLocaleString('uz-UZ')} <span className="text-sm font-normal text-blue-200">so‘m</span>
            </div>
          </div>
          <div className="text-xs text-blue-200 text-right">
            <div>Rasmni bosib kattalashtirib ko‘rish va ma'lumotlarni tahrirlash mumkin</div>
            <div className="text-[11px] text-blue-300">Materiallar soni va qiymati real vaqtda yangilanadi</div>
          </div>
        </div>
      </div>

      {/* Jadval */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-3 w-10 text-center">№</th>
                <th className="py-3.5 px-3 w-20 text-center">Rasm</th>
                <th className="py-3.5 px-4 min-w-[220px]">Material va Asbob-uskuna</th>
                <th className="py-3.5 px-3 w-32">Kategoriya</th>
                <th className="py-3.5 px-3 w-16 text-center">Birlik</th>
                <th className="py-3.5 px-3 w-24 text-right">Miqdori</th>
                <th className="py-3.5 px-4 w-32 text-right">Birlik narxi (so‘m)</th>
                <th className="py-3.5 px-4 w-36 text-right">Jami summa (so‘m)</th>
                <th className="py-3.5 px-3 w-24 text-center">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.map((item, idx) => {
                const isInlineEditing = inlineEditingId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-400 text-center">{idx + 1}</td>

                    {/* Rasm ustuni (64x64 px contain, lightbox zoom) */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex justify-center">
                        <MaterialThumbnail item={item} onClick={() => setLightboxItem(item)} />
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 text-[13px]">{item.name}</div>
                      {item.notes && <div className="text-[11px] text-slate-400 mt-0.5">{item.notes}</div>}
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60 inline-block">
                        {item.category_display || item.category}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center text-slate-600 font-medium">{item.unit}</td>

                    {/* Miqdor */}
                    <td className="py-3 px-3 text-right font-medium">
                      {isInlineEditing ? (
                        <NumericInput
                          value={editQuantity}
                          onChange={setEditQuantity}
                          min={0.1}
                          fallbackValue={1}
                          className="w-20 p-1 border border-blue-400 rounded-md text-right text-xs focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>

                    {/* Birlik narxi */}
                    <td className="py-3 px-4 text-right font-medium">
                      {isInlineEditing ? (
                        <NumericInput
                          step={1000}
                          value={editPrice}
                          onChange={setEditPrice}
                          min={0}
                          fallbackValue={0}
                          className="w-28 p-1 border border-blue-400 rounded-md text-right text-xs focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        Number(item.unit_price_uzs).toLocaleString('uz-UZ')
                      )}
                    </td>

                    {/* Jami */}
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {isInlineEditing
                        ? (editQuantity * editPrice).toLocaleString('uz-UZ')
                        : Number(item.total_price_uzs).toLocaleString('uz-UZ')}
                    </td>

                    {/* Boshqaruv tugmalari */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isInlineEditing ? (
                          <button
                            onClick={() => saveInlineEdit(item.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Saqlash"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                            title="Tahrirlash va rasm boshqaruvi"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="O‘chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lightbox Modal */}
      <ImageLightboxModal
        item={lightboxItem}
        onClose={() => setLightboxItem(null)}
        onEdit={(item) => setEditingItem(item)}
      />

      {/* Tahrirlash Modali */}
      <EditMaterialModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={(updated) => {
          setItems(items.map((i) => (i.id === updated.id ? updated : i)));
        }}
      />

      {/* Yangi material qo'shish modali */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Smetaga yangi material qo‘shish</h3>
              <button
                onClick={() => setIsAddItemOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Material nomi</label>
                <input
                  type="text"
                  required
                  placeholder="Kran, filtr, nasos, izolyatsiya..."
                  value={newItemForm.name}
                  onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Kategoriya</label>
                <select
                  value={newItemForm.category}
                  onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="radiator">Radiatorlar va kranlar</option>
                  <option value="underfloor_pipe">Issiq pol trubalari</option>
                  <option value="radiator_pipe">Magistral trubalar</option>
                  <option value="manifold">Kollektor va shkaflar</option>
                  <option value="valve">Ventillar va termoregulyatorlar</option>
                  <option value="fittings">Fitinglar va ulovchilar</option>
                  <option value="insulation">Izolyatsiya va lenta</option>
                  <option value="accessory">Qo‘shimcha montaj detallari</option>
                </select>
              </div>

              {/* Rasm qismi */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <label className="block font-semibold text-slate-700 mb-1.5">Material rasmi (foto)</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {newItemForm.image_url ? (
                      <img src={newItemForm.image_url} alt="Material" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 shadow-2xs transition">
                      {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>Kompyuterdan rasm yuklash</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                      />
                    </label>
                    <input
                      type="url"
                      value={newItemForm.image_url}
                      onChange={(e) => setNewItemForm({ ...newItemForm, image_url: e.target.value })}
                      placeholder="Yoki havolani kiriting (https://...)"
                      className="w-full p-1.5 text-xs border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Birlik</label>
                  <input
                    type="text"
                    required
                    value={newItemForm.unit}
                    onChange={(e) => setNewItemForm({ ...newItemForm, unit: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Miqdori</label>
                  <NumericInput
                    min={0.1}
                    fallbackValue={1}
                    value={newItemForm.quantity}
                    onChange={(val) => setNewItemForm({ ...newItemForm, quantity: val })}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Narxi (so‘m)</label>
                  <NumericInput
                    step={1000}
                    min={0}
                    fallbackValue={10000}
                    value={newItemForm.unit_price_uzs}
                    onChange={(val) => setNewItemForm({ ...newItemForm, unit_price_uzs: val })}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Izoh / Model (ixtiyoriy)</label>
                <input
                  type="text"
                  value={newItemForm.notes}
                  onChange={(e) => setNewItemForm({ ...newItemForm, notes: e.target.value })}
                  placeholder="Brend yoki o‘lcham tafsilotlari"
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition"
                >
                  Qo‘shish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
