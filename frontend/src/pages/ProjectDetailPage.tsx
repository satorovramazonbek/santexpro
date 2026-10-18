import React, { useState, useEffect, useMemo } from 'react';
import { Project, Room, Building } from '../types';
import { api } from '../api/client';
import { NumericInput } from '../components/common/NumericInput';
import { BuildingPassportCard } from '../components/building/BuildingPassportCard';
import { BuildingEnvelopeModal } from '../components/building/BuildingEnvelopeModal';
import { HouseMasterPlanCanvas } from '../components/building/HouseMasterPlanCanvas';
import {
  ArrowLeft,
  Plus,
  FileDown,
  Calculator,
  Flame,
  Settings,
  Archive,
  Trash2,
  ExternalLink,
  Layers,
  Thermometer,
  FileSpreadsheet,
  Grid,
  BarChart3,
  Building2,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Zap
} from 'lucide-react';

interface ProjectDetailPageProps {
  projectId: number;
  onBack: () => void;
  onOpenRoomEditor: (roomId: number) => void;
  onOpenMaterials: (projectId: number) => void;
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({
  projectId,
  onBack,
  onOpenRoomEditor,
  onOpenMaterials,
}) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isEnvelopeModalOpen, setIsEnvelopeModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'plan' | 'rooms' | 'balance'>('plan');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Yangi xona formasi
  const [roomForm, setRoomForm] = useState({
    name: '',
    length: 5.0,
    width: 4.0,
    height: 3.0,
    floor_number: 1,
    exterior_walls_count: 1,
    desired_temp: 22.0,
    heating_preference: 'combined' as 'combined' | 'radiator_only' | 'underfloor_only',
  });

  // Loyiha tahrirlash formasi
  const [projectForm, setProjectForm] = useState({
    name: '',
    address: '',
    client_name: '',
    client_phone: '',
    outdoor_design_temp: -15.0,
    notes: '',
  });

