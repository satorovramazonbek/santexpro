import React, { useState, useEffect, useRef } from 'react';
import { CatalogProduct, User, Project } from '../types';
import { api } from '../api/client';
import { NumericInput } from '../components/common/NumericInput';
import { 
  Search, 
  Plus, 
  Check, 
  ShieldCheck, 
  Image as ImageIcon, 
  Upload, 
  Loader2, 
  FileText, 
  ExternalLink, 
  Copy, 
  ShoppingCart, 
  SlidersHorizontal, 
  Layers, 
  Wrench, 
  Grid, 
  Flame, 
  Gauge, 
  Zap, 
  Droplets, 
  Radio, 
  Package, 
  X, 
  CheckCircle2, 
  Thermometer, 
  ArrowUpDown,
  Filter
} from 'lucide-react';

interface ProductCatalogPageProps {
  currentUser?: User | null;
}

export const CATEGORIES = [
  { key: 'all', label: 'Все категории', icon: Layers, color: 'text-slate-600' },
  { key: 'pipes', label: '1. Трубы', icon: Layers, color: 'text-blue-600' },
  { key: 'fittings', label: '2. Фитинги и монтаж', icon: Wrench, color: 'text-emerald-600' },
  { key: 'manifolds', label: '3. Коллекторы и шкафы', icon: Grid, color: 'text-indigo-600' },
  { key: 'underfloor', label: '4. Водяной тёплый пол', icon: Flame, color: 'text-orange-600' },
  { key: 'radiators', label: '5. Радиаторы отопления', icon: Thermometer, color: 'text-red-600' },
  { key: 'valves', label: '6. Запорная арматура', icon: Gauge, color: 'text-amber-600' },
  { key: 'pumps_boilers', label: '7. Насосы и котельное об-ние', icon: Zap, color: 'text-purple-600' },
  { key: 'water_drainage', label: '8. Водоснабжение и канализация', icon: Droplets, color: 'text-cyan-600' },
  { key: 'automation', label: '9. Автоматика и управление', icon: Radio, color: 'text-rose-600' },
  { key: 'insulation_mounting', label: '10. Изоляция и крепёж', icon: Package, color: 'text-teal-600' },
];

