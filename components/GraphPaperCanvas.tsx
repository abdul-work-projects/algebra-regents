'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';

interface GraphPaperCanvasProps {
  /** Persisted drawing as a base64 data URL (or undefined for blank). */
  initialDrawing?: string;
  /** Called whenever the drawing changes (debounced via stroke-end). */
  onChange: (dataUrl: string) => void;
  /** Optional clear handler — receives no args; component clears its canvas internally and emits empty drawing. */
  onClear?: () => void;
}

const GRID_MINOR = 20; // px between minor grid lines
const GRID_MAJOR = 5;  // every Nth line is bold

type Tool = 'pen' | 'eraser';

const PEN_COLOR_OPTIONS = [
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Purple', value: '#a855f7' },
];
const PEN_SIZES = [2, 6] as const;
const ERASER_SIZES = [15, 35] as const;
const COLORS_THAT_NEED_WHITE_TEXT = ['#000000', '#3b82f6', '#a855f7', '#ef4444'];

export default function GraphPaperCanvas({ initialDrawing, onChange, onClear }: GraphPaperCanvasProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [penColor, setPenColor] = useState<string>(PEN_COLOR_OPTIONS[2].value); // Red default
  const [penSize, setPenSize] = useState<number>(PEN_SIZES[0]);
  const [eraserSize, setEraserSize] = useState<number>(ERASER_SIZES[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const loadedRef = useRef<string | undefined>(undefined);

  const blackOrWhite = theme === 'dark' ? { name: 'White', value: '#ffffff' } : { name: 'Black', value: '#000000' };
  const colorOptions = [...PEN_COLOR_OPTIONS, blackOrWhite];

  // ── Resize: paint grid + restore ink ─────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const grid = gridRef.current;
    const ink = inkRef.current;
    if (!container || !grid || !ink) return;

    // Resize both canvases (which wipes them) and redraw the grid background.
    // Caller is responsible for restoring ink content from a snapshot.
    const sizeAndPaintGrid = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);

      [grid, ink].forEach((c) => {
        c.width = w * dpr;
        c.height = h * dpr;
        c.style.width = `${w}px`;
        c.style.height = `${h}px`;
        const ctx = c.getContext('2d');
        ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      });

      const gctx = grid.getContext('2d');
      if (gctx) {
        gctx.clearRect(0, 0, w, h);
        gctx.fillStyle = '#ffffff';
        gctx.fillRect(0, 0, w, h);
        for (let x = 0; x <= w; x += GRID_MINOR) {
          const isMajor = (x / GRID_MINOR) % GRID_MAJOR === 0;
          gctx.strokeStyle = isMajor ? '#bbd7f0' : '#e5eef7';
          gctx.lineWidth = isMajor ? 1 : 0.5;
          gctx.beginPath();
          gctx.moveTo(x + 0.5, 0);
          gctx.lineTo(x + 0.5, h);
          gctx.stroke();
        }
        for (let y = 0; y <= h; y += GRID_MINOR) {
          const isMajor = (y / GRID_MINOR) % GRID_MAJOR === 0;
          gctx.strokeStyle = isMajor ? '#bbd7f0' : '#e5eef7';
          gctx.lineWidth = isMajor ? 1 : 0.5;
          gctx.beginPath();
          gctx.moveTo(0, y + 0.5);
          gctx.lineTo(w, y + 0.5);
          gctx.stroke();
        }
      }
    };

    const restoreInkFromDataUrl = (dataUrl: string | null) => {
      const ictx = ink.getContext('2d');
      if (!ictx || !dataUrl || dataUrl === 'data:,') return;
      const img = new Image();
      img.onload = () => {
        ictx.save();
        ictx.setTransform(1, 0, 0, 1, 0, 0);
        // Force normal compositing — the previous stroke might have left this set to 'destination-out' (eraser),
        // which would make drawImage subtract instead of paint and the canvas would appear empty.
        ictx.globalCompositeOperation = 'source-over';
        ictx.drawImage(img, 0, 0, ink.width, ink.height);
        ictx.restore();
      };
      img.src = dataUrl;
    };

    // Initial paint — load whatever was passed in via initialDrawing.
    sizeAndPaintGrid();
    if (initialDrawing) {
      loadedRef.current = initialDrawing;
      restoreInkFromDataUrl(initialDrawing);
    }

    // ResizeObserver: snapshot whatever is currently on the ink canvas, resize, restore.
    // Without this snapshot the user's strokes get wiped on every container resize.
    const observer = new ResizeObserver(() => {
      const snapshot = ink.toDataURL();
      sizeAndPaintGrid();
      restoreInkFromDataUrl(snapshot);
    });
    observer.observe(container);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload ink when initialDrawing changes externally (e.g. switching question).
  // Skip self-triggered updates (we already have the right pixels — reloading would briefly
  // wipe the canvas while the data URL re-decodes, causing a visible flicker).
  useEffect(() => {
    if (initialDrawing === loadedRef.current) return;
    const ink = inkRef.current;
    if (!ink) return;
    const ctx = ink.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ink.width, ink.height);
    ctx.restore();
    loadedRef.current = initialDrawing;
    if (initialDrawing) {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(img, 0, 0, ink.width, ink.height);
        ctx.restore();
      };
      img.src = initialDrawing;
    }
  }, [initialDrawing]);

  const getPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ): { x: number; y: number } => {
    const canvas = inkRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const t = e.touches[0] || e.changedTouches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    lastPoint.current = getPos(e);
  };

  const move = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Track cursor for eraser indicator (whether or not we're actively drawing).
    if (tool === 'eraser') setCursorPos(getPos(e));
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = inkRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const p = getPos(e);
    if (!lastPoint.current) {
      lastPoint.current = p;
      return;
    }

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = eraserSize;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penSize;
    }
    ctx.stroke();
    lastPoint.current = p;
  };

  const end = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    const canvas = inkRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      // Mark this as our own outgoing change so the [initialDrawing] reload effect skips it.
      loadedRef.current = dataUrl;
      onChange(dataUrl);
    }
  };

  const clear = () => {
    const canvas = inkRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      loadedRef.current = undefined;
      onChange('');
    }
    onClear?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar — matches the question drawing toolbar in app/quiz/page.tsx */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-950 shrink-0 relative">
        {/* Pen */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (tool === 'pen') setShowColorPicker((v) => !v);
              else { setTool('pen'); setShowColorPicker(false); }
            }}
            className={`relative p-1 rounded-md border-2 transition-all active:scale-95 ${
              tool === 'pen'
                ? 'shadow-sm'
                : 'bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:border-gray-400 dark:hover:border-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-800'
            }`}
            style={
              tool === 'pen'
                ? {
                    backgroundColor: penColor,
                    borderColor: theme === 'dark' ? '#525252' : penColor,
                    color: COLORS_THAT_NEED_WHITE_TEXT.includes(penColor) ? '#ffffff' : '#000000',
                  }
                : {}
            }
            title="Pen"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          {tool === 'pen' && (
            <div
              onClick={(e) => { e.stopPropagation(); setShowColorPicker((v) => !v); }}
              className="absolute bottom-0 right-0 cursor-pointer rounded-br-md"
              title="Change color"
              style={{ width: 0, height: 0, borderLeft: '10px solid transparent', borderBottom: `10px solid ${theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}` }}
            />
          )}
          {showColorPicker && tool === 'pen' && (
            <>
              <div className="fixed inset-0 z-[110]" onClick={() => setShowColorPicker(false)} />
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-600 rounded-lg shadow-xl p-1.5 z-[120]">
                <div className="flex items-center gap-1.5">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => { setPenColor(color.value); setShowColorPicker(false); }}
                      className={`w-6 h-6 rounded-md transition-all hover:scale-110 active:scale-95 ${
                        penColor === color.value
                          ? 'ring-2 ring-black dark:ring-white ring-offset-1 dark:ring-offset-neutral-800'
                          : 'border-2 border-gray-300 dark:border-neutral-600'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Eraser */}
        <button
          type="button"
          onClick={() => setTool(tool === 'eraser' ? 'pen' : 'eraser')}
          className={`p-1 rounded-md border-2 transition-all active:scale-95 ${
            tool === 'eraser'
              ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black'
              : 'bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-neutral-800'
          }`}
          title="Eraser"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.24,3.56L21.19,8.5C21.97,9.29 21.97,10.55 21.19,11.34L12,20.53C10.44,22.09 7.91,22.09 6.34,20.53L2.81,17C2.03,16.21 2.03,14.95 2.81,14.16L13.41,3.56C14.2,2.78 15.46,2.78 16.24,3.56M4.22,15.58L7.76,19.11C8.54,19.9 9.8,19.9 10.59,19.11L14.12,15.58L9.17,10.63L4.22,15.58Z" />
          </svg>
        </button>

        {/* Clear */}
        <button
          type="button"
          onClick={clear}
          className="p-1 rounded-md border-2 border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-300 hover:border-rose-500 dark:hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 active:scale-95 transition-all"
          title="Clear all"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.36,2.72L20.78,4.14L15.06,9.85C16.13,11.39 16.28,13.24 15.38,14.44L9.06,8.12C10.26,7.22 12.11,7.37 13.65,8.44L19.36,2.72M5.93,17.57C3.92,15.56 2.69,13.16 2.35,10.92L7.23,8.83L14.67,16.27L12.58,21.15C10.34,20.81 7.94,19.58 5.93,17.57Z" />
          </svg>
        </button>

        {/* Size buttons (S/L) */}
        <div className="flex items-center gap-1">
          {tool === 'pen'
            ? PEN_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPenSize(size)}
                  className={`px-1.5 py-0.5 rounded-md border-2 text-[10px] font-medium transition-all active:scale-95 ${
                    penSize === size
                      ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black'
                      : 'bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:border-black dark:hover:border-white'
                  }`}
                >
                  {size === 2 ? 'S' : 'L'}
                </button>
              ))
            : ERASER_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setEraserSize(size)}
                  className={`px-1.5 py-0.5 rounded-md border-2 text-[10px] font-medium transition-all active:scale-95 ${
                    eraserSize === size
                      ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black'
                      : 'bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:border-black dark:hover:border-white'
                  }`}
                >
                  {size === 15 ? 'S' : 'L'}
                </button>
              ))}
        </div>
      </div>

      {/* Canvas surface */}
      <div ref={containerRef} className="relative flex-1 min-h-0 overflow-hidden touch-none">
        <canvas ref={gridRef} className="absolute inset-0 pointer-events-none" />
        <canvas
          ref={inkRef}
          className="absolute inset-0"
          style={{
            cursor: tool === 'pen'
              ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(penColor)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'/%3E%3C/svg%3E") 3 21, auto`
              : 'none',
          }}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />

        {/* Custom circle cursor for the eraser */}
        {tool === 'eraser' && (
          <div
            className="pointer-events-none absolute rounded-full border-2 border-black dark:border-white bg-white dark:bg-neutral-400 bg-opacity-30 dark:bg-opacity-30"
            style={{
              left: `${cursorPos.x}px`,
              top: `${cursorPos.y}px`,
              width: `${eraserSize}px`,
              height: `${eraserSize}px`,
              transform: 'translate(-50%, -50%)',
              transition: 'width 0.1s, height 0.1s',
              zIndex: 9999,
            }}
          />
        )}
      </div>
    </div>
  );
}
