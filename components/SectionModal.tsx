'use client';

import { useState, useEffect, useRef } from 'react';
import { TestSection } from '@/lib/types';

interface SectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; referenceImageUrl: string; referenceImageFile?: File | null }) => void | Promise<void>;
  section?: TestSection | null; // null for creating, TestSection for editing
  title?: string;
}

export default function SectionModal({ isOpen, onClose, onSave, section, title }: SectionModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (section) {
      setName(section.name);
      setDescription(section.description || '');
      setReferenceImageUrl(section.referenceImageUrl || '');
      setPreviewUrl(section.referenceImageUrl || null);
    } else {
      setName('');
      setDescription('');
      setReferenceImageUrl('');
      setPreviewUrl(null);
    }
    setReferenceImageFile(null);
  }, [section, isOpen]);

  // Clean up object URLs on unmount or when preview changes
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
      // Revoke previous blob URL if any
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    } else {
      // If file cleared, revert to existing URL if editing
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
      });
    } finally {
      setSaving(false);
    }
  };

  const isPdf = referenceImageFile?.type === 'application/pdf' ||
    (previewUrl && !previewUrl.startsWith('blob:') && previewUrl.toLowerCase().endsWith('.pdf'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-neutral-100 mb-4">
          {title || (section ? 'Edit Section' : 'Add Section')}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Section Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Part 1: Multiple Choice"
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for this section..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Reference Sheet Image
            </label>

            {/* Preview */}
            {previewUrl && (
              <div className="mb-2 relative group">
                {isPdf ? (
                  <div className="w-full h-32 flex items-center justify-center bg-gray-100 dark:bg-neutral-800 rounded-lg border border-gray-300 dark:border-neutral-600">
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
                    className="w-full max-h-48 object-contain rounded-lg border border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800"
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

            {/* File input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-700 dark:text-neutral-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 file:cursor-pointer cursor-pointer"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
              Students in this section will see this reference sheet. Leave empty to use the default.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-800 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
