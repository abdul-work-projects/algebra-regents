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
  showLineNumbers?: boolean;
  fillHeight?: boolean; // If true, fills available height instead of using maxHeight
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

// Render inline formatting: **bold**, *italic*, ^{superscript} / ^N
function renderInlineFormatting(text: string, keyPrefix: string): React.ReactNode[] {
  // Strip orphan * at start/end of text (from multi-line italic that spans blocks)
  let processed = text;
  // Count unmatched * — if odd number, strip leading or trailing one
  const asteriskCount = (processed.match(/(?<!\*)\*(?!\*)/g) || []).length;
  if (asteriskCount % 2 === 1) {
    // Remove a leading orphan * or trailing orphan *
    if (processed.startsWith('*') && !processed.startsWith('**')) {
      processed = processed.slice(1);
    } else if (processed.endsWith('*') && !processed.endsWith('**')) {
      processed = processed.slice(0, -1);
    }
  }

  // Match **bold**, *italic*, ^{superscript}, ^N (single digit superscript)
  const inlineRegex = /(\*\*(.+?)\*\*|\*(.+?)\*|\^\{(.+?)\}|\^(\d))/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = inlineRegex.exec(processed)) !== null) {
    // Push text before this match
    if (match.index > lastIndex) {
      nodes.push(processed.slice(lastIndex, match.index));
    }

    if (match[2] !== undefined) {
      // **bold**
      nodes.push(<strong key={`${keyPrefix}-b-${match.index}`}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      // *italic*
      nodes.push(<em key={`${keyPrefix}-i-${match.index}`}>{match[3]}</em>);
    } else if (match[4] !== undefined) {
      // ^{superscript}
      nodes.push(<sup key={`${keyPrefix}-s-${match.index}`} className="text-[0.7em]">{match[4]}</sup>);
    } else if (match[5] !== undefined) {
      // ^N single digit
      nodes.push(<sup key={`${keyPrefix}-s-${match.index}`} className="text-[0.7em]">{match[5]}</sup>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < processed.length) {
    nodes.push(processed.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [processed];
}

// Apply highlights to plain text, then inline formatting
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
    return [<span key="t-0" data-offset={baseOffset}>{renderInlineFormatting(text, `f-${baseOffset}`)}</span>];
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
          {renderInlineFormatting(text.slice(currentPos, relStart), `f-${baseOffset}-${currentPos}`)}
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
          {renderInlineFormatting(text.slice(relStart, relEnd), `f-${baseOffset}-h-${relStart}`)}
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
        {renderInlineFormatting(text.slice(currentPos), `f-${baseOffset}-${currentPos}`)}
      </span>
    );
  }

  return nodes;
}

// Block types for structured passage rendering
type BlockType = 'heading' | 'heading-center' | 'paragraph' | 'paragraph-indent' | 'footnote' | 'source' | 'blockquote' | 'rule' | 'blank';

interface PassageBlock {
  type: BlockType;
  content: string;
  startOffset: number;
  lineNum?: number; // Manual line number override
}

// Parse passage text into structured blocks
// Supported syntax:
//   # Heading            → bold left-aligned heading
//   ## Heading            → bold centered heading
//   > text                → italic blockquote (for intro/context)
//   [^1]definition        → numbered footnote (superscript number + definition)
//   [footnote]text        → unnumbered footnote
//   [source]text          → right-aligned source attribution
//   Source: text          → right-aligned source attribution
//   — text                → right-aligned source attribution (em dash)
//   ---                   → horizontal rule
//   [5]text               → paragraph with manual line number 5
//   [5]\ttext             → indented paragraph with manual line number 5
//   \ttext or 4-space     → indented paragraph (first-line indent)
//   (blank line)          → vertical spacing
//   anything else         → regular paragraph
//
// Inline formatting (rendered in all text):
//   **bold**              → bold text
//   *italic*              → italic text
//   ^1 or ^{text}         → superscript (footnote references)
function parsePassageBlocks(text: string): PassageBlock[] {
  const blocks: PassageBlock[] = [];
  const lines = text.split('\n');
  let offset = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for manual line number prefix: [N] where N is a number
    let manualLineNum: number | undefined;
    let contentAfterLineNum = trimmed;
    const lineNumMatch = trimmed.match(/^\[(\d+)\]\s?(.*)$/);
    if (lineNumMatch && !trimmed.startsWith('[^') && !trimmed.startsWith('[footnote]') && !trimmed.startsWith('[source]')) {
      manualLineNum = parseInt(lineNumMatch[1], 10);
      contentAfterLineNum = lineNumMatch[2];
    }

    if (trimmed === '```' || trimmed.startsWith('```')) {
      // Skip markdown code fences entirely
      offset += line.length + 1;
      continue;
    } else if (trimmed === '') {
      blocks.push({ type: 'blank', content: '', startOffset: offset });
    } else if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push({ type: 'rule', content: '', startOffset: offset });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'heading-center', content: trimmed.slice(3), startOffset: offset });
    } else if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'heading', content: trimmed.slice(2), startOffset: offset });
    } else if (trimmed.startsWith('> ')) {
      // Strip wrapping *italic* markers since blockquote is already italic
      let bqContent = trimmed.slice(2);
      bqContent = bqContent.replace(/^\*([^*])/,'$1').replace(/([^*])\*$/,'$1');
      blocks.push({ type: 'blockquote', content: bqContent, startOffset: offset });
    } else if (/^\[\^\d+\]/.test(trimmed)) {
      // [^1]definition text
      const match = trimmed.match(/^\[\^(\d+)\](.*)$/);
      if (match) {
        const content = match[1] + '|' + match[2].trim(); // encode as "num|definition"
        blocks.push({ type: 'footnote', content, startOffset: offset });
      } else {
        blocks.push({ type: 'paragraph', content: line, startOffset: offset });
      }
    } else if (trimmed.startsWith('[footnote]')) {
      blocks.push({ type: 'footnote', content: trimmed.slice(10).trim(), startOffset: offset });
    } else if (trimmed.startsWith('[source]') || trimmed.startsWith('Source:') || trimmed.startsWith('—')) {
      const content = trimmed.startsWith('[source]') ? trimmed.slice(8).trim() : trimmed;
      blocks.push({ type: 'source', content, startOffset: offset });
    } else if (manualLineNum !== undefined) {
      // Has manual line number — check if indented after the [N] prefix
      const isIndented = contentAfterLineNum.startsWith('\t') || contentAfterLineNum.startsWith('    ');
      const content = contentAfterLineNum.trim() || contentAfterLineNum;
      blocks.push({ type: isIndented ? 'paragraph-indent' : 'paragraph', content, startOffset: offset, lineNum: manualLineNum });
    } else if (line.startsWith('\t') || line.startsWith('    ')) {
      blocks.push({ type: 'paragraph-indent', content: trimmed, startOffset: offset });
    } else if (blocks.length > 0 && blocks[blocks.length - 1].type === 'blockquote') {
      // Continuation of blockquote — plain line after a blockquote line
      let bqContent = trimmed;
      bqContent = bqContent.replace(/^\*([^*])/,'$1').replace(/([^*])\*$/,'$1');
      blocks.push({ type: 'blockquote', content: bqContent, startOffset: offset });
    } else {
      blocks.push({ type: 'paragraph', content: line, startOffset: offset });
    }
    offset += line.length + 1; // +1 for \n
  }
  return blocks;
}

