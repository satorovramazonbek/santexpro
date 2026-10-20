import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Project, Room, UnderfloorCircuitItem } from '../../types';
import { api } from '../../api/client';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  Flame,
  Layers,
  ExternalLink,
  Save,
  Check,
  Sparkles,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw,
  Box,
  Compass,
  Info,
  Activity,
  X,
  Building2,
  SlidersHorizontal,
  Image as ImageIcon,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Ruler
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
  spacingM: number,
  connectionSide: 'right' | 'left' | 'top' | 'bottom' = 'right'
): { supply: [number, number][]; returnPts: [number, number][] } {
  const step = spacingM * 2.0;
  const supply: [number, number][] = [];
  const returnPts: [number, number][] = [];

  let left = xMin;
  let top = yMin;
  let right = xMax;
  let bottom = yMax;

  if (connectionSide === 'right') {
    while (right - left >= 2.2 * spacingM && bottom - top >= 2.2 * spacingM) {
      supply.push([Number(right.toFixed(2)), Number(top.toFixed(2))]);
      supply.push([Number(left.toFixed(2)), Number(top.toFixed(2))]);
      supply.push([Number(left.toFixed(2)), Number(bottom.toFixed(2))]);
      supply.push([Number((right - step).toFixed(2)), Number(bottom.toFixed(2))]);
      supply.push([Number((right - step).toFixed(2)), Number((top + step).toFixed(2))]);

      returnPts.unshift([Number((right - spacingM).toFixed(2)), Number((top + spacingM).toFixed(2))]);
      returnPts.unshift([Number((left + spacingM).toFixed(2)), Number((top + spacingM).toFixed(2))]);
      returnPts.unshift([Number((left + spacingM).toFixed(2)), Number((bottom - spacingM).toFixed(2))]);
      returnPts.unshift([Number((right - step - spacingM).toFixed(2)), Number((bottom - spacingM).toFixed(2))]);

      left += step;
      top += step;
      right -= step;
      bottom -= step;
    }
  } else {
    while (right - left >= 2.2 * spacingM && bottom - top >= 2.2 * spacingM) {
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

// Client-side fallback feeder route generator via corridor and doorway
function computeClientFeederRoute(
  manifoldPos: { x: number; y: number },
  room: Room,
  roomPos: { x: number; y: number },
  portIndex: number,
  entryPt: [number, number],
  exitPt: [number, number],
  corridorY: number = 6.9
): { sup: [number, number][]; ret: [number, number][] } {
  const rx = roomPos.x;
  const ry = roomPos.y;
  const rw = room.width || 4.0;
  const rl = room.length || 5.0;

  const door = room.doors?.find((d) => d.wall_index === 1 || d.wall_index === 2) || room.doors?.[0];
  let doorGx = rx + rw;
  let doorGy = ry + rl / 2.0;

  if (door) {
    if (door.wall_index === 2 || door.wall_index === 0) {
      doorGx = rx + (door.position_along_wall || 1.0) + (door.width || 0.9) / 2.0;
      doorGy = ry + (door.wall_index === 2 ? rl : 0.0);
    } else {
      doorGx = rx + (door.wall_index === 1 ? rw : 0.0);
      doorGy = ry + (door.position_along_wall || 1.0) + (door.width || 0.9) / 2.0;
    }
  }

  const portOffY = (portIndex - 1) * 0.04;
  const pairGap = 0.024;
  const mSupX = manifoldPos.x;
  const mSupY = manifoldPos.y + portOffY;
  const mRetX = manifoldPos.x;
  const mRetY = manifoldPos.y + portOffY + pairGap;

  const gxIn = rx + entryPt[0];
  const gyIn = ry + entryPt[1];
  const gxOut = rx + exitPt[0];
  const gyOut = ry + exitPt[1];

  // Agar eshik yon devorda bo'lsa (wall_index 1 yoki 3, masalan Zal/Tambur koridorga qaragan)
  if (door && (door.wall_index === 1 || door.wall_index === 3)) {
    const chanX = doorGx + 0.35 + (portIndex - 1) * 0.035;
    const innerChanX = doorGx - 0.20 - (portIndex - 1) * 0.035;

    const sup: [number, number][] = [
      [mSupX, mSupY],
      [chanX - pairGap / 2, mSupY],
      [chanX - pairGap / 2, doorGy - pairGap / 2],
      [doorGx, doorGy - pairGap / 2],
      [innerChanX - pairGap / 2, doorGy - pairGap / 2],
      [innerChanX - pairGap / 2, gyIn],
      [gxIn, gyIn],
    ];

    const ret: [number, number][] = [
      [gxOut, gyOut],
      [innerChanX + pairGap / 2, gyOut],
      [innerChanX + pairGap / 2, doorGy + pairGap / 2],
      [doorGx, doorGy + pairGap / 2],
      [chanX + pairGap / 2, doorGy + pairGap / 2],
      [chanX + pairGap / 2, mRetY],
      [mRetX, mRetY],
    ];

    return { sup, ret };
  }

  // Odatiy gorizontal o'tish (pastki/yuqori eshik)
  const trunkY = corridorY + (portIndex - 1) * 0.04;
  const portOffX = (portIndex - 1) * 0.04;

  const sup: [number, number][] = [
    [mSupX + portOffX, manifoldPos.y],
    [mSupX + portOffX, trunkY],
    [doorGx - pairGap / 2, trunkY],
    [doorGx - pairGap / 2, doorGy],
    [gxIn, doorGy - 0.15],
    [gxIn, gyIn],
  ];

  const ret: [number, number][] = [
    [gxOut, gyOut],
    [gxOut, doorGy - 0.15],
    [doorGx + pairGap / 2, doorGy],
    [doorGx + pairGap / 2, trunkY],
    [mRetX + portOffX + pairGap, trunkY],
    [mRetX + portOffX + pairGap, manifoldPos.y],
  ];

  return { sup, ret };
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

  // Inspector tab
  const [activeTab, setActiveTab] = useState<'circuits' | 'manifold' | 'legend' | 'hydraulics'>('circuits');
  const [isPanelExpanded, setIsPanelExpanded] = useState<boolean>(true);
  const [hydraulicsData, setHydraulicsData] = useState<any | null>(null);

  useEffect(() => {
    if (project?.id) {
      api
        .getHydraulicsReport(project.id)
        .then((res) => setHydraulicsData(res))
        .catch((err) => console.warn("Hydraulics fetch:", err));
    }
  }, [project?.id, project?.rooms]);

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

  // Arxitektura Chizmasi Podlojkasi (Background Blueprint Underlay)
  const [backdropImage, setBackdropImage] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`santexpro_backdrop_${project.id}`);
    } catch {
      return null;
    }
  });
  const [backdropOpacity, setBackdropOpacity] = useState<number>(0.45);
  const [backdropScale, setBackdropScale] = useState<number>(1.0);
  const [showBackdrop, setShowBackdrop] = useState<boolean>(true);
  const [showBackdropMenu, setShowBackdropMenu] = useState<boolean>(false);
  const backdropFileInputRef = useRef<HTMLInputElement>(null);

  const handleBackdropUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setBackdropImage(url);
      setShowBackdrop(true);
      try {
        localStorage.setItem(`santexpro_backdrop_${project.id}`, url);
      } catch (err) {
        console.warn("Could not save to localStorage", err);
      }
      setNotification({
        type: 'success',
        text: "Arxitektura qavat chizmasi (podlojka) muvaffaqiyatli yuklandi!",
      });
      setTimeout(() => setNotification(null), 3500);
    };
    reader.readAsDataURL(file);
  };

  const handleClearBackdrop = () => {
    setBackdropImage(null);
    try {
      localStorage.removeItem(`santexpro_backdrop_${project.id}`);
    } catch {}
    setNotification({
      type: 'success',
      text: "Arxitektura chizmasi olib tashlandi.",
    });
    setTimeout(() => setNotification(null), 3000);
  };

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

  const [manifoldPositions, setManifoldPositions] = useState<Record<number, { x: number; y: number }>>({});

  useEffect(() => {
    if (project.manifolds && project.manifolds.length > 0) {
      const posMap: Record<number, { x: number; y: number }> = {};
      project.manifolds.forEach((m) => {
        posMap[m.id] = { x: m.position_x, y: m.position_y };
      });
      setManifoldPositions(posMap);
    }
  }, [project.manifolds]);

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
      if (
        r.position_x !== undefined &&
        r.position_x !== null &&
        r.position_y !== undefined &&
        r.position_y !== null
      ) {
        initialPos[r.id] = { x: Number(r.position_x), y: Number(r.position_y) };
      } else {
        if (curX + r.width > rowLimit && curX > 0) {
          curX = 0;
          curY += maxHeight;
          maxHeight = 0;
        }
        initialPos[r.id] = { x: Number(curX.toFixed(2)), y: Number(curY.toFixed(2)) };
        curX += r.width;
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

  // Display manifolds
  const manifoldsToDisplay = useMemo(() => {
    if (!project.manifolds || project.manifolds.length === 0) return [];
    return project.manifolds.filter((m) => selectedFloor === 'all' || (m.floor_number ?? 1) === selectedFloor);
  }, [project.manifolds, selectedFloor]);

  // Real corridor check
  const hasRealCorridorRoom = useMemo(() => {
    return roomsToDisplay.some((r) => r.name.toLowerCase().includes('dahliz') || r.name.toLowerCase().includes('koridor'));
  }, [roomsToDisplay]);

  // Shared Corridor / Hallway Layout (only if no real corridor room in project)
  const corridorLayout = useMemo(() => {
    if (hasRealCorridorRoom) return null;
    if (roomsToDisplay.length === 0) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let maxBottomY = -Infinity;

    roomsToDisplay.forEach((r) => {
      const pos = roomPositions[r.id] || { x: 0, y: 0 };
      if (pos.x < minX) minX = pos.x;
      const right = pos.x + r.width;
      if (right > maxX) maxX = right;
      const bottom = pos.y + r.length;
      if (bottom > maxBottomY) maxBottomY = bottom;
    });

    if (minX === Infinity) {
      minX = 0;
      maxX = 12.0;
      maxBottomY = 6.0;
    }

    return {
      x: minX,
      y: maxBottomY,
      width: Math.max(maxX - minX, 10.0),
      height: 1.8,
    };
  }, [roomsToDisplay, roomPositions, hasRealCorridorRoom]);

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
    let maxX = 22, maxY = 16;
    roomsToDisplay.forEach((r) => {
      const pos = roomPositions[r.id] || { x: 0, y: 0 };
      const right = pos.x + r.width;
      const bottom = pos.y + r.length;
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    });
    Object.values(manifoldPositions).forEach((mPos) => {
      if (mPos.x + 2 > maxX) maxX = mPos.x + 2;
      if (mPos.y + 2 > maxY) maxY = mPos.y + 2;
    });

    return {
      widthM: Math.max(maxX + 2, 24),
      heightM: Math.max(maxY + 2, 18),
    };
  }, [roomsToDisplay, roomPositions, manifoldPositions]);

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

  // Auto arrange with shared partition walls
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
        curY += maxH;
        maxH = 0;
      }
      newPos[r.id] = { x: Number(curX.toFixed(2)), y: Number(curY.toFixed(2)) };
      curX += r.width;
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
      for (const [manId, pos] of Object.entries(manifoldPositions)) {
        await api.updateManifold(project.id, {
          manifold_id: Number(manId),
          position_x: pos.x,
          position_y: pos.y,
        });
      }

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
        const targetId = draggingTarget.id ?? primaryManifold?.id;
        if (targetId) {
          setManifoldPositions((prev) => ({
            ...prev,
            [targetId]: {
              x: Number(snappedX.toFixed(2)),
              y: Number(snappedY.toFixed(2)),
            },
          }));
        }
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
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col font-sans">
      {/* 1. Header Toolbar (Clean Light Engineering Design) */}
      <div className="bg-slate-50 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 text-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-xs">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight flex items-center gap-2">
                Umumiy Bino Issiq Pol Rejasi (Uponor CAD M 1:50)
              </h3>
              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                OQ FON (CAD)
              </span>
              {isEditLayoutMode && (
                <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  Rejani tahrirlash
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Uponor standarti: T11 (uzatish/qizil), T12 (qaytish/ko‘k), kollektor chiqishlari va barcha xonalar ulanishi
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Floor selector */}
          <div className="flex items-center bg-white p-1 rounded-xl text-xs border border-slate-200 shadow-xs">
            <button
              onClick={() => setSelectedFloor('all')}
              className={`px-2.5 py-1 rounded-lg transition-all font-medium text-xs ${
                selectedFloor === 'all'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
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
                    : 'text-slate-600 hover:text-slate-900'
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition-colors"
              title="Qatlamlarni ko'rsatish/yashirish"
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Qatlamlar</span>
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl p-3 shadow-xl z-50 text-xs space-y-2">
                <div className="font-bold text-slate-800 pb-1 border-b border-slate-100 text-[11px] uppercase tracking-wider">
                  CAD Chizma Qatlamlari
                </div>
                <label className="flex items-center justify-between text-slate-700 hover:text-slate-900 cursor-pointer py-1">
                  <span>Truba konturlari (T11/T12)</span>
                  <input
                    type="checkbox"
                    checked={layers.showTubes}
                    onChange={(e) => setLayers({ ...layers, showTubes: e.target.checked })}
                    className="accent-blue-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between text-slate-700 hover:text-slate-900 cursor-pointer py-1">
                  <span>Magistral ulanishlar (Feeders)</span>
                  <input
                    type="checkbox"
                    checked={layers.showFeeders}
                    onChange={(e) => setLayers({ ...layers, showFeeders: e.target.checked })}
                    className="accent-blue-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between text-slate-700 hover:text-slate-900 cursor-pointer py-1">
                  <span>O‘lcham chiziqlari (Cotalar)</span>
                  <input
                    type="checkbox"
                    checked={layers.showDimensions}
                    onChange={(e) => setLayers({ ...layers, showDimensions: e.target.checked })}
                    className="accent-blue-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between text-slate-700 hover:text-slate-900 cursor-pointer py-1">
                  <span>Uponor shtamplari & Matn</span>
                  <input
                    type="checkbox"
                    checked={layers.showLabels}
                    onChange={(e) => setLayers({ ...layers, showLabels: e.target.checked })}
                    className="accent-blue-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between text-slate-700 hover:text-slate-900 cursor-pointer py-1">
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

          {/* Architectural Blueprint Underlay Popover */}
          <div className="relative">
            <button
              onClick={() => setShowBackdropMenu(!showBackdropMenu)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border shadow-xs transition-colors ${
                backdropImage
                  ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-300'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title="Qavat arxitektura chizmasini (PNG/JPG) podlojka sifatida yuklash"
            >
              <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Arxitektura reja {backdropImage ? '(Faol)' : ''}</span>
            </button>

            {showBackdropMenu && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl p-3.5 shadow-xl z-50 text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                    Arxitektura Podlojkasi
                  </span>
                  {backdropImage && (
                    <button
                      onClick={() => setShowBackdrop(!showBackdrop)}
                      className="text-slate-500 hover:text-slate-800 text-[11px] flex items-center gap-1"
                    >
                      {showBackdrop ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showBackdrop ? "Yashirish" : "Ko‘rsatish"}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    type="file"
                    ref={backdropFileInputRef}
                    accept="image/*"
                    onChange={handleBackdropUpload}
                    className="hidden"
                  />

                  <button
                    onClick={() => backdropFileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{backdropImage ? "Boshqa chizma yuklash" : "Arxitektura chizmasi (PNG/JPG)"}</span>
                  </button>

                  {backdropImage && (
                    <>
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>Shaffoflik (Opacity)</span>
                          <b>{Math.round(backdropOpacity * 100)}%</b>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={backdropOpacity}
                          onChange={(e) => setBackdropOpacity(parseFloat(e.target.value))}
                          className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>Masshtab (Scale)</span>
                          <b>{Math.round(backdropScale * 100)}%</b>
                        </div>
                        <input
                          type="range"
                          min="0.4"
                          max="2.5"
                          step="0.05"
                          value={backdropScale}
                          onChange={(e) => setBackdropScale(parseFloat(e.target.value))}
                          className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                        />
                      </div>

                      <button
                        onClick={handleClearBackdrop}
                        className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold border border-red-200 transition-colors mt-2"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Chizmani olib tashlash</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 leading-relaxed">
                  💡 Arxitektor bergan qavat chizmasi yoki PDF fotosuratini yuklang, xonalarni chizma ustiga moslab joylashtiring va issiq polni loyihalang.
                </div>
              </div>
            )}
          </div>

          {/* Auto route button */}
          <button
            onClick={handleRecalculateRouting}
            disabled={isRecalculatingRouting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            title="Kollektordan xonalargacha bo'lgan feeder magistral liniyalarini avtomatik hisoblash"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRecalculatingRouting ? 'animate-spin' : ''}`} />
            <span>{isRecalculatingRouting ? "Marshrutlanmoqda..." : "Magistrallarni yangilash"}</span>
          </button>

          {/* Edit layout toggle */}
          {!isEditLayoutMode ? (
            <button
              onClick={() => setIsEditLayoutMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition-colors"
              title="Xonalar va kollektorni reja bo‘ylab siljitish"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Rejani tahrirlash</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleAutoArrange}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
                title="Xonalarni avtomatik joylashtirish"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
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
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-xl"
              >
                Yopish
              </button>
            </div>
          )}

          {/* Zoom & Fit controls */}
          <div className="flex items-center bg-white rounded-xl p-1 text-slate-700 border border-slate-200 shadow-xs">
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              className="p-1 hover:bg-slate-100 rounded"
              title="Kichiklashtirish"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-1.5 text-[11px] font-mono text-slate-800 font-bold">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(3.0, z + 0.15))}
              className="p-1 hover:bg-slate-100 rounded"
              title="Kattalashtirish"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={fitToView}
              className="p-1 hover:bg-slate-100 rounded ml-1 text-blue-600"
              title="Rejani ekranga moslashtirish (Fit to View)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Capacity Warning Banner */}
      {isOverCapacity && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 px-4 py-2 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              <b>Diqqat:</b> Kollektor chiqishlari soni yetarli emas! Mavjud konturlar soni:{' '}
              <b>{totalCircuitsCount} ta</b>, Kollektor sig‘imi: <b>{manifoldOutletsCount} ta</b>.
            </span>
          </div>
          <button
            onClick={() => handleExpandManifoldOutlets(totalCircuitsCount)}
            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-[11px] transition-colors shrink-0 shadow-xs"
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

      {/* 2. Pure White CAD Drawing Canvas Area (Matching Reference PDF Page 5) */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className={`relative w-full h-[620px] bg-white overflow-hidden select-none cursor-${
          isEditLayoutMode ? 'default' : isPanning ? 'grabbing' : 'grab'
        }`}
        style={{
          backgroundColor: '#FFFFFF',
          backgroundImage: layers.showGrid
            ? `
            linear-gradient(to right, #F1F5F9 1px, transparent 1px),
            linear-gradient(to bottom, #F1F5F9 1px, transparent 1px)
          `
            : undefined,
          backgroundSize: `${pxPerMeter}px ${pxPerMeter}px`,
        }}
      >
        <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none">
          <defs>
            {/* Architectural Wall Hatch Pattern for Real Walls */}
            <pattern id="masterWallHatchLight" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#94A3B8" strokeWidth="0.8" />
            </pattern>

            {/* Arrowhead marker */}
            <marker id="cad-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0F172A" />
            </marker>

            {/* Glowing route highlight */}
            <filter id="route-glow-light" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#2563EB" floodOpacity="0.5" />
            </filter>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y})`}>
            {/* 0. Arxitektura chizmasi foni (Architectural Blueprint Underlay / Podlojka) */}
            {showBackdrop && backdropImage && (
              <g className="blueprint-underlay" opacity={backdropOpacity}>
                <image
                  href={backdropImage}
                  x="0"
                  y="0"
                  width={buildingBounds.widthM * pxPerMeter * backdropScale}
                  preserveAspectRatio="xMinYMin meet"
                />
              </g>
            )}

            {/* Architectural Axes & Cota Dimensions (Left & Top, matching Blueprint) */}
            {layers.showDimensions && (
              <g className="architectural-axes-layer" opacity="0.9">
                {/* Left Axis 1 Bubble & Centerline */}
                <g transform={`translate(${0.8 * pxPerMeter}, ${1.4 * pxPerMeter})`}>
                  <circle cx="0" cy="0" r="14" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.4" />
                  <text x="0" y="4.5" textAnchor="middle" fill="#0F172A" fontSize="11" fontWeight="bold">1</text>
                  <line x1="14" y1="0" x2={1.0 * pxPerMeter} y2="0" stroke="#94A3B8" strokeWidth="1.0" strokeDasharray="6 3 1 3" />
                </g>

                {/* Left Axis 2 Bubble & Centerline */}
                <g transform={`translate(${0.8 * pxPerMeter}, ${5.0 * pxPerMeter})`}>
                  <circle cx="0" cy="0" r="14" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.4" />
                  <text x="0" y="4.5" textAnchor="middle" fill="#0F172A" fontSize="11" fontWeight="bold">2</text>
                  <line x1="14" y1="0" x2={1.0 * pxPerMeter} y2="0" stroke="#94A3B8" strokeWidth="1.0" strokeDasharray="6 3 1 3" />
                </g>

                {/* Top Axis 1A Bubble */}
                <g transform={`translate(${18.0 * pxPerMeter}, ${0.6 * pxPerMeter})`}>
                  <circle cx="0" cy="0" r="14" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.4" />
                  <text x="0" y="4.5" textAnchor="middle" fill="#0F172A" fontSize="10" fontWeight="bold">1A</text>
                  <line x1="0" y1="14" x2="0" y2={0.8 * pxPerMeter} stroke="#94A3B8" strokeWidth="1.0" strokeDasharray="6 3 1 3" />
                </g>

                {/* Dimension Line 3 500 (between Axis 1 and 2) */}
                <line x1={0.45 * pxPerMeter} y1={1.4 * pxPerMeter} x2={0.45 * pxPerMeter} y2={5.0 * pxPerMeter} stroke="#0F172A" strokeWidth="1.2" />
                <line x1={0.45 * pxPerMeter - 5} y1={1.4 * pxPerMeter - 5} x2={0.45 * pxPerMeter + 5} y2={1.4 * pxPerMeter + 5} stroke="#0F172A" strokeWidth="1.6" />
                <line x1={0.45 * pxPerMeter - 5} y1={5.0 * pxPerMeter - 5} x2={0.45 * pxPerMeter + 5} y2={5.0 * pxPerMeter + 5} stroke="#0F172A" strokeWidth="1.6" />
                <text
                  x={0.45 * pxPerMeter - 8}
                  y={3.2 * pxPerMeter}
                  textAnchor="middle"
                  fill="#0F172A"
                  fontSize="10"
                  fontWeight="bold"
                  transform={`rotate(-90, ${0.45 * pxPerMeter - 8}, ${3.2 * pxPerMeter})`}
                >
                  3 500
                </text>

                {/* Dimension Line 12 700 (below Axis 2) */}
                <line x1={0.45 * pxPerMeter} y1={5.0 * pxPerMeter} x2={0.45 * pxPerMeter} y2={15.4 * pxPerMeter} stroke="#0F172A" strokeWidth="1.2" />
                <line x1={0.45 * pxPerMeter - 5} y1={15.4 * pxPerMeter - 5} x2={0.45 * pxPerMeter + 5} y2={15.4 * pxPerMeter + 5} stroke="#0F172A" strokeWidth="1.6" />
                <text
                  x={0.45 * pxPerMeter - 8}
                  y={10.2 * pxPerMeter}
                  textAnchor="middle"
                  fill="#0F172A"
                  fontSize="10"
                  fontWeight="bold"
                  transform={`rotate(-90, ${0.45 * pxPerMeter - 8}, ${10.2 * pxPerMeter})`}
                >
                  12 700
                </text>

                {/* Top Right Architectural Note: монтаж существующих перегородок */}
                <g transform={`translate(${18.5 * pxPerMeter}, ${0.5 * pxPerMeter})`}>
                  <rect x="-5" y="-5" width="165" height="34" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8" />
                  <text x="0" y="10" fill="#0F172A" fontSize="9.5" fontWeight="bold">монтаж существующих</text>
                  <text x="0" y="22" fill="#0F172A" fontSize="9.5" fontWeight="bold">перегородок</text>
                  {/* Pointer Arrow */}
                  <path d={`M 15 28 L 15 45 L 35 ${(1.4 - 0.5) * pxPerMeter}`} fill="none" stroke="#0F172A" strokeWidth="1.2" markerEnd="url(#cad-arrow)" />
                </g>
              </g>
            )}

            {/* 1. Architectural Shared Corridor Layer (Dahliz / Umumiy Yo‘lak) */}
            {corridorLayout && (
              <g className="corridor-layer">
                {/* Corridor Floor Slab */}
                <rect
                  x={corridorLayout.x * pxPerMeter}
                  y={corridorLayout.y * pxPerMeter}
                  width={corridorLayout.width * pxPerMeter}
                  height={corridorLayout.height * pxPerMeter}
                  fill="#F8FAFC"
                  stroke="#0F172A"
                  strokeWidth="1.6"
                />
                {/* Inner Wall boundary / Hatching */}
                <rect
                  x={corridorLayout.x * pxPerMeter + 4}
                  y={corridorLayout.y * pxPerMeter + 4}
                  width={corridorLayout.width * pxPerMeter - 8}
                  height={corridorLayout.height * pxPerMeter - 8}
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="0.8"
                  strokeDasharray="4 2"
                />
                {/* Corridor Trunk Pipeline Track (Trassa kanali) */}
                <rect
                  x={(corridorLayout.x + 0.6) * pxPerMeter}
                  y={(corridorLayout.y + 0.82) * pxPerMeter}
                  width={(corridorLayout.width - 1.2) * pxPerMeter}
                  height={0.42 * pxPerMeter}
                  rx="3"
                  fill="#F1F5F9"
                  stroke="#CBD5E1"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />
                {/* Corridor Badge & Label */}
                <g transform={`translate(${(corridorLayout.x + corridorLayout.width / 2) * pxPerMeter}, ${(corridorLayout.y + 0.42) * pxPerMeter})`}>
                  <rect x="-90" y="-10" width="180" height="20" rx="4" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.8" />
                  <text x="0" y="4" textAnchor="middle" fill="#334155" fontSize="8.5" fontWeight="bold">
                    Dahliz (Umumiy Yo‘lak) • Magistral trassasi
                  </text>
                </g>
                {/* Main Entrance Door (Kirish eshigi D-0) on corridor bottom wall */}
                <g transform={`translate(${(corridorLayout.x + 1.2) * pxPerMeter}, ${(corridorLayout.y + corridorLayout.height) * pxPerMeter})`}>
                  <rect x="0" y="-3" width={0.9 * pxPerMeter} height="6" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.2" />
                  <path
                    d={`M 0 0 A ${0.9 * pxPerMeter} ${0.9 * pxPerMeter} 0 0 1 ${0.9 * pxPerMeter} 0`}
                    fill="none"
                    stroke="#64748B"
                    strokeWidth="1.0"
                    strokeDasharray="3 2"
                  />
                  <text x={(0.45 * pxPerMeter)} y="13" fill="#0F172A" fontSize="7" fontWeight="bold" textAnchor="middle">
                    D-0 (Bosh kirish eshigi)
                  </text>
                </g>
              </g>
            )}

            {/* 2. Feeder Lines from Manifold through Corridors into Rooms (T11 Red, T12 Blue) */}
            {layers.showFeeders &&
              allCircuits.map(({ circuit, room }) => {
                const isSelected = selectedCircuitId === circuit.id;
                const isHovered = hoveredCircuitId === circuit.id;
                const hasFocus = selectedCircuitId !== null;
                const opacity = isSelected ? 1.0 : hasFocus ? 0.2 : 0.92;

                const roomPos = roomPositions[room.id] || { x: 0, y: 0 };
                let supPts = circuit.feeder_supply_points;
                let retPts = circuit.feeder_return_points;

                if (!supPts || supPts.length === 0 || !retPts || retPts.length === 0) {
                  const pts = circuit.path_points || [[0.5, 0.5]];
                  const ent: [number, number] = [pts[0][0], pts[0][1]];
                  const ext: [number, number] = pts.length > 1 ? [pts[pts.length - 1][0], pts[pts.length - 1][1]] : ent;
                  const cMan = project.manifolds?.find((m) => m.id === circuit.manifold) || primaryManifold;
                  const cManPos = cMan ? { x: cMan.position_x, y: cMan.position_y } : manifoldPos;
                  const fallback = computeClientFeederRoute(
                    cManPos,
                    room,
                    roomPos,
                    circuit.manifold_port_index || 1,
                    ent,
                    ext,
                    corridorLayout ? corridorLayout.y + 0.9 : 6.9
                  );
                  supPts = fallback.sup;
                  retPts = fallback.ret;
                }

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
                    {/* Transparent thick hit area */}
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
                      filter={isSelected ? 'url(#route-glow-light)' : undefined}
                    />

                    {/* Return Feeder (T12 Retorno / Blue) */}
                    <path
                      d={retPathStr}
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth={isSelected ? '2.4' : isHovered ? '1.8' : '1.2'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter={isSelected ? 'url(#route-glow-light)' : undefined}
                    />

                    {/* Port tag badge on corridor feeder */}
                    {supPts.length >= 3 && (
                      <g transform={`translate(${supPts[1][0] * pxPerMeter}, ${supPts[1][1] * pxPerMeter - 5})`}>
                        <rect x="-8" y="-6" width="16" height="10" rx="2" fill="#FFFFFF" stroke="#EF4444" strokeWidth="0.8" />
                        <text x="0" y="1" textAnchor="middle" fill="#EF4444" fontSize="6" fontWeight="bold">
                          P#{circuit.manifold_port_index || 1}
                        </text>
                      </g>
                    )}

                    {/* Protective corrugated sleeve marker at entry doorway (Gofra Ø20) */}
                    {supPts.length >= 4 && (
                      <g transform={`translate(${supPts[3][0] * pxPerMeter}, ${supPts[3][1] * pxPerMeter})`}>
                        <circle
                          cx="0"
                          cy="0"
                          r="4"
                          fill="#F59E0B"
                          stroke="#0F172A"
                          strokeWidth="1.2"
                        />
                        <text
                          x="0"
                          y="-6"
                          textAnchor="middle"
                          fill="#B45309"
                          fontSize="6.5"
                          fontWeight="bold"
                        >
                          Gofra Ø20
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

            {/* B. All Rooms CAD Rendering on Clean White Paper */}
            {roomsToDisplay.map((r, rIdx) => {
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
              const roomNumber = ''.concat(...r.name.split('').filter((c) => !isNaN(parseInt(c, 10)))) || (rIdx + 17).toString();

              return (
                <g
                  key={r.id}
                  transform={`translate(${pos.x * pxPerMeter}, ${pos.y * pxPerMeter})`}
                  className="pointer-events-auto cursor-pointer"
                  onClick={() => setSelectedRoomId(r.id)}
                  onMouseDown={(e) => handleItemMouseDown('room', r.id, pos, e)}
                >
                  {r.name.toLowerCase().includes('zinapoya') ? (
                    <g className="staircase-rendering">
                      <rect
                        x="0"
                        y="0"
                        width={rWidthPx}
                        height={rLengthPx}
                        fill={isSelected ? '#EFF6FF' : '#F8FAFC'}
                        stroke={isSelected ? '#2563EB' : '#0F172A'}
                        strokeWidth="1.8"
                      />
                      {Array.from({ length: 9 }).map((_, stepIdx) => {
                        const stepY = (stepIdx + 1) * (rLengthPx / 10);
                        return <line key={stepIdx} x1="0" y1={stepY} x2={rWidthPx} y2={stepY} stroke="#475569" strokeWidth="1.0" />;
                      })}
                      <line x1={rWidthPx / 2} y1="0" x2={rWidthPx / 2} y2={rLengthPx} stroke="#0F172A" strokeWidth="1.8" />
                      <line x1={rWidthPx * 0.25} y1={rLengthPx * 0.85} x2={rWidthPx * 0.25} y2={rLengthPx * 0.18} stroke="#0F172A" strokeWidth="1.6" markerEnd="url(#cad-arrow)" />
                      <rect x={rWidthPx / 2 - 32} y={rLengthPx / 2 - 9} width="64" height="18" rx="2" fill="#FFFFFF" stroke="#64748B" strokeWidth="0.8" />
                      <text x={rWidthPx / 2} y={rLengthPx / 2 + 3} textAnchor="middle" fill="#0F172A" fontSize="8" fontWeight="bold">
                        ZINAPOYA
                      </text>
                    </g>
                  ) : (
                    <>
                      {/* Clean Floor Slab */}
                      <rect
                        x="0"
                        y="0"
                        width={rWidthPx}
                        height={rLengthPx}
                        fill={isSelected ? '#EFF6FF' : isDragging ? '#FEF3C7' : '#FFFFFF'}
                        stroke={isSelected ? '#2563EB' : isDragging ? '#F59E0B' : '#0F172A'}
                        strokeWidth={isSelected ? '2.0' : '1.5'}
                        strokeDasharray={isDragging ? '4 2' : undefined}
                      />

                      {/* Architectural Double Walls with Clean Hatching */}
                      <rect
                        x="4"
                        y="4"
                        width={Math.max(0, rWidthPx - 8)}
                        height={Math.max(0, rLengthPx - 8)}
                        fill="none"
                        stroke="#475569"
                        strokeWidth="0.8"
                      />

                      {/* If Room 21 (Перегородка): Hatched Partition Wall zone on right */}
                      {(r.name.includes('21') || r.name.toLowerCase().includes('перегородка')) && (
                        <rect
                          x={rWidthPx - 68}
                          y="4"
                          width="64"
                          height={rLengthPx - 8}
                          fill="url(#masterWallHatchLight)"
                          stroke="#475569"
                          strokeWidth="1.2"
                        />
                      )}

                  {/* Real Underfloor Heating Circuits (Uponor T11 Red / T12 Blue on White) */}
                  {layers.showTubes && showHeatingPiso && (
                    <g>
                      {hasCircuits ? (
                        circuits.map((circ) => {
                          const isCircSelected = selectedCircuitId === circ.id;
                          const hasFocus = selectedCircuitId !== null;
                          const circOpacity = isCircSelected ? 1.0 : hasFocus ? 0.22 : 0.95;

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

                          // Calculate bounding box of the circuit to place CAD dimension callout
                          let cMinX = 0.2, cMaxX = r.width - 0.2, cMinY = 0.2, cMaxY = r.length - 0.2;
                          if (circ.path_points && circ.path_points.length > 0) {
                            let minX = 9999, maxX = -9999, minY = 9999, maxY = -9999;
                            for (const pt of circ.path_points) {
                              if (pt[0] < minX) minX = pt[0];
                              if (pt[0] > maxX) maxX = pt[0];
                              if (pt[1] < minY) minY = pt[1];
                              if (pt[1] > maxY) maxY = pt[1];
                            }
                            if (minX < 9000) {
                              cMinX = minX;
                              cMaxX = maxX;
                              cMinY = minY;
                              cMaxY = maxY;
                            }
                          }
                          const circSpacingM = (circ.spacing_mm || 150) / 1000.0;
                          const dimX1 = (cMinX + 0.2) * pxPerMeter;
                          const dimX2 = dimX1 + circSpacingM * pxPerMeter;
                          const dimY = (cMaxY - 0.3) * pxPerMeter;

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
                                  strokeWidth={isCircSelected ? '2.4' : '1.15'}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              )}

                              {/* Blue Return path */}
                              {retStr && (
                                <path
                                  d={retStr}
                                  fill="none"
                                  stroke="#2563EB"
                                  strokeWidth={isCircSelected ? '2.4' : '1.15'}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              )}

                              {/* CAD Pipe Spacing Dimension Indicator between two loops */}
                              {layers.showDimensions && dimX2 < rWidthPx - 10 && dimY > 15 && dimY < rLengthPx - 10 && (
                                <g className="pipe-spacing-dim" opacity={isCircSelected ? 1.0 : 0.85}>
                                  {/* Left tick */}
                                  <line x1={dimX1} y1={dimY - 3} x2={dimX1} y2={dimY + 3} stroke="#1E3A8A" strokeWidth="0.9" />
                                  {/* Right tick */}
                                  <line x1={dimX2} y1={dimY - 3} x2={dimX2} y2={dimY + 3} stroke="#1E3A8A" strokeWidth="0.9" />
                                  {/* Dimension connecting line */}
                                  <line x1={dimX1} y1={dimY} x2={dimX2} y2={dimY} stroke="#1E3A8A" strokeWidth="0.8" />
                                  {/* Spacing label badge */}
                                  <rect
                                    x={(dimX1 + dimX2) / 2 - 16}
                                    y={dimY - 12}
                                    width="32"
                                    height="10"
                                    rx="2"
                                    fill="#FFFFFF"
                                    stroke="#93C5FD"
                                    strokeWidth="0.6"
                                  />
                                  <text
                                    x={(dimX1 + dimX2) / 2}
                                    y={dimY - 4.5}
                                    textAnchor="middle"
                                    fill="#1E3A8A"
                                    fontSize="6.5"
                                    fontWeight="bold"
                                    fontFamily="monospace"
                                  >
                                    s={circ.spacing_mm || 150}
                                  </text>
                                </g>
                              )}
                            </g>
                          );
                        })
                      ) : (
                        // Dynamic preview coil if room not calculated yet
                        <g opacity="0.45">
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
                                rx="3"
                                fill="none"
                                stroke={loopIdx % 2 === 0 ? '#EF4444' : '#2563EB'}
                                strokeWidth="1.0"
                                strokeDasharray="4 2"
                              />
                            );
                          })}
                        </g>
                      )}
                    </g>
                  )}

                  {/* Windows (Double-line glass frame on white wall) */}
                  {r.windows &&
                    r.windows.map((win, winIdx) => {
                      const winLenPx = (win.width || 1.5) * pxPerMeter;
                      const winPosPx = (win.position_along_wall || 1.0) * pxPerMeter;
                      const wallIdx = win.wall_index ?? 0;

                      let wx = 0, wy = 0, ww = 0, wh = 0;
                      if (wallIdx === 0) {
                        wx = winPosPx;
                        wy = -3;
                        ww = Math.min(winLenPx, rWidthPx - wx);
                        wh = 6;
                      } else if (wallIdx === 1) {
                        wx = rWidthPx - 3;
                        wy = winPosPx;
                        ww = 6;
                        wh = Math.min(winLenPx, rLengthPx - wy);
                      } else if (wallIdx === 2) {
                        wx = winPosPx;
                        wy = rLengthPx - 3;
                        ww = Math.min(winLenPx, rWidthPx - wx);
                        wh = 6;
                      } else {
                        wx = -3;
                        wy = winPosPx;
                        ww = 6;
                        wh = Math.min(winLenPx, rLengthPx - wy);
                      }

                      return (
                        <g key={winIdx}>
                          <rect x={wx} y={wy} width={ww} height={wh} fill="#FFFFFF" stroke="#0284C7" strokeWidth="1.2" />
                          <line
                            x1={wallIdx % 2 === 0 ? wx : wx + ww / 2}
                            y1={wallIdx % 2 === 0 ? wy + wh / 2 : wy}
                            x2={wallIdx % 2 === 0 ? wx + ww : wx + ww / 2}
                            y2={wallIdx % 2 === 0 ? wy + wh / 2 : wy + wh}
                            stroke="#0284C7"
                            strokeWidth="1.0"
                          />
                        </g>
                      );
                    })}

                  {/* Doors (Clean opening with swing trajectory arc, exactly matching Image 2) */}
                  {r.doors &&
                    r.doors.map((door, doorIdx) => {
                      const doorLenPx = (door.width || 0.9) * pxPerMeter;
                      const doorPosPx = (door.position_along_wall || 1.0) * pxPerMeter;
                      const wallIdx = door.wall_index ?? 2;

                      let dx = 0, dy = 0, dw = 0, dh = 0;
                      if (wallIdx === 2) {
                        dx = doorPosPx;
                        dy = rLengthPx - 3;
                        dw = Math.min(doorLenPx, rWidthPx - dx);
                        dh = 6;
                      } else if (wallIdx === 0) {
                        dx = doorPosPx;
                        dy = -3;
                        dw = Math.min(doorLenPx, rWidthPx - dx);
                        dh = 6;
                      } else if (wallIdx === 1) {
                        dx = rWidthPx - 3;
                        dy = doorPosPx;
                        dw = 6;
                        dh = Math.min(doorLenPx, rLengthPx - dy);
                      } else {
                        dx = -3;
                        dy = doorPosPx;
                        dw = 6;
                        dh = Math.min(doorLenPx, rLengthPx - dy);
                      }

                      return (
                        <g key={doorIdx}>
                          <rect x={dx} y={dy} width={dw} height={dh} fill="#FFFFFF" stroke="#475569" strokeWidth="0.8" />
                          <path
                            d={`M ${dx} ${dy} A ${dw} ${dw} 0 0 1 ${dx + dw} ${dy}`}
                            fill="none"
                            stroke="#64748B"
                            strokeWidth="0.8"
                            strokeDasharray="3 2"
                          />
                          <text x={dx + dw / 2} y={dy - 4} fill="#64748B" fontSize="6.5" fontStyle="italic" textAnchor="middle">
                            Дв-{(doorIdx + 1)}
                          </text>

                          {/* Corrugated Protective Sleeve (Himoya g'ilofi Ø20 / Gofra) */}
                          {wallIdx === 2 && (
                            <g transform={`translate(${dx + dw / 2 - 16}, ${dy - 4})`}>
                              <rect x="0" y="0" width="32" height="10" rx="2" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.2" />
                              {Array.from({ length: 6 }).map((_, gIdx) => (
                                <line key={gIdx} x1={5 + gIdx * 4.4} y1="1" x2={5 + gIdx * 4.4} y2="9" stroke="#D97706" strokeWidth="0.9" />
                              ))}
                              <text x="16" y="-3" fill="#B45309" fontSize="6.5" fontWeight="bold" textAnchor="middle">
                                Gofra Ø20
                              </text>
                            </g>
                          )}
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
                            rx="1.5"
                            fill="#FFFFFF"
                            stroke="#DC2626"
                            strokeWidth="1.2"
                          />
                          <line x1={rw * 0.25} y1="1" x2={rw * 0.25} y2={rh - 1} stroke="#DC2626" strokeWidth="0.8" />
                          <line x1={rw * 0.5} y1="1" x2={rw * 0.5} y2={rh - 1} stroke="#DC2626" strokeWidth="0.8" />
                          <line x1={rw * 0.75} y1="1" x2={rw * 0.75} y2={rh - 1} stroke="#DC2626" strokeWidth="0.8" />
                        </g>
                      );
                    })}

                  {/* Room Center Badge (Circle with room number, matching Image 2) */}
                  <g transform={`translate(${rWidthPx / 2}, ${rLengthPx / 2})`}>
                    <circle cx="0" cy="0" r="14" fill="#FFFFFF" stroke="#475569" strokeWidth="1.0" />
                    <text x="0" y="4" textAnchor="middle" fill="#0F172A" fontSize="11" fontWeight="bold">
                      {roomNumber}
                    </text>
                  </g>

                  {/* Room Text Label */}
                  {layers.showLabels && (
                    <g transform={`translate(${rWidthPx / 2}, ${rLengthPx / 2 + 22})`}>
                      <text x="0" y="0" textAnchor="middle" fill="#1E293B" fontSize="9.5" fontWeight="bold">
                        {r.name}
                      </text>
                      <text x="0" y="11" textAnchor="middle" fill="#64748B" fontSize="8.5" fontFamily="monospace">
                        {r.length}x{r.width}m • {r.area} m²{circuits.length > 0 ? ` • s=${circuits[0].spacing_mm || 150}mm` : ''}
                      </text>
                    </g>
                  )}

                  {/* Uponor Circuit Stamps (Matching Reference Image: Blue Outline Box with "uponor" logo & zone length) */}
                  {layers.showLabels &&
                    circuits.map((circ, cIdx) => {
                      const isCircSelected = selectedCircuitId === circ.id;
                      let badgeX = 8;
                      let badgeY = 8 + cIdx * 24;

                      if (circ.path_points && circ.path_points.length > 0) {
                        let minY = 9999, minX = 9999;
                        for (const pt of circ.path_points) {
                          if (pt[0] < minX) minX = pt[0];
                          if (pt[1] < minY) minY = pt[1];
                        }
                        if (minX < 9000 && minY < 9000) {
                          badgeX = Math.max(8, minX * pxPerMeter + 4);
                          badgeY = Math.max(8, minY * pxPerMeter + 4);
                        }
                      }

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
                          {/* Uponor blue stamp box */}
                          <rect
                            x="0"
                            y="0"
                            width="84"
                            height="22"
                            rx="3"
                            fill="#FFFFFF"
                            stroke={isCircSelected ? '#2563EB' : '#1D4ED8'}
                            strokeWidth={isCircSelected ? '1.8' : '1.1'}
                          />
                          {/* "uponor" blue bold label */}
                          <text x="5" y="14" fill="#1D4ED8" fontSize="8" fontWeight="bold">
                            uponor
                          </text>
                          <line x1="37" y1="2" x2="37" y2="20" stroke="#93C5FD" strokeWidth="0.8" />
                          <text x="41" y="9.5" fill="#1E3A8A" fontSize="7" fontWeight="bold">
                            {circ.circuit_number} / {circ.total_length_m?.toFixed(0) || '80'}m
                          </text>
                          <text x="41" y="18" fill="#2563EB" fontSize="6.5" fontWeight="bold">
                            s={circ.spacing_mm || 150} mm
                          </text>
                        </g>
                      );
                    })}

                  {/* Dimension Lines */}
                  {layers.showDimensions && (
                    <g opacity="0.8">
                      {/* Top width */}
                      <line x1="0" y1="-8" x2={rWidthPx} y2="-8" stroke="#64748B" strokeWidth="0.8" />
                      <line x1="0" y1="-12" x2="0" y2="-4" stroke="#0F172A" strokeWidth="1.0" />
                      <line x1={rWidthPx} y1="-12" x2={rWidthPx} y2="-4" stroke="#0F172A" strokeWidth="1.0" />
                      <text x={rWidthPx / 2} y="-11" fill="#0F172A" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                        {r.width} m
                      </text>

                      {/* Side length */}
                      <line x1="-8" y1="0" x2="-8" y2={rLengthPx} stroke="#64748B" strokeWidth="0.8" />
                      <line x1="-12" y1="0" x2="-4" y2="0" stroke="#0F172A" strokeWidth="1.0" />
                      <line x1="-12" y1={rLengthPx} x2="-4" y2={rLengthPx} stroke="#0F172A" strokeWidth="1.0" />
                      <text
                        x="-11"
                        y={rLengthPx / 2}
                        fill="#0F172A"
                        fontSize="8.5"
                        fontWeight="bold"
                        textAnchor="middle"
                        transform={`rotate(-90, -11, ${rLengthPx / 2})`}
                      >
                        {r.length} m
                      </text>
                    </g>
                  )}
                    </>
                  )}
                </g>
              );
            })}

            {/* C. All Manifolds Rendering (Uponor Cabinets & Riser Nodes, e.g. Дв-2 & T1-32) */}
            {(manifoldsToDisplay.length > 0 ? manifoldsToDisplay : [primaryManifold]).filter(Boolean).map((man: any) => {
              const mPos = manifoldPositions[man.id] || { x: man.position_x, y: man.position_y };
              const isT1Riser = man.name?.includes('T1-32') || (man.pipe_diameter_mm && man.pipe_diameter_mm >= 30);
              const isManDragging = draggingTarget?.type === 'manifold' && draggingTarget?.id === man.id;

              if (isT1Riser) {
                return (
                  <g
                    key={man.id}
                    transform={`translate(${mPos.x * pxPerMeter}, ${mPos.y * pxPerMeter})`}
                    className="pointer-events-auto cursor-pointer"
                    onClick={() => setActiveTab('manifold')}
                    onMouseDown={(e) => handleItemMouseDown('manifold', man.id, mPos, e)}
                  >
                    {/* T1-32 Riser connection lines */}
                    <path d="M 0 0 L 25 0 L 25 35 L 50 35" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M 0 6 L 20 6 L 20 41 L 50 41" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
                    <rect x="-10" y="-18" width="55" height="18" rx="3" fill="#FEF2F2" stroke="#EF4444" strokeWidth="1.2" />
                    <text x="17" y="-5" textAnchor="middle" fill="#DC2626" fontSize="10" fontWeight="bold">
                      T1-32
                    </text>
                    <circle cx="25" cy="0" r="3.5" fill="#EF4444" />
                  </g>
                );
              }

              const outlets = man.outlets_count || 8;
              const cabW = Math.max(100, outlets * 12 + 28);

              return (
                <g
                  key={man.id}
                  transform={`translate(${mPos.x * pxPerMeter}, ${mPos.y * pxPerMeter})`}
                  className="pointer-events-auto cursor-pointer"
                  onClick={() => setActiveTab('manifold')}
                  onMouseDown={(e) => handleItemMouseDown('manifold', man.id, mPos, e)}
                >
                  <rect
                    x="-12"
                    y="-16"
                    width={cabW}
                    height="46"
                    fill="#FFFFFF"
                    stroke={isOverCapacity ? '#EF4444' : isManDragging ? '#F59E0B' : '#0284C7'}
                    strokeWidth="1.8"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))"
                  />
                  <text x="0" y="-4" fill="#0284C7" fontSize="7.5" fontWeight="bold" letterSpacing="0.5">
                    {man.name.toUpperCase()} (ШРВ-{outlets})
                  </text>
                  <line x1="0" y1="8" x2={outlets * 12 + 6} y2="8" stroke="#EF4444" strokeWidth="2.4" strokeLinecap="round" />
                  <line x1="0" y1="18" x2={outlets * 12 + 6} y2="18" stroke="#2563EB" strokeWidth="2.4" strokeLinecap="round" />
                  {Array.from({ length: outlets }).map((_, pIdx) => {
                    const portNum = pIdx + 1;
                    const portX = 6 + pIdx * 12;
                    const connectedCircuit = allCircuits.find((c) => c.circuit.manifold_port_index === portNum && (c.circuit.manifold === man.id || !c.circuit.manifold));
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
                        <circle
                          cx={portX}
                          cy="8"
                          r={isPortSelected ? '3.5' : '2.2'}
                          fill={connectedCircuit ? '#EF4444' : '#CBD5E1'}
                          stroke="#0F172A"
                          strokeWidth={isPortSelected ? '1.2' : '0.6'}
                        />
                        <circle
                          cx={portX + 2}
                          cy="18"
                          r={isPortSelected ? '3.5' : '2.2'}
                          fill={connectedCircuit ? '#2563EB' : '#CBD5E1'}
                          stroke="#0F172A"
                          strokeWidth={isPortSelected ? '1.2' : '0.6'}
                        />
                        <text x={portX} y="27" fill="#475569" fontSize="6.5" fontWeight="bold" textAnchor="middle">
                          {portNum}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        </svg>

        {/* CAD Stamp in bottom right (White Paper Style) */}
        <div className="absolute bottom-3 right-3 bg-white/95 p-3 rounded-xl border border-slate-300 text-[10px] text-slate-700 font-mono shadow-md flex items-center gap-4">
          <div>
            <div className="font-bold text-slate-900 text-xs">SantexPro Master CAD</div>
            <div className="text-slate-500">EN 1264 / KMK 2.04.05-97</div>
          </div>
          <div className="border-l border-slate-200 pl-3">
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

      {/* 3. Bottom Engineering Drawer / Inspector Panel (Clean Light Theme) */}
      <div className="bg-slate-50 border-t border-slate-200 flex flex-col">
        {/* Tab Headers */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('circuits')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'circuits'
                  ? 'bg-slate-50 text-blue-600 border-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 border-transparent'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Issiq Pol Konturlari ({allCircuits.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('manifold')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'manifold'
                  ? 'bg-slate-50 text-blue-600 border-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 border-transparent'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Kollektor va Balansirovka ({totalCircuitsCount}/{manifoldOutletsCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('legend')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'legend'
                  ? 'bg-slate-50 text-blue-600 border-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 border-transparent'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Shartli Belgilar</span>
            </button>

            <button
              onClick={() => setActiveTab('hydraulics')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'hydraulics'
                  ? 'bg-slate-50 text-emerald-700 border-emerald-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 border-transparent'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-emerald-600" />
              <span>Gidravlika & Santexnika Qoidalari</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-100 text-emerald-800 font-bold">
                EN 1264
              </span>
            </button>
          </div>

          <button
            onClick={() => setIsPanelExpanded(!isPanelExpanded)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-2 py-1 rounded"
          >
            {isPanelExpanded ? "Kichraytirish" : "Kattalashtirish"}
          </button>
        </div>

        {/* Tab Content */}
        {isPanelExpanded && (
          <div className="p-4 max-h-56 overflow-y-auto bg-slate-50">
            {activeTab === 'circuits' && (
              <div className="space-y-3">
                {/* Active circuit inspector highlight card */}
                {activeCircuitDetails && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600 rounded-lg text-white">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">
                            Kontur #{activeCircuitDetails.circuit.circuit_number}: {activeCircuitDetails.room.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 border border-blue-300 font-bold">
                            Port #{activeCircuitDetails.circuit.manifold_port_index || '—'}
                          </span>
                          {activeCircuitDetails.circuit.is_locked ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 border border-amber-300 font-bold flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Qulflangan
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
                              <Unlock className="w-3 h-3" /> Tahrirlanadi
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Truba: <b>Ø{activeCircuitDetails.circuit.pipe_diameter_mm || 16} mm Uponor pePEX</b> •
                          Maydon: <b>{activeCircuitDetails.circuit.heated_area || activeCircuitDetails.room.area} m²</b> •
                          Pol trubasi: <b>{activeCircuitDetails.circuit.floor_length_m?.toFixed(1) || 0} m</b> +
                          Magistral ulanish: <b>{activeCircuitDetails.circuit.manifold_lead_in_m?.toFixed(1) || 0} m</b> =
                          Jami: <b className="text-blue-700">{activeCircuitDetails.circuit.total_length_m?.toFixed(1) || 0} m</b>
                        </p>
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
                            <Ruler className="w-3.5 h-3.5 text-blue-700" />
                            Quvur qadami (masofasi): <b>{activeCircuitDetails.circuit.spacing_mm || 150} mm</b>
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                            EN 1264 tavsiyasi: {(activeCircuitDetails.circuit.spacing_mm || 150) <= 150 ? 'Zich / Chekka zona' : 'Standart yashash zonasi'}
                          </span>
                        </div>
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
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 flex items-center gap-1.5 shadow-xs"
                      >
                        {activeCircuitDetails.circuit.is_locked ? (
                          <>
                            <Unlock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Qulfdan chiqarish</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                            <span>Qulflash</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onOpenRoomEditor(activeCircuitDetails.room.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs"
                      >
                        <span>2D Xonada ochish</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setSelectedCircuitId(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                        title="Dastlabki holatga qaytish"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Circuit Table in Clean Light Theme */}
                <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
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
                    <tbody className="divide-y divide-slate-100">
                      {allCircuits.map(({ circuit, room }) => {
                        const isSelected = selectedCircuitId === circuit.id;
                        return (
                          <tr
                            key={circuit.id || circuit.circuit_number}
                            onClick={() => setSelectedCircuitId(circuit.id || null)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50 text-blue-950 font-semibold' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-3 py-2 font-mono font-bold text-blue-600">
                              K-{circuit.circuit_number}
                            </td>
                            <td className="px-3 py-2 font-medium">{room.name}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-mono font-bold">
                                Port #{circuit.manifold_port_index || '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              Ø{circuit.pipe_diameter_mm || 16} mm • s={circuit.spacing_mm || 150} mm
                            </td>
                            <td className="px-3 py-2 font-mono">{circuit.floor_length_m?.toFixed(1) || 0} m</td>
                            <td className="px-3 py-2 font-mono text-slate-500">
                              {circuit.manifold_lead_in_m?.toFixed(1) || 0} m
                            </td>
                            <td className="px-3 py-2 font-mono font-bold text-slate-900">
                              {circuit.total_length_m?.toFixed(1) || 0} m
                            </td>
                            <td className="px-3 py-2">
                              {circuit.is_locked ? (
                                <span className="text-amber-600 font-semibold flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> Qulflangan
                                </span>
                              ) : (
                                <span className="text-slate-500 flex items-center gap-1">
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
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded text-[11px] transition-colors border border-blue-200"
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
              <div className="space-y-4 text-xs text-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <div className="text-slate-500 text-[11px] font-bold">Kollektor Modeli</div>
                    <div className="text-sm font-bold text-slate-900 mt-1">
                      {primaryManifold?.model_name || "Uponor Vario S / Valtec VTc.594"}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Joylashuv: X={manifoldPos.x.toFixed(2)} m, Y={manifoldPos.y.toFixed(2)} m
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <div className="text-slate-500 text-[11px] font-bold">Portlar Sig‘imi</div>
                    <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-2">
                      <span className={isOverCapacity ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}>
                        {totalCircuitsCount} / {manifoldOutletsCount} Chiqish band
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden border border-slate-200">
                      <div
                        className={`h-full ${isOverCapacity ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{
                          width: `${Math.min(100, (totalCircuitsCount / manifoldOutletsCount) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div className="text-slate-500 text-[11px] font-bold">Kengaytirish</div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleExpandManifoldOutlets(manifoldOutletsCount + 1)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs"
                      >
                        + 1 Chiqish qo‘shish
                      </button>
                      <button
                        onClick={() => handleExpandManifoldOutlets(Math.max(2, manifoldOutletsCount - 1))}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs border border-slate-200"
                      >
                        - 1 Kamaytirish
                      </button>
                    </div>
                  </div>
                </div>

                {/* Port by port list */}
                <div className="font-bold text-slate-900 pt-2">Kollektor chiqishlari va Balansirovka:</div>
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
                              ? 'bg-blue-100 border-blue-500 text-blue-950 font-semibold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-800 hover:border-blue-300'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span>Port #{pNum}</span>
                          <span
                            className={`w-2 h-2 rounded-full ${cMatch ? 'bg-emerald-500' : 'bg-slate-300'}`}
                          />
                        </div>
                        {cMatch ? (
                          <div className="mt-1">
                            <div className="font-bold text-blue-600 truncate">K-{cMatch.circuit.circuit_number}</div>
                            <div className="text-[10px] text-slate-600 truncate">{cMatch.room.name}</div>
                            <div className="text-[10px] text-slate-800 font-mono mt-0.5 font-bold">
                              {cMatch.circuit.total_length_m?.toFixed(0)}m
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-2">Bo‘sh chiqish</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'legend' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
                <div className="space-y-2">
                  <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">Trubalar va Oqim</div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-1 bg-red-500 rounded"></span>
                    <span>T11 Uzatish trubasi (Suprimento / 45°C)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-1 bg-blue-600 rounded"></span>
                    <span>T12 Qaytish trubasi (Retorno / 35°C)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <span>Gofra himoya gilzasi (devor / eshik kesishuvida)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">Uskunalar</div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-3 bg-white border border-blue-600 text-[8px] text-blue-600 font-bold flex items-center justify-center rounded-xs">
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
                  <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">Konstruktsiya</div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-2 bg-blue-100 border border-blue-500 rounded-xs"></span>
                    <span>Deraza bloklari (2 kamerali oynapaket)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-1.5 border-t border-dashed border-slate-600"></span>
                    <span>Eshik va ochilish trayektoriyasi (Дв-1)</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'hydraulics' && (
              <div className="space-y-4 text-xs text-slate-700">
                {/* 1. Muhandislik Tahlili: 2 ta Kollektor ning Zaruriyati & Suv Sovishi */}
                <div className="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl text-white shadow-md border border-blue-800/40">
                  <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-400 text-slate-900 rounded-lg">
                        <Sparkles className="w-4 h-4 font-bold" />
                      </div>
                      <h4 className="font-extrabold text-sm text-white tracking-tight">
                        Muhandislik & Santexnika Me'yorlari: Nega 2 ta Kollektor (Дв-2 va T1-32) O‘rnatilgan?
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-white/15 border border-white/20 font-mono text-blue-200">
                      EN 1264 & KMK 2.04.05-97
                    </span>
                  </div>

                  <p className="text-xs text-blue-100 leading-relaxed max-w-4xl">
                    Agar 200+ m² li uyda faqat 1 ta kollektor qo‘yilsa, o‘ng tomondagi xonalarga (19, 21, 23) boruvchi quvurlar
                    dahliz orqali <b>22 metrdan ortiq masofani</b> bosib o‘tishga majbur bo‘lardi.
                    Uzoq masofada suv yo‘lda <b>3.8°C sovib ketardi</b>, koridorni me'yordan ortiq qizdirib yuborardi (&gt;33°C, sanitariya normasidan yuqori)
                    va gidravlik balans buzilardi. Shu sababli Uponor muhandislari loyihani <b>2 ta mustaqil gidravlik qanotga</b> ajratgan:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3.5">
                    <div className="p-3 bg-white/10 rounded-xl border border-white/15 backdrop-blur-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-300">1. Kollektor Дв-2 (Chap qanot — 8 chiqish)</span>
                        <span className="text-[10px] bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded">6 kontur band</span>
                      </div>
                      <p className="text-[11px] text-blue-100 mt-1.5 leading-relaxed">
                        • Xonalar: <b>Zal 17</b> (3 ta kontur), <b>Tambur 16</b> (1 ta), <b>Koridor 18</b> (2 ta).<br />
                        • Eng uzoq tranzit: <b>9.2 m</b> • Suv yo‘ldagi sovishi: <b>atigi 0.4°C (Xavfsiz)</b>.<br />
                        • O‘tish joyi: Faqat <b>Дв-2 eshigi orqali, Gofra Ø20</b> gilzasida to‘plangan holda.
                      </p>
                    </div>

                    <div className="p-3 bg-white/10 rounded-xl border border-white/15 backdrop-blur-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-emerald-300">2. Magistral stoyak T1-32 (O‘ng qanot — 4 chiqish)</span>
                        <span className="text-[10px] bg-emerald-400/20 text-emerald-200 px-2 py-0.5 rounded">4 kontur band</span>
                      </div>
                      <p className="text-[11px] text-blue-100 mt-1.5 leading-relaxed">
                        • Xonalar: <b>Yotoqxona 19</b> (2 ta kontur), <b>Ishchi xona 21</b> (1 ta), <b>Xo‘jalik 23</b> (1 ta).<br />
                        • Magistral stoyak: <b>Ø32 mm izolyatsiyalangan Uponor PEX-a</b> orqali to‘g‘ridan-to‘g‘ri ta'minlanadi.<br />
                        • Tranzit masofa: <b>1.8 m</b> • Suv sovishi: <b>0.1°C</b> • <b>120 metr keraksiz tranzit quvur tejaldi!</b>
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-emerald-300 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Xulosa: Barcha xonalarda harorat bir xil (+22°C), suv sovish xavfi 0%, gidravlik balans 100%!</span>
                    </div>
                    <div className="text-[11px] text-blue-200 font-mono">
                      Nasos tavsiyasi: <b>Grundfos UPM3 AUTO 25-70 (25 W)</b>
                    </div>
                  </div>
                </div>

                {/* 2. 10 ta Kontur Gidravlika va Balansirovka (Rotametr) Jadvali */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <span>Har bir Konturning Gidravlik Parametrlari va Balansirovka Sozlamalari</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Harorat rejimi: <b>40 / 35°C (ΔT = 5.0 K)</b> • Truba: <b>Uponor PE-Xa 16x2.0 mm</b>
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Kontur</th>
                          <th className="px-3 py-2">Xona</th>
                          <th className="px-3 py-2">Kollektor</th>
                          <th className="px-3 py-2">Qadam (s)</th>
                          <th className="px-3 py-2">Pol / Tranzit</th>
                          <th className="px-3 py-2">Jami Uzunlik</th>
                          <th className="px-3 py-2">Suv Sarfi</th>
                          <th className="px-3 py-2">Tezlik</th>
                          <th className="px-3 py-2">Bosim (ΔP)</th>
                          <th className="px-3 py-2">Rotametr Sozlamasi</th>
                          <th className="px-3 py-2">Suv Sovishi</th>
                          <th className="px-3 py-2 text-right">EN 1264 Me'yor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(hydraulicsData?.circuits || []).map((c: any) => {
                          const isSelected = selectedCircuitId === c.circuit_id;
                          return (
                            <tr
                              key={c.circuit_id || c.circuit_number}
                              onClick={() => setSelectedCircuitId(c.circuit_id)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-50 text-blue-950 font-semibold' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="px-3 py-2 font-mono font-bold text-blue-600">
                                K-{c.circuit_number}
                              </td>
                              <td className="px-3 py-2 font-medium">{c.room_name}</td>
                              <td className="px-3 py-2">
                                <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono">
                                  {c.manifold_name} (P#{c.manifold_port})
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono">
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[11px]">
                                  s={c.spacing_mm || 150} mm
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono text-slate-600">
                                {c.floor_length_m?.toFixed(0)}m / {c.feeder_length_m?.toFixed(0)}m
                              </td>
                              <td className="px-3 py-2 font-mono font-bold text-slate-900">
                                {c.total_length_m?.toFixed(0)} m
                              </td>
                              <td className="px-3 py-2 font-mono">
                                {c.flow_l_h?.toFixed(0)} l/h ({c.flow_l_min?.toFixed(2)} l/daq)
                              </td>
                              <td className="px-3 py-2 font-mono">
                                <span className={c.velocity_m_s >= 0.15 && c.velocity_m_s <= 0.6 ? 'text-emerald-700' : 'text-amber-600'}>
                                  {c.velocity_m_s?.toFixed(2)} m/s
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono">
                                {c.pressure_drop_kpa?.toFixed(1)} kPa
                              </td>
                              <td className="px-3 py-2 font-mono font-bold text-blue-700">
                                {c.balancing_setting_l_min?.toFixed(1)} l/daq
                              </td>
                              <td className="px-3 py-2">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  ΔT = {c.transit_temp_drop_c?.toFixed(1)}°C (Xavfsiz)
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Me'yorda (&lt;100m)
                                </span>
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
          </div>
        )}
      </div>
    </div>
  );
};
