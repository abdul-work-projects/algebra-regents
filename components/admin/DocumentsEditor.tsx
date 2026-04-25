'use client';

import { ChangeEvent, DragEvent, useState } from 'react';

export type DocumentSize = 'small' | 'medium' | 'large' | 'extra-large';

export interface DocumentDraft {
  id: string;                       // local-only React key
  type: 'image' | 'pdf';
  file?: File | null;               // staged image file pending upload
  url?: string;                     // existing image url, or PDF url
  page?: number;                    // PDF only
  label?: string;
  position?: 'above' | 'below';     // omit for reference docs
  size?: DocumentSize;              // per-image display size
}

export const newDocId = (): string => `doc-${Math.random().toString(36).slice(2, 9)}`;

interface DocumentsEditorProps {
  value: DocumentDraft[];
  onChange: (next: DocumentDraft[]) => void;
  showPosition?: boolean;           // true for question body docs, false for reference/passage
  title?: string;
  emptyHint?: string;
}

export default function DocumentsEditor({
  value,
  onChange,
  showPosition = false,
  title = 'Documents',
  emptyHint = 'No documents added yet.',
}: DocumentsEditorProps) {
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dropZoneOver, setDropZoneOver] = useState(false);

  const update = (idx: number, patch: Partial<DocumentDraft>) => {
    onChange(value.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const stageImageFile = (file: File, idx: number) => {
    const reader = new FileReader();
    reader.onloadend = () => update(idx, { file, url: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleRowDragOver = (e: DragEvent<HTMLLIElement>, idx: number) => {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      setDragOverIdx(idx);
    }
  };

  const handleRowDrop = (e: DragEvent<HTMLLIElement>, idx: number) => {
    e.preventDefault();
    setDragOverIdx(null);
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    stageImageFile(file, idx);
  };

  const handleDropZoneDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      setDropZoneOver(true);
    }
  };

  const handleDropZoneDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropZoneOver(false);
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    // Resolve all data URLs first, then append in a single onChange — avoids race
    // conditions and stale-state clobbering between FileReader callbacks.
    const additions: DocumentDraft[] = await Promise.all(
      files.map(
        (file) =>
          new Promise<DocumentDraft>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () =>
              resolve({
                id: newDocId(),
                type: 'image',
                file,
                url: reader.result as string,
                size: 'large',
                ...(showPosition ? { position: 'above' as const } : {}),
              });
            reader.readAsDataURL(file);
          })
      )
    );
    onChange([...value, ...additions]);
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...value];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const addImage = () => {
    onChange([...value, {
      id: newDocId(),
      type: 'image',
      file: null,
      url: '',
      size: 'large',
      ...(showPosition ? { position: 'above' as const } : {}),
    }]);
  };

  const addPdf = () => {
    onChange([...value, {
      id: newDocId(),
      type: 'pdf',
      url: '',
      ...(showPosition ? { position: 'above' as const } : {}),
    }]);
  };

  const handleFile = (idx: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    stageImageFile(file, idx);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300">
          {title}
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={addImage}
            className="px-2 py-1 text-xs font-medium rounded-md bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
          >
            + Image
          </button>
          <button
            type="button"
            onClick={addPdf}
            className="px-2 py-1 text-xs font-medium rounded-md bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
          >
            + PDF
          </button>
        </div>
      </div>

      <div
        onDragOver={handleDropZoneDragOver}
        onDragLeave={() => setDropZoneOver(false)}
        onDrop={handleDropZoneDrop}
        className={`rounded-xl border-2 border-dashed p-3 text-center text-xs transition-colors ${
          dropZoneOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            : 'border-gray-200 dark:border-neutral-700 text-gray-500 dark:text-neutral-400'
        }`}
      >
        Drop image files here to add them — or use the buttons above.
      </div>

      {value.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-neutral-500 italic px-1">{emptyHint}</p>
      ) : (
        <ul className="space-y-2">
          {value.map((doc, idx) => (
            <li
              key={doc.id}
              onDragOver={(e) => doc.type === 'image' ? handleRowDragOver(e, idx) : undefined}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={(e) => doc.type === 'image' ? handleRowDrop(e, idx) : undefined}
              className={`border bg-white dark:bg-neutral-900 rounded-xl p-3 space-y-2 transition-colors ${
                dragOverIdx === idx
                  ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                  : 'border-gray-200 dark:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300">
                  {doc.type}
                </span>
                {showPosition && (
                  <select
                    value={doc.position ?? 'above'}
                    onChange={(e) => update(idx, { position: e.target.value as 'above' | 'below' })}
                    className="text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-300"
                  >
                    <option value="above">Above question text</option>
                    <option value="below">Below question text</option>
                  </select>
                )}
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="px-1.5 py-1 text-xs rounded-md text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === value.length - 1}
                    className="px-1.5 py-1 text-xs rounded-md text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="px-2 py-1 text-xs rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                    title="Remove"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {doc.type === 'image' ? (
                <div className="space-y-1.5">
                  <label
                    htmlFor={`doc-${doc.id}-file`}
                    className="block cursor-pointer"
                  >
                    {doc.url ? (
                      <div className="relative w-full h-32 rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden bg-white dark:bg-neutral-950 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={doc.url} alt="Document" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="text-xs font-medium text-white">Click to replace or drag a file here</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-neutral-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-center text-xs text-gray-500 dark:text-neutral-400 transition-colors">
                        Click to choose a file or drag a file here
                      </div>
                    )}
                  </label>
                  <input
                    id={`doc-${doc.id}-file`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(idx, e)}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 dark:text-neutral-400">Size:</span>
                    {(['small', 'medium', 'large', 'extra-large'] as const).map((s) => {
                      const selected = (doc.size ?? 'large') === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => update(idx, { size: s })}
                          className={`px-2 py-0.5 text-xs rounded-full transition-all ${
                            selected
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700'
                          }`}
                        >
                          {s === 'extra-large' ? 'Extra Large' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/file.pdf"
                    value={doc.url ?? ''}
                    onChange={(e) => update(idx, { url: e.target.value })}
                    className="px-2 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Page"
                    value={doc.page ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      update(idx, { page: v === '' ? undefined : Math.max(1, parseInt(v, 10) || 1) });
                    }}
                    className="w-24 px-2 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                </div>
              )}

              <input
                type="text"
                placeholder="Label (optional)"
                value={doc.label ?? ''}
                onChange={(e) => update(idx, { label: e.target.value })}
                className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