export default function ScrollablePassage({
  passage,
  highlights,
  onHighlightAdd,
  onHighlightRemove,
  onNoteAdd,
  maxHeight = '50vh',
  showLineNumbers = false,
  fillHeight = false,
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

  // Render content with or without line numbers
  const renderContent = () => {
    if (showLineNumbers) {
      const blocks = parsePassageBlocks(passage.passageText!);

      // Helper to render a block's text content with math, highlights, and inline formatting
      const renderBlockText = (block: PassageBlock) => {
        const blockSegments = parseTextSegments(block.content);
        return blockSegments.map((segment, idx) => {
          if (segment.type === 'math') {
            return (
              <span key={idx}>
                <MathText text={segment.content} className="inline" />
              </span>
            );
          }
          return (
            <span key={idx} data-offset={block.startOffset + segment.startOffset}>
              {renderHighlightedText(
                segment.content,
                block.startOffset + segment.startOffset,
                highlights,
                handleHighlightClick
              )}
            </span>
          );
        });
      };

      // Track whether we've rendered the first footnote (to show rule above it)
      let firstFootnote = true;

      return (
        <div className="text-gray-900 dark:text-neutral-100" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '1rem' }}>
          {blocks.map((block, blockIdx) => {
            if (block.type === 'blank') {
              return <div key={blockIdx} className="h-3" />;
            }

            if (block.type === 'rule') {
              return (
                <div key={blockIdx} className="flex gap-3 my-3">
                  <div className="w-8 shrink-0" />
                  <hr className="flex-1 border-t border-gray-300 dark:border-neutral-600" />
                </div>
              );
            }

            if (block.type === 'heading') {
              return (
                <div key={blockIdx} className="flex gap-3 mb-2 mt-3">
                  <div className="w-8 shrink-0" />
                  <div className="flex-1 font-bold text-lg" data-offset={block.startOffset}>
                    {renderBlockText(block)}
                  </div>
                </div>
              );
            }

            if (block.type === 'heading-center') {
              return (
                <div key={blockIdx} className="flex gap-3 mb-2 mt-3">
                  <div className="w-8 shrink-0" />
                  <div className="flex-1 font-bold text-lg text-center" data-offset={block.startOffset}>
                    {renderBlockText(block)}
                  </div>
                </div>
              );
            }

            if (block.type === 'blockquote') {
              return (
                <div key={blockIdx} className="flex gap-3 my-2">
                  <div className="w-8 shrink-0" />
                  <div className="flex-1 italic pl-4" data-offset={block.startOffset}>
                    {renderBlockText(block)}
                  </div>
                </div>
              );
            }

            if (block.type === 'footnote') {
              // Check if content has numbered format "num|definition"
              const pipeIdx = block.content.indexOf('|');
              const isNumbered = pipeIdx > 0 && /^\d+$/.test(block.content.slice(0, pipeIdx));
              const footnoteNum = isNumbered ? block.content.slice(0, pipeIdx) : null;
              const footnoteContent = isNumbered ? block.content.slice(pipeIdx + 1) : block.content;

              // Create a modified block with just the definition text for rendering
              const renderBlock = { ...block, content: footnoteContent };

              const showRule = firstFootnote;
              firstFootnote = false;

              return (
                <div key={blockIdx}>
                  {showRule && (
                    <div className="flex gap-3 mt-4 mb-2">
                      <div className="w-8 shrink-0" />
                      <hr className="w-24 border-t border-gray-300 dark:border-neutral-600" />
                    </div>
                  )}
                  <div className="flex gap-3 mt-1">
                    <div className="w-8 shrink-0" />
                    <div className="flex-1 text-sm" data-offset={block.startOffset}>
                      {footnoteNum && <sup className="text-[0.75em] mr-0.5">{footnoteNum}</sup>}
                      {renderBlockText(renderBlock)}
                    </div>
                  </div>
                </div>
              );
            }

            if (block.type === 'source') {
              return (
                <div key={blockIdx} className="flex gap-3 mt-1">
                  <div className="w-8 shrink-0" />
                  <div className="flex-1 text-sm text-right" data-offset={block.startOffset}>
                    {renderBlockText(block)}
                  </div>
                </div>
              );
            }

            // Paragraph types - only show manually specified line numbers
            const showNum = block.lineNum !== undefined;
            const isIndented = block.type === 'paragraph-indent';

            return (
              <div key={blockIdx} className="flex gap-3 leading-relaxed">
                <div className="w-8 shrink-0 text-right text-sm text-gray-900 dark:text-neutral-100 select-none" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                  {showNum ? block.lineNum : ''}
                </div>
                <div className={`flex-1 min-w-0 ${isIndented ? 'indent-8' : ''}`} style={{ whiteSpace: 'pre-wrap' }}>
                  {renderBlockText(block)}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Default rendering (no line numbers)
    return (
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
    );
  };

  // When no maxHeight is set and not fillHeight, render inline (parent handles scroll)
  const isInline = !fillHeight && maxHeight === '50vh' && showLineNumbers;

  return (
    <div className={`relative ${fillHeight ? 'h-full' : ''}`}>
      {/* Text container */}
      <div
        ref={containerRef}
        className={`${isInline ? 'py-1' : `overflow-y-auto px-4 py-3 pr-6 scrollbar-hide ${fillHeight ? 'h-full' : ''}`}`}
        style={isInline ? {} : (fillHeight ? { scrollbarWidth: 'none' } : { maxHeight, scrollbarWidth: 'none' })}
        onMouseUp={handleTextSelection}
        onTouchEnd={handleTextSelection}
      >
        {renderContent()}
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
