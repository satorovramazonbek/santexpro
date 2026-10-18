/**
 * SantexPro CAD Drawing Engine
 * Professional HVAC / Plumbing 2D CAD and 3D Axonometric graphics generator
 * adhering to architectural and engineering standards (EN 1264, EN 12831, KMK 2.04.05-97, GOST 21.602).
 */

export interface CadPoint {
  x: number;
  y: number;
}

export interface CadPoint3D {
  x: number;
  y: number;
  z: number;
}

export interface CadLoop {
  circuitNumber: number;
  name: string;
  colorHex: string;
  supplyPathD: string;
  returnPathD: string;
  fullPathD: string;
  feederSupplyD: string;
  feederReturnD: string;
  feederCorrugatedD: string;
  tagPoint: CadPoint;
  stampPoint: CadPoint;
  totalLengthM: number;
  heatedAreaM2: number;
  spacingMm: number;
  isEdgeZone?: boolean;
}

export interface SanitaryFixture {
  id: string;
  name: string;
  type: 'toilet' | 'washbasin' | 'shower' | 'bath' | 'floor_drain' | 'bidet';
  x: number; // meters
  y: number;
  width: number;
  length: number;
  rotation: number;
  label: string;
}

/**
 * Standard 30° / 30° Engineering Isometric (Axonometric) Projection
 * Converts 3D meters (x, y, z) into 2D SVG pixel coordinates.
 */
export function projectIso(
  xM: number,
  yM: number,
  zM: number,
  originX: number,
  originY: number,
  scale: number
): { x: number; y: number } {
  const cos30 = Math.cos(Math.PI / 6); // ~0.8660
  const sin30 = Math.sin(Math.PI / 6); // 0.5

  const isoX = originX + (xM - yM) * cos30 * scale;
  const isoY = originY + (xM + yM) * sin30 * scale - zM * scale;

  return {
    x: Number(isoX.toFixed(1)),
    y: Number(isoY.toFixed(1)),
  };
}

/**
 * Generates an SVG path with smooth rounded corners (fillets) given a list of vertices.
 * Prevents sharp 90-degree corners and simulates natural pipe bending radius (5 x pipe diameter).
 */
