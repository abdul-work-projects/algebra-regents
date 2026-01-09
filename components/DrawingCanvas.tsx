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
        const width = rect.width;
        const height = rect.height;

        // Set both canvases to same size
        backgroundCanvas.width = width;
        backgroundCanvas.height = height;
        drawingCanvas.width = width;
        drawingCanvas.height = height;

        // Draw background image
        bgCtx.clearRect(0, 0, width, height);
        if (image.complete && image.naturalHeight !== 0) {
          bgCtx.drawImage(image, 0, 0, width, height);
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
      return () => {
        image.removeEventListener('load', handleImageLoad);
        image.removeEventListener('error', handleImageError);
      };
    }
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
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';
    } else {
      // Eraser mode - erase on the drawing canvas only
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 20;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    ctx.lineTo(x, y);
    ctx.stroke();
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

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 p-3 bg-gray-100 rounded-lg">
        <button
          onClick={() => setTool('pen')}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            tool === 'pen'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg
            className="w-5 h-5"
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
        </button>

        <button
          onClick={() => setTool('eraser')}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            tool === 'eraser'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Eraser
        </button>

        <div className="flex-1" />

        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className="px-3 py-2 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Undo
        </button>

        <button
          onClick={handleClear}
          className="px-3 py-2 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Canvas Container with Two Layers */}
      <div className="relative w-full bg-white rounded-lg overflow-hidden border-2 border-gray-200">
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
          className="absolute inset-0 w-full pointer-events-none"
          style={{ minHeight: '400px' }}
        />

        {/* Drawing canvas - for user drawings only */}
        <canvas
          ref={drawingCanvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="relative w-full cursor-crosshair touch-none"
          style={{ minHeight: '400px' }}
        />
      </div>
    </div>
  );
}
