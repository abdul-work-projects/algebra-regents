'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { GraphData, GraphLine, GraphPoint, DEFAULT_GRAPH_DATA, LINE_COLORS, ActiveLine } from './types';

// We need to import JSXGraph dynamically since it requires window
declare global {
  interface Window {
    JXG: any;
  }
}

interface GraphingToolProps {
  initialData?: GraphData;
  onChange: (data: GraphData) => void;
}

export default function GraphingTool({ initialData, onChange }: GraphingToolProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeLine, setActiveLine] = useState<ActiveLine>('line1');
  const [isDashed, setIsDashed] = useState(false);
  const [shadeMode, setShadeMode] = useState<'above' | 'below' | null>(null);
  const [isShadeClickMode, setIsShadeClickMode] = useState(false);
  const [graphData, setGraphData] = useState<GraphData>(initialData || DEFAULT_GRAPH_DATA);
  const [pointCounts, setPointCounts] = useState({ line1: 0, line2: 0 });

  // Track JSXGraph objects
  const pointsRef = useRef<{ [lineId: string]: any[] }>({ line1: [], line2: [] });
  const linesRef = useRef<{ [lineId: string]: any }>({});
  const shadesRef = useRef<{ [lineId: string]: any[] }>({ line1: [], line2: [] });
  const regionShadesRef = useRef<any[]>([]);

  // Use refs to track current state for click handler (avoids stale closure)
  const activeLineRef = useRef<ActiveLine>('line1');
  const isDashedRef = useRef(false);
  const setActiveLineRef = useRef(setActiveLine);
  const setPointCountsRef = useRef(setPointCounts);
  const shadeModeRef = useRef<'above' | 'below' | null>(null);

  // Keep refs in sync with state and setters
  useEffect(() => {
    activeLineRef.current = activeLine;
  }, [activeLine]);

  useEffect(() => {
    isDashedRef.current = isDashed;
  }, [isDashed]);

  useEffect(() => {
    setActiveLineRef.current = setActiveLine;
    setPointCountsRef.current = setPointCounts;
  });

  useEffect(() => {
    shadeModeRef.current = shadeMode;
  }, [shadeMode]);

  // Ref for shade click mode
  const isShadeClickModeRef = useRef(false);
  useEffect(() => {
    isShadeClickModeRef.current = isShadeClickMode;
  }, [isShadeClickMode]);

  // Ref for addRegionShade function
  const addRegionShadeRef = useRef<(x: number, y: number) => void>(() => {});

  // Ref for updateGraphData to avoid circular dependency
  const updateGraphDataRef = useRef<() => void>(() => {});

  // Load JSXGraph script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.JXG) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsxgraph@1.8.0/distrib/jsxgraphcore.js';
      script.async = true;
      script.onload = () => setIsLoaded(true);
      document.head.appendChild(script);

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/jsxgraph@1.8.0/distrib/jsxgraph.css';
      document.head.appendChild(link);
    } else if (window.JXG) {
      setIsLoaded(true);
    }
  }, []);

  // Initialize board
  useEffect(() => {
    if (!isLoaded || !containerRef.current || boardRef.current) return;

    const JXG = window.JXG;
    const bounds = graphData.gridBounds;

    boardRef.current = JXG.JSXGraph.initBoard(containerRef.current.id, {
      // Bounding box: [xMin, yMax, xMax, yMin] with small padding
      boundingbox: [bounds.xMin - 1, bounds.yMax + 1, bounds.xMax + 1, bounds.yMin - 1],
      showCopyright: false,
      showNavigation: false,
      keepAspectRatio: true,
      zoom: {
        enabled: false,
      },
      pan: {
        enabled: false,
      },
      defaultAxes: {
        x: {
          ticks: {
            ticksDistance: 1,
            minorTicks: 0,
          },
        },
        y: {
          ticks: {
            ticksDistance: 1,
            minorTicks: 0,
          },
        },
      },
      grid: {
        majorStep: 1,
      },
    });

    // Create axes manually for better control
    boardRef.current.create('axis', [[0, 0], [1, 0]], {
      ticks: { ticksDistance: 1, minorTicks: 0 },
    });
    boardRef.current.create('axis', [[0, 0], [0, 1]], {
      ticks: { ticksDistance: 1, minorTicks: 0 },
    });

    // Create grid with 1-unit spacing
    boardRef.current.create('grid', [], {
      majorStep: 1,
      minorElements: 0,
      strokeColor: '#e0e0e0',
      strokeWidth: 1,
    });

    // Restore existing data
    if (initialData) {
      initialData.lines.forEach((line) => {
        line.points.forEach((point) => {
          addPointToBoard(line.id as ActiveLine, point.x, point.y, point.isOpen, line.isDashed);
        });
        if (line.shade) {
          updateShade(line.id as ActiveLine, line.shade);
        }
      });
    }

    // Click handler to add points or shade regions
    boardRef.current.on('down', (e: any) => {
      const coords = boardRef.current.getUsrCoordsOfMouse(e);
      const x = coords[0];
      const y = coords[1];

      // If in shade click mode, add shading to the clicked region
      if (isShadeClickModeRef.current) {
        addRegionShadeRef.current(x, y);
        return;
      }

      // Get all JSXGraph objects under the mouse click
      const objectsUnderMouse = boardRef.current.getAllObjectsUnderMouse(e);

      // Check if we clicked on a point or line
      for (const obj of objectsUnderMouse) {
        if (obj.elType === 'point' || obj.elType === 'line') {
          // Get the stroke color to determine which line
          const strokeColor = obj.getAttribute('strokeColor') || '';
          const normalizedColor = strokeColor.toLowerCase().trim();
          const blue = LINE_COLORS.line1.toLowerCase();
          const red = LINE_COLORS.line2.toLowerCase();

          if (normalizedColor === blue) {
            activeLineRef.current = 'line1';
            setActiveLineRef.current('line1');
          } else if (normalizedColor === red) {
            activeLineRef.current = 'line2';
            setActiveLineRef.current('line2');
          }

          // Return early - we selected an existing element, don't add new points
          return;
        }
      }

      // Clamp to valid grid range (snap to nearest valid point if clicking outside)
      const clampedX = Math.max(bounds.xMin, Math.min(bounds.xMax, Math.round(x)));
      const clampedY = Math.max(bounds.yMin, Math.min(bounds.yMax, Math.round(y)));

      // Use refs for current values (avoids stale closure)
      let currentLine = activeLineRef.current;
      const currentDashed = isDashedRef.current;

      // Auto-switch: if line 1 is complete, switch to line 2
      if (pointsRef.current.line1.length >= 2 && currentLine === 'line1') {
        currentLine = 'line2';
        activeLineRef.current = 'line2';
        setActiveLineRef.current('line2');
      }

      const points = pointsRef.current[currentLine];

      // Max 2 points per line, max 4 points total
      if (points.length >= 2) return;

      addPointToBoard(currentLine, clampedX, clampedY, false, currentDashed);
    });

    return () => {
      if (boardRef.current) {
        window.JXG.JSXGraph.freeBoard(boardRef.current);
        boardRef.current = null;
      }
    };
  }, [isLoaded]);

  const addPointToBoard = useCallback((lineId: ActiveLine, x: number, y: number, isOpen: boolean, dashed: boolean) => {
    if (!boardRef.current) return;

    const JXG = window.JXG;
    const color = LINE_COLORS[lineId];
    const points = pointsRef.current[lineId];

    // Create point
    const point = boardRef.current.create('point', [x, y], {
      name: '',
      size: 4,
      strokeColor: color,
      fillColor: isOpen ? '#ffffff' : color,
      strokeWidth: 2,
      fixed: false,
      snapToGrid: true,
    });

    // Store which line this point belongs to
    point.lineId = lineId;

    // Update graph data on drag
    point.on('drag', () => {
      updateGraphData();
    });

    points.push(point);

    // Update point counts for UI
    setPointCountsRef.current(prev => ({
      ...prev,
      [lineId]: points.length,
    }));

    // If we have 2 points, create/update line
    if (points.length === 2) {
      updateLine(lineId, dashed);
    }

    updateGraphData();
  }, []);

  const updateLine = useCallback((lineId: ActiveLine, dashed: boolean) => {
    if (!boardRef.current) return;

    const points = pointsRef.current[lineId];
    if (points.length < 2) return;

    const color = LINE_COLORS[lineId];

    // Remove existing line
    if (linesRef.current[lineId]) {
      boardRef.current.removeObject(linesRef.current[lineId]);
    }

    // Create extended line through two points
    const line = boardRef.current.create('line', [points[0], points[1]], {
      strokeColor: color,
      strokeWidth: 2,
      dash: dashed ? 2 : 0,
      straightFirst: true,
      straightLast: true,
    });

    // Store which line this belongs to for click detection
    line.lineId = lineId;

    linesRef.current[lineId] = line;
  }, []);

  const updateShade = useCallback((lineId: ActiveLine, direction: 'above' | 'below' | null) => {
    if (!boardRef.current) return;

    const line = linesRef.current[lineId];
    if (!line) return;

    // Remove existing shades for this line
    shadesRef.current[lineId].forEach((shade: any) => {
      if (shade) boardRef.current.removeObject(shade);
    });
    shadesRef.current[lineId] = [];

    if (!direction) return;

    const points = pointsRef.current[lineId];
    if (points.length < 2) return;

    const color = LINE_COLORS[lineId];

    // Create inequality
    const ineq = boardRef.current.create('inequality', [line], {
      inverse: direction === 'below',
      fillColor: color,
      fillOpacity: 0.2,
    });

    shadesRef.current[lineId].push(ineq);
  }, []);

  // Add shading to a specific clicked region
  const addRegionShade = useCallback((x: number, y: number) => {
    if (!boardRef.current) return;

    const bounds = graphData.gridBounds;
    const lines = [linesRef.current.line1, linesRef.current.line2].filter(Boolean);

    if (lines.length === 0) return;

    // For each line, determine which side the click is on
    const sides: { line: any; above: boolean; lineId: string }[] = [];

    (['line1', 'line2'] as ActiveLine[]).forEach((lineId) => {
      const line = linesRef.current[lineId];
      if (!line) return;

      const points = pointsRef.current[lineId];
      if (points.length < 2) return;

      const x1 = points[0].X();
      const y1 = points[0].Y();
      const x2 = points[1].X();
      const y2 = points[1].Y();

      // Calculate which side of the line the point is on
      // (y2-y1)(x-x1) - (x2-x1)(y-y1) > 0 means above
      const value = (y2 - y1) * (x - x1) - (x2 - x1) * (y - y1);
      sides.push({ line, above: value > 0, lineId });
    });

    // Create a unique color based on the region
    const regionColor = sides.length === 2 ? '#8b5cf6' : LINE_COLORS[sides[0]?.lineId as ActiveLine] || '#3b82f6';

    // Check if we already have a shade at this region - toggle it off if so
    const existingIndex = regionShadesRef.current.findIndex((shade) => {
      if (!shade || !shade.regionData) return false;
      return sides.every((s, i) => shade.regionData[i]?.above === s.above);
    });

    if (existingIndex >= 0) {
      // Remove existing shade and its hidden points
      const shade = regionShadesRef.current[existingIndex];
      if (shade.hiddenPoints) {
        shade.hiddenPoints.forEach((p: any) => {
          try { boardRef.current.removeObject(p); } catch (e) {}
        });
      }
      try { boardRef.current.removeObject(shade); } catch (e) {}
      regionShadesRef.current.splice(existingIndex, 1);
      updateGraphDataRef.current();
      return;
    }

    // Create shading for the clicked region
    if (sides.length === 1) {
      // For single line, use inequality
      const ineq = boardRef.current.create('inequality', [sides[0].line], {
        inverse: sides[0].above,
        fillColor: regionColor,
        fillOpacity: 0.25,
      });
      ineq.regionData = sides;
      regionShadesRef.current.push(ineq);
    } else if (sides.length === 2) {
      // For two lines, find intersection and create a polygon for the quadrant
      const line1Points = pointsRef.current.line1;
      const line2Points = pointsRef.current.line2;

      const x1a = line1Points[0].X(), y1a = line1Points[0].Y();
      const x1b = line1Points[1].X(), y1b = line1Points[1].Y();
      const x2a = line2Points[0].X(), y2a = line2Points[0].Y();
      const x2b = line2Points[1].X(), y2b = line2Points[1].Y();

      // Use larger bounds to ensure shading extends to edges
      const pad = 2;
      const bx1 = bounds.xMin - pad, bx2 = bounds.xMax + pad;
      const by1 = bounds.yMin - pad, by2 = bounds.yMax + pad;

      // Function to check which side of a line a point is on
      const getSide1 = (px: number, py: number) => (y1b - y1a) * (px - x1a) - (x1b - x1a) * (py - y1a) > 0;
      const getSide2 = (px: number, py: number) => (y2b - y2a) * (px - x2a) - (x2b - x2a) * (py - y2a) > 0;
      const inClickedQuadrant = (px: number, py: number) => getSide1(px, py) === sides[0].above && getSide2(px, py) === sides[1].above;

      // Get line intersection with bounding box edges
      const getLineEdgePoints = (xa: number, ya: number, xb: number, yb: number) => {
        const pts: { x: number; y: number }[] = [];
        const dx = xb - xa, dy = yb - ya;

        if (Math.abs(dx) > 0.0001) {
          // Intersect with left edge (x = bx1)
          const t1 = (bx1 - xa) / dx;
          const y1 = ya + t1 * dy;
          if (y1 >= by1 && y1 <= by2) pts.push({ x: bx1, y: y1 });

          // Intersect with right edge (x = bx2)
          const t2 = (bx2 - xa) / dx;
          const y2 = ya + t2 * dy;
          if (y2 >= by1 && y2 <= by2) pts.push({ x: bx2, y: y2 });
        }

        if (Math.abs(dy) > 0.0001) {
          // Intersect with bottom edge (y = by1)
          const t3 = (by1 - ya) / dy;
          const x3 = xa + t3 * dx;
          if (x3 >= bx1 && x3 <= bx2) pts.push({ x: x3, y: by1 });

          // Intersect with top edge (y = by2)
          const t4 = (by2 - ya) / dy;
          const x4 = xa + t4 * dx;
          if (x4 >= bx1 && x4 <= bx2) pts.push({ x: x4, y: by2 });
        }

        return pts;
      };

      // Find line intersection point
      const d = (x1a - x1b) * (y2a - y2b) - (y1a - y1b) * (x2a - x2b);
      let intersectX = 0, intersectY = 0;
      if (Math.abs(d) > 0.0001) {
        const t = ((x1a - x2a) * (y2a - y2b) - (y1a - y2a) * (x2a - x2b)) / d;
        intersectX = x1a + t * (x1b - x1a);
        intersectY = y1a + t * (y1b - y1a);
      }

      // Collect all candidate points
      const allPoints: { x: number; y: number }[] = [];

      // Add intersection point if within bounds
      if (intersectX >= bx1 && intersectX <= bx2 && intersectY >= by1 && intersectY <= by2) {
        allPoints.push({ x: intersectX, y: intersectY });
      }

      // Add corners that are in the clicked quadrant
      const corners = [
        { x: bx1, y: by1 }, { x: bx2, y: by1 },
        { x: bx2, y: by2 }, { x: bx1, y: by2 },
      ];
      corners.forEach(c => {
        if (inClickedQuadrant(c.x, c.y)) allPoints.push(c);
      });

      // Add line1 edge intersections that are on the correct side of line2
      getLineEdgePoints(x1a, y1a, x1b, y1b).forEach(p => {
        if (getSide2(p.x, p.y) === sides[1].above) allPoints.push(p);
      });

      // Add line2 edge intersections that are on the correct side of line1
      getLineEdgePoints(x2a, y2a, x2b, y2b).forEach(p => {
        if (getSide1(p.x, p.y) === sides[0].above) allPoints.push(p);
      });

      // Remove duplicates
      const uniquePoints = allPoints.filter((p, i) =>
        allPoints.findIndex(q => Math.abs(q.x - p.x) < 0.01 && Math.abs(q.y - p.y) < 0.01) === i
      );

      if (uniquePoints.length >= 3) {
        // Sort points by angle from centroid
        const cx = uniquePoints.reduce((s, p) => s + p.x, 0) / uniquePoints.length;
        const cy = uniquePoints.reduce((s, p) => s + p.y, 0) / uniquePoints.length;
        uniquePoints.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));

        // Create polygon with invisible points
        const polygonPoints = uniquePoints.map(p =>
          boardRef.current.create('point', [p.x, p.y], { visible: false, withLabel: false })
        );
        const polygon = boardRef.current.create('polygon', polygonPoints, {
          fillColor: regionColor,
          fillOpacity: 0.3,
          strokeWidth: 0,
          borders: { visible: false },
          vertices: { visible: false },
        });

        polygon.regionData = sides;
        polygon.hiddenPoints = polygonPoints;
        regionShadesRef.current.push(polygon);
      }
    }

    updateGraphDataRef.current();
  }, [graphData.gridBounds]);

  // Keep addRegionShadeRef in sync
  useEffect(() => {
    addRegionShadeRef.current = addRegionShade;
  }, [addRegionShade]);

  const handleAddPoint = useCallback((x: number, y: number) => {
    const points = pointsRef.current[activeLine];

    // Max 2 points per line
    if (points.length >= 2) return;

    addPointToBoard(activeLine, x, y, false, isDashed);
  }, [activeLine, isDashed, addPointToBoard]);

  const updateGraphData = useCallback(() => {
    const newLines: GraphLine[] = [];

    (['line1', 'line2'] as ActiveLine[]).forEach((lineId) => {
      const points = pointsRef.current[lineId];
      if (points.length > 0) {
        const line = linesRef.current[lineId];
        const shades = shadesRef.current[lineId];

        // Get shade direction from first shade if exists
        let shadeDirection: 'above' | 'below' | null = null;
        if (shades && shades.length > 0 && shades[0]) {
          try {
            shadeDirection = shades[0].getAttribute('inverse') ? 'below' : 'above';
          } catch (e) {
            // Shade may be invalid
          }
        }

        newLines.push({
          id: lineId,
          color: LINE_COLORS[lineId],
          isDashed: line ? line.getAttribute('dash') > 0 : false,
          points: points.map((p: any) => ({
            x: Math.round(p.X()),
            y: Math.round(p.Y()),
            isOpen: p.getAttribute('fillColor') === '#ffffff',
          })),
          shade: shadeDirection,
        });
      }
    });

    const newData: GraphData = {
      lines: newLines,
      gridBounds: graphData.gridBounds,
    };

    setGraphData(newData);
    onChange(newData);
  }, [graphData.gridBounds, onChange]);

  // Keep updateGraphDataRef in sync
  useEffect(() => {
    updateGraphDataRef.current = updateGraphData;
  }, [updateGraphData]);

  const clearLine = useCallback((lineId: ActiveLine) => {
    if (!boardRef.current) return;

    // Remove points
    pointsRef.current[lineId].forEach((p) => {
      try {
        boardRef.current.removeObject(p);
      } catch (e) {
        // Point may already be removed
      }
    });
    pointsRef.current[lineId] = [];

    // Update point counts for UI
    setPointCounts(prev => ({
      ...prev,
      [lineId]: 0,
    }));

    // Remove line
    if (linesRef.current[lineId]) {
      try {
        boardRef.current.removeObject(linesRef.current[lineId]);
      } catch (e) {
        // Line may already be removed
      }
      linesRef.current[lineId] = null;
    }

    // Remove shades for this line
    shadesRef.current[lineId].forEach((shade: any) => {
      if (shade) {
        try {
          boardRef.current.removeObject(shade);
        } catch (e) {
          // Shade may already be removed
        }
      }
    });
    shadesRef.current[lineId] = [];

    // Remove region shades that involve this line
    regionShadesRef.current = regionShadesRef.current.filter((shade) => {
      if (!shade) return false;
      if (shade.regionData?.some((s: any) => s.lineId === lineId)) {
        // Remove hidden points first
        if (shade.hiddenPoints) {
          shade.hiddenPoints.forEach((p: any) => {
            try { boardRef.current.removeObject(p); } catch (e) {}
          });
        }
        try {
          boardRef.current.removeObject(shade);
        } catch (e) {
          // Shade may already be removed
        }
        return false;
      }
      return true;
    });

    // If clearing line1, switch to line1 so user can redraw it
    if (lineId === 'line1') {
      activeLineRef.current = 'line1';
      setActiveLine('line1');
    }

    updateGraphData();
  }, [updateGraphData]);

  const handleToggleDashed = useCallback(() => {
    const newDashed = !isDashed;
    setIsDashed(newDashed);

    // Update existing line if present
    if (linesRef.current[activeLine]) {
      linesRef.current[activeLine].setAttribute({ dash: newDashed ? 2 : 0 });
      updateGraphData();
    }
  }, [isDashed, activeLine, updateGraphData]);

  const clearAllShades = useCallback(() => {
    if (!boardRef.current) return;

    // Clear region shades
    regionShadesRef.current.forEach((shade) => {
      if (shade) {
        // Remove hidden points first
        if (shade.hiddenPoints) {
          shade.hiddenPoints.forEach((p: any) => {
            try { boardRef.current.removeObject(p); } catch (e) {}
          });
        }
        try {
          boardRef.current.removeObject(shade);
        } catch (e) {
          // Shade may already be removed
        }
      }
    });
    regionShadesRef.current = [];

    // Clear line shades
    (['line1', 'line2'] as ActiveLine[]).forEach((lineId) => {
      shadesRef.current[lineId].forEach((shade: any) => {
        if (shade) {
          try {
            boardRef.current.removeObject(shade);
          } catch (e) {
            // Shade may already be removed
          }
        }
      });
      shadesRef.current[lineId] = [];
    });

    setShadeMode(null);
    updateGraphData();
  }, [updateGraphData]);

  const handleTogglePointType = useCallback(() => {
    const points = pointsRef.current[activeLine];
    if (points.length === 0) return;

    // Check if first point is currently open
    const firstPoint = points[0];
    const currentFill = firstPoint.getAttribute('fillColor');
    const isCurrentlyOpen = currentFill === '#ffffff';

    // Toggle all points on the line together
    points.forEach((point: any) => {
      point.setAttribute({
        fillColor: isCurrentlyOpen ? LINE_COLORS[activeLine] : '#ffffff',
      });
    });

    updateGraphData();
  }, [activeLine, updateGraphData]);

  // Get the active line's color for styling
  const activeBorderClass = activeLine === 'line1' ? 'border-blue-500' : 'border-red-500';

  return (
    <div className="flex flex-col h-full">
      {/* Compact Toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        {/* Line Style - Solid/Dashed icons */}
        <button
          onClick={handleToggleDashed}
          className={`w-7 h-5 rounded border transition-all flex items-center justify-center ${
            isDashed ? `border-gray-600 bg-gray-100` : 'border-gray-300 bg-white hover:border-gray-400'
          }`}
          title={isDashed ? 'Dashed (click for solid)' : 'Solid (click for dashed)'}
        >
          <svg className="w-4 h-1" viewBox="0 0 20 4">
            {isDashed ? (
              <>
                <line x1="0" y1="2" x2="4" y2="2" stroke={activeLine === 'line1' ? '#3b82f6' : '#ef4444'} strokeWidth="2" />
                <line x1="8" y1="2" x2="12" y2="2" stroke={activeLine === 'line1' ? '#3b82f6' : '#ef4444'} strokeWidth="2" />
                <line x1="16" y1="2" x2="20" y2="2" stroke={activeLine === 'line1' ? '#3b82f6' : '#ef4444'} strokeWidth="2" />
              </>
            ) : (
              <line x1="0" y1="2" x2="20" y2="2" stroke={activeLine === 'line1' ? '#3b82f6' : '#ef4444'} strokeWidth="2" />
            )}
          </svg>
        </button>

        {/* Point Style - Open/Closed */}
        <button
          onClick={handleTogglePointType}
          className="w-5 h-5 rounded border border-gray-300 bg-white hover:border-gray-400 transition-all flex items-center justify-center"
          title="Toggle endpoint (filled/hollow)"
        >
          <div className={`w-2.5 h-2.5 rounded-full border-2 ${activeBorderClass}`} />
        </button>

        <div className="w-px h-4 bg-gray-300" />

        {/* Shade region mode toggle */}
        <button
          onClick={() => setIsShadeClickMode(!isShadeClickMode)}
          className={`h-5 px-1.5 rounded border transition-all flex items-center justify-center gap-1 text-[10px] font-medium ${
            isShadeClickMode
              ? 'border-purple-500 bg-purple-100 text-purple-700'
              : 'border-gray-300 bg-white hover:border-gray-400 text-gray-600'
          }`}
          title={isShadeClickMode ? 'Shade mode ON - click regions to shade/unshade' : 'Click to enable shade mode'}
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v10H7V7z" fillOpacity="0.3" />
            <path d="M7 7h10v10H7V7z" />
          </svg>
          <span>Shade</span>
        </button>

        {/* Clear shades button */}
        <button
          onClick={clearAllShades}
          className="h-5 px-1.5 rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center text-[10px] font-medium"
          title="Clear all shading"
        >
          <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v10H7V7z" fillOpacity="0.5" />
          </svg>
        </button>

        <div className="flex-1" />

        {/* Clear current line */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!boardRef.current) return;

            const lineId = activeLine;

            // Remove points
            pointsRef.current[lineId].forEach((p) => {
              try { boardRef.current.removeObject(p); } catch (e) {}
            });
            pointsRef.current[lineId] = [];

            // Remove line
            if (linesRef.current[lineId]) {
              try { boardRef.current.removeObject(linesRef.current[lineId]); } catch (e) {}
              linesRef.current[lineId] = null;
            }

            // Remove shades
            shadesRef.current[lineId].forEach((shade: any) => {
              if (shade) try { boardRef.current.removeObject(shade); } catch (e) {}
            });
            shadesRef.current[lineId] = [];

            // Remove region shades involving this line
            regionShadesRef.current = regionShadesRef.current.filter((shade) => {
              if (!shade) return false;
              if (shade.regionData?.some((s: any) => s.lineId === lineId)) {
                if (shade.hiddenPoints) {
                  shade.hiddenPoints.forEach((p: any) => {
                    try { boardRef.current.removeObject(p); } catch (e) {}
                  });
                }
                try { boardRef.current.removeObject(shade); } catch (e) {}
                return false;
              }
              return true;
            });

            // Update state
            setPointCounts(prev => ({ ...prev, [lineId]: 0 }));
            if (lineId === 'line1') {
              activeLineRef.current = 'line1';
              setActiveLine('line1');
            }

            // Force board to update
            boardRef.current.update();

            // Trigger data update
            updateGraphDataRef.current();
          }}
          className="h-5 px-1.5 rounded border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-400 transition-all flex items-center justify-center gap-0.5 text-[10px] font-medium"
          title="Clear current line"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Clear</span>
        </button>
      </div>

      {/* Graph Area - Square container for 1:1 aspect ratio */}
      <div className="flex-1 relative bg-white flex items-center justify-center p-2">
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-gray-500 text-sm">Loading...</div>
          </div>
        )}
        <div
          id="jsxgraph-container"
          ref={containerRef}
          className="bg-white"
          style={{
            width: 'min(100%, 450px)',
            height: 'min(100%, 450px)',
            aspectRatio: '1 / 1',
          }}
        />
      </div>

      {/* Compact hint */}
      <div className={`px-2 py-1 border-t border-gray-200 text-[10px] text-center ${
        isShadeClickMode ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-400'
      }`}>
        {isShadeClickMode ? 'Click a region to shade/unshade it' : `Click to place points (${activeLine === 'line1' ? 'Line 1' : 'Line 2'})`}
      </div>
    </div>
  );
}