  const loadProject = async () => {
    try {
      setLoading(true);
      const data = await api.getProject(projectId);
      setProject(data);
      setProjectForm({
        name: data.name,
        address: data.address,
        client_name: data.client_name,
        client_phone: data.client_phone,
        outdoor_design_temp: data.outdoor_design_temp,
        notes: data.notes,
      });
    } catch (err: any) {
      setError(err.message || "Loyiha yuklanmadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRoom({
        project: projectId,
        ...roomForm,
      });
      setIsAddRoomOpen(false);
      setRoomForm({
        name: '',
        length: 5.0,
        width: 4.0,
        height: 3.0,
        floor_number: 1,
        exterior_walls_count: 1,
        desired_temp: 22.0,
        heating_preference: 'combined',
      });
      loadProject();
    } catch (err: any) {
      alert("Xona yaratishda xatolik: " + err.message);
    }
  };

  const handleDeleteRoom = async (roomId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Ushbu xonani va uning barcha hisob-kitoblarini o‘chirmoqchimisiz?")) return;
    try {
      await api.deleteRoom(roomId);
      loadProject();
    } catch (err: any) {
      alert("O‘chirishda xatolik: " + err.message);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateProject(projectId, projectForm);
      setIsEditProjectOpen(false);
      loadProject();
    } catch (err: any) {
      alert("Loyiha yangilashda xatolik: " + err.message);
    }
  };

  const handleSaveBuildingEnvelope = async (data: Partial<Building> & { sync_rooms?: boolean }) => {
    try {
      await api.updateBuilding(projectId, data);
      await loadProject();
    } catch (err: any) {
      alert("Bino parametrlarini saqlashda xatolik: " + err.message);
    }
  };

  const handleToggleArchive = async () => {
    try {
      await api.toggleArchive(projectId);
      loadProject();
    } catch (err: any) {
      alert("Arxivlashda xatolik: " + err.message);
    }
  };

  const handleDownloadPdf = async () => {
    if (!project) return;
    try {
      setDownloadingPdf(true);
      await api.downloadPdf(project.id, `SantexPro_${project.name}.pdf`);
    } catch (err: any) {
      alert("PDF yuklab olishda xatolik: " + err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Butun bino issiqlik va tizim statistikasi
  const buildingStats = useMemo(() => {
    if (!project || !project.rooms) {
      return {
        totalAreaM2: 0,
        totalVolumeM3: 0,
        totalHeatLossW: 0,
        totalHeatLossKW: 0,
        avgSpecificW: 0,
        recommendedBoilerKW: 0,
        totalUnderfloorAreaM2: 0,
        totalCircuitsCount: 0,
        totalPipeLengthM: 0,
        totalRadiatorsCount: 0,
        totalRadiatorPowerW: 0,
      };
    }

    let totalArea = 0;
    let totalVol = 0;
    let totalHeatW = 0;
    let ufArea = 0;
    let circCount = 0;
    let pipeM = 0;
    let radCount = 0;
    let radPower = 0;

    project.rooms.forEach((r) => {
      totalArea += r.area;
      totalVol += r.volume;

      const calc = r.calculation_results?.find((c) => c.calculation_type === 'heat_loss');
      if (calc && calc.output_results?.total_heat_loss_w) {
        totalHeatW += calc.output_results.total_heat_loss_w;
      }

      if (r.heating_preference !== 'radiator_only') {
        ufArea += r.area;
      }

      if (r.underfloor_circuits) {
        circCount += r.underfloor_circuits.length;
        r.underfloor_circuits.forEach((c) => {
          pipeM += (c as any).total_length_m || 0;
        });
      }

      if (r.radiators) {
        r.radiators.forEach((rad) => {
          radCount += rad.quantity || 1;
          radPower += rad.calculated_actual_power_w || 0;
        });
      }
    });

    const avgSpec = totalArea > 0 ? totalHeatW / totalArea : 0;
    // 20% zaxira va issiq suv (GVS) ehtiyoji bilan qozon quvvati
    const boilerKW = Number(((totalHeatW * 1.20) / 1000.0).toFixed(1));

    return {
      totalAreaM2: Number(totalArea.toFixed(1)),
      totalVolumeM3: Number(totalVol.toFixed(1)),
      totalHeatLossW: Number(totalHeatW.toFixed(0)),
      totalHeatLossKW: Number((totalHeatW / 1000.0).toFixed(2)),
      avgSpecificW: Number(avgSpec.toFixed(1)),
      recommendedBoilerKW: Math.max(boilerKW, 12.0),
      totalUnderfloorAreaM2: Number(ufArea.toFixed(1)),
      totalCircuitsCount: circCount,
      totalPipeLengthM: Number(pipeM.toFixed(0)),
      totalRadiatorsCount: radCount,
      totalRadiatorPowerW: Number(radPower.toFixed(0)),
    };
  }, [project]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500 text-sm">Loyiha yuklanmoqda...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error || "Loyiha topilmadi"}</p>
        <button onClick={onBack} className="text-blue-600 underline text-sm">Ortga qaytish</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Yuqori panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors mt-0.5"
              title="Ro‘yxatga qaytish"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{project.name}</h1>
                {project.is_archived && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    Arxivlangan
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Mijoz: <b className="text-slate-700">{project.client_name || "Ko‘rsatilmagan"}</b>
                {project.client_phone && ` (${project.client_phone})`}
                {project.address && ` • ${project.address}`}
              </p>
            </div>
          </div>

          {/* Harakatlar (Actions) */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onOpenMaterials(project.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200 shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Materiallar smetasi
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              {downloadingPdf ? "Tayyorlanmoqda..." : "PDF hisobot"}
            </button>

            <button
              onClick={() => setIsEnvelopeModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              title="Bino konstruksiyasi va issiqlik parametrlari"
            >
              <Sliders className="w-4 h-4 text-blue-600" />
              Bino konstruksiyasi
            </button>

            <button
              onClick={() => setIsEditProjectOpen(true)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
              title="Loyiha sozlamalari"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={handleToggleArchive}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
              title={project.is_archived ? "Arxivdan chiqarish" : "Arxivlash"}
            >
              <Archive className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metrik ko'rsatkichlar paneli */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-500 block mb-0.5">Xonalar soni</span>
            <span className="text-lg font-bold text-slate-900">{project.total_rooms_count} ta</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-500 block mb-0.5">Umumiy maydon</span>
            <span className="text-lg font-bold text-slate-900">{project.total_area_m2?.toFixed(1)} m²</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-500 block mb-0.5">Tashqi hisobiy harorat</span>
            <span className="text-lg font-bold text-blue-700">{project.outdoor_design_temp} °C</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-500 block mb-0.5">Jami issiqlik quvvati</span>
            <span className="text-lg font-bold text-emerald-700">
              {(project.total_heat_loss_w / 1000.0).toFixed(2)} kVt
            </span>
          </div>
        </div>
      </div>

      {/* Bino Konstruksiyasi Pasporti Card */}
      <BuildingPassportCard
        project={project}
        building={project.building}
        onEditEnvelope={() => setIsEnvelopeModalOpen(true)}
      />

      {/* Ko'rinish rejimini tanlash tablari */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
          <button
            onClick={() => setActiveTab('plan')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'plan'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid className="w-4 h-4" />
            Umumiy Uy Rejasi (CAD Chizma)
          </button>

          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'rooms'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Xonalar Ro‘yxati ({project.rooms?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('balance')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'balance'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Bino Balansi va Qozon Hisobi
          </button>
        </div>

        {/* Yangi xona qo'shish */}
        <button
          onClick={() => setIsAddRoomOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yangi xona qo‘shish
        </button>
      </div>

      {/* 1-TAB: Umumiy Uy Chizmasi (Master CAD Plan) */}
      {activeTab === 'plan' && (
        <div>
          {project.rooms && project.rooms.length > 0 ? (
            <HouseMasterPlanCanvas
              project={project}
              onOpenRoomEditor={onOpenRoomEditor}
              onLayoutSaved={loadProject}
            />
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <Flame className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Ushbu loyihada hali xonalar yo‘q</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Umumiy uy chizmasini shakllantirish uchun birinchi xonani qo‘shing.
              </p>
              <button
                onClick={() => setIsAddRoomOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs"
              >
                Birinchi xonani qo‘shish
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2-TAB: Xonalar Grid ro'yxati */}
      {activeTab === 'rooms' && (
        <div>
          {project.rooms && project.rooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.rooms.map((r) => {
                const heatCalc = r.calculation_results?.find((c) => c.calculation_type === 'heat_loss');
                const heatLossW = heatCalc?.output_results?.total_heat_loss_w;
                const specW = heatCalc?.output_results?.specific_heat_loss_w_m2;

                return (
                  <div
                    key={r.id}
                    onClick={() => onOpenRoomEditor(r.id)}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-blue-400 cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                            {r.name}
                          </h3>
                          <span className="text-xs text-slate-500">
                            {r.floor_number}-qavat • {r.exterior_walls_count} ta tashqi devor
                          </span>
                        </div>

                        <button
                          onClick={(e) => handleDeleteRoom(r.id, e)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xonani o‘chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Xona o'lchamlari */}
                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-xs text-center my-3">
                        <div>
                          <span className="text-slate-400 block text-[10px]">O‘lchamlari</span>
                          <span className="font-semibold text-slate-700">{r.length}x{r.width}m</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Maydon</span>
                          <span className="font-bold text-slate-900">{r.area} m²</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Hajm</span>
                          <span className="font-semibold text-slate-700">{r.volume} m³</span>
                        </div>
                      </div>

                      {/* Isitish tizimi turi va quvvat */}
                      <div className="flex items-center justify-between text-xs my-2">
                        <span className="text-slate-500">Isitish quvvati:</span>
                        <span className="font-bold text-slate-900">
                          {heatLossW ? `${heatLossW.toFixed(0)} Vt (${specW?.toFixed(0)} Vt/m²)` : 'Hisoblanmagan'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {r.heating_preference === 'combined' ? 'Aralash (Rad + Pol)' : r.heating_preference === 'radiator_only' ? 'Faqat radiator' : 'Faqat issiq pol'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                          +{r.desired_temp}°C
                        </span>
                      </div>
                    </div>

                    {/* Pastki tugma */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold group-hover:text-blue-700">
                      <span>2D CAD Muharrirda ochish</span>
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <Flame className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Ushbu loyihada hali xonalar yo‘q</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Isitish hisob-kitoblarini boshlash uchun birinchi xonani qo‘shing.
              </p>
              <button
                onClick={() => setIsAddRoomOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs"
              >
                Birinchi xonani qo‘shish
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3-TAB: Bino Issiqlik Balansi va Qozon Hisobi */}
      {activeTab === 'balance' && (
        <div className="space-y-6">
          {/* Asosiy Muhandislik Xulosasi */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-200 text-xs font-semibold uppercase tracking-wider">
                  Qozon (Kotyol) Tavsiya Quvvati
                </span>
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">
                {buildingStats.recommendedBoilerKW} kVt
              </div>
              <p className="text-[11px] text-blue-200 mt-2">
                Q_jami ({buildingStats.totalHeatLossKW} kVt) + 20% zaxira va issiq suv (GVS) ehtiyoji bilan
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  Issiq Pol Tizimi
                </span>
                <Flame className="w-5 h-5 text-sky-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {buildingStats.totalUnderfloorAreaM2} m²
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {buildingStats.totalCircuitsCount} ta kontur • Jami quvur sarfi: ~{buildingStats.totalPipeLengthM} metr
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  Radiatorlar Tizimi
                </span>
                <Thermometer className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {buildingStats.totalRadiatorsCount} dona
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                O‘rnatilgan radiator quvvati: {(buildingStats.totalRadiatorPowerW / 1000.0).toFixed(2)} kVt
              </p>
            </div>
          </div>

          {/* Xonalar bo'yicha taqsimot jadvali */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-800">
              Xonalar bo‘yicha Issiqlik Yo‘qotilishi va Maydon Balansi Jadvali
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Xona nomi</th>
                    <th className="p-3">Qavat</th>
                    <th className="p-3">O‘lchamlar</th>
                    <th className="p-3">Maydon (m²)</th>
                    <th className="p-3">Istalgan t (°C)</th>
                    <th className="p-3">Tashqi devor</th>
                    <th className="p-3">Issiqlik yo‘qotilishi</th>
                    <th className="p-3">Solishtirma (Vt/m²)</th>
                    <th className="p-3">Isitish usuli</th>
                    <th className="p-3 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.rooms && project.rooms.map((r) => {
                    const heatCalc = r.calculation_results?.find((c) => c.calculation_type === 'heat_loss');
                    const heatW = heatCalc?.output_results?.total_heat_loss_w;
                    const specW = heatCalc?.output_results?.specific_heat_loss_w_m2;

                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{r.name}</td>
                        <td className="p-3 text-slate-600">{r.floor_number}-qavat</td>
                        <td className="p-3 text-slate-600 font-mono">{r.length}x{r.width}m</td>
                        <td className="p-3 font-semibold text-slate-900">{r.area} m²</td>
                        <td className="p-3 text-blue-600 font-medium">+{r.desired_temp}°C</td>
                        <td className="p-3 text-slate-600">{r.exterior_walls_count} ta</td>
                        <td className="p-3 font-bold text-slate-900">
                          {heatW !== undefined ? `${heatW.toFixed(0)} Vt` : '—'}
                        </td>
                        <td className="p-3 text-slate-600">
                          {specW !== undefined ? `${specW.toFixed(0)} Vt/m²` : '—'}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {r.heating_preference === 'combined'
                              ? 'Aralash'
                              : r.heating_preference === 'radiator_only'
                              ? 'Radiator'
                              : 'Issiq pol'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => onOpenRoomEditor(r.id)}
                            className="text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            Ochish
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bino Konstruksiyasini Sozlash Modali */}
      <BuildingEnvelopeModal
        project={project}
        building={project.building}
        isOpen={isEnvelopeModalOpen}
        onClose={() => setIsEnvelopeModalOpen(false)}
        onSave={handleSaveBuildingEnvelope}
      />

      {/* Yangi xona qo'shish modali */}
      {isAddRoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="font-bold text-slate-900 text-base mb-4">Yangi xona qo‘shish</h3>
            <form onSubmit={handleCreateRoom} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Xona nomi</label>
                <input
                  type="text"
                  required
                  placeholder="Mehmonxona, Oshxona, Yotoqxona..."
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Uzunligi (m)</label>
                  <NumericInput
                    min={1}
                    max={50}
                    fallbackValue={5}
                    value={roomForm.length}
                    onChange={(val) => setRoomForm({ ...roomForm, length: val })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Kengligi (m)</label>
                  <NumericInput
                    min={1}
                    max={50}
                    fallbackValue={4}
                    value={roomForm.width}
                    onChange={(val) => setRoomForm({ ...roomForm, width: val })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Balandligi (m)</label>
                  <NumericInput
                    min={1}
                    max={20}
                    fallbackValue={3}
                    value={roomForm.height}
                    onChange={(val) => setRoomForm({ ...roomForm, height: val })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Tashqi devorlar soni</label>
                  <select
                    value={roomForm.exterior_walls_count}
                    onChange={(e) => setRoomForm({ ...roomForm, exterior_walls_count: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="1">1 ta tashqi devor</option>
                    <option value="2">2 ta tashqi devor (burchak)</option>
                    <option value="3">3 ta tashqi devor</option>
                    <option value="4">4 ta tashqi devor</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Istalgan harorat (°C)</label>
                  <NumericInput
                    min={5}
                    max={40}
                    fallbackValue={22}
                    value={roomForm.desired_temp}
                    onChange={(val) => setRoomForm({ ...roomForm, desired_temp: val })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Isitish turi</label>
                <select
                  value={roomForm.heating_preference}
                  onChange={(e) => setRoomForm({ ...roomForm, heating_preference: e.target.value as any })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="combined">Aralash (Radiator + Issiq pol)</option>
                  <option value="radiator_only">Faqat radiator</option>
                  <option value="underfloor_only">Faqat issiq pol</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddRoomOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Xonani yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loyiha tahrirlash modali */}
      {isEditProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="font-bold text-slate-900 text-base mb-4">Loyiha parametrlarini tahrirlash</h3>
            <form onSubmit={handleSaveProject} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Loyiha nomi</label>
                <input
                  type="text"
                  required
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Obyekt manzili</label>
                <input
                  type="text"
                  value={projectForm.address}
                  onChange={(e) => setProjectForm({ ...projectForm, address: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Mijoz ismi</label>
                  <input
                    type="text"
                    value={projectForm.client_name}
                    onChange={(e) => setProjectForm({ ...projectForm, client_name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Telefon raqami</label>
                  <input
                    type="text"
                    value={projectForm.client_phone}
                    onChange={(e) => setProjectForm({ ...projectForm, client_phone: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Tashqi hisobiy harorat (°C)</label>
                <NumericInput
                  allowNegative={true}
                  fallbackValue={-15}
                  value={projectForm.outdoor_design_temp}
                  onChange={(val) => setProjectForm({ ...projectForm, outdoor_design_temp: val })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400">Toshkent: -15°C, Samarqand: -12°C, Nukus: -19°C</span>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Eslatmalar</label>
                <textarea
                  rows={2}
                  value={projectForm.notes}
                  onChange={(e) => setProjectForm({ ...projectForm, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditProjectOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
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
