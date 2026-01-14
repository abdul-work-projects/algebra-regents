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
  tool: 'pen' | 'eraser';
  penSize: number;
  eraserSize: number;
  penColor: string;
  onUndo: () => void;
  onClear: () => void;
  canUndo: boolean;
}

type Tool = 'pen' | 'eraser';

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

  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  // Initialize canvas to fill container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const initCanvas = () => {
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      canvas.width = width;
      canvas.height = height;

      // Transparent background
      ctx.clearRect(0, 0, width, height);

      // Load initial drawing if provided
      if (initialDrawing) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
        };
        img.src = initialDrawing;
      }
    };

    initCanvas();

    // Handle resize
    const handleResize = () => {
      const currentDrawing = canvas.toDataURL();
      initCanvas();
      if (currentDrawing && currentDrawing !== 'data:,') {
        const img = new Image();
        img.onload = () => {
          const drawCtx = canvas.getContext('2d');
          if (drawCtx) {
            drawCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
        };
        img.src = currentDrawing;
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [initialDrawing]);

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL();
    onDrawingChange(dataUrl);
  };

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
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
    const canvas = canvasRef.current;
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

    const canvas = canvasRef.current;
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
      saveDrawing();
    }
  };

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 50 }}>
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
        className="absolute inset-0 touch-none pointer-events-auto"
        style={{
          width: '100%',
          height: '100%',
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
            zIndex: 9999,
          }}
        />
      )}
    </div>
  );
}