export function createSmoothFilletedPath(points: CadPoint[], cornerRadius: number = 8): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 1; i < points.length - 1; i++) {
    const pPrev = points[i - 1];
    const pCurr = points[i];
    const pNext = points[i + 1];

    const v1 = { x: pPrev.x - pCurr.x, y: pPrev.y - pCurr.y };
    const v2 = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };

    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);

    if (len1 === 0 || len2 === 0) {
      d += ` L ${pCurr.x.toFixed(1)} ${pCurr.y.toFixed(1)}`;
      continue;
    }

    const r = Math.min(cornerRadius, len1 * 0.42, len2 * 0.42);

    const startX = pCurr.x + (v1.x / len1) * r;
    const startY = pCurr.y + (v1.y / len1) * r;

    const endX = pCurr.x + (v2.x / len2) * r;
    const endY = pCurr.y + (v2.y / len2) * r;

    d += ` L ${startX.toFixed(1)} ${startY.toFixed(1)}`;
    d += ` Q ${pCurr.x.toFixed(1)} ${pCurr.y.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;

  return d;
}

/**
 * Generates professional Uponor / Rehau style Bifilar Spiral (Улитка / Chig'anoq)
 * where supply (red) and return (blue) pipes run parallel with constant spacing `s`.
 * Returns separate supply and return vertices, and continuous full vertices.
 */
export function generateBifilarSpiralVertices(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  spacingM: number
): { supply: CadPoint[]; returnPts: CadPoint[]; full: CadPoint[] } {
  const step = spacingM * 2;
  const supply: CadPoint[] = [];
  const returnPts: CadPoint[] = [];

  let left = x0;
  let top = y0;
  let right = x1;
  let bottom = y1;

  // Spiral inward
  while (right - left >= 2.8 * spacingM && bottom - top >= 2.8 * spacingM) {
    // Supply track (clockwise)
    supply.push({ x: left, y: top });
    supply.push({ x: right, y: top });
    supply.push({ x: right, y: bottom });
    supply.push({ x: left + step, y: bottom });
    supply.push({ x: left + step, y: top + step });

    // Return track (unshifts to build reverse outward path)
    returnPts.unshift({ x: left + spacingM, y: top + spacingM });
    returnPts.unshift({ x: right - spacingM, y: top + spacingM });
    returnPts.unshift({ x: right - spacingM, y: bottom - spacingM });
    returnPts.unshift({ x: left + step + spacingM, y: bottom - spacingM });

    left += step;
    top += step;
    right -= step;
    bottom -= step;
  }

  // Smooth center turn connecting supply to return seamlessly
  const lastSupply = supply[supply.length - 1];
  const firstReturn = returnPts[0];

  let centerSupply: CadPoint[] = [];
  let centerReturn: CadPoint[] = [];

  if (lastSupply && firstReturn) {
    const midX = Number(((lastSupply.x + firstReturn.x) / 2).toFixed(3));
    const midY = Number(((lastSupply.y + firstReturn.y) / 2).toFixed(3));
    centerSupply = [{ x: midX, y: midY }];
    centerReturn = [{ x: midX, y: midY }];
  }

  const supplyFull = [...supply, ...centerSupply];
  const returnFull = [...centerReturn, ...returnPts];
  const full = [...supply, ...returnPts];
  return { supply: supplyFull, returnPts: returnFull, full };
}

/**
 * Generates High-precision Meander (Змейка / Ilon izi) pipe pattern.
 */
export function generateMeanderVertices(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  spacingM: number
): { supply: CadPoint[]; returnPts: CadPoint[]; full: CadPoint[] } {
  const points: CadPoint[] = [];
  const width = x1 - x0;
  const height = y1 - y0;

  if (width >= height) {
    let curY = y0;
    let sweepRight = true;
    while (curY <= y1) {
      if (sweepRight) {
        points.push({ x: x0, y: curY });
        points.push({ x: x1, y: curY });
      } else {
        points.push({ x: x1, y: curY });
        points.push({ x: x0, y: curY });
      }
      curY += spacingM;
      sweepRight = !sweepRight;
    }
  } else {
    let curX = x0;
    let sweepDown = true;
    while (curX <= x1) {
      if (sweepDown) {
        points.push({ x: curX, y: y0 });
        points.push({ x: curX, y: y1 });
      } else {
        points.push({ x: curX, y: y1 });
        points.push({ x: curX, y: y0 });
      }
      curX += spacingM;
      sweepDown = !sweepDown;
    }
  }

  return { supply: points, returnPts: [], full: points };
}

/**
 * Multi-circuit room layout generator with engineering offsets, expansion joints,
 * and clean feeder trunks with corrugated insulation to the manifold box.
 */
export function generateRoomCadCircuits(
  roomLength: number,
  roomWidth: number,
  numCircuits: number = 2,
  spacingMm: number = 150,
  pattern: 'spiral' | 'serpentine' = 'spiral',
  manifoldPos: { x: number; y: number } = { x: 0.5, y: 0.5 },
  toPxX: (m: number) => number,
  toPxY: (m: number) => number,
  pxPerMeter: number
): CadLoop[] {
  const spacingM = spacingMm / 1000;
  const wallOffsetM = 0.20; // 200mm from walls
  const loops: CadLoop[] = [];

  const PALETTE = [
    '#2563EB', // Blue
    '#DC2626', // Red
    '#059669', // Emerald
    '#D97706', // Amber
    '#9333EA', // Purple
    '#0891B2', // Cyan
  ];

  const splitAlongX = roomLength >= roomWidth;
  const n = Math.max(1, numCircuits);

  for (let i = 0; i < n; i++) {
    let zX0: number, zY0: number, zX1: number, zY1: number;

    if (splitAlongX) {
      const zoneLen = (roomLength - 2 * wallOffsetM) / n;
      zX0 = wallOffsetM + i * zoneLen + (i > 0 ? 0.05 : 0);
      zX1 = wallOffsetM + (i + 1) * zoneLen - (i < n - 1 ? 0.05 : 0);
      zY0 = wallOffsetM;
      zY1 = roomWidth - wallOffsetM;
    } else {
      const zoneW = (roomWidth - 2 * wallOffsetM) / n;
      zX0 = wallOffsetM;
      zX1 = roomLength - wallOffsetM;
      zY0 = wallOffsetM + i * zoneW + (i > 0 ? 0.05 : 0);
      zY1 = wallOffsetM + (i + 1) * zoneW - (i < n - 1 ? 0.05 : 0);
    }

    // Check if zone is adjacent to exterior window (Edge zone / Краевая зона)
    const isEdgeZone = zY0 <= wallOffsetM + 0.01;
    const effectiveSpacingM = isEdgeZone ? Math.max(0.10, spacingM * 0.8) : spacingM;

    // Generate metric points
    const res = pattern === 'spiral'
      ? generateBifilarSpiralVertices(zX0, zY0, zX1, zY1, effectiveSpacingM)
      : generateMeanderVertices(zX0, zY0, zX1, zY1, effectiveSpacingM);

    const metricPts = res.full;

    // Calculate physical length
    let physicalLengthM = 0;
    for (let k = 0; k < metricPts.length - 1; k++) {
      physicalLengthM += Math.hypot(
        metricPts[k + 1].x - metricPts[k].x,
        metricPts[k + 1].y - metricPts[k].y
      );
    }

    const distToManifold = Math.hypot(zX0 - manifoldPos.x, zY0 - manifoldPos.y);
    const totalLengthM = Math.round(physicalLengthM + distToManifold * 2);

    // Convert to pixel coordinates
    const pxPts = metricPts.map(p => ({ x: toPxX(p.x), y: toPxY(p.y) }));
    const pxSupply = res.supply.map(p => ({ x: toPxX(p.x), y: toPxY(p.y) }));
    const pxReturn = res.returnPts.map(p => ({ x: toPxX(p.x), y: toPxY(p.y) }));

    const cornerR = Math.max(5, Math.min(16, pxPerMeter * (effectiveSpacingM / 2.2)));
    const fullPathD = createSmoothFilletedPath(pxPts, cornerR);
    const supplyPathD = createSmoothFilletedPath(pxSupply, cornerR);
    const returnPathD = createSmoothFilletedPath(pxReturn, cornerR);

    // Feeder tracks from manifold to start & end of loop
    const loopStartPx = pxPts[0] || { x: toPxX(zX0), y: toPxY(zY0) };
    const loopEndPx = pxPts[pxPts.length - 1] || loopStartPx;
    const mPxX = toPxX(manifoldPos.x);
    const mPxY = toPxY(manifoldPos.y);

    const feederOffset = (i - (n - 1) / 2) * 10;
    const supplyFeederOffset = feederOffset - 3;
    const returnFeederOffset = feederOffset + 3;

    // Red supply feeder path (T11)
    const feederSupplyD = `M ${mPxX + supplyFeederOffset} ${mPxY} ` +
      `L ${mPxX + supplyFeederOffset} ${loopStartPx.y} ` +
      `L ${loopStartPx.x} ${loopStartPx.y}`;

    // Blue return feeder path (T12)
    const feederReturnD = `M ${mPxX + returnFeederOffset} ${mPxY} ` +
      `L ${mPxX + returnFeederOffset} ${loopEndPx.y} ` +
      `L ${loopEndPx.x} ${loopEndPx.y}`;

    // Corrugated protective sleeve around feeder where leaving manifold
    const feederCorrugatedD = `M ${mPxX + feederOffset - 6} ${mPxY + 10} ` +
      `L ${mPxX + feederOffset + 6} ${mPxY + 10} ` +
      `L ${mPxX + feederOffset + 6} ${mPxY + 36} ` +
      `L ${mPxX + feederOffset - 6} ${mPxY + 36} Z`;

    // Tag position in center of the zone
    const tagPoint: CadPoint = {
      x: toPxX((zX0 + zX1) / 2),
      y: toPxY((zY0 + zY1) / 2),
    };

    // Uponor circuit stamp in outer corner (matching PDF Page 5)
    const stampPoint: CadPoint = {
      x: toPxX(zX0 + 0.45),
      y: toPxY(zY1 - 0.35),
    };

    loops.push({
      circuitNumber: i + 1,
      name: `K-${i + 1}`,
      colorHex: PALETTE[i % PALETTE.length],
      supplyPathD,
      returnPathD,
      fullPathD,
      feederSupplyD,
      feederReturnD,
      feederCorrugatedD,
      tagPoint,
      stampPoint,
      totalLengthM,
      heatedAreaM2: Number(((zX1 - zX0) * (zY1 - zY0)).toFixed(2)),
      spacingMm: Math.round(effectiveSpacingM * 1000),
      isEdgeZone,
    });
  }

  return loops;
}

export interface UponorScheduleData {
  systemName: string;
  pipeSpec: string;
  spacingMm: number;
  supplyTempC: number;
  returnTempC: number;
  deltaTC: number;
  manifoldName: string;
  circuits: {
    circuitNumber: number;
    name: string;
    areaM2: number;
    pipeLengthM: number;
    flowRateLh: number;
    valveSetting: number;
  }[];
}

export function getUponorScheduleData(
  roomName: string,
  cadLoops: CadLoop[],
  heatDemandW: number = 1800
): UponorScheduleData {
  const avgSpacing = cadLoops[0]?.spacingMm || 150;
  const totalArea = cadLoops.reduce((sum, l) => sum + l.heatedAreaM2, 0) || 15.0;
  const specificOutput = Math.round(heatDemandW / Math.max(1, totalArea));

  return {
    systemName: 'Uponor underfloor heating system (T11-T12)',
    pipeSpec: 'Uponor Wirsbo Q&E pePEX Ø16×2.0 mm',
    spacingMm: avgSpacing,
    supplyTempC: 45,
    returnTempC: 35,
    deltaTC: 10,
    manifoldName: `ШРВ-${cadLoops.length} (Uponor Pro Vario S)`,
    circuits: cadLoops.map((l) => {
      const circuitPowerW = Math.round(l.heatedAreaM2 * specificOutput);
      const flowLh = Math.round((circuitPowerW * 3600) / (4186 * 10));
      const valveSetting = Number((Math.min(5.0, Math.max(1.5, (l.totalLengthM / 75.0) * 4.2))).toFixed(1));
      return {
        circuitNumber: l.circuitNumber,
        name: `K-${l.circuitNumber}`,
        areaM2: l.heatedAreaM2,
        pipeLengthM: l.totalLengthM,
        flowRateLh: Math.max(25, flowLh),
        valveSetting,
      };
    }),
  };
}

/**
 * Standard Sanitary Fixtures Generator for Bathrooms & Kitchens
 */
export function getStandardSanitaryFixtures(
  roomType: string,
  roomLength: number,
  roomWidth: number
): SanitaryFixture[] {
  const isSanuzel = /vanna|hammom|sanuzel|hojat|tualet|yuvinish|bathroom|toilet/i.test(roomType);
  const isKitchen = /oshxona|kuxnya|kitchen/i.test(roomType);

  if (!isSanuzel && !isKitchen) return [];

  if (isKitchen) {
    return [
      {
        id: 'kitchen_sink',
        name: 'Oshxona rakovinasi',
        type: 'washbasin',
        x: Math.min(roomLength - 0.8, 1.2),
        y: 0.45,
        width: 0.6,
        length: 0.8,
        rotation: 0,
        label: 'Moyka (B1+T3+K1)',
      },
      {
        id: 'floor_drain',
        name: 'Avariya trapi',
        type: 'floor_drain',
        x: roomLength / 2,
        y: roomWidth / 2,
        width: 0.15,
        length: 0.15,
        rotation: 0,
        label: 'Trap Ø50',
      },
    ];
  }

  // Complete Bathroom Suite
  const fixtures: SanitaryFixture[] = [
    {
      id: 'wc_wall_hung',
      name: 'Osma unitaz (Installyatsiya)',
      type: 'toilet',
      x: Math.min(roomLength - 0.7, 0.9),
      y: 0.4,
      width: 0.4,
      length: 0.6,
      rotation: 0,
      label: 'Unitaz (B1 + K1 Ø110)',
    },
    {
      id: 'washbasin',
      name: 'Qo‘lyuvgich (Rakovina)',
      type: 'washbasin',
      x: Math.min(roomLength - 0.7, 2.0),
      y: 0.4,
      width: 0.5,
      length: 0.7,
      rotation: 0,
      label: 'Rakovina (B1+T3+K1)',
    },
    {
      id: 'shower_tray',
      name: 'Dush zonasi va trap',
      type: 'shower',
      x: Math.max(0.6, roomLength - 1.0),
      y: Math.max(0.6, roomWidth - 1.0),
      width: 0.9,
      length: 0.9,
      rotation: 0,
      label: 'Dush (Trap Ø50 + B1+T3)',
    },
    {
      id: 'floor_trap',
      name: 'Pol trapi (Zanglamas po‘lat)',
      type: 'floor_drain',
      x: roomLength / 2,
      y: roomWidth / 2,
      width: 0.15,
      length: 0.15,
      rotation: 0,
      label: 'Trap Ø50 (Suv to‘siq)',
    },
  ];

  return fixtures;
}
