import React, { useState, useEffect } from 'react';
import { Room, Project, RadiatorCatalogItem } from '../types';
import { api } from '../api/client';
import { RoomEditorCanvas } from '../editor/RoomEditorCanvas';
import { RoomCalculationsPanel } from '../editor/RoomCalculationsPanel';
import { NumericInput } from '../components/common/NumericInput';
import {
  ArrowLeft,
  Settings2,
  Plus,
  Trash2,
  DoorOpen,
  SquareDashed,
  Maximize2,
  Save,
  Check
} from 'lucide-react';

interface RoomEditorPageProps {
  roomId: number;
  onBack: () => void;
}

export const RoomEditorPage: React.FC<RoomEditorPageProps> = ({ roomId, onBack }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [catalogRadiators, setCatalogRadiators] = useState<RadiatorCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modallar
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
  const [isAddWindowOpen, setIsAddWindowOpen] = useState(false);
  const [isAddDoorOpen, setIsAddDoorOpen] = useState(false);

  // Xona tahrirlash formasi
  const [roomForm, setRoomForm] = useState({
    name: '',
    length: 5.0,
    width: 4.0,
    height: 3.0,
    exterior_walls_count: 1,
    desired_temp: 22.0,
    heating_preference: 'combined' as 'combined' | 'radiator_only' | 'underfloor_only',
  });

  // Yangi deraza formasi
  const [windowForm, setWindowForm] = useState({
    name: 'Deraza 1',
    width: 1.5,
    height: 1.4,
    wall_index: 0,
    position_along_wall: 1.0,
    glazing_type: 'double_standard',
    u_value: 1.8,
  });

  // Yangi eshik formasi
  const [doorForm, setDoorForm] = useState({
    name: 'Eshik 1',
    width: 0.9,
    height: 2.1,
    wall_index: 2,
    position_along_wall: 1.0,
    door_type: 'interior',
    u_value: 0.0,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [roomData, rads] = await Promise.all([
        api.getRoom(roomId),
        api.getRadiators(),
      ]);
      setRoom(roomData);
      setCatalogRadiators(rads);
      setRoomForm({
        name: roomData.name,
        length: roomData.length,
        width: roomData.width,
        height: roomData.height,
        exterior_walls_count: roomData.exterior_walls_count,
        desired_temp: roomData.desired_temp,
        heating_preference: roomData.heating_preference,
      });
    } catch (err: any) {
      setError(err.message || "Xona ma'lumotlarini yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [roomId]);

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    try {
      const updated = await api.updateRoom(room.id, roomForm);
      setRoom(updated);
      setIsEditRoomOpen(false);
    } catch (err: any) {
      alert("Xatolik: " + err.message);
    }
  };

  const handleAddWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    try {
      await api.createWindow({
        room: room.id,
        ...windowForm,
      });
      setIsAddWindowOpen(false);
      loadData();
    } catch (err: any) {
      alert("Deraza qo‘shishda xatolik: " + err.message);
    }
  };

  const handleDeleteWindow = async (id?: number) => {
    if (!id || !confirm("Derazani o‘chirmoqchimisiz?")) return;
    try {
      await api.deleteWindow(id);
      loadData();
    } catch (err: any) {
      alert("O‘chirishda xatolik: " + err.message);
    }
  };

  const handleAddDoor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    try {
      await api.createDoor({
        room: room.id,
        ...doorForm,
      });
      setIsAddDoorOpen(false);
      loadData();
    } catch (err: any) {
      alert("Eshik qo‘shishda xatolik: " + err.message);
    }
  };

  const handleDeleteDoor = async (id?: number) => {
    if (!id || !confirm("Eshikni o‘chirmoqchimisiz?")) return;
    try {
      await api.deleteDoor(id);
      loadData();
    } catch (err: any) {
      alert("O‘chirishda xatolik: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500 text-sm">Xona tahrirlagichi yuklanmoqda...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error || "Xona topilmadi"}</p>
        <button onClick={onBack} className="text-blue-600 underline text-sm">Ortga qaytish</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Yuqori sarlavha va asboblar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
            title="Loyiha sahifasiga qaytish"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">{room.name}</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {room.length} x {room.width} x {room.height} m
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Maydon: <b>{room.area} m²</b> | Hajm: <b>{room.volume} m³</b> | Tashqi devorlar: <b>{room.exterior_walls_count} ta</b>
            </p>
          </div>
        </div>

        {/* Tugmalar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditRoomOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
          >
            <Settings2 className="w-3.5 h-3.5" />
            O‘lchamlarni tahrirlash
          </button>

          <button
            onClick={() => setIsAddWindowOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors border border-sky-200"
          >
            <Plus className="w-3.5 h-3.5" />
            Deraza qo‘shish
          </button>

          <button
            onClick={() => setIsAddDoorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200"
          >
            <DoorOpen className="w-3.5 h-3.5" />
            Eshik qo‘shish
          </button>
        </div>
      </div>

      {/* 2 Ustunli Asosiy Panel: 2D Canvas + Hisob-kitoblar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chap ustun: 2D SVG Xona Muharriri (7 ustun) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <RoomEditorCanvas
            room={room}
            manifold={room.manifolds?.[0] || null}
            onCalculationUpdated={loadData}
          />

          {/* Deraza va eshiklar ro'yxati kartochkasi */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-800 text-xs mb-3 flex items-center justify-between">
              <span>O‘rnatilgan deraza va eshiklar ({room.windows?.length || 0} ta oyna, {room.doors?.length || 0} ta eshik)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {room.windows?.map((w) => (
                <div key={w.id} className="p-2.5 rounded-xl border border-sky-100 bg-sky-50/50 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sky-950">{w.name}</div>
                    <div className="text-[11px] text-sky-700">
                      {w.width} x {w.height} m ({w.area} m²) | U={w.u_value}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteWindow(w.id)}
                    className="p-1 hover:text-red-600 text-slate-400 rounded-md"
                    title="O‘chirish"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {room.doors?.map((d) => (
                <div key={d.id} className="p-2.5 rounded-xl border border-amber-100 bg-amber-50/50 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-amber-950">{d.name}</div>
                    <div className="text-[11px] text-amber-700">
                      {d.width} x {d.height} m ({d.area} m²) | U={d.u_value}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDoor(d.id)}
                    className="p-1 hover:text-red-600 text-slate-400 rounded-md"
                    title="O‘chirish"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* O'ng ustun: Muhandislik Hisob-kitoblari Paneli (5 ustun) */}
        <div className="lg:col-span-5 h-[700px]">
          <RoomCalculationsPanel
            room={room}
            catalogRadiators={catalogRadiators}
            onCalculationUpdated={loadData}
          />
        </div>
      </div>

      {/* Xona o'lchamlari tahrirlash modali */}
      {isEditRoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="font-bold text-slate-900 text-base mb-4">Xona o‘lchamlarini tahrirlash</h3>
            <form onSubmit={handleSaveRoom} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Xona nomi</label>
                <input
                  type="text"
                  required
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
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
                    <option value="4">4 ta tashqi devor (alohida)</option>
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
                <label className="block font-medium text-slate-600 mb-1">Isitish afzalligi</label>
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
                  onClick={() => setIsEditRoomOpen(false)}
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

      {/* Deraza qo'shish modali */}
      {isAddWindowOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-slate-900 text-base mb-4">Deraza qo‘shish</h3>
            <form onSubmit={handleAddWindow} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomi</label>
                <input
                  type="text"
                  required
                  value={windowForm.name}
                  onChange={(e) => setWindowForm({ ...windowForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Kengligi (m)</label>
                  <NumericInput
                    min={0.3}
                    max={10}
                    fallbackValue={1.5}
                    value={windowForm.width}
                    onChange={(val) => setWindowForm({ ...windowForm, width: val })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Balandligi (m)</label>
                  <NumericInput
                    min={0.3}
                    max={10}
                    fallbackValue={1.4}
                    value={windowForm.height}
                    onChange={(val) => setWindowForm({ ...windowForm, height: val })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Oynapaket turi</label>
                <select
                  value={windowForm.glazing_type}
                  onChange={(e) => {
                    const uMap: Record<string, number> = {
                      single: 5.2,
                      double_standard: 1.8,
                      double_low_e: 1.4,
                      triple: 1.1,
                    };
                    setWindowForm({
                      ...windowForm,
                      glazing_type: e.target.value,
                      u_value: uMap[e.target.value] || 1.8,
                    });
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="double_standard">2 qavatli standart oynapaket (U=1.8)</option>
                  <option value="double_low_e">2 qavatli Low-E energiya tejamkor (U=1.4)</option>
                  <option value="triple">3 qavatli zamonaviy oynapaket (U=1.1)</option>
                  <option value="single">1 qavatli oddiy shisha (U=5.2)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddWindowOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Qo‘shish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Eshik qo'shish modali */}
      {isAddDoorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-slate-900 text-base mb-4">Eshik qo‘shish</h3>
            <form onSubmit={handleAddDoor} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomi</label>
                <input
                  type="text"
                  required
                  value={doorForm.name}
                  onChange={(e) => setDoorForm({ ...doorForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Kengligi (m)</label>
                  <NumericInput
                    min={0.5}
                    max={5}
                    fallbackValue={0.9}
                    value={doorForm.width}
                    onChange={(val) => setDoorForm({ ...doorForm, width: val })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Balandligi (m)</label>
                  <NumericInput
                    min={1.5}
                    max={5}
                    fallbackValue={2.1}
                    value={doorForm.height}
                    onChange={(val) => setDoorForm({ ...doorForm, height: val })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Eshik turi</label>
                <select
                  value={doorForm.door_type}
                  onChange={(e) => {
                    const uMap: Record<string, number> = {
                      interior: 0.0,
                      exterior_insulated: 1.8,
                      exterior_wood: 2.5,
                      balcony_glass: 1.6,
                    };
                    setDoorForm({
                      ...doorForm,
                      door_type: e.target.value,
                      u_value: uMap[e.target.value] || 0.0,
                    });
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="interior">Ichki xonalararo eshik (U=0, yo‘qotishsiz)</option>
                  <option value="exterior_insulated">Tashqi izolyatsiyalangan eshik (U=1.8)</option>
                  <option value="exterior_wood">Tashqi yog‘och eshik (U=2.5)</option>
                  <option value="balcony_glass">Balkon shisha eshigi (U=1.6)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddDoorOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
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
