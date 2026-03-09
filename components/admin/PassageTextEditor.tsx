'use client';

import { useState } from 'react';
import ScrollablePassage from '@/components/ScrollablePassage';

interface PassageTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  labelClassName?: string;
  className?: string;
  inputClassName?: string;
}

export default function PassageTextEditor({
  value,
  onChange,
  placeholder = 'Enter passage text...',
  rows = 4,
  label,
  labelClassName,
  className = '',
  inputClassName = '',
}: PassageTextEditorProps) {
  const [tab, setTab] = useState<'write' | 'preview'>('write');

  const passage = {
    id: 'preview',
    passageText: value,
  };

  return (
    <div className={className}>
      {label && (
        <label className={labelClassName || "block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1"}>{label}</label>
      )}
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-1">
        <button
          type="button"
          onClick={() => setTab('write')}
          className={`px-3 py-1 text-xs font-medium rounded-t-lg border border-b-0 transition-colors ${
            tab === 'write'
              ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 border-gray-300 dark:border-neutral-600'
              : 'bg-gray-100 dark:bg-neutral-900 text-gray-500 dark:text-neutral-400 border-transparent hover:text-gray-700 dark:hover:text-neutral-300'
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setTab('preview')}
          className={`px-3 py-1 text-xs font-medium rounded-t-lg border border-b-0 transition-colors ${
            tab === 'preview'
              ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 border-gray-300 dark:border-neutral-600'
              : 'bg-gray-100 dark:bg-neutral-900 text-gray-500 dark:text-neutral-400 border-transparent hover:text-gray-700 dark:hover:text-neutral-300'
          }`}
        >
          Preview
        </button>
      </div>

      {tab === 'write' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={inputClassName || 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 font-mono'}
        />
      ) : (
        <div
          className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 overflow-hidden"
          style={{ minHeight: `${rows * 1.75}rem` }}
        >
          {value ? (
            <div className="px-2 py-2">
              <ScrollablePassage
                passage={passage}
                highlights={[]}
                onHighlightAdd={() => {}}
                onHighlightRemove={() => {}}
                onNoteAdd={() => {}}
                showLineNumbers
              />
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-400 dark:text-neutral-500 italic">
              Nothing to preview
            </div>
          )}
        </div>
      )}

      {/* Formatting help */}
      {tab === 'write' && (
        <details className="mt-1">
          <summary className="text-[10px] text-gray-400 dark:text-neutral-500 cursor-pointer hover:text-gray-600 dark:hover:text-neutral-300 select-none">
            Formatting help
          </summary>
          <div className="mt-1 text-[10px] text-gray-500 dark:text-neutral-400 bg-gray-50 dark:bg-neutral-900 rounded-lg p-2 space-y-0.5 font-mono">
            <div><span className="text-gray-700 dark:text-neutral-300"># Heading</span> — bold heading</div>
            <div><span className="text-gray-700 dark:text-neutral-300">## Heading</span> — centered heading</div>
            <div><span className="text-gray-700 dark:text-neutral-300">&gt; text</span> — italic blockquote</div>
            <div><span className="text-gray-700 dark:text-neutral-300">[5]text</span> — paragraph with line number 5</div>
            <div><span className="text-gray-700 dark:text-neutral-300">[5]⇥text</span> — indented paragraph with line number</div>
            <div><span className="text-gray-700 dark:text-neutral-300">⇥text</span> — indented paragraph (tab or 4 spaces)</div>
            <div><span className="text-gray-700 dark:text-neutral-300">**bold**</span> — <strong>bold</strong></div>
            <div><span className="text-gray-700 dark:text-neutral-300">*italic*</span> — <em>italic</em></div>
            <div><span className="text-gray-700 dark:text-neutral-300">^1 or ^{"{text}"}</span> — superscript</div>
            <div><span className="text-gray-700 dark:text-neutral-300">[^1]definition</span> — numbered footnote</div>
            <div><span className="text-gray-700 dark:text-neutral-300">[source]text</span> — right-aligned source</div>
            <div><span className="text-gray-700 dark:text-neutral-300">—Author</span> — right-aligned attribution</div>
            <div><span className="text-gray-700 dark:text-neutral-300">---</span> — horizontal rule</div>
          </div>
        </details>
      )}
    </div>
  );
}
