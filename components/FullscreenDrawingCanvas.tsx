'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * FullscreenDrawingCanvas Component
 *
 * Provides a fullscreen drawing canvas that fills the entire container
 * Allows drawing anywhere on the screen as background layer
 */

interface FullscreenDrawingCanvasProps {
  initialDrawing?: string;
  onDrawingChange: (dataUrl: string) => void;
  tool: 'pen' | 'eraser' | null;
  penSize: number;
  eraserSize: number;
  penColor: string;
  onUndo: () => void;
  onClear: () => void;
  canUndo: boolean;
}

type Tool = 'pen' | 'eraser' | null;

export default function FullscreenDrawingCanvas({
  initialDrawing,
  onDrawingChange,
  tool,
  penSize,
  eraserSize,
  penColor,
  onUndo,
  onClear,
  canUndo,
}: FullscreenDrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const initializedRef = useRef(false);
  const loadedDrawingRef = useRef<string | undefined>(undefined);

  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  // Helper to resize canvas buffer to match container + DPR, then restore drawing
  const resizeCanvas = (canvas: HTMLCanvasElement, container: HTMLDivElement, drawing?: string) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (drawing && drawing !== 'data:,') {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      };
      img.src = drawing;
    }
  };

  // Initialize canvas to fill container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) return;

    // Only load initialDrawing on first mount
    if (!initializedRef.current) {
      initializedRef.current = true;
      loadedDrawingRef.current = initialDrawing;
      resizeCanvas(canvas, container, initialDrawing);
    }

    // Handle resize / zoom — capture at current buffer resolution, then redraw
    const handleResize = () => {
      const currentDrawing = canvas.toDataURL();
      resizeCanvas(canvas, container, currentDrawing);
    };

    window.addEventListener('resize', handleResize);

    // Also observe the container so the canvas re-fits when the surrounding
    // content shrinks/grows (e.g. navigating between a long and short question).
    const observer = new ResizeObserver(() => handleResize());
    observer.observe(container);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  // Handle external initialDrawing changes (e.g. question navigation, undo)
  useEffect(() => {
    if (!initializedRef.current) return;
    if (initialDrawing !== loadedDrawingRef.current) {
      loadedDrawingRef.current = initialDrawing;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      resizeCanvas(canvas, container, initialDrawing);
    }
  }, [initialDrawing]);

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL();
    loadedDrawingRef.current = dataUrl;
    onDrawingChange(dataUrl);
  };

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    // Context is already scaled by DPR via setTransform, so use CSS coordinates
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    if (!tool) return;
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    lastPointRef.current = { x, y };
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    if (!isDrawing || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(x, y);

    if (tool === 'pen') {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = eraserSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    ctx.stroke();
    lastPointRef.current = { x, y };
  };

  const handleMouseMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (tool === 'eraser') {
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        const touch = e.touches[0];
        setCursorPosition({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
      } else {
        setCursorPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }

    draw(e);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPointRef.current = null;
      saveDrawing();
    }
  };

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 50 }}>
      {/* Drawing canvas - for user drawings */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={handleMouseMove}
        onTouchEnd={stopDrawing}
        className={`absolute inset-0 touch-none ${tool ? 'pointer-events-auto' : 'pointer-events-none'}`}
        style={{
          cursor: tool === 'pen'
            ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(penColor)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'/%3E%3C/svg%3E") 0 20, auto`
            : tool === 'eraser' ? 'none' : 'default'
        }}
      />

      {/* Custom Eraser Cursor */}
      {tool === 'eraser' && (
        <div
          className="pointer-events-none absolute rounded-full border-2 border-black dark:border-white bg-white dark:bg-neutral-400 bg-opacity-30 dark:bg-opacity-30"
          style={{
            left: `${cursorPosition.x}px`,
            top: `${cursorPosition.y}px`,
            width: `${eraserSize}px`,
            height: `${eraserSize}px`,
            transform: 'translate(-50%, -50%)',
            transition: 'width 0.1s, height 0.1s',
            zIndex: 9999,
          }}
        />
      )}
    </div>
  );
}
