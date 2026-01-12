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
        const containerWidth = rect.width;

        // Calculate height based on image aspect ratio
        let canvasWidth = containerWidth;
        let canvasHeight = 500; // Default height

        if (image.complete && image.naturalHeight !== 0) {
          const aspectRatio = image.naturalWidth / image.naturalHeight;
          canvasHeight = containerWidth / aspectRatio;
          // Set a minimum and maximum height
          canvasHeight = Math.max(300, Math.min(canvasHeight, 800));
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
      ctx.strokeStyle = '#22c55e'; // Green color
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
      {/* Toolbar - Duolingo Style */}
      <div className="flex items-center gap-1.5 mb-3">
        <button
          onClick={() => setTool('pen')}
          className={`p-1.5 rounded-lg border-2 transition-all active:scale-95 ${
            tool === 'pen'
              ? 'bg-green-500 border-green-500 text-white'
              : 'bg-white border-gray-300 text-gray-700 hover:border-green-500 hover:bg-green-50'
          }`}
          title="Pen"
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
        </button>

        <button
          onClick={() => setTool('eraser')}
          className={`px-2.5 py-1.5 rounded-lg border-2 text-xs font-medium transition-all active:scale-95 ${
            tool === 'eraser'
              ? 'bg-black border-black text-white'
              : 'bg-white border-gray-300 text-gray-700 hover:border-black hover:bg-gray-100'
          }`}
          title="Eraser"
        >
          Eraser
        </button>

        <div className="flex-1" />

        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className="px-2.5 py-1.5 rounded-lg border-2 border-gray-300 bg-white text-xs font-medium text-gray-700 hover:border-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
          title="Undo"
        >
          Undo
        </button>

        <button
          onClick={handleClear}
          className="px-2.5 py-1.5 rounded-lg border-2 border-gray-300 bg-white text-xs font-medium text-gray-700 hover:border-rose-500 hover:bg-rose-50 active:scale-95 transition-all"
          title="Clear all"
        >
          Clear
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
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
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
          className={`relative touch-none ${tool === 'pen' ? 'cursor-pointer' : 'cursor-cell'}`}
          style={{ width: '100%', display: 'block', minHeight: '300px', maxHeight: '800px' }}
        />
      </div>
    </div>
  );
}
