import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Project, Room, UnderfloorCircuitItem, Manifold } from '../../types';
import { api } from '../../api/client';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  Flame,
  Layers,
  Thermometer,
  ExternalLink,
  Save,
  Check,
  Grid,
  Sparkles,
  RotateCcw,
  Sliders,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw,
  Box,
  Compass,
  Info,
  ChevronRight,
  Activity,
  Wrench,
  X
} from 'lucide-react';

interface HouseMasterPlanCanvasProps {
  project: Project;
  onOpenRoomEditor: (roomId: number) => void;
  onLayoutSaved?: () => void;
}

// Client-side fallback bifilar spiral path generator
function computeBifilarSpiral(
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number,
  spacingM: number
): { supply: [number, number][]; returnPts: [number, number][] } {
  const step = spacingM * 2.0;
  const supply: [number, number][] = [];
  const returnPts: [number, number][] = [];

  let left = xMin;
  let top = yMin;
  let right = xMax;
  let bottom = yMax;

  while (right - left >= 2.5 * spacingM && bottom - top >= 2.5 * spacingM) {
    supply.push([Number(left.toFixed(2)), Number(top.toFixed(2))]);
    supply.push([Number(right.toFixed(2)), Number(top.toFixed(2))]);
    supply.push([Number(right.toFixed(2)), Number(bottom.toFixed(2))]);
    supply.push([Number((left + step).toFixed(2)), Number(bottom.toFixed(2))]);
    supply.push([Number((left + step).toFixed(2)), Number((top + step).toFixed(2))]);

    returnPts.unshift([Number((left + spacingM).toFixed(2)), Number((top + spacingM).toFixed(2))]);
    returnPts.unshift([Number((right - spacingM).toFixed(2)), Number((top + spacingM).toFixed(2))]);
    returnPts.unshift([Number((right - spacingM).toFixed(2)), Number((bottom - spacingM).toFixed(2))]);
    returnPts.unshift([Number((left + step + spacingM).toFixed(2)), Number((bottom - spacingM).toFixed(2))]);

    left += step;
    top += step;
    right -= step;
    bottom -= step;
  }

  if (supply.length > 0 && returnPts.length > 0) {
    const lastS = supply[supply.length - 1];
    const firstR = returnPts[0];
    const mid: [number, number] = [
      Number(((lastS[0] + firstR[0]) / 2).toFixed(2)),
      Number(((lastS[1] + firstR[1]) / 2).toFixed(2)),
    ];
    supply.push(mid);
    returnPts.unshift(mid);
  }

  return { supply, returnPts };
}

