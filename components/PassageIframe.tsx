'use client';

import { useEffect, useRef, useState } from 'react';

interface PassageIframeProps {
  url: string;
  page?: number;
  className?: string;
}

// Append Chrome PDF viewer params to hide toolbar/navpanes, fit to width, and optionally jump to a page
// or apply a zoom percent. Harmless for non-PDF URLs (it's just a fragment identifier).
function buildSrc(url: string, page?: number, zoomPercent?: number): string {
  const [base, existing = ''] = url.split('#');
  const params = new URLSearchParams(existing);
  if (!params.has('toolbar')) params.set('toolbar', '0');
  if (!params.has('navpanes')) params.set('navpanes', '0');
  if (zoomPercent && zoomPercent > 0) {
    // Explicit zoom overrides Fit-to-width.
    params.set('zoom', String(zoomPercent));
    params.delete('view');
  } else if (!params.has('view')) {
    params.set('view', 'FitH');
  }
  if (page && !params.has('page')) params.set('page', String(page));
  return `${base}#${params.toString()}`;
}

const ZOOM_STEPS = [50, 75, 100, 125, 150, 175, 200, 250, 300];

export default function PassageIframe({ url, page, className = '' }: PassageIframeProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // `null` = fit-to-width (default); a number is an explicit zoom percent.
  const [zoomPercent, setZoomPercent] = useState<number | null>(null);

  const stepZoom = (dir: 1 | -1) => {
    setZoomPercent((cur) => {
      const baseline = cur ?? 100;
      // Find the closest defined step to the current zoom, then move by `dir` index.
      let idx = ZOOM_STEPS.findIndex((s) => s >= baseline);
      if (idx === -1) idx = ZOOM_STEPS.length - 1;
      const next = Math.max(0, Math.min(ZOOM_STEPS.length - 1, idx + dir));
      return ZOOM_STEPS[next];
    });
    setReloadKey((k) => k + 1);
  };

  const resetZoom = () => {
    setZoomPercent(null);
    setReloadKey((k) => k + 1);
  };

  // Reload the PDF when the container width changes so FitH re-applies to the new width.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let lastWidth = el.getBoundingClientRect().width;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (Math.abs(width - lastWidth) < 1) return;
      lastWidth = width;
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setReloadKey((k) => k + 1), 250);
    });
    observer.observe(el);
    return () => {
      if (timeout) clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <iframe
        key={reloadKey}
        src={buildSrc(url, page, zoomPercent ?? undefined)}
        title="Passage"
        className="w-full h-full rounded-lg border border-gray-200 dark:border-neutral-700 bg-white"
      />

      {/* Zoom controls — overlay top-left */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border border-gray-300 dark:border-neutral-600 rounded-md shadow-sm px-1 py-0.5">
        <button
          onClick={() => stepZoom(-1)}
          className="px-2 py-1 text-xs font-bold text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded transition-colors"
          title="Zoom out"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={resetZoom}
          className="px-2 py-1 text-[10px] font-medium tabular-nums text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded transition-colors min-w-[44px]"
          title="Reset zoom (fit width)"
        >
          {zoomPercent ? `${zoomPercent}%` : 'Fit'}
        </button>
        <button
          onClick={() => stepZoom(1)}
          className="px-2 py-1 text-xs font-bold text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded transition-colors"
          title="Zoom in"
          aria-label="Zoom in"
        >
          +
        </button>
      </div>

      {page && (
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white/95 dark:bg-neutral-900/95 backdrop-blur border border-gray-300 dark:border-neutral-600 rounded-md shadow-sm text-gray-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-900 active:scale-95 transition-all"
          title={`Jump back to page ${page}`}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8M21 3v5h-5" />
          </svg>
          Start
        </button>
      )}
    </div>
  );
}
