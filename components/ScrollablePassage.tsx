'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Passage, PassageHighlight } from '@/lib/types';
import MathText from './MathText';
import HighlightToolbar from './HighlightToolbar';

interface ScrollablePassageProps {
  passage: Passage;
  highlights: PassageHighlight[];
  onHighlightAdd: (highlight: PassageHighlight) => void;
  onHighlightRemove: (highlightId: string) => void;
  onNoteAdd: (highlightId: string, note: string) => void;
  maxHeight?: string;
}

// Parse text into segments of plain text and math delimiters
function parseTextSegments(text: string): { type: 'text' | 'math'; content: string; startOffset: number; endOffset: number }[] {
  const segments: { type: 'text' | 'math'; content: string; startOffset: number; endOffset: number }[] = [];
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^$]*?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;

  let lastIndex = 0;
  let match;

  while ((match = mathRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
        startOffset: lastIndex,
        endOffset: match.index,
      });
    }
    segments.push({
      type: 'math',
      content: match[0],
      startOffset: match.index,
      endOffset: match.index + match[0].length,
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
      startOffset: lastIndex,
      endOffset: text.length,
    });
  }

  return segments;
}

// Apply highlights to plain text
function renderHighlightedText(
  text: string,
  baseOffset: number,
  highlights: PassageHighlight[],
  onHighlightClick: (highlightId: string, event: React.MouseEvent) => void
): React.ReactNode[] {
  const relevantHighlights = highlights.filter(
    (h) => h.startOffset < baseOffset + text.length && h.endOffset > baseOffset
  );

  if (relevantHighlights.length === 0) {
    return [<span key="t-0" data-offset={baseOffset}>{text}</span>];
  }

  const sorted = [...relevantHighlights].sort((a, b) => a.startOffset - b.startOffset);

  const nodes: React.ReactNode[] = [];
  let currentPos = 0;

  for (const highlight of sorted) {
    const relStart = Math.max(0, highlight.startOffset - baseOffset);
    const relEnd = Math.min(text.length, highlight.endOffset - baseOffset);

    if (relStart > currentPos) {
      nodes.push(
        <span key={`t-${currentPos}`} data-offset={baseOffset + currentPos}>
          {text.slice(currentPos, relStart)}
        </span>
      );
    }

    if (relStart < relEnd) {
      nodes.push(
        <mark
          key={highlight.id}
          data-offset={baseOffset + relStart}
          className="cursor-pointer rounded-sm px-0.5 relative"
          style={{ backgroundColor: highlight.color }}
          onClick={(e) => {
            e.stopPropagation();
            onHighlightClick(highlight.id, e);
          }}
        >
          {text.slice(relStart, relEnd)}
          {highlight.note && (
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 bg-blue-500 rounded-full text-[8px] text-white font-bold ml-0.5 align-super cursor-pointer">
              i
            </span>
          )}
        </mark>
      );
    }

    currentPos = relEnd;
  }

  if (currentPos < text.length) {
    nodes.push(
      <span key={`t-${currentPos}`} data-offset={baseOffset + currentPos}>
        {text.slice(currentPos)}
      </span>
    );
  }

  return nodes;
}

