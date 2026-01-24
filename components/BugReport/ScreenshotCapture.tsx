'use client';

import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';

interface ScreenshotCaptureProps {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}

export default function ScreenshotCapture({ onCapture, onCancel }: ScreenshotCaptureProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [endPos, setEndPos] = useState({ x: 0, y: 0 });
  const [isCapturing, setIsCapturing] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Use refs to track positions for the capture (avoids stale closure)
  const startPosRef = useRef({ x: 0, y: 0 });
  const endPosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCapturing) return;
    const pos = { x: e.clientX, y: e.clientY };
    setIsSelecting(true);
    setStartPos(pos);
    setEndPos(pos);
    startPosRef.current = pos;
    endPosRef.current = pos;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || isCapturing) return;
    const pos = { x: e.clientX, y: e.clientY };
    setEndPos(pos);
    endPosRef.current = pos;
  };

  const handleMouseUp = async () => {
    if (!isSelecting || isCapturing) return;
    setIsSelecting(false);

    // Use refs for accurate position values
    const start = startPosRef.current;
    const end = endPosRef.current;
    const left = Math.min(start.x, end.x);
    const top = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);

    if (width < 10 || height < 10) {
      return; // Too small, ignore
    }

    setIsCapturing(true);

    try {
      // Hide the overlay temporarily
      if (overlayRef.current) {
        overlayRef.current.style.display = 'none';
      }

      // Small delay to ensure overlay is hidden
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture the selected area
      const canvas = await html2canvas(document.body, {
        x: left + window.scrollX,
        y: top + window.scrollY,
        width: width,
        height: height,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const dataUrl = canvas.toDataURL('image/png');
      onCapture(dataUrl);
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      alert('Failed to capture screenshot. Please try again.');
      if (overlayRef.current) {
        overlayRef.current.style.display = 'block';
      }
      setIsCapturing(false);
    }
  };

  const getSelectionRect = () => {
    const left = Math.min(startPos.x, endPos.x);
    const top = Math.min(startPos.y, endPos.y);
    const width = Math.abs(endPos.x - startPos.x);
    const height = Math.abs(endPos.y - startPos.y);
    return { left, top, width, height };
  };

  const rect = getSelectionRect();

  // Handle escape key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[300] cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40" />

      {/* Instructions */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
        Click and drag to select area to capture. Press ESC to cancel.
      </div>

      {/* Selection rectangle */}
      {(isSelecting || rect.width > 0) && (
        <>
          {/* Clear area where selection is */}
          <div
            className="absolute bg-transparent border-2 border-blue-500 border-dashed"
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
            }}
          />

          {/* Size indicator */}
          {rect.width > 50 && rect.height > 30 && (
            <div
              className="absolute bg-blue-500 text-white text-xs px-2 py-1 rounded"
              style={{
                left: rect.left,
                top: rect.top - 24,
              }}
            >
              {Math.round(rect.width)} x {Math.round(rect.height)}
            </div>
          )}
        </>
      )}

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-100 active:scale-95 transition-all shadow-lg"
      >
        Cancel
      </button>

      {/* Capturing indicator */}
      {isCapturing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3">
            <svg className="animate-spin w-5 h-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-medium">Capturing...</span>
          </div>
        </div>
      )}
    </div>
  );
}
