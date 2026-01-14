'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * DrawingCanvas Component
 *
 * Provides a two-layer canvas system for drawing scratch work on question images:
 * - Background layer: Displays the question image (protected from erasing)
 * - Drawing layer: Transparent layer for user drawings (pen/eraser work here)
 *
 * Features:
 * - Pen tool for drawing
 * - Eraser tool (only affects drawings, not the image)
 * - Undo functionality
 * - Clear all drawings
 * - Touch and mouse support for mobile and desktop
 * - Automatic persistence via localStorage
 */

interface DrawingCanvasProps {
  imageUrl: string;
  initialDrawing?: string; // Base64 encoded previous drawing to restore
  onDrawingChange: (dataUrl: string) => void; // Callback when drawing changes
}

type Tool = 'pen' | 'eraser';

export default function DrawingCanvas({
  imageUrl,
  initialDrawing,
  onDrawingChange,
}: DrawingCanvasProps) {
  // Canvas refs: Two separate layers for background image and user drawings
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [history, setHistory] = useState<string[]>([]); // Stack of canvas states for undo
  const [canUndo, setCanUndo] = useState(false);
  const [penSize, setPenSize] = useState(2);
  const [eraserSize, setEraserSize] = useState(20);
  const [penColor, setPenColor] = useState('#22c55e'); // Default green
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  /**
   * Initialize both canvas layers when image loads
   * - Background canvas: Draws the question image
   * - Drawing canvas: Loads any previous drawings from localStorage
   */
  useEffect(() => {
    const backgroundCanvas = backgroundCanvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    const image = imageRef.current;
    if (!backgroundCanvas || !drawingCanvas || !image) return;

    const bgCtx = backgroundCanvas.getContext('2d');
    const drawCtx = drawingCanvas.getContext('2d');
    if (!bgCtx || !drawCtx) return;

    const loadImage = () => {
      const container = backgroundCanvas.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        const containerWidth = rect.width;

        // Calculate height based on image aspect ratio
        let canvasWidth = containerWidth;
        let canvasHeight = 500; // Default height

        if (image.complete && image.naturalHeight !== 0) {
          const aspectRatio = image.naturalWidth / image.naturalHeight;
          canvasHeight = containerWidth / aspectRatio;
          // No constraints - let the aspect ratio determine the height naturally
        }

        // Set both canvases to same size
        backgroundCanvas.width = canvasWidth;
        backgroundCanvas.height = canvasHeight;
        drawingCanvas.width = canvasWidth;
        drawingCanvas.height = canvasHeight;

        // Draw background image maintaining aspect ratio
        bgCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        if (image.complete && image.naturalHeight !== 0) {
          bgCtx.drawImage(image, 0, 0, canvasWidth, canvasHeight);
        }

        // Load initial drawing if provided
        if (initialDrawing) {
          const img = new Image();
          img.onload = () => {
            drawCtx.drawImage(img, 0, 0);
          };
          img.src = initialDrawing;
        }
      }
    };

    const handleImageLoad = () => {
      if (image.complete && image.naturalHeight !== 0) {
        loadImage();
      }
    };

    const handleImageError = () => {
      console.warn('Image failed to load:', imageUrl);
      // Still initialize the canvas even if image fails
      const container = backgroundCanvas.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        backgroundCanvas.width = rect.width;
        backgroundCanvas.height = rect.height;
        drawingCanvas.width = rect.width;
        drawingCanvas.height = rect.height;
      }
    };

    if (image.complete && image.naturalHeight !== 0) {
      loadImage();
    } else {
      image.addEventListener('load', handleImageLoad);
      image.addEventListener('error', handleImageError);
    }

    // Add resize listener to recalculate canvas size on viewport changes
    const handleResize = () => {
      if (image.complete && image.naturalHeight !== 0) {
        // Save current drawing before resizing
        const currentDrawing = drawingCanvas.toDataURL();
        loadImage();
        // Restore drawing after resize
        if (currentDrawing && currentDrawing !== 'data:,') {
          const img = new Image();
          img.onload = () => {
            const drawCtx = drawingCanvas.getContext('2d');
            if (drawCtx) {
              drawCtx.drawImage(img, 0, 0, drawingCanvas.width, drawingCanvas.height);
            }
          };
          img.src = currentDrawing;
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      image.removeEventListener('load', handleImageLoad);
      image.removeEventListener('error', handleImageError);
      window.removeEventListener('resize', handleResize);
    };
  }, [imageUrl, initialDrawing]);

  /**
   * Save current drawing state to history for undo functionality
   * Also triggers localStorage save via onDrawingChange callback
   */
  const saveToHistory = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL();
    setHistory((prev) => [...prev, dataUrl]);
    setCanUndo(true);
    onDrawingChange(dataUrl);
  };

  /**
   * Get accurate coordinates from mouse or touch events
   * Handles different canvas scaling and positioning
   */
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    if (tool === 'pen') {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';
    } else {
      // Eraser mode - erase on the drawing canvas only
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = eraserSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleMouseMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    // Update cursor position for eraser visual
    if (tool === 'eraser') {
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        const touch = e.touches[0];
        setCursorPosition({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
      } else {
        setCursorPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }

    // Call draw for both pen and eraser
    draw(e);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;

    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Remove last state
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    setCanUndo(newHistory.length > 0);

    // Clear drawing canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Restore previous state if exists
    if (newHistory.length > 0) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = newHistory[newHistory.length - 1];
    }

    onDrawingChange(newHistory.length > 0 ? newHistory[newHistory.length - 1] : '');
  };

  const handleClear = () => {
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
    setCanUndo(false);
    onDrawingChange('');
  };

  const colors = [
    { name: 'Green', value: '#22c55e' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Black', value: '#000000' },
  ];

  return (
    <div className="w-full">
      {/* Toolbar - Compact Single Row */}
      <div className="flex items-center gap-1.5 mb-3">
        {/* Pen Tool with Integrated Color Picker */}
        <div className="relative">
          {/* Unified Pen Button */}
          <button
            onClick={(e) => {
              if (tool === 'pen') {
                // If already pen, toggle color picker
                setShowColorPicker(!showColorPicker);
              } else {
                // If not pen, select pen tool
                setTool('pen');
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (tool === 'pen') {
                setShowColorPicker(true);
              }
            }}
            className={`relative p-1.5 rounded-lg border-2 transition-all active:scale-95 ${
              tool === 'pen'
                ? 'border-2 text-white'
                : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
            }`}
            style={tool === 'pen' ? { backgroundColor: penColor, borderColor: penColor } : {}}
            title="Pen (click again to change color)"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>

            {/* Small triangle indicator when pen is selected */}
            {tool === 'pen' && (
              <div className="absolute bottom-0 right-0 w-0 h-0 border-l-4 border-l-transparent border-b-4 border-b-white" />
            )}
          </button>

          {/* Color Picker Popup - Minimal Horizontal Dropup */}
          {showColorPicker && tool === 'pen' && (
            <>
              {/* Backdrop to close popup */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowColorPicker(false)}
              />
              {/* Popup Content */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl p-1.5 z-20">
                {/* Arrow pointing down */}
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 rotate-45" />

                {/* Horizontal color swatches */}
                <div className="flex items-center gap-1.5">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => {
                        setPenColor(color.value);
                        setShowColorPicker(false);
                      }}
                      className={`w-7 h-7 rounded-md transition-all hover:scale-110 active:scale-95 ${
                        penColor === color.value ? 'ring-2 ring-black ring-offset-1' : 'border-2 border-gray-300'
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

        {/* Eraser Button */}
        <button
          onClick={() => setTool('eraser')}
          className={`p-1.5 rounded-lg border-2 transition-all active:scale-95 ${
            tool === 'eraser'
              ? 'bg-black border-black text-white'
              : 'bg-white border-gray-300 text-gray-700 hover:border-black hover:bg-gray-100'
          }`}
          title="Eraser"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M16.24,3.56L21.19,8.5C21.97,9.29 21.97,10.55 21.19,11.34L12,20.53C10.44,22.09 7.91,22.09 6.34,20.53L2.81,17C2.03,16.21 2.03,14.95 2.81,14.16L13.41,3.56C14.2,2.78 15.46,2.78 16.24,3.56M4.22,15.58L7.76,19.11C8.54,19.9 9.8,19.9 10.59,19.11L14.12,15.58L9.17,10.63L4.22,15.58Z" />
          </svg>
        </button>

        {/* Size Buttons */}
        <div className="flex items-center gap-1">
          {tool === 'pen' ? (
            <>
              {[2, 4, 6, 8].map((size) => (
                <button
                  key={size}
                  onClick={() => setPenSize(size)}
                  className={`px-2 py-1 rounded-lg border-2 text-xs font-medium transition-all active:scale-95 ${
                    penSize === size
                      ? 'bg-black border-black text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-black hover:bg-gray-100'
                  }`}
                >
                  {size === 2 ? 'S' : size === 4 ? 'M' : size === 6 ? 'L' : 'XL'}
                </button>
              ))}
            </>
          ) : (
            <>
              {[10, 20, 30, 40].map((size) => (
                <button
                  key={size}
                  onClick={() => setEraserSize(size)}
                  className={`px-2 py-1 rounded-lg border-2 text-xs font-medium transition-all active:scale-95 ${
                    eraserSize === size
                      ? 'bg-black border-black text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-black hover:bg-gray-100'
                  }`}
                >
                  {size === 10 ? 'S' : size === 20 ? 'M' : size === 30 ? 'L' : 'XL'}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="flex-1" />

        {/* Undo Button */}
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className="p-1.5 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:border-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
          title="Undo"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12.5,8C9.85,8 7.45,9 5.6,10.6L2,7V16H11L7.38,12.38C8.77,11.22 10.54,10.5 12.5,10.5C16.04,10.5 19.05,12.81 20.1,16L22.47,15.22C21.08,11.03 17.15,8 12.5,8Z" />
          </svg>
        </button>

        {/* Clear Button */}
        <button
          onClick={handleClear}
          className="p-1.5 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:border-rose-500 hover:bg-rose-50 active:scale-95 transition-all"
          title="Clear all"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M19.36,2.72L20.78,4.14L15.06,9.85C16.13,11.39 16.28,13.24 15.38,14.44L9.06,8.12C10.26,7.22 12.11,7.37 13.65,8.44L19.36,2.72M5.93,17.57C3.92,15.56 2.69,13.16 2.35,10.92L7.23,8.83L14.67,16.27L12.58,21.15C10.34,20.81 7.94,19.58 5.93,17.57Z" />
          </svg>
        </button>
      </div>

      {/* Canvas Container with Two Layers */}
      <div className="relative w-full bg-white rounded overflow-hidden border border-gray-200">
        {/* Hidden image element for loading */}
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Question"
          className="hidden"
        />

        {/* Background canvas - shows the question image */}
        <canvas
          ref={backgroundCanvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: 'auto' }}
        />

        {/* Drawing canvas - for user drawings only */}
        <canvas
          ref={drawingCanvasRef}
          onMouseDown={startDrawing}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={handleMouseMove}
          onTouchEnd={stopDrawing}
          className="relative touch-none"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            cursor: tool === 'pen'
              ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'/%3E%3C/svg%3E") 0 20, auto`
              : 'none'
          }}
        />

        {/* Custom Eraser Cursor */}
        {tool === 'eraser' && (
          <div
            className="pointer-events-none absolute rounded-full border-2 border-black bg-white bg-opacity-30"
            style={{
              left: `${cursorPosition.x}px`,
              top: `${cursorPosition.y}px`,
              width: `${eraserSize}px`,
              height: `${eraserSize}px`,
              transform: 'translate(-50%, -50%)',
              transition: 'width 0.1s, height 0.1s',
            }}
          />
        )}
      </div>
    </div>
  );
}
