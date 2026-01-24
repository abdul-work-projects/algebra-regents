'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { GraphData, DEFAULT_GRAPH_DATA } from './types';

// Dynamic import to avoid SSR issues with JSXGraph
const GraphingTool = dynamic(() => import('./GraphingTool'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 flex items-center justify-center bg-gray-50">
      <div className="text-gray-500">Loading graphing tool...</div>
    </div>
  ),
});

interface GraphingToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: GraphData;
  onSave: (data: GraphData) => void;
  questionNumber: number;
}

export default function GraphingToolModal({
  isOpen,
  onClose,
  initialData,
  onSave,
  questionNumber,
}: GraphingToolModalProps) {
  const [graphData, setGraphData] = useState<GraphData>(initialData || DEFAULT_GRAPH_DATA);
  const [clearKey, setClearKey] = useState(0);

  // Reset graph data when modal opens with new initial data
  useEffect(() => {
    if (isOpen) {
      setGraphData(initialData || DEFAULT_GRAPH_DATA);
      setClearKey(prev => prev + 1);
    }
  }, [isOpen, initialData]);

  const handleSave = () => {
    onSave(graphData);
    onClose();
  };

  const handleClearAll = () => {
    setGraphData(DEFAULT_GRAPH_DATA);
    setClearKey(prev => prev + 1); // Force GraphingTool to remount
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[200]"
        onClick={onClose}
      />

      {/* Modal - Compact */}
      <div className="fixed inset-2 md:inset-4 flex items-center justify-center z-[210]">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 32px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Compact Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
            <span className="text-sm font-bold text-gray-900">Graph - Q{questionNumber}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleClearAll}
                className="px-2.5 py-1 text-xs font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 active:scale-95 transition-all"
              >
                Clear
              </button>
              <button
                onClick={handleSave}
                className="px-2.5 py-1 text-xs font-bold text-white bg-black rounded-lg hover:bg-gray-800 active:scale-95 transition-all"
              >
                Save
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Graph Area */}
          <div className="flex-1 overflow-hidden">
            <GraphingTool
              key={clearKey}
              initialData={graphData}
              onChange={setGraphData}
            />
          </div>
        </div>
      </div>
    </>
  );
}
