'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultSplit?: number; // 0-100, percentage for left pane
  minLeft?: number; // minimum percentage for left pane
  minRight?: number; // minimum percentage for right pane
  className?: string;
}

const DIVIDER_WIDTH = 8;

export default function SplitPane({
  left,
  right,
  defaultSplit = 60,
  minLeft = 30,
  minRight = 25,
  className = '',
}: SplitPaneProps) {
  const [splitPercent, setSplitPercent] = useState(defaultSplit);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    const clamped = Math.min(Math.max(percent, minLeft), 100 - minRight);
    setSplitPercent(clamped);
  }, [minLeft, minRight]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const handleTouchStart = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    const clamped = Math.min(Math.max(percent, minLeft), 100 - minRight);
    setSplitPercent(clamped);
  }, [minLeft, minRight]);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Use absolute positioning for hard boundaries
  const leftWidth = `calc(${splitPercent}% - ${DIVIDER_WIDTH / 2}px)`;
  const rightLeft = `calc(${splitPercent}% + ${DIVIDER_WIDTH / 2}px)`;
  const rightWidth = `calc(${100 - splitPercent}% - ${DIVIDER_WIDTH / 2}px)`;

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full ${className}`}
      style={{ overflow: 'hidden' }}
    >
      {/* Left pane — absolute so width is a hard constraint */}
      <div
        className="absolute top-0 bottom-0 left-0 overflow-y-auto overflow-x-hidden"
        style={{ width: leftWidth, scrollbarWidth: 'none' }}
      >
        {left}
      </div>

      {/* Draggable divider */}
      <div
        className="absolute top-0 bottom-0 z-10 group cursor-col-resize"
        style={{ left: `calc(${splitPercent}% - ${DIVIDER_WIDTH / 2}px)`, width: DIVIDER_WIDTH }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-gray-300 dark:bg-neutral-600 group-hover:bg-blue-400 dark:group-hover:bg-blue-500 transition-colors" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-10 flex items-center justify-center">
          <div className="w-1 h-8 rounded-full bg-gray-400 dark:bg-neutral-500 group-hover:bg-blue-400 dark:group-hover:bg-blue-500 transition-colors flex flex-col items-center justify-center gap-1">
            <div className="w-0.5 h-1 bg-white/60 rounded-full" />
            <div className="w-0.5 h-1 bg-white/60 rounded-full" />
            <div className="w-0.5 h-1 bg-white/60 rounded-full" />
          </div>
        </div>
        {/* Wider hit area */}
        <div className="absolute inset-y-0 -left-2 -right-2" />
      </div>

      {/* Right pane — absolute so width is a hard constraint */}
      <div
        className="absolute top-0 bottom-0 overflow-y-auto overflow-x-hidden"
        style={{ left: rightLeft, width: rightWidth, scrollbarWidth: 'none' }}
      >
        {right}
      </div>
    </div>
  );
}