export const ProductCatalogPage: React.FC<ProductCatalogPageProps> = ({ currentUser }) => {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedManufacturer, setSelectedManufacturer] = useState('all');
  const [selectedSize, setSelectedSize] = useState('all');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'brand'>('default');

  // Modals state
  const [passportProduct, setPassportProduct] = useState<CatalogProduct | null>(null);
  const [addToProjectProduct, setAddToProjectProduct] = useState<CatalogProduct | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  // Add to Project State
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [targetProjectId, setTargetProjectId] = useState<number | null>(null);
  const [targetQuantity, setTargetQuantity] = useState(1);
  const [targetNotes, setTargetNotes] = useState('');
  const [addingToProject, setAddingToProject] = useState(false);
  const [addSuccessMessage, setAddSuccessMessage] = useState<string | null>(null);

  // Admin New Product Form State
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '',
    category: 'pipes',
    subcategory: '',
    manufacturer: '',
    model_name: '',
    sku: '',
    nominal_size: '',
    connection_type: '',
    material: '',
    pn_bar: 10,
    max_temp_c: 95,
    kv_value: 0,
    power_w: 0,
    unit: 'шт',
    price_uzs: 100000,
    image_url: '',
    datasheet_url: '',
    description: '',
    is_verified: true,
  });

  const isAdmin = currentUser?.is_staff || currentUser?.is_superuser;

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getCatalogProducts();
      setProducts(data);
    } catch (err) {
      console.error("Ошибка при загрузке каталога:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    if (currentUser) {
      try {
        const projs = await api.getProjects();
        setUserProjects(projs);
        if (projs.length > 0 && !targetProjectId) {
          setTargetProjectId(projs[0].id);
        }
      } catch (err) {
        console.error("Ошибка при загрузке проектов:", err);
      }
    }
  };

  useEffect(() => {
    loadProducts();
    loadProjects();
  }, [currentUser]);

  // Copy SKU handler
  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  // Add to Project handler
  const handleAddToProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addToProjectProduct || !targetProjectId) return;

    try {
      setAddingToProject(true);
      await api.addProductToProjectMaterials(
        addToProjectProduct.id,
        targetProjectId,
        targetQuantity,
        targetNotes || undefined
      );
      setAddSuccessMessage(`Позиция "${addToProjectProduct.name}" успешно добавлена в смету!`);
      setTimeout(() => {
        setAddSuccessMessage(null);
        setAddToProjectProduct(null);
        setTargetQuantity(1);
        setTargetNotes('');
      }, 1800);
    } catch (err: any) {
      alert("Ошибка при добавлении в смету: " + err.message);
    } finally {
      setAddingToProject(false);
    }
  };

  // Image Upload handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const res = await api.uploadImage(file);
      setForm(prev => ({ ...prev, image_url: res.url }));
    } catch (err: any) {
      alert("Ошибка при загрузке фото: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Create Product handler (Admin)
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCatalogProduct({
        ...form,
        pn_bar: Number(form.pn_bar) || undefined,
        max_temp_c: Number(form.max_temp_c) || undefined,
        kv_value: Number(form.kv_value) || undefined,
        power_w: Number(form.power_w) || undefined,
        price_uzs: Number(form.price_uzs) || 0,
      });
      setIsAddOpen(false);
      loadProducts();
    } catch (err: any) {
      alert("Ошибка при сохранении: " + err.message);
    }
  };

  // Extract unique manufacturers and nominal sizes for filters
  const manufacturers = Array.from(new Set(products.map(p => p.manufacturer).filter(Boolean))).sort();
  const sizes = Array.from(new Set(products.map(p => p.nominal_size).filter(Boolean))).sort();

  // Filter products
  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || 
      p.name.toLowerCase().includes(q) ||
      p.manufacturer.toLowerCase().includes(q) ||
      p.model_name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.nominal_size.toLowerCase().includes(q) ||
      p.material.toLowerCase().includes(q);

    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchMfg = selectedManufacturer === 'all' || p.manufacturer.toLowerCase() === selectedManufacturer.toLowerCase();
    const matchSize = selectedSize === 'all' || p.nominal_size === selectedSize;
    const matchVerified = !onlyVerified || p.is_verified;

    return matchSearch && matchCategory && matchMfg && matchSize && matchVerified;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price_asc') return Number(a.price_uzs) - Number(b.price_uzs);
    if (sortBy === 'price_desc') return Number(b.price_uzs) - Number(a.price_uzs);
    if (sortBy === 'brand') return a.manufacturer.localeCompare(b.manufacturer);
    return 0; // default category order
  });

  // Category counts
  const categoryCounts = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Шапка каталога */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 tracking-wide uppercase">
              Официальные стандарты EN / ГОСТ
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 10 Категорий оборудования
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Профессиональный каталог инженерной сантехники
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Сертифицированное оборудование для систем отопления, водяного тёплого пола, водоснабжения и котельных. 
            Параметры строго верифицированы по официальным паспортам производителей (Valtec, Uponor, Rehau, Purmo, Korado, Danfoss, Grundfos, Ostendorf, K-Flex).
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-2xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Добавить товар в каталог
          </button>
        )}
      </div>

      {/* Горизонтальный переключатель категорий (10 категорий) */}
      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <div className="flex items-center gap-2 min-w-max">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const count = cat.key === 'all' ? products.length : (categoryCounts[cat.key] || 0);
            const isSelected = selectedCategory === cat.key;

            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : cat.color}`} />
                <span>{cat.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Поиск и панель расширенной фильтрации */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Поле поиска */}
          <div className="relative md:col-span-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск по артикулу (SKU), наименованию, бренду или размеру..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Фильтр по бренду */}
          <div className="md:col-span-2">
            <select
              value={selectedManufacturer}
              onChange={(e) => setSelectedManufacturer(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="all">Все производители</option>
              {manufacturers.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Фильтр по размеру/диаметру */}
          <div className="md:col-span-2">
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="all">Все размеры / DN</option>
              {sizes.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Сортировка */}
          <div className="md:col-span-3">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="default">По умолчанию</option>
                <option value="price_asc">Цена: по возрастанию</option>
                <option value="price_desc">Цена: по убыванию</option>
                <option value="brand">По бренду (А-Я)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Быстрые фильтры и статус */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyVerified}
              onChange={(e) => setOnlyVerified(e.target.checked)}
              className="w-3.5 h-3.5 text-blue-600 rounded-sm focus:ring-blue-500"
            />
            <span className="text-slate-700 font-medium">
              Только проверенные паспорта производителей (ГОСТ / EN)
            </span>
          </label>

          <div className="text-slate-400 text-[11px]">
            Найдено позиций: <b className="text-slate-800">{sortedProducts.length}</b> из {products.length}
          </div>
        </div>
      </div>

      {/* Сетка товаров каталога */}
      {loading ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Загрузка каталога сертифицированной продукции...</p>
        </div>
      ) : sortedProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedProducts.map((p) => {
            const hasPhoto = Boolean(p.display_image || p.image_url);
            const imgSrc = p.display_image || p.image_url || '';

            return (
              <div
                key={p.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5">
                  {/* Изображение товара */}
                  <div className="relative w-full h-44 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 mb-3 flex items-center justify-center p-3">
                    {hasPhoto ? (
                      <img
                        src={imgSrc}
                        alt={p.name}
                        onClick={() => setLightboxImage({ url: imgSrc, title: p.name })}
                        className="max-h-full max-w-full object-contain cursor-zoom-in group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300">
                        <Package className="w-10 h-10 stroke-1 mb-1 text-slate-300" />
                        <span className="text-[10px] text-slate-400 font-medium">Фото в техпаспорте</span>
                      </div>
                    )}

                    {/* Верифицированный бейдж */}
                    {p.is_verified && (
                      <div className="absolute top-2.5 left-2.5 bg-emerald-600/95 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Паспорт</span>
                      </div>
                    )}

                    {/* Категория бейдж */}
                    <div className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-2xs">
                      {p.category_display || p.category}
                    </div>
                  </div>

                  {/* Бренд, Серия и Артикул */}
                  <div className="space-y-1 mb-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        {p.manufacturer}
                      </span>
                      
                      {/* SKU с копированием */}
                      <button
                        onClick={() => handleCopySku(p.sku)}
                        title="Нажмите для копирования артикула"
                        className="flex items-center gap-1 text-[11px] font-mono text-slate-600 hover:text-blue-600 bg-slate-100 px-2 py-0.5 rounded-md transition cursor-pointer"
                      >
                        <span>Арт. {p.sku}</span>
                        {copiedSku === p.sku ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 title-hover group-hover:text-blue-700 transition-colors">
                      {p.name}
                    </h3>
                  </div>

                  {/* Сетка технических характеристик */}
                  <div className="my-3 p-3 bg-slate-50/90 rounded-2xl border border-slate-100/80 text-[11px] space-y-1.5">
                    {p.nominal_size && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Номинал / Размер:</span>
                        <span className="font-bold text-slate-800">{p.nominal_size}</span>
                      </div>
                    )}
                    {p.material && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Материал:</span>
                        <span className="font-semibold text-slate-700 line-clamp-1 max-w-[160px] text-right" title={p.material}>
                          {p.material}
                        </span>
                      </div>
                    )}
                    {p.pn_bar && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Рабочее давление:</span>
                        <span className="font-bold text-slate-800">PN {p.pn_bar} бар</span>
                      </div>
                    )}
                    {p.max_temp_c && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Макс. температура:</span>
                        <span className="font-bold text-red-700">{p.max_temp_c} °C</span>
                      </div>
                    )}
                    {p.power_w && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Мощность (ΔT=50K):</span>
                        <span className="font-black text-red-700">{p.power_w} Вт</span>
                      </div>
                    )}
                    {p.kv_value && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Пропускная сп-ть Kv:</span>
                        <span className="font-bold text-blue-700">{p.kv_value} м³/ч</span>
                      </div>
                    )}
                    {p.connection_type && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Присоединение:</span>
                        <span className="font-semibold text-slate-700 line-clamp-1 max-w-[150px] text-right" title={p.connection_type}>
                          {p.connection_type}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Нижняя часть карточки: цена и действия */}
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500 font-medium">Цена за {p.unit}:</span>
                    <div className="text-right">
                      <span className="text-base font-black text-slate-900">
                        {Number(p.price_uzs).toLocaleString('ru-RU')}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 ml-1">сум</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPassportProduct(p)}
                      className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      Паспорт
                    </button>

                    <button
                      onClick={() => {
                        setAddToProjectProduct(p);
                        setTargetQuantity(1);
                      }}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      В смету
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">По выбранным фильтрам ничего не найдено</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Попробуйте сбросить параметры поиска или выбрать другую категорию оборудования.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedManufacturer('all');
              setSelectedSize('all');
              setOnlyVerified(false);
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Сбросить все фильтры
          </button>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: Технический паспорт изделия */}
      {passportProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-600 text-white">
                  {passportProduct.manufacturer}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  Арт. {passportProduct.sku}
                </span>
              </div>
              <button
                onClick={() => setPassportProduct(null)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="w-full sm:w-48 h-48 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center p-3 shrink-0">
                  {passportProduct.display_image || passportProduct.image_url ? (
                    <img
                      src={passportProduct.display_image || passportProduct.image_url}
                      alt={passportProduct.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Package className="w-12 h-12 text-slate-300" />
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">
                    {passportProduct.name}
                  </h2>
                  <p className="text-slate-600 leading-relaxed text-xs">
                    {passportProduct.description || "Официальное сертифицированное инженерное оборудование. Соответствует строительным нормам и стандартам качества."}
                  </p>

                  <div className="pt-2 flex items-baseline gap-2">
                    <span className="text-xs text-slate-500 font-medium">Ориентировочная стоимость:</span>
                    <span className="text-lg font-black text-slate-900">
                      {Number(passportProduct.price_uzs).toLocaleString('ru-RU')} сум
                    </span>
                    <span className="text-xs text-slate-400">/ {passportProduct.unit}</span>
                  </div>
                </div>
              </div>

              {/* Таблица технических параметров паспорта */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Заводские технические характеристики
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                  <div className="grid grid-cols-2 p-2.5 bg-slate-50 font-semibold text-slate-700">
                    <span>Параметр</span>
                    <span>Значение</span>
                  </div>
                  {passportProduct.nominal_size && (
                    <div className="grid grid-cols-2 p-2.5">
                      <span className="text-slate-500">Номинальный размер (DN/OD)</span>
                      <span className="font-bold text-slate-800">{passportProduct.nominal_size}</span>
                    </div>
                  )}
                  {passportProduct.material && (
                    <div className="grid grid-cols-2 p-2.5">
                      <span className="text-slate-500">Материал корпуса / трубы</span>
                      <span className="font-semibold text-slate-800">{passportProduct.material}</span>
                    </div>
                  )}
                  {passportProduct.connection_type && (
                    <div className="grid grid-cols-2 p-2.5">
                      <span className="text-slate-500">Тип присоединения / резьба</span>
                      <span className="font-semibold text-slate-800">{passportProduct.connection_type}</span>
                    </div>
                  )}
                  {passportProduct.pn_bar && (
                    <div className="grid grid-cols-2 p-2.5">
                      <span className="text-slate-500">Номинальное давление (PN)</span>
                      <span className="font-bold text-slate-800">{passportProduct.pn_bar} бар</span>
                    </div>
                  )}
                  {passportProduct.max_temp_c && (
                    <div className="grid grid-cols-2 p-2.5">
                      <span className="text-slate-500">Максимальная рабочая температура</span>
                      <span className="font-bold text-red-700">{passportProduct.max_temp_c} °C</span>
                    </div>
                  )}
                  {passportProduct.power_w && (
                    <div className="grid grid-cols-2 p-2.5">
                      <span className="text-slate-500">Номинальная теплоотдача (ΔT=50K)</span>
                      <span className="font-black text-red-700">{passportProduct.power_w} Вт</span>
                    </div>
                  )}
                  {passportProduct.kv_value && (
                    <div className="grid grid-cols-2 p-2.5">
                      <span className="text-slate-500">Коэффициент расхода Kv</span>
                      <span className="font-bold text-blue-700">{passportProduct.kv_value} м³/ч</span>
                    </div>
                  )}

                  {/* Спецификации из JSON */}
                  {passportProduct.specifications && Object.entries(passportProduct.specifications).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-2 p-2.5">
                      <span className="text-slate-500 font-medium capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="font-semibold text-slate-800">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ссылка на PDF паспорт */}
              {passportProduct.datasheet_url && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-blue-900 font-semibold">
                      Официальный паспорт и инструкция по монтажу
                    </span>
                  </div>
                  <a
                    href={passportProduct.datasheet_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline"
                  >
                    <span>Открыть PDF</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setPassportProduct(null)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Закрыть
              </button>
              <button
                onClick={() => {
                  const p = passportProduct;
                  setPassportProduct(null);
                  setAddToProjectProduct(p);
                  setTargetQuantity(1);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Добавить в смету проекта</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: Добавление позиции в смету проекта */}
      {addToProjectProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                Добавление в смету проекта
              </h3>
              <button
                onClick={() => setAddToProjectProduct(null)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addSuccessMessage ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Успешно добавлено!</h4>
                <p className="text-xs text-slate-600">{addSuccessMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleAddToProjectSubmit} className="p-5 space-y-4 text-xs">
                {/* Инфо о товаре */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-blue-600">
                    {addToProjectProduct.manufacturer} • Арт. {addToProjectProduct.sku}
                  </div>
                  <div className="font-bold text-slate-900 text-xs line-clamp-2">
                    {addToProjectProduct.name}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 pt-1">
                    Цена: {Number(addToProjectProduct.price_uzs).toLocaleString('ru-RU')} сум / {addToProjectProduct.unit}
                  </div>
                </div>

                {/* Выбор проекта */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Выберите проект:
                  </label>
                  {userProjects.length > 0 ? (
                    <select
                      value={targetProjectId || ''}
                      onChange={(e) => setTargetProjectId(Number(e.target.value))}
                      required
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      {userProjects.map(proj => (
                        <option key={proj.id} value={proj.id}>
                          {proj.name} ({proj.address || 'Без адреса'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px]">
                      У вас пока нет активных проектов. Создайте проект в разделе «Проекты» или «Панель управления».
                    </div>
                  )}
                </div>

                {/* Количество */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Количество ({addToProjectProduct.unit}):
                    </label>
                    <NumericInput
                      required
                      value={targetQuantity}
                      onChange={(val) => setTargetQuantity(val > 0 ? val : 1)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Итоговая сумма:
                    </label>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 text-right">
                      {(targetQuantity * Number(addToProjectProduct.price_uzs)).toLocaleString('ru-RU')} сум
                    </div>
                  </div>
                </div>

                {/* Примечание */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Примечание для монтажника (необязательно):
                  </label>
                  <input
                    type="text"
                    placeholder="Например: Для котельной / Для контура спальни"
                    value={targetNotes}
                    onChange={(e) => setTargetNotes(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAddToProjectProduct(null)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={addingToProject || !targetProjectId}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {addingToProject ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Добавление...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Подтвердить добавление
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: Лайтбокс фотографии */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in cursor-zoom-out"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-4 max-w-2xl w-full shadow-2xl relative cursor-default"
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-full h-96 flex items-center justify-center p-4">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <p className="text-center font-bold text-slate-900 text-xs mt-2">
              {lightboxImage.title}
            </p>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: Добавление товара администратором */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Добавить сертифицированный товар в каталог</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Категория оборудования</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                >
                  {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Полное наименование товара</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Кран шаровой полнопроходной Valtec BASE VT.214.N 1/2&quot;"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Производитель (Бренд)</label>
                  <input
                    type="text"
                    required
                    placeholder="Valtec, Uponor, Rehau..."
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Артикул производителя (SKU)</label>
                  <input
                    type="text"
                    required
                    placeholder="VT.214.N.04 / 1062044"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Номинальный размер (DN/OD)</label>
                  <input
                    type="text"
                    placeholder="1/2&quot; / Ø16x2.0 / DN25"
                    value={form.nominal_size}
                    onChange={(e) => setForm({ ...form, nominal_size: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Материал изделия</label>
                  <input
                    type="text"
                    placeholder="Латунь CW617N / PE-Xa"
                    value={form.material}
                    onChange={(e) => setForm({ ...form, material: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Давление PN (бар)</label>
                  <NumericInput
                    value={form.pn_bar}
                    onChange={(val) => setForm({ ...form, pn_bar: val })}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tmax (°C)</label>
                  <NumericInput
                    value={form.max_temp_c}
                    onChange={(val) => setForm({ ...form, max_temp_c: val })}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Цена (сум)</label>
                  <NumericInput
                    step={1000}
                    value={form.price_uzs}
                    onChange={(val) => setForm({ ...form, price_uzs: val })}
                    className="w-full p-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Загрузка фото */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="block font-semibold text-slate-700">Изображение товара</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl font-medium flex items-center gap-1.5 text-xs text-slate-700 transition cursor-pointer"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Загрузка...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        Загрузить файл
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-slate-400">или укажите прямую ссылку (URL):</span>
                </div>
                <input
                  type="url"
                  placeholder="https://... или /media/..."
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ссылка на паспорт / документацию (PDF)</label>
                <input
                  type="url"
                  placeholder="https://manufacturer.com/passport.pdf"
                  value={form.datasheet_url}
                  onChange={(e) => setForm({ ...form, datasheet_url: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Техническое описание</label>
                <textarea
                  rows={2}
                  placeholder="Область применения, нормативные документы..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  Сохранить товар
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