export const HouseMasterPlanCanvas: React.FC<HouseMasterPlanCanvasProps> = ({
  project,
  onOpenRoomEditor,
  onLayoutSaved,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Qavat tanlash
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [selectedCircuitId, setSelectedCircuitId] = useState<number | null>(null);
  const [hoveredCircuitId, setHoveredCircuitId] = useState<number | null>(null);

  // Zoom va Pan
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Tahrirlash va Drag
  const [isEditLayoutMode, setIsEditLayoutMode] = useState<boolean>(false);
  const [draggingTarget, setDraggingTarget] = useState<{ type: 'room' | 'manifold'; id?: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [savingLayout, setSavingLayout] = useState<boolean>(false);
  const [isRecalculatingRouting, setIsRecalculatingRouting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Tab paneli (inspector)
  const [activeTab, setActiveTab] = useState<'circuits' | 'manifold' | 'legend'>('circuits');
  const [isPanelExpanded, setIsPanelExpanded] = useState<boolean>(true);

  // Qatlamlar (Layers)
  const [layers, setLayers] = useState({
    showTubes: true,
    showFeeders: true,
    showDimensions: true,
    showLabels: true,
    showRadiators: true,
    showGrid: true,
  });
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);

  // Xonalar joylashuvi
  const [roomPositions, setRoomPositions] = useState<Record<number, { x: number; y: number }>>({});

  // Kollektor pozitsiyasi
  const primaryManifold = useMemo(() => {
    return project.manifolds && project.manifolds.length > 0 ? project.manifolds[0] : null;
  }, [project.manifolds]);

  const [manifoldPos, setManifoldPos] = useState<{ x: number; y: number }>({
    x: primaryManifold?.position_x ?? 8.0,
    y: primaryManifold?.position_y ?? 0.5,
  });

  // Qavatlar
  const availableFloors = useMemo(() => {
    if (!project.rooms) return [1];
    const floors = Array.from(new Set(project.rooms.map((r) => r.floor_number || 1))).sort((a, b) => a - b);
    return floors.length > 0 ? floors : [1];
  }, [project.rooms]);

  // Initial layout calculation
  useEffect(() => {
    if (!project.rooms) return;
    const initialPos: Record<number, { x: number; y: number }> = {};
    let curX = 0;
    let curY = 0;
    let maxHeight = 0;
    const rowLimit = 16.0;

    project.rooms.forEach((r) => {
      if (r.position_x !== undefined && r.position_y !== undefined && (r.position_x !== 0 || r.position_y !== 0)) {
        initialPos[r.id] = { x: r.position_x, y: r.position_y };
      } else {
        if (curX + r.width > rowLimit && curX > 0) {
          curX = 0;
          curY += maxHeight + 0.6;
          maxHeight = 0;
        }
        initialPos[r.id] = { x: Number(curX.toFixed(2)), y: Number(curY.toFixed(2)) };
        curX += r.width + 0.6;
        if (r.length > maxHeight) maxHeight = r.length;
      }
    });

    setRoomPositions(initialPos);
  }, [project.rooms]);

  useEffect(() => {
    if (primaryManifold) {
      setManifoldPos({
        x: primaryManifold.position_x ?? 8.0,
        y: primaryManifold.position_y ?? 0.5,
      });
    }
  }, [primaryManifold]);

  // Display rooms
  const roomsToDisplay = useMemo(() => {
    if (!project.rooms) return [];
    return project.rooms.filter((r) => selectedFloor === 'all' || r.floor_number === selectedFloor);
  }, [project.rooms, selectedFloor]);

  // All circuits flat list
  const allCircuits = useMemo(() => {
    const list: { circuit: UnderfloorCircuitItem; room: Room }[] = [];
    if (!project.rooms) return list;
    project.rooms.forEach((r) => {
      if (selectedFloor === 'all' || r.floor_number === selectedFloor) {
        if (r.underfloor_circuits && r.underfloor_circuits.length > 0) {
          r.underfloor_circuits.forEach((c) => {
            list.push({ circuit: c, room: r });
          });
        }
      }
    });
    return list;
  }, [project.rooms, selectedFloor]);

  // Manifold outlets validation
  const totalCircuitsCount = allCircuits.length;
  const manifoldOutletsCount = primaryManifold?.outlets_count ?? 8;
  const isOverCapacity = totalCircuitsCount > manifoldOutletsCount;

  // Building bounds
  const buildingBounds = useMemo(() => {
    let minX = 0, minY = 0, maxX = 12, maxY = 8;
    roomsToDisplay.forEach((r) => {
      const pos = roomPositions[r.id] || { x: 0, y: 0 };
      const right = pos.x + r.width;
      const bottom = pos.y + r.length;
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    });
    if (manifoldPos.x + 2 > maxX) maxX = manifoldPos.x + 2;
    if (manifoldPos.y + 2 > maxY) maxY = manifoldPos.y + 2;

    return {
      widthM: Math.max(maxX + 2, 14),
      heightM: Math.max(maxY + 2, 10),
    };
  }, [roomsToDisplay, roomPositions, manifoldPos]);

  const pxPerMeter = 44 * zoom;

  // Fit to view
  const fitToView = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const padding = 60;
    const availableW = rect.width - padding * 2;
    const availableH = rect.height - padding * 2;

    const scaleX = availableW / (buildingBounds.widthM * 44);
    const scaleY = availableH / (buildingBounds.heightM * 44);
    const newZoom = Math.min(Math.max(0.5, Math.min(scaleX, scaleY)), 2.2);

    setZoom(newZoom);
    setPan({
      x: padding,
      y: padding,
    });
  }, [buildingBounds]);

  // Auto arrange
  const handleAutoArrange = () => {
    if (!project.rooms) return;
    const newPos: Record<number, { x: number; y: number }> = {};
    let curX = 0;
    let curY = 0;
    let maxH = 0;
    const maxRowW = 16.0;

    project.rooms.forEach((r) => {
      if (curX + r.width > maxRowW && curX > 0) {
        curX = 0;
        curY += maxH + 0.6;
        maxH = 0;
      }
      newPos[r.id] = { x: Number(curX.toFixed(2)), y: Number(curY.toFixed(2)) };
      curX += r.width + 0.6;
      if (r.length > maxH) maxH = r.length;
    });

    setRoomPositions(newPos);
  };

  // Save layout
  const handleSaveLayout = async () => {
    try {
      setSavingLayout(true);
      const payload = Object.entries(roomPositions).map(([roomId, pos]) => ({
        id: Number(roomId),
        position_x: pos.x,
        position_y: pos.y,
      }));

      await api.saveProjectLayout(project.id, payload);
      await api.updateManifold(project.id, {
        position_x: manifoldPos.x,
        position_y: manifoldPos.y,
      });

      setNotification({
        type: 'success',
        text: "Bino va kollektorning CAD koordinatalari muvaffaqiyatli saqlandi!",
      });
      setTimeout(() => setNotification(null), 3500);
      setIsEditLayoutMode(false);
      if (onLayoutSaved) onLayoutSaved();
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: "Koordinatalarni saqlashda xatolik: " + err.message,
      });
    } finally {
      setSavingLayout(false);
    }
  };

  // Recalculate routing
  const handleRecalculateRouting = async () => {
    try {
      setIsRecalculatingRouting(true);
      await api.updateCircuitsRouting(project.id);
      setNotification({
        type: 'success',
        text: "Barcha konturlarning magistral marshrutlari (T11/T12) muvaffaqiyatli qayta hisoblandi!",
      });
      setTimeout(() => setNotification(null), 3500);
      if (onLayoutSaved) onLayoutSaved();
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: "Marshrutlashda xatolik yuz berdi: " + err.message,
      });
    } finally {
      setIsRecalculatingRouting(false);
    }
  };

  // Expand manifold outlets
  const handleExpandManifoldOutlets = async (newCount: number) => {
    try {
      await api.updateManifold(project.id, { outlets_count: newCount });
      setNotification({
        type: 'success',
        text: `Kollektor chiqishlari ${newCount} taga muvaffaqiyatli kengaytirildi!`,
      });
      setTimeout(() => setNotification(null), 3000);
      if (onLayoutSaved) onLayoutSaved();
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: "Kollektorni kengaytirishda xatolik: " + err.message,
      });
    }
  };

  // Toggle circuit lock
  const handleToggleCircuitLock = async (circuitId: number, currentLocked: boolean) => {
    try {
      await api.updateUnderfloorCircuit(circuitId, { is_locked: !currentLocked });
      if (onLayoutSaved) onLayoutSaved();
    } catch (err: any) {
      alert("Konturni qulflashda xatolik: " + err.message);
    }
  };

  // Pan & Mouse handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (draggingTarget !== null) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && draggingTarget === null) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
      return;
    }

    if (draggingTarget !== null && isEditLayoutMode) {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const mouseXM = (e.clientX - containerRect.left - pan.x) / pxPerMeter;
      const mouseYM = (e.clientY - containerRect.top - pan.y) / pxPerMeter;

      const rawX = mouseXM - dragOffset.x;
      const rawY = mouseYM - dragOffset.y;

      const snap = 0.25;
      const snappedX = Math.max(0, Math.round(rawX / snap) * snap);
      const snappedY = Math.max(0, Math.round(rawY / snap) * snap);

      if (draggingTarget.type === 'room' && draggingTarget.id) {
        setRoomPositions((prev) => ({
          ...prev,
          [draggingTarget.id!]: {
            x: Number(snappedX.toFixed(2)),
            y: Number(snappedY.toFixed(2)),
          },
        }));
      } else if (draggingTarget.type === 'manifold') {
        setManifoldPos({
          x: Number(snappedX.toFixed(2)),
          y: Number(snappedY.toFixed(2)),
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingTarget(null);
  };

  const handleItemMouseDown = (
    type: 'room' | 'manifold',
    id: number | undefined,
    currentPos: { x: number; y: number },
    e: React.MouseEvent
  ) => {
    if (!isEditLayoutMode) return;
    e.stopPropagation();
    setDraggingTarget({ type, id });

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const mouseXM = (e.clientX - containerRect.left - pan.x) / pxPerMeter;
    const mouseYM = (e.clientY - containerRect.top - pan.y) / pxPerMeter;

    setDragOffset({
      x: mouseXM - currentPos.x,
      y: mouseYM - currentPos.y,
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((prev) => Math.min(Math.max(0.4, prev * factor), 3.0));
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX * 0.8,
        y: prev.y - e.deltaY * 0.8,
      }));
    }
  };

  // Selected circuit details
  const activeCircuitDetails = useMemo(() => {
    if (!selectedCircuitId) return null;
    return allCircuits.find((c) => c.circuit.id === selectedCircuitId) || null;
  }, [allCircuits, selectedCircuitId]);

  return (
    <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col font-sans">
      {/* 1. Header Toolbar */}
      <div className="bg-slate-900 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl text-white shadow-md shadow-blue-500/20">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                Planta Geral de Piso Radiante (Master CAD Plan)
              </h3>
              <span className="text-[10px] font-mono bg-blue-950 text-blue-400 border border-blue-800/80 px-2 py-0.5 rounded-full font-semibold">
                M 1:50 CAD
              </span>
              {isEditLayoutMode && (
                <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  Rejani tahrirlash
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Uponor standarti: T11 (suprimento/qizil), T12 (retorno/ko‘k), kollektor chiqishlari va to‘liq marshrut
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Floor selector */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl text-xs border border-slate-700/60">
            <button
              onClick={() => setSelectedFloor('all')}
              className={`px-2.5 py-1 rounded-lg transition-all font-medium text-xs ${
                selectedFloor === 'all'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Barcha qavatlar
            </button>
            {availableFloors.map((fl) => (
              <button
                key={fl}
                onClick={() => setSelectedFloor(fl)}
                className={`px-2.5 py-1 rounded-lg transition-all font-medium text-xs ${
                  selectedFloor === fl
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {fl}-qavat
              </button>
            ))}
          </div>

          {/* Layer toggles popover button */}
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
              title="Qatlamlarni ko'rsatish/yashirish"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Qatlamlar</span>
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl z-50 text-xs space-y-2">
                <div className="font-bold text-slate-200 pb-1 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  CAD Qatlamlari
                </div>
                <label className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-1">
                  <span>Truba konturlari (T11/T12)</span>
                  <input
                    type="checkbox"
                    checked={layers.showTubes}
                    onChange={(e) => setLayers({ ...layers, showTubes: e.target.checked })}
                    className="accent-blue-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-1">
                  <span>Magistral ulanishlar (Feeders)</span>
                  <input
                    type="checkbox"
                    checked={layers.showFeeders}
                    onChange={(e) => setLayers({ ...layers, showFeeders: e.target.checked })}
                    className="accent-blue-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-1">
                  <span>O‘lcham chiziqlari</span>
                  <input
                    type="checkbox"
                    checked={layers.showDimensions}
                    onChange={(e) => setLayers({ ...layers, showDimensions: e.target.checked })}
                    className="accent-blue-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-1">
                  <span>Kontur shtamplari & Matn</span>
                  <input
                    type="checkbox"
                    checked={layers.showLabels}
                    onChange={(e) => setLayers({ ...layers, showLabels: e.target.checked })}
                    className="accent-blue-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-1">
                  <span>Radiatorlar</span>
                  <input
                    type="checkbox"
                    checked={layers.showRadiators}
                    onChange={(e) => setLayers({ ...layers, showRadiators: e.target.checked })}
                    className="accent-blue-600 rounded"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Auto route button */}
          <button
            onClick={handleRecalculateRouting}
            disabled={isRecalculatingRouting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl border border-indigo-500 shadow-sm transition-colors disabled:opacity-50"
            title="Kollektordan xonalargacha bo'lgan feeder magistral liniyalarini avtomatik hisoblash"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRecalculatingRouting ? 'animate-spin' : ''}`} />
            <span>{isRecalculatingRouting ? "Marshrutlanmoqda..." : "Magistrallarni yangilash"}</span>
          </button>

          {/* Edit layout toggle */}
          {!isEditLayoutMode ? (
            <button
              onClick={() => setIsEditLayoutMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
              title="Xonalar va kollektorni reja bo‘ylab siljitish"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Rejani tahrirlash</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleAutoArrange}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700 transition-colors"
                title="Xonalarni avtomatik joylashtirish"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Avto-joylash</span>
              </button>

              <button
                onClick={handleSaveLayout}
                disabled={savingLayout}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingLayout ? "Saqlanmoqda..." : "Saqlash"}</span>
              </button>

              <button
                onClick={() => setIsEditLayoutMode(false)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-xl"
              >
                Yopish
              </button>
            </div>
          )}

          {/* Zoom & Fit controls */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 text-slate-300 border border-slate-700">
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              className="p-1 hover:text-white rounded"
              title="Kichiklashtirish"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-1.5 text-[11px] font-mono text-slate-300 font-semibold">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(3.0, z + 0.15))}
              className="p-1 hover:text-white rounded"
              title="Kattalashtirish"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={fitToView}
              className="p-1 hover:text-white rounded ml-1 text-sky-400"
              title="Rejani ekranga moslashtirish (Fit to View)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Capacity Warning Banner */}
      {isOverCapacity && (
        <div className="bg-red-500/15 border-b border-red-500/30 text-red-200 px-4 py-2 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              <b>Diqqat:</b> Kollektor chiqishlari soni yetarli emas! Mavjud konturlar soni:{' '}
              <b>{totalCircuitsCount} ta</b>, Kollektor sig‘imi: <b>{manifoldOutletsCount} ta</b>.
            </span>
          </div>
          <button
            onClick={() => handleExpandManifoldOutlets(totalCircuitsCount)}
            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-[11px] transition-colors shrink-0"
          >
            + Chiqishlarni {totalCircuitsCount} taga oshirish
          </button>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div
          className={`px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-2 animate-fadeIn transition-colors ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white'
              : notification.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-amber-600 text-white'
          }`}
        >
          {notification.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* 2. Interactive SVG Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className={`relative w-full h-[580px] bg-slate-950 overflow-hidden select-none cursor-${
          isEditLayoutMode ? 'default' : isPanning ? 'grabbing' : 'grab'
        }`}
        style={{
          backgroundImage: layers.showGrid
            ? `
            linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
          `
            : undefined,
          backgroundSize: `${pxPerMeter}px ${pxPerMeter}px`,
        }}
      >
        <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none">
          <g transform={`translate(${pan.x}, ${pan.y})`}>
            {/* Fine subgrid */}
            {layers.showGrid && (
              <defs>
                <pattern
                  id="house_master_grid_sub"
                  width={pxPerMeter * 0.5}
                  height={pxPerMeter * 0.5}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${pxPerMeter * 0.5} 0 L 0 0 0 ${pxPerMeter * 0.5}`}
                    fill="none"
                    stroke="rgba(255,255,255,0.02)"
                    strokeWidth="0.8"
                  />
                </pattern>
                {/* Glow filter for highlighted circuit */}
                <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
            )}

            {layers.showGrid && (
              <rect
                x="-300"
                y="-300"
                width={buildingBounds.widthM * pxPerMeter + 600}
                height={buildingBounds.heightM * pxPerMeter + 600}
                fill="url(#house_master_grid_sub)"
              />
            )}

            {/* A. Feeder Lines from Manifold to Rooms (Under floor level) */}
            {layers.showFeeders &&
              allCircuits.map(({ circuit, room }) => {
                const isSelected = selectedCircuitId === circuit.id;
                const isHovered = hoveredCircuitId === circuit.id;
                const hasFocus = selectedCircuitId !== null;
                const opacity = isSelected ? 1.0 : hasFocus ? 0.18 : 0.85;

                const supPts = circuit.feeder_supply_points;
                const retPts = circuit.feeder_return_points;

                if (!supPts || !retPts) return null;

                const supPathStr = supPts
                  .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p[0] * pxPerMeter} ${p[1] * pxPerMeter}`)
                  .join(' ');
                const retPathStr = retPts
                  .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p[0] * pxPerMeter} ${p[1] * pxPerMeter}`)
                  .join(' ');

                return (
                  <g
                    key={`feeder-${circuit.id}`}
                    opacity={opacity}
                    className="pointer-events-auto cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCircuitId(circuit.id === selectedCircuitId ? null : circuit.id || null);
                      setSelectedRoomId(room.id);
                    }}
                    onMouseEnter={() => setHoveredCircuitId(circuit.id || null)}
                    onMouseLeave={() => setHoveredCircuitId(null)}
                  >
                    {/* Wider transparent hit zone */}
                    <path d={supPathStr} fill="none" stroke="transparent" strokeWidth="14" />
                    <path d={retPathStr} fill="none" stroke="transparent" strokeWidth="14" />

                    {/* Supply Feeder (T11 Suprimento / Red) */}
                    <path
                      d={supPathStr}
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth={isSelected ? '2.4' : isHovered ? '1.8' : '1.2'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter={isSelected ? 'url(#route-glow)' : undefined}
                    />

                    {/* Return Feeder (T12 Retorno / Blue) */}
                    <path
                      d={retPathStr}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth={isSelected ? '2.4' : isHovered ? '1.8' : '1.2'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter={isSelected ? 'url(#route-glow)' : undefined}
                    />

                    {/* Protective corrugated sleeve marker at entry */}
                    {supPts.length >= 2 && (
                      <circle
                        cx={supPts[supPts.length - 1][0] * pxPerMeter}
                        cy={supPts[supPts.length - 1][1] * pxPerMeter}
                        r="3.5"
                        fill="#F59E0B"
                        stroke="#0F172A"
                        strokeWidth="1"
                      />
                    )}
                  </g>
                );
              })}

            {/* B. All Rooms CAD Rendering */}
            {roomsToDisplay.map((r) => {
              const pos = roomPositions[r.id] || { x: 0, y: 0 };
              const rWidthPx = r.width * pxPerMeter;
              const rLengthPx = r.length * pxPerMeter;
              const isSelected = selectedRoomId === r.id;
              const isDragging = draggingTarget?.type === 'room' && draggingTarget?.id === r.id;

              const heatCalc = r.calculation_results?.find((c) => c.calculation_type === 'heat_loss');
              const heatLossW = heatCalc?.output_results?.total_heat_loss_w;
              const specW = heatCalc?.output_results?.specific_heat_loss_w_m2;

              const circuits = r.underfloor_circuits || [];
              const hasCircuits = circuits.length > 0;
              const showHeatingPiso = r.heating_preference !== 'radiator_only';

              return (
                <g
                  key={r.id}
                  transform={`translate(${pos.x * pxPerMeter}, ${pos.y * pxPerMeter})`}
                  className="pointer-events-auto cursor-pointer"
                  onClick={() => setSelectedRoomId(r.id)}
                  onMouseDown={(e) => handleItemMouseDown('room', r.id, pos, e)}
                >
                  {/* Floor slab background */}
                  <rect
                    x="0"
                    y="0"
                    width={rWidthPx}
                    height={rLengthPx}
                    rx="3"
                    fill={
                      isSelected
                        ? 'rgba(37, 99, 235, 0.16)'
                        : isDragging
                        ? 'rgba(245, 158, 11, 0.22)'
                        : 'rgba(30, 41, 59, 0.85)'
                    }
                    stroke={isSelected ? '#3B82F6' : isDragging ? '#F59E0B' : 'rgba(100, 116, 139, 0.7)'}
                    strokeWidth={isSelected ? '2.0' : '1.3'}
                    strokeDasharray={isDragging ? '4 2' : undefined}
                  />

                  {/* Architectural double-line walls */}
                  <rect
                    x="3.5"
                    y="3.5"
                    width={Math.max(0, rWidthPx - 7)}
                    height={Math.max(0, rLengthPx - 7)}
                    fill="none"
                    stroke={isSelected ? '#60A5FA' : 'rgba(148, 163, 184, 0.35)'}
                    strokeWidth="0.8"
                  />

                  {/* Real Underfloor Heating Circuits (Uponor T11 Red / T12 Blue) */}
                  {layers.showTubes && showHeatingPiso && (
                    <g>
                      {hasCircuits ? (
                        circuits.map((circ) => {
                          const isCircSelected = selectedCircuitId === circ.id;
                          const hasFocus = selectedCircuitId !== null;
                          const circOpacity = isCircSelected ? 1.0 : hasFocus ? 0.2 : 0.88;

                          let supPts = circ.supply_path_points;
                          let retPts = circ.return_path_points;

                          if ((!supPts || supPts.length === 0) && circ.path_points && circ.path_points.length > 0) {
                            const half = Math.floor(circ.path_points.length / 2);
                            supPts = circ.path_points.slice(0, half);
                            retPts = circ.path_points.slice(half);
                          }

                          // Fallback to geometric generation if points missing
                          if ((!supPts || supPts.length === 0) && (!retPts || retPts.length === 0)) {
                            const spacingM = (circ.spacing_mm || 150) / 1000.0;
                            const gen = computeBifilarSpiral(0.2, 0.2, r.width - 0.2, r.length - 0.2, spacingM);
                            supPts = gen.supply;
                            retPts = gen.returnPts;
                          }

                          const supStr = supPts
                            ? supPts
                                .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p[0] * pxPerMeter} ${p[1] * pxPerMeter}`)
                                .join(' ')
                            : '';
                          const retStr = retPts
                            ? retPts
                                .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p[0] * pxPerMeter} ${p[1] * pxPerMeter}`)
                                .join(' ')
                            : '';

                          return (
                            <g
                              key={circ.id || circ.circuit_number}
                              opacity={circOpacity}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCircuitId(circ.id === selectedCircuitId ? null : circ.id || null);
                                setSelectedRoomId(r.id);
                              }}
                              className="cursor-pointer"
                            >
                              {/* Red Supply path */}
                              {supStr && (
                                <path
                                  d={supStr}
                                  fill="none"
                                  stroke="#EF4444"
                                  strokeWidth={isCircSelected ? '2.4' : '1.1'}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  filter={isCircSelected ? 'url(#route-glow)' : undefined}
                                />
                              )}

                              {/* Blue Return path */}
                              {retStr && (
                                <path
                                  d={retStr}
                                  fill="none"
                                  stroke="#38BDF8"
                                  strokeWidth={isCircSelected ? '2.4' : '1.1'}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  filter={isCircSelected ? 'url(#route-glow)' : undefined}
                                />
                              )}
                            </g>
                          );
                        })
                      ) : (
                        // Dynamic preview coil if room not calculated yet
                        <g opacity="0.35">
                          {Array.from({ length: Math.min(5, Math.floor(r.length / 0.8)) }).map((_, loopIdx) => {
                            const inset = (loopIdx + 1) * Math.max(8, pxPerMeter * 0.16);
                            if (rWidthPx - inset * 2 <= 12 || rLengthPx - inset * 2 <= 12) return null;
                            return (
                              <rect
                                key={loopIdx}
                                x={inset}
                                y={inset}
                                width={rWidthPx - inset * 2}
                                height={rLengthPx - inset * 2}
                                rx="4"
                                fill="none"
                                stroke={loopIdx % 2 === 0 ? '#EF4444' : '#38BDF8'}
                                strokeWidth="1.0"
                                strokeDasharray="4 2"
                              />
                            );
                          })}
                        </g>
                      )}
                    </g>
                  )}

                  {/* Windows */}
                  {r.windows &&
                    r.windows.map((win, winIdx) => {
                      const winLenPx = (win.width || 1.5) * pxPerMeter;
                      const winPosPx = (win.position_along_wall || 1.0) * pxPerMeter;
                      const wallIdx = win.wall_index ?? 0;

                      let wx = 0, wy = 0, ww = 0, wh = 0;
                      if (wallIdx === 0) {
                        wx = winPosPx;
                        wy = -2.5;
                        ww = Math.min(winLenPx, rWidthPx - wx);
                        wh = 5.5;
                      } else if (wallIdx === 1) {
                        wx = rWidthPx - 3;
                        wy = winPosPx;
                        ww = 5.5;
                        wh = Math.min(winLenPx, rLengthPx - wy);
                      } else if (wallIdx === 2) {
                        wx = winPosPx;
                        wy = rLengthPx - 3;
                        ww = Math.min(winLenPx, rWidthPx - wx);
                        wh = 5.5;
                      } else {
                        wx = -2.5;
                        wy = winPosPx;
                        ww = 5.5;
                        wh = Math.min(winLenPx, rLengthPx - wy);
                      }

                      return (
                        <g key={winIdx}>
                          <rect x={wx} y={wy} width={ww} height={wh} fill="#0284C7" stroke="#E2E8F0" strokeWidth="1.0" />
                          <line
                            x1={wallIdx % 2 === 0 ? wx : wx + ww / 2}
                            y1={wallIdx % 2 === 0 ? wy + wh / 2 : wy}
                            x2={wallIdx % 2 === 0 ? wx + ww : wx + ww / 2}
                            y2={wallIdx % 2 === 0 ? wy + wh / 2 : wy + wh}
                            stroke="#FFFFFF"
                            strokeWidth="0.8"
                          />
                        </g>
                      );
                    })}

                  {/* Doors with swing arc */}
                  {r.doors &&
                    r.doors.map((door, doorIdx) => {
                      const doorLenPx = (door.width || 0.9) * pxPerMeter;
                      const doorPosPx = (door.position_along_wall || 1.0) * pxPerMeter;
                      const wallIdx = door.wall_index ?? 2;

                      let dx = 0, dy = 0, dw = 0, dh = 0;
                      if (wallIdx === 2) {
                        dx = doorPosPx;
                        dy = rLengthPx - 2.5;
                        dw = Math.min(doorLenPx, rWidthPx - dx);
                        dh = 4.5;
                      } else if (wallIdx === 0) {
                        dx = doorPosPx;
                        dy = -2;
                        dw = Math.min(doorLenPx, rWidthPx - dx);
                        dh = 4.5;
                      } else if (wallIdx === 1) {
                        dx = rWidthPx - 2;
                        dy = doorPosPx;
                        dw = 4.5;
                        dh = Math.min(doorLenPx, rLengthPx - dy);
                      } else {
                        dx = -2;
                        dy = doorPosPx;
                        dw = 4.5;
                        dh = Math.min(doorLenPx, rLengthPx - dy);
                      }

                      return (
                        <g key={doorIdx}>
                          <rect x={dx} y={dy} width={dw} height={dh} fill="#F59E0B" stroke="#FDE68A" strokeWidth="1.0" />
                          <path
                            d={`M ${dx} ${dy} A ${dw} ${dw} 0 0 1 ${dx + dw} ${dy}`}
                            fill="none"
                            stroke="rgba(245, 158, 11, 0.45)"
                            strokeWidth="0.8"
                            strokeDasharray="2 2"
                          />
                        </g>
                      );
                    })}

                  {/* Radiators */}
                  {layers.showRadiators &&
                    r.radiators &&
                    r.radiators.map((rad, radIdx) => {
                      const rx = (rad.position_x || 1.2) * pxPerMeter;
                      const ry = (rad.position_y || 0.15) * pxPerMeter;
                      const rw = Math.max(22, pxPerMeter * 0.9);
                      const rh = Math.max(9, pxPerMeter * 0.18);

                      return (
                        <g key={radIdx} transform={`translate(${rx}, ${ry})`}>
                          <rect
                            x="0"
                            y="0"
                            width={rw}
                            height={rh}
                            rx="2"
                            fill="rgba(255, 255, 255, 0.95)"
                            stroke="#EF4444"
                            strokeWidth="1.2"
                          />
                          <line x1={rw * 0.25} y1="2" x2={rw * 0.25} y2={rh - 2} stroke="#DC2626" strokeWidth="0.8" />
                          <line x1={rw * 0.5} y1="2" x2={rw * 0.5} y2={rh - 2} stroke="#DC2626" strokeWidth="0.8" />
                          <line x1={rw * 0.75} y1="2" x2={rw * 0.75} y2={rh - 2} stroke="#DC2626" strokeWidth="0.8" />
                        </g>
                      );
                    })}

                  {/* Room Text & Circuit Stamp Badges */}
                  {layers.showLabels && (
                    <g transform={`translate(${rWidthPx / 2}, ${rLengthPx / 2 - 12})`}>
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        fill="#F8FAFC"
                        fontSize={Math.max(11, Math.min(14, pxPerMeter * 0.32))}
                        fontWeight="bold"
                      >
                        {r.name}
                      </text>
                      <text x="0" y="13" textAnchor="middle" fill="#94A3B8" fontSize="9.5" fontFamily="monospace">
                        {r.length}x{r.width}m • {r.area} m²
                      </text>
                      {heatLossW !== undefined && (
                        <text x="0" y="26" textAnchor="middle" fill="#38BDF8" fontSize="9" fontWeight="600">
                          {heatLossW.toFixed(0)} W ({specW?.toFixed(0)} W/m²)
                        </text>
                      )}
                    </g>
                  )}

                  {/* Circuit Stamp Tags inside Room */}
                  {layers.showLabels &&
                    circuits.map((circ, cIdx) => {
                      const isCircSelected = selectedCircuitId === circ.id;
                      const badgeX = 8;
                      const badgeY = 8 + cIdx * 18;

                      return (
                        <g
                          key={circ.id || cIdx}
                          transform={`translate(${badgeX}, ${badgeY})`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCircuitId(circ.id === selectedCircuitId ? null : circ.id || null);
                            setSelectedRoomId(r.id);
                          }}
                          className="cursor-pointer"
                        >
                          <rect
                            x="0"
                            y="0"
                            width="94"
                            height="15"
                            rx="3"
                            fill={isCircSelected ? '#0284C7' : 'rgba(15, 23, 42, 0.9)'}
                            stroke={isCircSelected ? '#38BDF8' : '#334155'}
                            strokeWidth="1"
                          />
                          <text x="5" y="10.5" fill="#FFFFFF" fontSize="8" fontWeight="bold">
                            K-{circ.circuit_number} Ø{circ.pipe_diameter_mm || 16} L={circ.total_length_m?.toFixed(0)}m
                          </text>
                          {circ.manifold_port_index && (
                            <text x="76" y="10.5" fill="#38BDF8" fontSize="7.5" fontWeight="bold">
                              P#{circ.manifold_port_index}
                            </text>
                          )}
                        </g>
                      );
                    })}

                  {/* Dimension Lines */}
                  {layers.showDimensions && (
                    <g opacity="0.65">
                      {/* Top width */}
                      <line x1="0" y1="-8" x2={rWidthPx} y2="-8" stroke="#94A3B8" strokeWidth="0.8" />
                      <line x1="0" y1="-12" x2="0" y2="-4" stroke="#94A3B8" strokeWidth="0.8" />
                      <line x1={rWidthPx} y1="-12" x2={rWidthPx} y2="-4" stroke="#94A3B8" strokeWidth="0.8" />
                      <text x={rWidthPx / 2} y="-11" fill="#CBD5E1" fontSize="9" textAnchor="middle">
                        {r.width} m
                      </text>

                      {/* Side length */}
                      <line x1="-8" y1="0" x2="-8" y2={rLengthPx} stroke="#94A3B8" strokeWidth="0.8" />
                      <line x1="-12" y1="0" x2="-4" y2="0" stroke="#94A3B8" strokeWidth="0.8" />
                      <line x1="-12" y1={rLengthPx} x2="-4" y2={rLengthPx} stroke="#94A3B8" strokeWidth="0.8" />
                      <text
                        x="-11"
                        y={rLengthPx / 2}
                        fill="#CBD5E1"
                        fontSize="9"
                        textAnchor="middle"
                        transform={`rotate(-90, -11, ${rLengthPx / 2})`}
                      >
                        {r.length} m
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* C. Manifold Cabinet (Uponor / Valtec Distribution Cabinet) */}
            <g
              transform={`translate(${manifoldPos.x * pxPerMeter}, ${manifoldPos.y * pxPerMeter})`}
              className="pointer-events-auto cursor-pointer"
              onClick={() => setActiveTab('manifold')}
              onMouseDown={(e) => handleItemMouseDown('manifold', undefined, manifoldPos, e)}
            >
              {/* Cabinet Enclosure */}
              <rect
                x="-12"
                y="-16"
                width={Math.max(110, manifoldOutletsCount * 12 + 28)}
                height="46"
                rx="4"
                fill="#0F172A"
                stroke={isOverCapacity ? '#EF4444' : '#0284C7'}
                strokeWidth="1.8"
                filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"
              />

              {/* Cabinet title */}
              <text x="0" y="-4" fill="#38BDF8" fontSize="7.5" fontWeight="bold" letterSpacing="0.5">
                KOLLEKTOR SHKAF (ШРВ-{manifoldOutletsCount})
              </text>

              {/* Top Red Supply Header (T11) */}
              <line
                x1="0"
                y1="8"
                x2={manifoldOutletsCount * 12 + 6}
                y2="8"
                stroke="#EF4444"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              {/* Bottom Blue Return Header (T12) */}
              <line
                x1="0"
                y1="18"
                x2={manifoldOutletsCount * 12 + 6}
                y2="18"
                stroke="#38BDF8"
                strokeWidth="2.4"
                strokeLinecap="round"
              />

              {/* Numbered Port Outlets */}
              {Array.from({ length: manifoldOutletsCount }).map((_, pIdx) => {
                const portNum = pIdx + 1;
                const portX = 6 + pIdx * 12;
                const connectedCircuit = allCircuits.find((c) => c.circuit.manifold_port_index === portNum);
                const isPortSelected = selectedCircuitId !== null && connectedCircuit?.circuit.id === selectedCircuitId;

                return (
                  <g
                    key={pIdx}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (connectedCircuit) {
                        setSelectedCircuitId(connectedCircuit.circuit.id || null);
                        setSelectedRoomId(connectedCircuit.room.id);
                      }
                    }}
                  >
                    {/* Supply nipple */}
                    <circle
                      cx={portX}
                      cy="8"
                      r={isPortSelected ? '3.5' : '2.2'}
                      fill={connectedCircuit ? '#EF4444' : '#64748B'}
                      stroke="#FFFFFF"
                      strokeWidth={isPortSelected ? '1.2' : '0.6'}
                    />
                    {/* Return nipple */}
                    <circle
                      cx={portX + 2}
                      cy="18"
                      r={isPortSelected ? '3.5' : '2.2'}
                      fill={connectedCircuit ? '#38BDF8' : '#64748B'}
                      stroke="#FFFFFF"
                      strokeWidth={isPortSelected ? '1.2' : '0.6'}
                    />
                    {/* Port number label */}
                    <text x={portX} y="27" fill="#94A3B8" fontSize="6" fontWeight="bold" textAnchor="middle">
                      {portNum}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* CAD Stamp in bottom right */}
        <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-[10px] text-slate-300 font-mono shadow-2xl flex items-center gap-4">
          <div>
            <div className="font-bold text-white text-xs">SantexPro Master CAD</div>
            <div className="text-slate-400">EN 1264 / KMK 2.04.05-97</div>
          </div>
          <div className="border-l border-slate-700 pl-3">
            <div>Masshtab: <b>1:50</b></div>
            <div>Jami xonalar: <b>{roomsToDisplay.length} ta</b></div>
            <div>Issiq pol konturlari: <b>{totalCircuitsCount} ta</b></div>
          </div>
        </div>

        {/* Drag instructions */}
        {isEditLayoutMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 px-4 py-1.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce">
            <Move className="w-4 h-4" />
            <span>Xona yoki kollektorni sichqoncha bilan tortib, kerakli joyga joylashtiring (0.25m qadam)</span>
          </div>
        )}
      </div>

      {/* 3. Bottom Engineering Drawer / Inspector Panel */}
      <div className="bg-slate-900 border-t border-slate-800 flex flex-col">
        {/* Tab Headers */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-800">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('circuits')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'circuits'
                  ? 'bg-slate-800 text-sky-400 border-sky-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border-transparent'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Issiq Pol Konturlari ({allCircuits.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('manifold')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'manifold'
                  ? 'bg-slate-800 text-sky-400 border-sky-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border-transparent'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Kollektor va Balansirovka ({totalCircuitsCount}/{manifoldOutletsCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('legend')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'legend'
                  ? 'bg-slate-800 text-sky-400 border-sky-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border-transparent'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Shartli Belgilar (Legenda)</span>
            </button>
          </div>

          <button
            onClick={() => setIsPanelExpanded(!isPanelExpanded)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded"
          >
            {isPanelExpanded ? "Kichraytirish" : "Kattalashtirish"}
          </button>
        </div>

        {/* Tab Content */}
        {isPanelExpanded && (
          <div className="p-4 max-h-56 overflow-y-auto">
            {activeTab === 'circuits' && (
              <div className="space-y-3">
                {/* Active circuit inspector highlight card */}
                {activeCircuitDetails && (
                  <div className="p-3 bg-blue-950/60 border border-blue-700/60 rounded-xl flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600 rounded-lg text-white">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">
                            Kontur #{activeCircuitDetails.circuit.circuit_number}: {activeCircuitDetails.room.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-950 text-sky-300 border border-sky-700 font-bold">
                            Port #{activeCircuitDetails.circuit.manifold_port_index || '—'}
                          </span>
                          {activeCircuitDetails.circuit.is_locked ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950 text-amber-300 border border-amber-700 font-bold flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Qulflangan
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                              <Unlock className="w-3 h-3" /> Tahrirlanadi
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          Truba: <b>Ø{activeCircuitDetails.circuit.pipe_diameter_mm || 16} mm Uponor pePEX</b> •
                          Maydon: <b>{activeCircuitDetails.circuit.heated_area || activeCircuitDetails.room.area} m²</b> •
                          Qadam: <b>{activeCircuitDetails.circuit.spacing_mm || 150} mm</b> •
                          Pol trubasi: <b>{activeCircuitDetails.circuit.floor_length_m?.toFixed(1) || 0} m</b> +
                          Magistral ulanish: <b>{activeCircuitDetails.circuit.manifold_lead_in_m?.toFixed(1) || 0} m</b> =
                          Jami: <b className="text-sky-300">{activeCircuitDetails.circuit.total_length_m?.toFixed(1) || 0} m</b>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleToggleCircuitLock(
                            activeCircuitDetails.circuit.id!,
                            !!activeCircuitDetails.circuit.is_locked
                          )
                        }
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5"
                      >
                        {activeCircuitDetails.circuit.is_locked ? (
                          <>
                            <Unlock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Qulfdan chiqarish</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Qulflash</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onOpenRoomEditor(activeCircuitDetails.room.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
                      >
                        <span>2D Xonada ochish</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setSelectedCircuitId(null)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                        title="Dastlabki holatga qaytish"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Circuit Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="px-3 py-2">Kontur</th>
                        <th className="px-3 py-2">Xona</th>
                        <th className="px-3 py-2">Kollektor Port</th>
                        <th className="px-3 py-2">Diametr & Qadam</th>
                        <th className="px-3 py-2">Pol Uzunligi</th>
                        <th className="px-3 py-2">Magistral</th>
                        <th className="px-3 py-2">Jami Uzunlik</th>
                        <th className="px-3 py-2">Holat</th>
                        <th className="px-3 py-2 text-right">Amal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {allCircuits.map(({ circuit, room }) => {
                        const isSelected = selectedCircuitId === circuit.id;
                        return (
                          <tr
                            key={circuit.id || circuit.circuit_number}
                            onClick={() => setSelectedCircuitId(circuit.id || null)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-900/40 text-white font-semibold' : 'hover:bg-slate-800/60'
                            }`}
                          >
                            <td className="px-3 py-2 font-mono font-bold text-sky-400">
                              K-{circuit.circuit_number}
                            </td>
                            <td className="px-3 py-2 font-medium">{room.name}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-mono">
                                Port #{circuit.manifold_port_index || '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              Ø{circuit.pipe_diameter_mm || 16} mm • s={circuit.spacing_mm || 150} mm
                            </td>
                            <td className="px-3 py-2 font-mono">{circuit.floor_length_m?.toFixed(1) || 0} m</td>
                            <td className="px-3 py-2 font-mono text-slate-400">
                              {circuit.manifold_lead_in_m?.toFixed(1) || 0} m
                            </td>
                            <td className="px-3 py-2 font-mono font-bold text-white">
                              {circuit.total_length_m?.toFixed(1) || 0} m
                            </td>
                            <td className="px-3 py-2">
                              {circuit.is_locked ? (
                                <span className="text-amber-400 flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> Qulflangan
                                </span>
                              ) : (
                                <span className="text-slate-400 flex items-center gap-1">
                                  <Unlock className="w-3 h-3" /> Ochiq
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenRoomEditor(room.id);
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded text-[11px] transition-colors"
                              >
                                Tahrirlash
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'manifold' && (
              <div className="space-y-4 text-xs text-slate-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <div className="text-slate-400 text-[11px] font-bold">Kollektor Modeli</div>
                    <div className="text-sm font-bold text-white mt-1">
                      {primaryManifold?.model_name || "Uponor Vario S / Valtec VTc.594"}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Joylashuv: X={manifoldPos.x.toFixed(2)} m, Y={manifoldPos.y.toFixed(2)} m
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <div className="text-slate-400 text-[11px] font-bold">Portlar Sig‘imi</div>
                    <div className="text-sm font-bold text-white mt-1 flex items-center gap-2">
                      <span className={isOverCapacity ? 'text-red-400' : 'text-emerald-400'}>
                        {totalCircuitsCount} / {manifoldOutletsCount} Chiqish band
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full ${isOverCapacity ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{
                          width: `${Math.min(100, (totalCircuitsCount / manifoldOutletsCount) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex flex-col justify-between">
                    <div className="text-slate-400 text-[11px] font-bold">Kengaytirish</div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleExpandManifoldOutlets(manifoldOutletsCount + 1)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs"
                      >
                        + 1 Chiqish qo‘shish
                      </button>
                      <button
                        onClick={() => handleExpandManifoldOutlets(Math.max(2, manifoldOutletsCount - 1))}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-bold text-xs"
                      >
                        - 1 Kamaytirish
                      </button>
                    </div>
                  </div>
                </div>

                {/* Port by port list */}
                <div className="font-bold text-white pt-2">Kollektor chiqishlari va Balansirovka:</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {Array.from({ length: manifoldOutletsCount }).map((_, pIdx) => {
                    const pNum = pIdx + 1;
                    const cMatch = allCircuits.find((c) => c.circuit.manifold_port_index === pNum);
                    return (
                      <div
                        key={pIdx}
                        onClick={() => {
                          if (cMatch) {
                            setSelectedCircuitId(cMatch.circuit.id || null);
                            setSelectedRoomId(cMatch.room.id);
                          }
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                          cMatch
                            ? selectedCircuitId === cMatch.circuit.id
                              ? 'bg-blue-900/60 border-blue-400 text-white'
                              : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-slate-500'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span>Port #{pNum}</span>
                          <span
                            className={`w-2 h-2 rounded-full ${cMatch ? 'bg-emerald-400' : 'bg-slate-600'}`}
                          />
                        </div>
                        {cMatch ? (
                          <div className="mt-1">
                            <div className="font-semibold text-sky-400 truncate">K-{cMatch.circuit.circuit_number}</div>
                            <div className="text-[10px] text-slate-400 truncate">{cMatch.room.name}</div>
                            <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                              {cMatch.circuit.total_length_m?.toFixed(0)}m
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 mt-2">Bo‘sh chiqish</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'legend' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs text-slate-300">
                <div className="space-y-2">
                  <div className="font-bold text-white text-[11px] uppercase tracking-wider">Trubalar va Oqim</div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-1 bg-red-500 rounded"></span>
                    <span>T11 Uzatish trubasi (Suprimento / 45°C)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-1 bg-sky-400 rounded"></span>
                    <span>T12 Qaytish trubasi (Retorno / 35°C)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <span>Gofra himoya gilzasi (devor / eshik kesishuvida)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-white text-[11px] uppercase tracking-wider">Uskunalar</div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-3 bg-slate-900 border border-sky-400 text-[8px] text-sky-400 font-bold flex items-center justify-center rounded-xs">
                      ШРВ
                    </span>
                    <span>Taqsimlash kollektor shkafi (Uponor / Valtec)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-3 bg-white border border-red-500 rounded-xs"></span>
                    <span>Isitish radiatori (po‘lat panel / bimetall)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-white text-[11px] uppercase tracking-wider">Konstruktsiya</div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-2 bg-sky-600 rounded-xs"></span>
                    <span>Deraza bloklari (2 kamerali oynapaket)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-1.5 bg-amber-500 rounded-xs"></span>
                    <span>Eshik va ochilish trayektoriyasi</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
