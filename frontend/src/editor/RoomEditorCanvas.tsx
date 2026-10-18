import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Room, Manifold } from '../types';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  Eye, 
  EyeOff, 
  Table, 
  FileCheck, 
  Bath, 
  Box, 
  Compass, 
  Info, 
  Flame, 
  CheckCircle2, 
  ShieldCheck, 
  Maximize2,
  Minimize2,
  MousePointer,
  Hand,
  Focus
} from 'lucide-react';
import { 
  generateRoomCadCircuits, 
  CadLoop, 
  getStandardSanitaryFixtures, 
  SanitaryFixture,
  projectIso 
} from './cadDrawingEngine';
import { api } from '../api/client';

interface RoomEditorCanvasProps {
  room: Room;
  manifold?: Manifold | null;
  onUpdateRadiatorPosition?: (radiatorId: number, x: number, y: number) => void;
  onUpdateManifoldPosition?: (x: number, y: number) => void;
  onAddWindow?: (wallIndex: number, pos: number) => void;
  onAddDoor?: (wallIndex: number, pos: number) => void;
  onAddRadiator?: (x: number, y: number) => void;
  onCalculationUpdated?: () => void;
}

export const RoomEditorCanvas: React.FC<RoomEditorCanvasProps> = ({
  room,
  manifold,
  onUpdateRadiatorPosition,
  onUpdateManifoldPosition,
  onCalculationUpdated,
}) => {
  // View mode: 2D plan or 3D Axonometric scheme
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);

  // Layer toggles
  const [showUnderfloor, setShowUnderfloor] = useState(true);
  const [showRadiators, setShowRadiators] = useState(true);
  const [showPipes, setShowPipes] = useState(true);
  const [showSanitary, setShowSanitary] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showCircuitTable, setShowCircuitTable] = useState(false);
  const [showPirogModal, setShowPirogModal] = useState(false);
  const [selectedCircuit, setSelectedCircuit] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Dynamic container dimensions (measures true rendered size)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 50) {
        setContainerSize({
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [isExpanded]);

  // Reset pan and zoom when room changes
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1.0);
  }, [room.id, room.length, room.width]);

  // Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Non-passive wheel and gesture listener for touchpad pinch-to-zoom and smooth panning
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // 1. PINCH-TO-ZOOM: Triggered when spreading/pinching 2 fingers on a trackpad
      // or when holding Ctrl/Cmd while scrolling. Browsers set e.ctrlKey=true for trackpad pinch.
      if (e.ctrlKey || e.metaKey) {
        // Continuous smooth exponential zoom factor:
        // Spreading fingers apart (zoom in) has negative deltaY -> factor > 1
        // Pinching fingers together (zoom out) has positive deltaY -> factor < 1
        const zoomFactor = Math.exp(-e.deltaY * 0.01);

        setZoom((prevZoom) => {
          const targetZoom = Math.min(5.0, Math.max(0.35, prevZoom * zoomFactor));
          if (Math.abs(targetZoom - prevZoom) < 0.0005) return prevZoom;

          const rect = svgEl.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          const centerX = containerSize.width / 2;
          const centerY = containerSize.height / 2;

          const scaleRatio = targetZoom / prevZoom;

          setPan((prevPan) => ({
            x: mouseX - centerX - (mouseX - prevPan.x - centerX) * scaleRatio,
            y: mouseY - centerY - (mouseY - prevPan.y - centerY) * scaleRatio,
          }));

          return targetZoom;
        });
      } else {
        // 2. TWO-FINGER SCROLL / PAN: Normal scrolling or swiping on trackpad pans the canvas
        // This completely prevents accidental canvas zoom explosions on normal scroll
        setPan((prevPan) => ({
          x: prevPan.x - e.deltaX,
          y: prevPan.y - e.deltaY,
        }));
      }
    };

    // Prevent Safari default viewport zoom on gesture
    const onGesture = (e: Event) => {
      e.preventDefault();
    };

    svgEl.addEventListener('wheel', onWheel, { passive: false });
    svgEl.addEventListener('gesturestart', onGesture, { passive: false });
    svgEl.addEventListener('gesturechange', onGesture, { passive: false });

    return () => {
      svgEl.removeEventListener('wheel', onWheel);
      svgEl.removeEventListener('gesturestart', onGesture);
      svgEl.removeEventListener('gesturechange', onGesture);
    };
  }, [containerSize.width, containerSize.height]);

  // 2D Base Scale (pixels per meter) with generous margins so room NEVER clips on initial load
  const basePxPerMeter = useMemo(() => {
    const availW = Math.max(200, containerSize.width - 170);
    const availH = Math.max(200, containerSize.height - 150);
    const ppm = Math.min(availW / Math.max(1, room.length), availH / Math.max(1, room.width));
    return Math.max(35, Math.min(180, ppm));
  }, [containerSize.width, containerSize.height, room.length, room.width]);

  const pxPerMeter = basePxPerMeter;
  const baseOriginX = (containerSize.width - room.length * basePxPerMeter) / 2;
  const baseOriginY = (containerSize.height - room.width * basePxPerMeter) / 2;

  // 2D Coordinate conversions
  const toPxX = (mX: number) => baseOriginX + mX * basePxPerMeter;
  const toPxY = (mY: number) => baseOriginY + mY * basePxPerMeter;

  // Mouse handlers for canvas panning (radiators and manifolds are fixed and cannot be dragged)
  const handleMouseDown = (e: React.MouseEvent<any>) => {
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanStartOffset({ x: pan.x, y: pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan({
        x: panStartOffset.x + dx,
        y: panStartOffset.y + dy,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleFitView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1.0);
  };

  // Manifold coordinates: strictly fixed in the wall niche (cannot be moved or dragged into room)
  const manifoldPos = useMemo(() => ({
    x: 0.35,
    y: Math.min(room.width - 0.6, Math.max(0.6, room.width / 2))
  }), [room.width]);

  // User selected circuit count override (for quick switching on canvas)
  const [selectedNumCircuits, setSelectedNumCircuits] = useState<number | null>(null);

  useEffect(() => {
    setSelectedNumCircuits(null);
  }, [room.id, room.underfloor_circuits?.length]);

  const defaultCircuits = room.underfloor_circuits && room.underfloor_circuits.length > 0 
    ? room.underfloor_circuits.length 
    : (room.length > 4.5 || room.area > 15 ? 2 : 1);

  const numCircuits = selectedNumCircuits ?? defaultCircuits;

  const spacingMm = room.underfloor_circuits?.[0]?.spacing_mm || 150;
  const pattern = room.underfloor_circuits?.[0]?.pattern || 'spiral';

  const handleCircuitCountChange = async (count: number) => {
    setSelectedNumCircuits(count);
    try {
      await api.calculateUnderfloor(room.id, {
        spacing_mm: spacingMm,
        routing_pattern: pattern as any,
        custom_num_circuits: count,
      });
      if (onCalculationUpdated) {
        onCalculationUpdated();
      }
    } catch (err) {
      console.error('Failed to update underfloor circuits:', err);
    }
  };

  const cadLoops: CadLoop[] = useMemo(() => {
    return generateRoomCadCircuits(
      room.length,
      room.width,
      numCircuits,
      spacingMm,
      pattern,
      manifoldPos,
      toPxX,
      toPxY,
      basePxPerMeter
    );
  }, [room.length, room.width, numCircuits, spacingMm, pattern, manifoldPos, baseOriginX, baseOriginY, basePxPerMeter]);

  // Sanitary fixtures
  const sanitaryFixtures: SanitaryFixture[] = useMemo(() => {
    return getStandardSanitaryFixtures(room.name, room.length, room.width);
  }, [room.name, room.length, room.width]);

  // Wall thickness (0.30 m)
  const wallThicknessM = 0.30;
  const wallThickPx = Math.max(14, wallThicknessM * basePxPerMeter);

  // 3D Isometric Projection Helpers
  const isoOriginX = containerSize.width / 2;
  const isoOriginY = containerSize.height * 0.44;
  const isoScale = Math.min((containerSize.width - 120) / (room.length + room.width), 36);
  const getIso = (x: number, y: number, z: number) =>
    projectIso(x, y, z, isoOriginX, isoOriginY, isoScale);

  return (
    <>
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setIsExpanded(false)}
        />
      )}
      <div className={
        isExpanded
          ? "fixed inset-3 md:inset-6 z-50 bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-scale-in"
          : "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative"
      }>
        {/* Top Controls Toolbar */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 text-sm">{room.name}</span>
          <span className="bg-blue-100 text-blue-800 font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
            {room.length} × {room.width} m ({room.area} m²)
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600 font-mono">Shift: {room.height} m</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600 font-medium">Masshtab: 1:50</span>
        </div>

        {/* View Mode & Layer Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher: 2D Plan vs 3D Axonometry */}
          <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 shadow-xs mr-1">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
                viewMode === '2d'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              2D Reja (Plan)
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
                viewMode === '3d'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              3D Aksonometriya
            </button>
          </div>

          {/* Issiq pol qatlami va konturlar sonini tanlash */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setShowUnderfloor(!showUnderfloor)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-semibold text-xs transition-all ${
                showUnderfloor
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Issiq pol konturlarini ko‘rsatish/yashirish"
            >
              {showUnderfloor ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              Issiq pol
            </button>

            {showUnderfloor && (
              <div className="flex items-center gap-1 pl-1.5 pr-1 border-l border-slate-200 ml-1">
                <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">Bo‘linishi:</span>
                <select
                  value={numCircuits}
                  onChange={(e) => handleCircuitCountChange(Number(e.target.value))}
                  className="bg-blue-50/90 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded px-1.5 py-0.5 text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors"
                  title="Issiq pol konturlar sonini tanlang (1 ta, 2 ta, 3 ta va h.k.)"
                >
                  <option value={1}>1 ta kontur</option>
                  <option value={2}>2 ta kontur</option>
                  <option value={3}>3 ta kontur</option>
                  <option value={4}>4 ta kontur</option>
                  <option value={5}>5 ta kontur</option>
                  <option value={6}>6 ta kontur</option>
                </select>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowRadiators(!showRadiators)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              showRadiators
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
            title="Radiatorlar"
          >
            {showRadiators ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Radiatorlar
          </button>

          <button
            onClick={() => setShowPipes(!showPipes)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              showPipes
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
            title="Trassalar va magistrallar"
          >
            {showPipes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Trassa (T1/T2)
          </button>

          {sanitaryFixtures.length > 0 && (
            <button
              onClick={() => setShowSanitary(!showSanitary)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                showSanitary
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
              title="Santexnika jihozlari (Unitaz, rakovina, trap)"
            >
              <Bath className="w-3.5 h-3.5" />
              Santexnika
            </button>
          )}

          <button
            onClick={() => setShowPirogModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
            title="Pol konstruksiyasi kesimi"
          >
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            Pol "Pirogi"
          </button>

          <button
            onClick={() => setShowCircuitTable(!showCircuitTable)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              showCircuitTable
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
            title="Konturlar jadvali (ГОСТ)"
          >
            <Table className="w-3.5 h-3.5" />
            Jadval
          </button>

          {/* Zoom & View Navigation Controls */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 ml-1">
            <button
              onClick={() => setZoom(z => Math.max(0.35, z / 1.25))}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
              title="Kichraytirish (Zoom Out)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleFitView}
              className="px-1.5 py-1 text-[11px] font-mono font-bold text-slate-700 hover:bg-slate-100 rounded transition-colors"
              title="100% masshtab va markazga qaytarish"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom(z => Math.min(5.0, z * 1.25))}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
              title="Kattalashtirish (Zoom In)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleFitView}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
              title="Xonani to‘liq ko‘rinishga moslash (Fit View)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-1.5 rounded transition-colors ${
                isExpanded 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
              title={isExpanded ? "Oddiy ko‘rinishga qaytish (Esc)" : "Kengaytirilgan to‘liq ekran rejimi"}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main SVG Drawing Canvas Area */}
      <div 
        ref={containerRef}
        className={`relative bg-slate-100/80 flex items-center justify-center overflow-hidden select-none w-full ${
          isExpanded ? 'flex-1 min-h-[500px]' : 'h-[620px]'
        }`}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className={`w-full h-full bg-white font-sans ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={(e) => handleMouseDown(e)}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            {/* Professional CAD Diagonal Wall Hatch Pattern */}
            <pattern id="cadWallHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#94A3B8" strokeWidth="1.2" />
            </pattern>

            {/* Precision Blueprint Grid (0.5m & 0.1m) */}
            <pattern id="cadMinorGrid" width={basePxPerMeter * 0.1} height={basePxPerMeter * 0.1} patternUnits="userSpaceOnUse">
              <path d={`M ${basePxPerMeter * 0.1} 0 L 0 0 0 ${basePxPerMeter * 0.1}`} fill="none" stroke="#F1F5F9" strokeWidth="0.5" />
            </pattern>
            <pattern id="cadMajorGrid" width={basePxPerMeter * 0.5} height={basePxPerMeter * 0.5} patternUnits="userSpaceOnUse">
              <rect width={basePxPerMeter * 0.5} height={basePxPerMeter * 0.5} fill="url(#cadMinorGrid)" />
              <path d={`M ${basePxPerMeter * 0.5} 0 L 0 0 0 ${basePxPerMeter * 0.5}`} fill="none" stroke="#E2E8F0" strokeWidth="1" />
            </pattern>

            {/* Corrugated Sleeve Hatch (Gofroturba / Pepex izolyatsiya) */}
            <pattern id="corrugatedSleeve" width="6" height="6" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="6" y2="6" stroke="#475569" strokeWidth="1" />
              <line x1="6" y1="0" x2="0" y2="6" stroke="#475569" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Main Pan & Zoom Viewport Group (Transforms both 2D and 3D modes smoothly) */}
          <g 
            transform={`translate(${pan.x}, ${pan.y}) translate(${containerSize.width / 2}, ${containerSize.height / 2}) scale(${zoom}) translate(${-containerSize.width / 2}, ${-containerSize.height / 2})`}
          >
            {/* ============================================================== */}
            {/* VIEW MODE 1: 2D ARCHITECTURAL & HVAC PLAN                      */}
            {/* ============================================================== */}
            {viewMode === '2d' && (
              <g className="view-mode-2d">
                {/* 1. CAD Background Grid (Infinite canvas) */}
                <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#cadMajorGrid)" />

                {/* 2. Building Axes (1, 2 and A, B) */}
                {showAxes && (
                  <g className="axes-layer">
                    {/* Axis 1 (West Wall Vertical) */}
                    <line 
                      x1={toPxX(0)} y1={toPxY(0) - wallThickPx - 55} 
                      x2={toPxX(0)} y2={toPxY(room.width) + wallThickPx + 36} 
                      stroke="#94A3B8" strokeWidth="0.8" strokeDasharray="6,3,1.5,3" 
                    />
                    <circle cx={toPxX(0)} cy={toPxY(0) - wallThickPx - 44} r="12" fill="white" stroke="#DC2626" strokeWidth="1.2" />
                    <text x={toPxX(0)} y={toPxY(0) - wallThickPx - 40} textAnchor="middle" className="text-xs font-bold fill-red-600 font-mono">1</text>

                    {/* Axis 2 (East Wall Vertical) */}
                    <line 
                      x1={toPxX(room.length)} y1={toPxY(0) - wallThickPx - 55} 
                      x2={toPxX(room.length)} y2={toPxY(room.width) + wallThickPx + 36} 
                      stroke="#94A3B8" strokeWidth="0.8" strokeDasharray="6,3,1.5,3" 
                    />
                    <circle cx={toPxX(room.length)} cy={toPxY(0) - wallThickPx - 44} r="12" fill="white" stroke="#DC2626" strokeWidth="1.2" />
                    <text x={toPxX(room.length)} y={toPxY(0) - wallThickPx - 40} textAnchor="middle" className="text-xs font-bold fill-red-600 font-mono">2</text>

                    {/* Axis A (North Wall Horizontal) */}
                    <line 
                      x1={toPxX(0) - wallThickPx - 55} y1={toPxY(0)} 
                      x2={toPxX(room.length) + wallThickPx + 36} y2={toPxY(0)} 
                      stroke="#94A3B8" strokeWidth="0.8" strokeDasharray="6,3,1.5,3" 
                    />
                    <circle cx={toPxX(0) - wallThickPx - 44} cy={toPxY(0)} r="12" fill="white" stroke="#2563EB" strokeWidth="1.2" />
                    <text x={toPxX(0) - wallThickPx - 44} y={toPxY(0) + 4} textAnchor="middle" className="text-xs font-bold fill-blue-600 font-mono">A</text>

                    {/* Axis B (South Wall Horizontal) */}
                    <line 
                      x1={toPxX(0) - wallThickPx - 55} y1={toPxY(room.width)} 
                      x2={toPxX(room.length) + wallThickPx + 36} y2={toPxY(room.width)} 
                      stroke="#94A3B8" strokeWidth="0.8" strokeDasharray="6,3,1.5,3" 
                    />
                    <circle cx={toPxX(0) - wallThickPx - 44} cy={toPxY(room.width)} r="12" fill="white" stroke="#2563EB" strokeWidth="1.2" />
                    <text x={toPxX(0) - wallThickPx - 44} y={toPxY(room.width) + 4} textAnchor="middle" className="text-xs font-bold fill-blue-600 font-mono">B</text>
                  </g>
                )}

              {/* 3. Room Interior Floor Plate */}
              <rect
                x={toPxX(0)}
                y={toPxY(0)}
                width={room.length * pxPerMeter}
                height={room.width * pxPerMeter}
                fill="#FDFDFD"
                stroke="#64748B"
                strokeWidth="1"
              />


              {/* 4. Underfloor Heating Layer (CAD Loops & Feeder Trunks) */}
              {showUnderfloor && (
                <g className="underfloor-layer">
                  {cadLoops.map((loop) => {
                    const isSelected = selectedCircuit === null || selectedCircuit === loop.circuitNumber;
                    return (
                      <g 
                        key={loop.circuitNumber} 
                        opacity={isSelected ? 1 : 0.25}
                        className="transition-opacity cursor-pointer"
                        onClick={() => setSelectedCircuit(selectedCircuit === loop.circuitNumber ? null : loop.circuitNumber)}
                      >
                        {/* Dual-Color Authentic Bifilar Spiral Loops (T11 Red Supply & T12 Blue Return matching Uponor PDF) */}
                        <path
                          d={loop.supplyPathD}
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth={Math.max(1.1, Math.min(1.5, pxPerMeter * 0.016))}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d={loop.returnPathD}
                          fill="none"
                          stroke="#2563EB"
                          strokeWidth={Math.max(1.1, Math.min(1.5, pxPerMeter * 0.016))}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Feeder Pipes to Manifold with Corrugated Sleeve */}
                        {showPipes && (
                          <g className="feeder-connections">
                            {/* Supply Feeder (T11 - Qizil) */}
                            <path
                              d={loop.feederSupplyD}
                              fill="none"
                              stroke="#EF4444"
                              strokeWidth="1.2"
                              strokeDasharray="4,2"
                            />
                            {/* Return Feeder (T12 - Ko'k) */}
                            <path
                              d={loop.feederReturnD}
                              fill="none"
                              stroke="#3B82F6"
                              strokeWidth="1.2"
                              strokeDasharray="4,2"
                            />
                            {/* Corrugated Sleeve protection at exit */}
                            <path
                              d={loop.feederCorrugatedD}
                              fill="url(#corrugatedSleeve)"
                              stroke="#475569"
                              strokeWidth="0.8"
                            />
                          </g>
                        )}

                        {/* Official Uponor Circuit Stamp / Badge (Page 5 PDF Standard) */}
                        <g transform={`translate(${loop.stampPoint.x}, ${loop.stampPoint.y})`}>
                          <rect
                            x="-32"
                            y="-20"
                            width="64"
                            height="40"
                            rx="3"
                            fill="#FFFFFF"
                            stroke="#1E40AF"
                            strokeWidth="1.5"
                            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.12))"
                          />
                          <rect x="-32" y="-20" width="64" height="15" fill="#1E40AF" rx="3" />
                          <text x="0" y="-9" textAnchor="middle" className="text-[10px] font-bold fill-white tracking-wider">
                            uponor
                          </text>
                          <text x="0" y="4" textAnchor="middle" className="text-[9px] font-bold fill-slate-900 font-mono">
                            {loop.name} ({loop.circuitNumber}-kontur)
                          </text>
                          <text x="0" y="15" textAnchor="middle" className="text-[10px] font-extrabold fill-blue-700 font-mono">
                            {loop.totalLengthM} m
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* Center Room Number Circle (matching reference PDF Page 5) */}
                  <g transform={`translate(${toPxX(room.length / 2)}, ${toPxY(room.width / 2)})`}>
                    <circle cx="0" cy="0" r="14" fill="#FFFFFF" stroke="#64748B" strokeWidth="1.2" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))" />
                    <text x="0" y="4" textAnchor="middle" className="text-xs font-bold fill-slate-800 font-mono">
                      {room.name.match(/\d+/)?.[0] ?? (room.id || 1)}
                    </text>
                  </g>

                  {/* Expansion Joint between zones */}
                  {cadLoops.length > 1 && (
                    <g className="expansion-joint">
                      {room.length >= room.width ? (
                        <line
                          x1={toPxX(room.length / 2)}
                          y1={toPxY(0)}
                          x2={toPxX(room.length / 2)}
                          y2={toPxY(room.width)}
                          stroke="#EF4444"
                          strokeWidth="1.2"
                          strokeDasharray="6,4"
                        />
                      ) : (
                        <line
                          x1={toPxX(0)}
                          y1={toPxY(room.width / 2)}
                          x2={toPxX(room.length)}
                          y2={toPxY(room.width / 2)}
                          stroke="#EF4444"
                          strokeWidth="1.2"
                          strokeDasharray="6,4"
                        />
                      )}
                      <rect
                        x={toPxX(room.length / 2) - 10}
                        y={toPxY(room.width / 2) - 16}
                        width="20"
                        height="32"
                        fill="url(#corrugatedSleeve)"
                        stroke="#334155"
                        strokeWidth="0.8"
                        rx="2"
                      />

                      <text
                        x={toPxX(room.length / 2)}
                        y={toPxY(room.width / 2) + 26}
                        textAnchor="middle"
                        className="text-[8px] font-bold fill-red-700 bg-white"
                      >
                        Deformatsion chok (Gofra)
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* 5. Architectural Double Walls */}
              <g className="walls-layer">
                {/* North Wall */}
                <rect
                  x={toPxX(0) - wallThickPx}
                  y={toPxY(0) - wallThickPx}
                  width={room.length * pxPerMeter + 2 * wallThickPx}
                  height={wallThickPx}
                  fill="url(#cadWallHatch)"
                  stroke="#1E293B"
                  strokeWidth="1.4"
                />
                {/* South Wall */}
                <rect
                  x={toPxX(0) - wallThickPx}
                  y={toPxY(room.width)}
                  width={room.length * pxPerMeter + 2 * wallThickPx}
                  height={wallThickPx}
                  fill="url(#cadWallHatch)"
                  stroke="#1E293B"
                  strokeWidth="1.4"
                />
                {/* West Wall */}
                <rect
                  x={toPxX(0) - wallThickPx}
                  y={toPxY(0)}
                  width={wallThickPx}
                  height={room.width * pxPerMeter}
                  fill="url(#cadWallHatch)"
                  stroke="#1E293B"
                  strokeWidth="1.4"
                />
                {/* East Wall */}
                <rect
                  x={toPxX(room.length)}
                  y={toPxY(0)}
                  width={wallThickPx}
                  height={room.width * pxPerMeter}
                  fill="url(#cadWallHatch)"
                  stroke="#1E293B"
                  strokeWidth="1.4"
                />
              </g>


              {/* 6. Architectural Windows */}
              {room.windows && room.windows.map((win, idx) => {
                const winPxX = toPxX(win.position_along_wall);
                const winPxWidth = win.width * pxPerMeter;
                const winPxY = toPxY(0) - wallThickPx;

                return (
                  <g key={win.id || idx} className="window-block">
                    <rect
                      x={winPxX}
                      y={winPxY}
                      width={winPxWidth}
                      height={wallThickPx}
                      fill="white"
                      stroke="#1E293B"
                      strokeWidth="1.2"
                    />
                    {/* Double Glass Glazing */}
                    <line x1={winPxX} y1={winPxY + wallThickPx * 0.38} x2={winPxX + winPxWidth} y2={winPxY + wallThickPx * 0.38} stroke="#0284C7" strokeWidth="1.2" />
                    <line x1={winPxX} y1={winPxY + wallThickPx * 0.65} x2={winPxX + winPxWidth} y2={winPxY + wallThickPx * 0.65} stroke="#0284C7" strokeWidth="1.2" />
                    {/* Window Sill */}
                    <rect x={winPxX - 4} y={toPxY(0) - 2} width={winPxWidth + 8} height="5" fill="#E2E8F0" stroke="#475569" strokeWidth="0.8" />
                    {/* Tag */}
                    <text
                      x={winPxX + winPxWidth / 2}
                      y={winPxY - 8}
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-sky-900 font-mono tracking-tight"
                    >
                      OK-{idx + 1}: {win.width}×{win.height}m (U={win.u_value})
                    </text>
                  </g>
                );
              })}

              {/* 7. Architectural Doors */}
              {room.doors && room.doors.map((door, idx) => {
                const doorPxX = toPxX(door.position_along_wall);
                const doorPxWidth = door.width * pxPerMeter;
                const doorPxY = toPxY(room.width);

                return (
                  <g key={door.id || idx} className="door-block">
                    <rect x={doorPxX} y={doorPxY} width={doorPxWidth} height={wallThickPx} fill="white" stroke="#1E293B" strokeWidth="1.2" />
                    <path
                      d={`M ${doorPxX} ${doorPxY} A ${doorPxWidth} ${doorPxWidth} 0 0 1 ${doorPxX + doorPxWidth} ${doorPxY - doorPxWidth}`}
                      fill="none"
                      stroke="#D97706"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />
                    <line x1={doorPxX} y1={doorPxY} x2={doorPxX} y2={doorPxY - doorPxWidth} stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" />
                    <text
                      x={doorPxX + doorPxWidth / 2}
                      y={doorPxY + wallThickPx + 14}
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-amber-900 font-mono"
                    >
                      D-{idx + 1}: {door.width}m ({door.door_type_display || "Eshik"})
                    </text>
                  </g>
                );
              })}

              {/* 8. Radiators Layer & Supply/Return Piping (T1 / T2) */}
              {showRadiators && room.radiators && room.radiators.map((rad, idx) => {
                const radX = toPxX(rad.position_x);
                const radY = toPxY(Math.min(0.18, rad.position_y || 0.15));
                const radLengthM = rad.catalog_item_details?.length_mm ? rad.catalog_item_details.length_mm / 1000 : 1.0;
                const radW = Math.max(64, radLengthM * pxPerMeter);
                const radH = 18;

                // Connecting pipes from manifold to radiator (T1 red & T2 blue)
                const mX = toPxX(manifoldPos.x);
                const mY = toPxY(manifoldPos.y);

                const badgeText = `${rad.catalog_item_details?.model_name || rad.custom_model_name || "Radiator"}: ${rad.calculated_actual_power_w} Vt`;
                const badgeW = Math.max(140, badgeText.length * 6.6 + 24);

                return (
                  <g key={rad.id || idx}>
                    {/* Radiator connecting pipelines (T1 supply & T2 return) */}
                    {showPipes && (
                      <g className="radiator-pipe-traces">
                        {/* T1: Supply (Qizil) */}
                        <path
                          d={`M ${mX} ${mY} L ${mX} ${radY - 14} L ${radX - radW / 2} ${radY - 14} L ${radX - radW / 2} ${radY}`}
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth="1.2"
                        />
                        {/* T2: Return (Ko'k) */}
                        <path
                          d={`M ${mX + 6} ${mY} L ${mX + 6} ${radY - 10} L ${radX + radW / 2} ${radY - 10} L ${radX + radW / 2} ${radY}`}
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="1.2"
                        />
                        <text
                          x={(mX + radX) / 2}
                          y={radY - 16}
                          textAnchor="middle"
                          className="text-[8px] font-bold fill-slate-700 font-mono"
                        >
                          T1/T2 Ø16×2.0 (PE-Xa)
                        </text>
                      </g>
                    )}

                    {/* Radiator Unit */}
                    <g className="radiator-unit">
                      {/* Brackets */}
                      <rect x={radX - radW / 2 + 10} y={radY - 4} width="6" height="4" fill="#475569" />
                      <rect x={radX + radW / 2 - 16} y={radY - 4} width="6" height="4" fill="#475569" />

                      {/* Body */}
                      <rect
                        x={radX - radW / 2}
                        y={radY}
                        width={radW}
                        height={radH}
                        fill="#FFFFFF"
                        stroke="#1E40AF"
                        strokeWidth="1.2"
                        rx="3"
                        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
                      />

                      {/* Internal Fins */}
                      {Array.from({ length: Math.floor(radW / 7) }).map((_, finIdx) => (
                        <line
                          key={finIdx}
                          x1={radX - radW / 2 + 6 + finIdx * 7}
                          y1={radY + 3}
                          x2={radX - radW / 2 + 6 + finIdx * 7}
                          y2={radY + radH - 3}
                          stroke="#94A3B8"
                          strokeWidth="0.8"
                        />
                      ))}

                      {/* Thermostatic Valve (Qizil termogolovka) */}
                      <circle cx={radX - radW / 2 - 4} cy={radY + radH / 2} r="4.5" fill="#DC2626" stroke="#991B1B" strokeWidth="1" />
                      {/* Return lockshield valve */}
                      <rect x={radX + radW / 2} y={radY + radH / 2 - 3.5} width="7" height="7" fill="#2563EB" rx="1.5" />

                      {/* Badge with auto-expanding width */}
                      <g transform={`translate(${radX}, ${radY + 30})`}>
                        <rect
                          x={-badgeW / 2}
                          y="-9"
                          width={badgeW}
                          height="18"
                          rx="4"
                          fill="white"
                          stroke="#2563EB"
                          strokeWidth="1.2"
                          filter="drop-shadow(0 1px 3px rgba(0,0,0,0.08))"
                        />
                        <text
                          x="0"
                          y="3.5"
                          textAnchor="middle"
                          className="text-[9px] font-bold fill-slate-900 font-mono"
                        >
                          {badgeText}
                        </text>
                      </g>
                    </g>
                  </g>
                );
              })}

              {/* 9. Sanitary Fixtures Layer (Unitaz, rakovina, dush, trap, V1/T3/K1) */}
              {showSanitary && sanitaryFixtures.map((fix) => {
                const fixX = toPxX(fix.x);
                const fixY = toPxY(fix.y);
                const fixW = fix.width * pxPerMeter;
                const fixL = fix.length * pxPerMeter;

                return (
                  <g key={fix.id} className="sanitary-fixture-group">
                    {fix.type === 'toilet' && (
                      <g transform={`translate(${fixX}, ${fixY})`}>
                        {/* Built-in Installation frame */}
                        <rect x="-18" y="-14" width="36" height="12" fill="#334155" stroke="#0F172A" strokeWidth="1.2" rx="2" />
                        <rect x="-6" y="-12" width="12" height="6" fill="#F8FAFC" stroke="#64748B" strokeWidth="0.8" rx="1" />
                        {/* Ceramic Toilet Bowl */}
                        <path d="M -14 0 C -14 24, 14 24, 14 0 Z" fill="#FFFFFF" stroke="#0284C7" strokeWidth="1.8" />
                        <ellipse cx="0" cy="5" rx="9" ry="12" fill="#F0F9FF" stroke="#0284C7" strokeWidth="1" />
                        {/* Sewer Pipe K1 Ø110 */}
                        <circle cx="0" cy="-6" r="5" fill="#64748B" />
                        {/* Cold Water B1 Ø16 */}
                        <circle cx="12" cy="-8" r="3" fill="#0284C7" />
                        <text x="0" y="32" textAnchor="middle" className="text-[8px] font-bold fill-slate-800 font-mono">
                          {fix.label}
                        </text>
                      </g>
                    )}

                    {fix.type === 'washbasin' && (
                      <g transform={`translate(${fixX}, ${fixY})`}>
                        {/* Basin Countertop & Bowl */}
                        <rect x={-fixW / 2} y={-fixL / 2} width={fixW} height={fixL} fill="#FFFFFF" stroke="#0284C7" strokeWidth="1.8" rx="6" />
                        <ellipse cx="0" cy="0" rx={fixW / 2 - 5} ry={fixL / 2 - 5} fill="#F0F9FF" stroke="#38BDF8" strokeWidth="1" />
                        {/* Mixer Faucet & Drain */}
                        <circle cx="0" cy={-fixL / 2 + 5} r="3" fill="#D97706" />
                        <circle cx="0" cy="0" r="2.5" fill="#64748B" />
                        <text x="0" y={fixL / 2 + 12} textAnchor="middle" className="text-[8px] font-bold fill-slate-800 font-mono">
                          {fix.label}
                        </text>
                      </g>
                    )}

                    {fix.type === 'shower' && (
                      <g transform={`translate(${fixX}, ${fixY})`}>
                        {/* Shower Tray with Diagonal Grid */}
                        <rect x={-fixW / 2} y={-fixL / 2} width={fixW} height={fixL} fill="#F8FAFC" stroke="#0284C7" strokeWidth="1.8" rx="4" />
                        <line x1={-fixW / 2} y1={-fixL / 2} x2={fixW / 2} y2={fixL / 2} stroke="#CBD5E1" strokeWidth="1" />
                        <line x1={fixW / 2} y1={-fixL / 2} x2={-fixW / 2} y2={fixL / 2} stroke="#CBD5E1" strokeWidth="1" />
                        {/* Central Shower Trap */}
                        <circle cx="0" cy="0" r="8" fill="#FFFFFF" stroke="#0284C7" strokeWidth="1.5" />
                        <circle cx="0" cy="0" r="4" fill="#0284C7" />
                        {/* Glass Partition */}
                        <line x1={-fixW / 2} y1={fixL / 2} x2={fixW / 2} y2={fixL / 2} stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
                        <text x="0" y={fixL / 2 + 14} textAnchor="middle" className="text-[8px] font-bold fill-slate-800 font-mono">
                          {fix.label}
                        </text>
                      </g>
                    )}

                    {fix.type === 'floor_drain' && (
                      <g transform={`translate(${fixX}, ${fixY})`}>
                        {/* Stainless Steel Floor Trap */}
                        <rect x="-8" y="-8" width="16" height="16" fill="#F1F5F9" stroke="#334155" strokeWidth="1.5" />
                        <circle cx="0" cy="0" r="5" fill="#38BDF8" stroke="#0284C7" strokeWidth="1" />
                        <line x1="-6" y1="0" x2="6" y2="0" stroke="#334155" strokeWidth="0.8" />
                        <line x1="0" y1="-6" x2="0" y2="6" stroke="#334155" strokeWidth="0.8" />
                        <text x="0" y="16" textAnchor="middle" className="text-[8px] font-bold fill-slate-700 font-mono">
                          {fix.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* 10. Manifold Cabinet (Коллекторный шкаф ШРВ) */}
              <g className="manifold-cabinet group">
                {/* Wall mounting cabinet casing (Clean Architectural CAD Style) */}
                <rect
                  x={toPxX(manifoldPos.x) - 28}
                  y={toPxY(manifoldPos.y) - 17}
                  width="56"
                  height="34"
                  fill="#F8FAFC"
                  stroke="#334155"
                  strokeWidth="1.2"
                  rx="4"
                  filter="drop-shadow(0 3px 6px rgba(0,0,0,0.14))"
                />
                {/* Inner cabinet backplate */}
                <rect
                  x={toPxX(manifoldPos.x) - 24}
                  y={toPxY(manifoldPos.y) - 13}
                  width="48"
                  height="26"
                  fill="#F1F5F9"
                  stroke="#94A3B8"
                  strokeWidth="0.8"
                  rx="2"
                />

                {/* Supply Header T1 (Qizil taroq + rotametrlar) */}
                <line
                  x1={toPxX(manifoldPos.x) - 18}
                  y1={toPxY(manifoldPos.y) - 6}
                  x2={toPxX(manifoldPos.x) + 18}
                  y2={toPxY(manifoldPos.y) - 6}
                  stroke="#EF4444"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                {/* Flowmeters pins */}
                {Array.from({ length: Math.min(6, Math.max(2, cadLoops.length * 2)) }).map((_, fIdx) => {
                  const count = Math.min(6, Math.max(2, cadLoops.length * 2));
                  const spacing = count > 1 ? 30 / (count - 1) : 0;
                  const pinX = toPxX(manifoldPos.x) - 15 + fIdx * spacing;
                  return (
                    <g key={fIdx}>
                      <line x1={pinX} y1={toPxY(manifoldPos.y) - 9} x2={pinX} y2={toPxY(manifoldPos.y) - 6} stroke="#EF4444" strokeWidth="1" />
                      <circle cx={pinX} cy={toPxY(manifoldPos.y) - 10} r="1.5" fill="#38BDF8" stroke="#0284C7" strokeWidth="0.5" />
                    </g>
                  );
                })}

                {/* Return Header T2 (Ko'k taroq) */}
                <line
                  x1={toPxX(manifoldPos.x) - 18}
                  y1={toPxY(manifoldPos.y) + 6}
                  x2={toPxX(manifoldPos.x) + 18}
                  y2={toPxY(manifoldPos.y) + 6}
                  stroke="#3B82F6"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />

                {/* Return valves */}
                {Array.from({ length: Math.min(6, Math.max(2, cadLoops.length * 2)) }).map((_, fIdx) => {
                  const count = Math.min(6, Math.max(2, cadLoops.length * 2));
                  const spacing = count > 1 ? 30 / (count - 1) : 0;
                  const pinX = toPxX(manifoldPos.x) - 15 + fIdx * spacing;
                  return (
                    <circle key={fIdx} cx={pinX} cy={toPxY(manifoldPos.y) + 6} r="1.8" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="1" />
                  );
                })}

                {/* Auto Air Vent & Drain Valve */}
                <circle cx={toPxX(manifoldPos.x) + 20} cy={toPxY(manifoldPos.y) - 6} r="2" fill="#D97706" />
                <circle cx={toPxX(manifoldPos.x) + 20} cy={toPxY(manifoldPos.y) + 6} r="2" fill="#D97706" />

                {/* Solid pill label with border (never transparently overlaps wall hatching) */}
                <g transform={`translate(${toPxX(manifoldPos.x)}, ${toPxY(manifoldPos.y) + 26})`}>
                  <rect
                    x="-55"
                    y="-8"
                    width="110"
                    height="16"
                    rx="4"
                    fill="#FFFFFF"
                    stroke="#0284C7"
                    strokeWidth="1"
                    filter="drop-shadow(0 1px 2px rgba(0,0,0,0.08))"
                  />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    className="text-[9px] font-bold fill-sky-950 font-mono tracking-tight"
                  >
                    Kollektor (ШРВ-{cadLoops.length})
                  </text>
                </g>
              </g>

              {/* 11. Architectural Dimensions Layer */}
              {showDimensions && (
                <g className="dimensions-layer">
                  {/* Top Length Dimension */}
                  <g>
                    <line
                      x1={toPxX(0)}
                      y1={toPxY(0) - wallThickPx - 26}
                      x2={toPxX(room.length)}
                      y2={toPxY(0) - wallThickPx - 26}
                      stroke="#334155"
                      strokeWidth="0.8"
                    />
                    <line x1={toPxX(0) - 4} y1={toPxY(0) - wallThickPx - 22} x2={toPxX(0) + 4} y2={toPxY(0) - wallThickPx - 30} stroke="#0F172A" strokeWidth="1.2" />
                    <line x1={toPxX(room.length) - 4} y1={toPxY(0) - wallThickPx - 22} x2={toPxX(room.length) + 4} y2={toPxY(0) - wallThickPx - 30} stroke="#0F172A" strokeWidth="1.2" />
                    <rect x={toPxX(room.length / 2) - 32} y={toPxY(0) - wallThickPx - 36} width="64" height="18" fill="white" rx="3" />
                    <text
                      x={toPxX(room.length / 2)}
                      y={toPxY(0) - wallThickPx - 23}
                      textAnchor="middle"
                      className="text-xs font-bold fill-slate-900 font-mono"
                    >
                      {room.length.toFixed(2)} m
                    </text>
                  </g>

                  {/* Left Width Dimension */}
                  <g>
                    <line
                      x1={toPxX(0) - wallThickPx - 26}
                      y1={toPxY(0)}
                      x2={toPxX(0) - wallThickPx - 26}
                      y2={toPxY(room.width)}
                      stroke="#334155"
                      strokeWidth="0.8"
                    />
                    <line x1={toPxX(0) - wallThickPx - 22} y1={toPxY(0) - 4} x2={toPxX(0) - wallThickPx - 30} y2={toPxY(0) + 4} stroke="#0F172A" strokeWidth="1.2" />
                    <line x1={toPxX(0) - wallThickPx - 22} y1={toPxY(room.width) - 4} x2={toPxX(0) - wallThickPx - 30} y2={toPxY(room.width) + 4} stroke="#0F172A" strokeWidth="1.2" />
                    <rect x={toPxX(0) - wallThickPx - 46} y={toPxY(room.width / 2) - 9} width="40" height="18" fill="white" rx="3" />
                    <text
                      x={toPxX(0) - wallThickPx - 26}
                      y={toPxY(room.width / 2) + 4}
                      textAnchor="middle"
                      className="text-xs font-bold fill-slate-900 font-mono"
                    >
                      {room.width.toFixed(2)} m
                    </text>
                  </g>
                </g>
              )}


              {/* 12. Engineering Drawing Stamp (ГОСТ / КМК Burchak Shtampi) */}
              <g transform={`translate(${toPxX(room.length) - 190}, ${toPxY(room.width) + wallThickPx + 30})`}>
                <rect x="0" y="0" width="190" height="60" fill="white" stroke="#1E293B" strokeWidth="1.5" />
                <line x1="0" y1="20" x2="190" y2="20" stroke="#1E293B" strokeWidth="1" />
                <line x1="0" y1="40" x2="190" y2="40" stroke="#1E293B" strokeWidth="1" />
                <line x1="95" y1="0" x2="95" y2="60" stroke="#1E293B" strokeWidth="1" />

                <text x="8" y="14" className="text-[9px] font-black fill-slate-900">SantexPro CAD v1.0</text>
                <text x="102" y="14" className="text-[9px] font-mono font-bold fill-blue-700">M 1:50 | Bosqich: P</text>
                <text x="8" y="32" className="text-[8px] font-medium fill-slate-700 truncate max-w-[80px]">{room.name}</text>
                <text x="102" y="32" className="text-[8px] font-mono fill-slate-800">S = {room.area} m²</text>
                <text x="8" y="52" className="text-[8px] font-semibold fill-emerald-800">KMK 2.04.05-97</text>
                <text x="102" y="52" className="text-[8px] font-mono fill-slate-500">Isitish va pol rejasi</text>
              </g>
            </g>
          )}

          {/* ============================================================== */}
          {/* VIEW MODE 2: 3D AXONOMETRIC SCHEME (ГОСТ 21.602 / KMK)         */}
          {/* ============================================================== */}
          {viewMode === '3d' && (
            <g className="view-mode-3d">
              {/* Axonometric Background */}
              <rect width="100%" height="100%" fill="#F8FAFC" />

              {/* Floor Slab Polygon */}
              {(() => {
                const f0 = getIso(0, 0, 0);
                const f1 = getIso(room.length, 0, 0);
                const f2 = getIso(room.length, room.width, 0);
                const f3 = getIso(0, room.width, 0);
                const pointsStr = `${f0.x},${f0.y} ${f1.x},${f1.y} ${f2.x},${f2.y} ${f3.x},${f3.y}`;

                return (
                  <g className="iso-floor">
                    {/* Floor Fill */}
                    <polygon points={pointsStr} fill="#FFFFFF" stroke="#94A3B8" strokeWidth="2" />
                    {/* Isometric Grid Lines */}
                    {Array.from({ length: Math.floor(room.length) + 1 }).map((_, i) => {
                      const pA = getIso(i, 0, 0);
                      const pB = getIso(i, room.width, 0);
                      return <line key={`gx-${i}`} x1={pA.x} y1={pA.y} x2={pB.x} y2={pB.y} stroke="#F1F5F9" strokeWidth="1" />;
                    })}
                    {Array.from({ length: Math.floor(room.width) + 1 }).map((_, j) => {
                      const pA = getIso(0, j, 0);
                      const pB = getIso(room.length, j, 0);
                      return <line key={`gy-${j}`} x1={pA.x} y1={pA.y} x2={pB.x} y2={pB.y} stroke="#F1F5F9" strokeWidth="1" />;
                    })}
                  </g>
                );
              })()}

              {/* 3D Vertical Wall Columns and Tops */}
              {(() => {
                const h = Math.min(room.height || 3.0, 3.2);
                const b0 = getIso(0, 0, 0);
                const b1 = getIso(room.length, 0, 0);
                const b2 = getIso(room.length, room.width, 0);
                const b3 = getIso(0, room.width, 0);

                const t0 = getIso(0, 0, h);
                const t1 = getIso(room.length, 0, h);
                const t2 = getIso(room.length, room.width, h);
                const t3 = getIso(0, room.width, h);

                return (
                  <g className="iso-walls">
                    {/* North-East Wall Panels (Transparent tinted) */}
                    <polygon
                      points={`${b0.x},${b0.y} ${b1.x},${b1.y} ${t1.x},${t1.y} ${t0.x},${t0.y}`}
                      fill="#E2E8F0"
                      fillOpacity="0.4"
                      stroke="#64748B"
                      strokeWidth="1.5"
                    />
                    <polygon
                      points={`${b0.x},${b0.y} ${b3.x},${b3.y} ${t3.x},${t3.y} ${t0.x},${t0.y}`}
                      fill="#CBD5E1"
                      fillOpacity="0.3"
                      stroke="#64748B"
                      strokeWidth="1.5"
                    />

                    {/* Wall Corner Risers */}
                    <line x1={b0.x} y1={b0.y} x2={t0.x} y2={t0.y} stroke="#334155" strokeWidth="2" />
                    <line x1={b1.x} y1={b1.y} x2={t1.x} y2={t1.y} stroke="#334155" strokeWidth="2" />
                    <line x1={b3.x} y1={b3.y} x2={t3.x} y2={t3.y} stroke="#334155" strokeWidth="2" />

                    {/* Wall Top Beam Lines */}
                    <line x1={t0.x} y1={t0.y} x2={t1.x} y2={t1.y} stroke="#334155" strokeWidth="2" strokeDasharray="4,2" />
                    <line x1={t0.x} y1={t0.y} x2={t3.x} y2={t3.y} stroke="#334155" strokeWidth="2" strokeDasharray="4,2" />
                  </g>
                );
              })()}

              {/* 3D Underfloor Pipe Coils (Laid flat on the isometric floor) */}
              {showUnderfloor && (
                <g className="iso-underfloor">
                  {cadLoops.map((loop) => {
                    const stepM = (loop.spacingMm || 150) / 1000;
                    const zLen = room.length / cadLoops.length;
                    const startX = (loop.circuitNumber - 1) * zLen + 0.25;
                    const endX = loop.circuitNumber * zLen - 0.25;

                    // Generate isometric pipe tracks
                    const isoTracks: string[] = [];
                    for (let xCur = startX; xCur <= endX - stepM; xCur += stepM * 2) {
                      const p1 = getIso(xCur, 0.3, 0.05);
                      const p2 = getIso(xCur, room.width - 0.3, 0.05);
                      const p3 = getIso(xCur + stepM, room.width - 0.3, 0.05);
                      const p4 = getIso(xCur + stepM, 0.3, 0.05);
                      isoTracks.push(`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y}`);
                    }

                    return (
                      <g key={`iso-loop-${loop.circuitNumber}`}>
                        <path
                          d={isoTracks.join(' ')}
                          fill="none"
                          stroke={loop.colorHex}
                          strokeWidth="1.3"
                          strokeLinecap="round"
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* 3D Manifold Cabinet with Risers */}
              {(() => {
                const mBase = getIso(manifoldPos.x, manifoldPos.y, 0);
                const mCabinetBottom = getIso(manifoldPos.x, manifoldPos.y, 0.35);
                const mCabinetTop = getIso(manifoldPos.x, manifoldPos.y, 0.85);

                return (
                  <g className="iso-manifold">
                    {/* Feed Pipes from floor up into cabinet */}
                    <line x1={mBase.x - 3} y1={mBase.y} x2={mCabinetBottom.x - 3} y2={mCabinetBottom.y} stroke="#EF4444" strokeWidth="1.6" />
                    <line x1={mBase.x + 3} y1={mBase.y} x2={mCabinetBottom.x + 3} y2={mCabinetBottom.y} stroke="#3B82F6" strokeWidth="1.6" />

                    {/* Manifold Cabinet Box in 3D */}
                    <rect
                      x={mCabinetBottom.x - 18}
                      y={mCabinetTop.y}
                      width="36"
                      height={mCabinetBottom.y - mCabinetTop.y}
                      fill="#0F172A"
                      stroke="#0284C7"
                      strokeWidth="1.2"
                      rx="3"
                    />

                    {/* Supply Header (Red) */}
                    <line
                      x1={mCabinetBottom.x - 14}
                      y1={mCabinetTop.y + 12}
                      x2={mCabinetBottom.x + 14}
                      y2={mCabinetTop.y + 12}
                      stroke="#EF4444"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    {/* Return Header (Blue) */}
                    <line
                      x1={mCabinetBottom.x - 14}
                      y1={mCabinetTop.y + 24}
                      x2={mCabinetBottom.x + 14}
                      y2={mCabinetTop.y + 24}
                      stroke="#3B82F6"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />


                    {/* Tag */}
                    <text
                      x={mCabinetBottom.x}
                      y={mCabinetTop.y - 6}
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-slate-900 font-mono"
                    >
                      ШРВ-{cadLoops.length} (h=+0.35m)
                    </text>
                  </g>
                );
              })()}

              {/* 3D Elevated Radiators on Walls */}
              {showRadiators && room.radiators && room.radiators.map((rad, idx) => {
                const rFloor = getIso(rad.position_x, rad.position_y, 0);
                const rBot = getIso(rad.position_x, rad.position_y, 0.15);
                const rTop = getIso(rad.position_x, rad.position_y, 0.75);
                const rWidthPx = 48;

                return (
                  <g key={`iso-rad-${idx}`}>
                    {/* Vertical Pipe Drops from Radiator to Floor */}
                    {showPipes && (
                      <g>
                        <line x1={rBot.x - rWidthPx / 2 + 4} y1={rBot.y} x2={rFloor.x - rWidthPx / 2 + 4} y2={rFloor.y} stroke="#EF4444" strokeWidth="2.2" />
                        <line x1={rBot.x + rWidthPx / 2 - 4} y1={rBot.y} x2={rFloor.x + rWidthPx / 2 - 4} y2={rFloor.y} stroke="#3B82F6" strokeWidth="2.2" />
                      </g>
                    )}

                    {/* Radiator Body Standing Vertically on Wall */}
                    <rect
                      x={rBot.x - rWidthPx / 2}
                      y={rTop.y}
                      width={rWidthPx}
                      height={rBot.y - rTop.y}
                      fill="#FFFFFF"
                      stroke="#1E40AF"
                      strokeWidth="2"
                      rx="3"
                      filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))"
                    />

                    {/* Fins */}
                    {[-14, -7, 0, 7, 14].map((off) => (
                      <line
                        key={off}
                        x1={rBot.x + off}
                        y1={rTop.y + 3}
                        x2={rBot.x + off}
                        y2={rBot.y - 3}
                        stroke="#94A3B8"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Valves */}
                    <circle cx={rBot.x - rWidthPx / 2 - 2} cy={(rTop.y + rBot.y) / 2} r="3.5" fill="#DC2626" />
                    <rect x={rBot.x + rWidthPx / 2 - 1} y={(rTop.y + rBot.y) / 2 - 3} width="5" height="6" fill="#2563EB" />

                    {/* Tag */}
                    <text
                      x={rBot.x}
                      y={rTop.y - 6}
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-blue-900 font-mono"
                    >
                      {rad.catalog_item_details?.model_name || rad.custom_model_name || "Rad"}: {rad.calculated_actual_power_w}W
                    </text>
                  </g>
                );
              })}

              {/* 3D Axonometric Stamp */}
              <g transform={`translate(${toPxX(room.length) - 200}, ${toPxY(room.width) + wallThickPx + 30})`}>
                <rect x="0" y="0" width="200" height="60" fill="white" stroke="#1E293B" strokeWidth="1.5" rx="3" />
                <text x="10" y="18" className="text-[10px] font-black fill-slate-900">SantexPro 3D Aksonometriya</text>
                <text x="10" y="34" className="text-[8px] font-semibold fill-indigo-700">KMK 2.04.05-97 / GOST 21.602</text>
                <text x="10" y="50" className="text-[8px] font-mono fill-slate-600">Burchak: 30°/30° Izometriya</text>
              </g>
            </g>
          )}
          </g>
        </svg>

        {/* Interactive Navigation HUD Hint */}
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-medium text-slate-600 shadow-sm flex items-center gap-2 select-none pointer-events-none z-10">
          <span className="flex items-center gap-1 font-semibold text-blue-600">
            <MousePointer className="w-3.5 h-3.5" />
            Navigatsiya:
          </span>
          <span>Touchpad 2 barmoq bilan masshtab (Pinch)</span>
          <span className="text-slate-300">•</span>
          <span>2 barmoq / bosib surish (Pan)</span>
          <span className="text-slate-300">•</span>
          <button 
            type="button"
            onClick={handleFitView}
            className="pointer-events-auto text-blue-600 hover:text-blue-800 font-bold underline ml-1 cursor-pointer"
          >
            Markazga moslash
          </button>
        </div>

        {/* Uponor Underfloor Heating System Specification Schedule (matching Page 5 PDF) */}
        {showCircuitTable && (
          <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl shadow-2xl p-4 max-w-md w-full animate-scale-in text-xs z-20">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                <span className="font-bold text-slate-900 text-xs">
                  Uponor underfloor heating system (T11-T12)
                </span>
              </div>
              <button 
                onClick={() => setShowCircuitTable(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-1.5 py-0.5 rounded hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Sizing Data Header (matching Page 5 of the PDF) */}
            <div className="my-2.5 p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[10px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Truba (Pipe):</span>
                <span className="font-bold text-slate-800">Uponor Wirsbo Q&E pePEX Ø16×2.0 mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Qadam (Spacing):</span>
                <span className="font-bold text-slate-800">{cadLoops[0]?.spacingMm || 150} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Haroratlar (Supply / Return):</span>
                <span className="font-bold text-slate-800">45 °C / 35 °C (ΔT = 10 K)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Kollektor (Manifold):</span>
                <span className="font-bold text-slate-800">{manifold?.name || `ШРВ-${cadLoops.length}`} (Uponor Pro Vario S)</span>
              </div>
            </div>

            <table className="w-full text-left mt-2 divide-y divide-slate-100">
              <thead className="text-[10px] text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-1.5">Kontur</th>
                  <th className="py-1.5">Maydon</th>
                  <th className="py-1.5">Uzunlik</th>
                  <th className="py-1.5">Sarf</th>
                  <th className="py-1.5">Sozlash (Adj)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {cadLoops.map((c) => {
                  const flow = Math.round(c.heatedAreaM2 * 50 * 3600 / (4186 * 10));
                  const adj = Number((Math.min(5.0, Math.max(1.5, (c.totalLengthM / 75.0) * 4.2))).toFixed(1));
                  return (
                    <tr key={c.circuitNumber} className="hover:bg-slate-50">
                      <td className="py-1.5 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.colorHex }}></span>
                        {c.name}
                      </td>
                      <td className="py-1.5">{c.heatedAreaM2} m²</td>
                      <td className="py-1.5 font-bold text-slate-900">{c.totalLengthM} m</td>
                      <td className="py-1.5 text-blue-700">{flow} l/h</td>
                      <td className="py-1.5 font-bold text-slate-700">{adj}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
              <span>Jami: <b>{cadLoops.reduce((sum, c) => sum + c.totalLengthM, 0)} m truba</b></span>
              <span className="font-mono font-bold text-blue-700">
                {cadLoops.reduce((sum, c) => sum + Math.round(c.heatedAreaM2 * 50 * 3600 / (4186 * 10)), 0)} l/h
              </span>
            </div>
          </div>
        )}

        {/* Pol Konstruksiyasi "Pirogi" Modali */}
        {showPirogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-scale-in text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Issiq Pol Konstruksiyasi "Pirogi"</h3>
                    <p className="text-[10px] text-slate-500">EN 1264 va KMK 2.04.05-97 standarti bo‘yicha</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPirogModal(false)}
                  className="text-slate-400 hover:text-slate-700 text-base font-bold"
                >
                  ✕
                </button>
              </div>

              {/* 7 Layers Graphic Stack */}
              <div className="space-y-1.5">
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-amber-600 text-white font-bold flex items-center justify-center text-[10px]">1</span>
                    <span className="font-bold text-amber-950">Toza pol qoplamasi (Kafel / Plitka / Laminat)</span>
                  </div>
                  <span className="font-mono font-bold text-amber-900 text-[11px]">15 mm</span>
                </div>

                <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-slate-600 text-white font-bold flex items-center justify-center text-[10px]">2</span>
                    <span className="font-bold text-slate-900">Sement-qum stajkasi (Plastifikator + Fibra)</span>
                  </div>
                  <span className="font-mono font-bold text-slate-700 text-[11px]">65 mm</span>
                </div>

                <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">3</span>
                    <span className="font-bold text-blue-950">Isitish trubasi (PE-Xa / PE-RT 16×2.0 mm)</span>
                  </div>
                  <span className="font-mono font-bold text-blue-900 text-[11px]">Ø16 mm</span>
                </div>

                <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">4</span>
                    <span className="font-bold text-indigo-950">Metall armatura to‘ri (100×100×4 mm)</span>
                  </div>
                  <span className="font-mono font-bold text-indigo-900 text-[11px]">Ø4 mm</span>
                </div>

                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">5</span>
                    <span className="font-bold text-emerald-950">Issiqlik izolyatsiyasi (Penopolistirol EPS-30)</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-900 text-[11px]">50 mm</span>
                </div>

                <div className="p-2.5 bg-cyan-50 rounded-xl border border-cyan-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-cyan-600 text-white font-bold flex items-center justify-center text-[10px]">6</span>
                    <span className="font-bold text-cyan-950">Gidro-bug‘ izolyatsiyasi (Polietilen plyonka)</span>
                  </div>
                  <span className="font-mono font-bold text-cyan-900 text-[11px]">0.2 mm</span>
                </div>

                <div className="p-2.5 bg-slate-200 rounded-xl border border-slate-400 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-slate-700 text-white font-bold flex items-center justify-center text-[10px]">7</span>
                    <span className="font-bold text-slate-900">Temir-beton orayopma plita (yoki zamin)</span>
                  </div>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">220 mm</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setShowPirogModal(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-xs"
                >
                  Tushundim
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Summary Bar */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">Konturlar:</span>
          {cadLoops.map((c) => (
            <button
              key={c.circuitNumber}
              onClick={() => setSelectedCircuit(selectedCircuit === c.circuitNumber ? null : c.circuitNumber)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedCircuit === c.circuitNumber 
                  ? 'bg-white shadow-xs border border-slate-300 text-slate-900' 
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.colorHex }} />
              {c.name}: {c.totalLengthM} m ({c.spacingMm} mm)
            </button>
          ))}
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          🔒 <span className="text-slate-700 font-semibold">Muhandislik me'yori:</span> Barcha radiatorlar derazalar ostiga, kollektor shkafi esa devor nishasiga qat'iy mahkamlangan (o'rni o'zgarmas).
        </div>
      </div>
    </div>
    </>
  );
};
