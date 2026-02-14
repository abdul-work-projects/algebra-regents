'use client';

import { useState, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
}

export default function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  }, []);

  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      (containerRef as React.MutableRefObject<HTMLDivElement>).current = node;
      setContainerWidth(node.clientWidth);
    }
  }, []);

  const pageWidth = containerWidth > 0 ? (containerWidth - 32) * scale : undefined;

  return (
    <div ref={measuredRef}>
      {/* Zoom controls */}
      <div className="sticky top-0 z-10 flex items-center justify-center gap-2 mb-3">
        <div className="inline-flex items-center gap-2 bg-white dark:bg-neutral-900 rounded-lg px-3 py-1.5 shadow-sm border border-gray-200 dark:border-neutral-700">
        <button
          onClick={() => setScale(s => Math.max(0.5, s - 0.15))}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-neutral-400"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>
        <span className="text-xs font-medium text-gray-600 dark:text-neutral-400 min-w-[3rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(s => Math.min(2, s + 0.15))}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-neutral-400"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        {numPages > 0 && (
          <span className="text-xs text-gray-500 dark:text-neutral-400 ml-2">
            {numPages} page{numPages !== 1 ? 's' : ''}
          </span>
        )}
        </div>
      </div>

      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="ml-2 text-sm text-gray-500 dark:text-neutral-400">Loading PDF...</span>
          </div>
        }
        error={
          <div className="text-center py-8 text-red-500 text-sm">
            Failed to load PDF. Please try again.
          </div>
        }
      >
        <div className="space-y-4" style={{ width: pageWidth ? `${pageWidth}px` : 'auto', margin: '0 auto' }}>
          {Array.from({ length: numPages }, (_, i) => (
            <Page
              key={i + 1}
              pageNumber={i + 1}
              width={pageWidth}
              className="shadow-sm rounded overflow-hidden"
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          ))}
        </div>
      </Document>
    </div>
  );
}