export default function ScrollablePassage({
  passage,
  highlights,
  onHighlightAdd,
  onHighlightRemove,
  onNoteAdd,
  maxHeight = '50vh',
}: ScrollablePassageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ startOffset: number; endOffset: number } | null>(null);
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [viewingNote, setViewingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setContentHeight(scrollHeight);
    setContainerHeight(clientHeight);
    if (scrollHeight <= clientHeight) {
      setScrollProgress(0);
    } else {
      setScrollProgress(scrollTop / (scrollHeight - clientHeight));
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      handleScroll();
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Recalculate on highlights change
  useEffect(() => {
    handleScroll();
  }, [highlights, handleScroll]);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    const startNode = range.startContainer;
    const endNode = range.endContainer;

    const getNodeOffset = (node: Node): number => {
      let current: Node | null = node;
      while (current) {
        if (current instanceof HTMLElement && current.dataset.offset) {
          return parseInt(current.dataset.offset, 10);
        }
        current = current.parentNode;
      }
      return 0;
    };

    const startBase = getNodeOffset(startNode);
    const endBase = getNodeOffset(endNode);

    const startOffset = startBase + range.startOffset;
    const endOffset = endBase + range.endOffset;

    if (startOffset >= endOffset) return;

    const rect = range.getBoundingClientRect();
    setToolbarPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    setSelectionRange({ startOffset, endOffset });
  }, []);

  const handleHighlight = useCallback((color: string) => {
    if (!selectionRange) return;

    const id = Math.random().toString(36).substr(2, 9);
    onHighlightAdd({
      id,
      startOffset: selectionRange.startOffset,
      endOffset: selectionRange.endOffset,
      color,
    });

    setToolbarPosition(null);
    setSelectionRange(null);
    window.getSelection()?.removeAllRanges();
  }, [selectionRange, onHighlightAdd]);

  const handleHighlightClick = useCallback((highlightId: string, event: React.MouseEvent) => {
    const highlight = highlights.find(h => h.id === highlightId);
    if (!highlight) return;

    // If highlight has a note, show the note viewer
    if (highlight.note) {
      setViewingNote(highlight.note);
      setSelectedHighlightId(highlightId);
      setShowNoteInput(false);
    } else {
      setViewingNote(null);
      setSelectedHighlightId(highlightId);
      setShowNoteInput(false);
    }

    // Position popup near the click using fixed coordinates
    setPopupPosition({
      x: event.clientX,
      y: event.clientY,
    });
  }, [highlights]);

  const handleRemoveHighlight = useCallback(() => {
    if (selectedHighlightId) {
      onHighlightRemove(selectedHighlightId);
      setSelectedHighlightId(null);
      setPopupPosition(null);
      setViewingNote(null);
    }
  }, [selectedHighlightId, onHighlightRemove]);

  const handleAddNote = useCallback(() => {
    if (selectedHighlightId && noteText.trim()) {
      onNoteAdd(selectedHighlightId, noteText.trim());
      setNoteText('');
      setShowNoteInput(false);
      setSelectedHighlightId(null);
      setPopupPosition(null);
      setViewingNote(null);
    }
  }, [selectedHighlightId, noteText, onNoteAdd]);

  const closePopup = useCallback(() => {
    setSelectedHighlightId(null);
    setPopupPosition(null);
    setShowNoteInput(false);
    setViewingNote(null);
    setNoteText('');
  }, []);

  if (!passage.passageText) return null;

  const segments = parseTextSegments(passage.passageText);
  const isScrollable = contentHeight > containerHeight;
  const textLength = passage.passageText.length;

  // Compute highlight markers for the scrollbar gutter
  const highlightMarkers = isScrollable && textLength > 0
    ? highlights.map(h => ({
        id: h.id,
        color: h.color,
        // Position as percentage of total text
        top: (h.startOffset / textLength) * 100,
        height: Math.max(2, ((h.endOffset - h.startOffset) / textLength) * 100),
      }))
    : [];

  return (
    <div className="relative">
      {/* Scrollable text container */}
      <div
        ref={containerRef}
        className="overflow-y-auto border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 px-4 py-3 pr-6 scrollbar-hide"
        style={{ maxHeight, scrollbarWidth: 'none' }}
        onMouseUp={handleTextSelection}
        onTouchEnd={handleTextSelection}
      >
        <div className="text-gray-900 dark:text-neutral-100" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '1rem', whiteSpace: 'pre-wrap' }}>
          {segments.map((segment, idx) => {
            if (segment.type === 'math') {
              return (
                <span key={idx}>
                  <MathText text={segment.content} className="inline" />
                </span>
              );
            }

            return (
              <span key={idx} data-offset={segment.startOffset}>
                {renderHighlightedText(
                  segment.content,
                  segment.startOffset,
                  highlights,
                  handleHighlightClick
                )}
              </span>
            );
          })}
        </div>

      </div>

      {/* Custom scrollbar track + thumb (replaces native) */}
      {isScrollable && (
        <div className="absolute right-0 top-0 bottom-0 w-2 pointer-events-none">
          {/* Track */}
          <div className="absolute inset-0 bg-gray-100 dark:bg-neutral-800/50 rounded-full mx-px" />

          {/* Highlight position markers */}
          {highlightMarkers.map((marker) => (
            <div
              key={marker.id}
              className="absolute w-2 rounded-sm"
              style={{
                backgroundColor: marker.color,
                top: `${marker.top}%`,
                height: `${Math.max(3, marker.height)}%`,
                minHeight: '4px',
                filter: 'saturate(1.8) brightness(0.85)',
              }}
            />
          ))}

          {/* Scroll thumb */}
          <div
            className="absolute w-1.5 left-0.5 bg-gray-300 dark:bg-neutral-600 rounded-full transition-[top] duration-100"
            style={{
              height: `${Math.max(10, (containerHeight / contentHeight) * 100)}%`,
              top: `${scrollProgress * (100 - Math.max(10, (containerHeight / contentHeight) * 100))}%`,
            }}
          />
        </div>
      )}

      {/* Highlight toolbar (appears on text selection) */}
      {toolbarPosition && (
        <HighlightToolbar
          position={toolbarPosition}
          onHighlight={handleHighlight}
          onClose={() => {
            setToolbarPosition(null);
            setSelectionRange(null);
          }}
        />
      )}

      {/* Click-away overlay + popup (fixed so it never gets clipped) */}
      {selectedHighlightId && popupPosition && (
        <>
          <div className="fixed inset-0 z-[200]" onClick={closePopup} />
          <div
            className="fixed z-[201] bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-xl p-2 min-w-[180px]"
            style={{
              left: `${popupPosition.x}px`,
              top: `${popupPosition.y + 8}px`,
              transform: 'translateX(-50%)',
              maxWidth: '280px',
            }}
          >
            {/* Viewing existing note */}
            {viewingNote && !showNoteInput && (
              <div className="px-2 py-1.5 mb-1.5 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded text-sm text-gray-800 dark:text-neutral-200">
                {viewingNote}
              </div>
            )}

            <div className="flex items-center gap-1">
              {/* Remove highlight */}
              <button
                onClick={handleRemoveHighlight}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                title="Remove highlight"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              {/* Add/Edit note — Google Docs style comment icon */}
              {!showNoteInput ? (
                <button
                  onClick={() => {
                    setShowNoteInput(true);
                    setViewingNote(null);
                    const existing = highlights.find(h => h.id === selectedHighlightId);
                    setNoteText(existing?.note || '');
                  }}
                  className="p-1.5 text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded transition-colors"
                  title={viewingNote ? 'Edit note' : 'Add note'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </button>
              ) : (
                <div className="flex-1 flex items-center gap-1 ml-1">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                    placeholder="Add a note..."
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 min-w-0"
                    autoFocus
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!noteText.trim()}
                    className="p-1 text-blue-500 hover:text-blue-600 disabled:opacity-40 transition-colors"
                    title="Save note"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
