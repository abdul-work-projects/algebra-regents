'use client';

import { useState, useEffect } from 'react';
import { TestSection } from '@/lib/types';
import DocumentsEditor, { DocumentDraft } from '@/components/admin/DocumentsEditor';
import { docsToDrafts } from '@/hooks/useQuestionForm';
import FormattedText from '@/components/FormattedText';

interface SectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    referenceDocuments: DocumentDraft[];
  }) => void | Promise<void>;
  section?: TestSection | null;
  title?: string;
}

export default function SectionModal({ isOpen, onClose, onSave, section, title }: SectionModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [referenceDocuments, setReferenceDocuments] = useState<DocumentDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDescriptionPreview, setShowDescriptionPreview] = useState(false);

  useEffect(() => {
    if (section) {
      setName(section.name);
      setDescription(section.description || '');
      setReferenceDocuments(docsToDrafts(section.referenceDocuments));
    } else {
      setName('');
      setDescription('');
      setReferenceDocuments([]);
    }
  }, [section, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        referenceDocuments,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-neutral-800 flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-neutral-100">
            {title || (section ? 'Edit Section' : 'Add Section')}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-neutral-100 mb-1">
                Section Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Part 1: Multiple Choice"
                className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
                required
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-bold text-gray-900 dark:text-neutral-100">
                  Description
                </label>
                <button
                  type="button"
                  onClick={() => setShowDescriptionPreview((v) => !v)}
                  className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
                >
                  {showDescriptionPreview ? 'Edit' : 'Preview'}
                </button>
              </div>
              {showDescriptionPreview ? (
                <div className="min-h-[3.5rem] px-4 py-3 border border-gray-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-950">
                  {description.trim() ? (
                    <FormattedText
                      text={description}
                      className="text-sm leading-relaxed text-gray-700 dark:text-neutral-300 text-left"
                    />
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-neutral-500 italic">
                      Nothing to preview yet — type a description to see how it&apos;ll render on the divider page.
                    </p>
                  )}
                </div>
              ) : (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., **Part III** — Answer all *3 questions* in this part. Each correct answer will receive **4 credits**."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 font-mono text-sm"
                />
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
                Shown on the divider page between test parts. Formatting:{' '}
                <code className="font-mono">**bold**</code>,{' '}
                <code className="font-mono">*italic*</code>, blank line for a new paragraph.
              </p>
            </div>

            <DocumentsEditor
              title="Reference Documents"
              value={referenceDocuments}
              onChange={setReferenceDocuments}
              emptyHint="Add reference images or PDFs (multi-doc with thumbnail switcher)."
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 rounded-full hover:border-black dark:hover:border-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 disabled:opacity-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="px-4 py-2 text-sm font-bold text-white bg-black dark:bg-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {saving && (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {saving ? 'Saving...' : (section ? 'Save Changes' : 'Add Section')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
