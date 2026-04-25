'use client';

import { useState, useEffect, useRef } from 'react';
import { TestSection } from '@/lib/types';
import DocumentsEditor, { DocumentDraft, newDocId } from '@/components/admin/DocumentsEditor';
import { docsToDrafts } from '@/hooks/useQuestionForm';

interface SectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    referenceImageUrl: string;
    referenceImageFile?: File | null;
    referenceDocuments: DocumentDraft[];
  }) => void | Promise<void>;
  section?: TestSection | null;
  title?: string;
}

export default function SectionModal({ isOpen, onClose, onSave, section, title }: SectionModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [referenceDocuments, setReferenceDocuments] = useState<DocumentDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (section) {
      setName(section.name);
      setDescription(section.description || '');
      setReferenceImageUrl(section.referenceImageUrl || '');
      setPreviewUrl(section.referenceImageUrl || null);
      const existing = section.referenceDocuments;
      if (existing && existing.length > 0) {
        setReferenceDocuments(docsToDrafts(existing));
      } else if (section.referenceImageUrl) {
        setReferenceDocuments([{ id: newDocId(), type: 'image', file: null, url: section.referenceImageUrl }]);
      } else {
        setReferenceDocuments([]);
      }
    } else {
      setName('');
      setDescription('');
      setReferenceImageUrl('');
      setPreviewUrl(null);
      setReferenceDocuments([]);
    }
    setReferenceImageFile(null);
  }, [section, isOpen]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setReferenceImageFile(file);

    if (file) {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl(referenceImageUrl || null);
    }
  };

  const handleRemoveImage = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setReferenceImageFile(null);
    setPreviewUrl(null);
    setReferenceImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        referenceImageUrl: referenceImageFile ? '' : referenceImageUrl.trim(),
        referenceImageFile: referenceImageFile,
        referenceDocuments,
      });
    } finally {
      setSaving(false);
    }
  };

  const isPdf = referenceImageFile?.type === 'application/pdf' ||
    (previewUrl && !previewUrl.startsWith('blob:') && previewUrl.toLowerCase().endsWith('.pdf'));

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-neutral-800">
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

        <form onSubmit={handleSubmit}>
          {/* Content */}
          <div className="p-4 space-y-4">
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
              <label className="block text-sm font-bold text-gray-900 dark:text-neutral-100 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Answer all 24 questions. Each correct answer will receive 2 credits."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
                Shown on the divider page between test parts
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-neutral-100 mb-1">
                Reference Sheet Image
              </label>

              {previewUrl && (
                <div className="mb-2 relative group">
                  {isPdf ? (
                    <div className="w-full h-32 flex items-center justify-center bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-neutral-800">
                      <div className="text-center">
                        <svg className="w-10 h-10 mx-auto text-red-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
                        </svg>
                        <p className="mt-1 text-sm text-gray-600 dark:text-neutral-400">
                          {referenceImageFile?.name || 'PDF Reference Sheet'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Reference sheet preview"
                      className="w-full max-h-48 object-contain rounded-2xl border border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800"
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove image"
                  >
                    X
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-700 dark:text-neutral-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-gray-100 file:text-gray-700 dark:file:bg-neutral-800 dark:file:text-neutral-300 hover:file:bg-gray-200 dark:hover:file:bg-neutral-700 file:cursor-pointer cursor-pointer"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
                Legacy single-image upload. Use the Documents list below for multiple images / PDFs.
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
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950">
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
