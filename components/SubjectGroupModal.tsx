"use client";

import { useEffect, useState } from "react";
import { SubjectGroup } from "@/lib/types";

interface SubjectGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (group: { name: string }) => Promise<void>;
  editingGroup?: SubjectGroup | null;
}

export default function SubjectGroupModal({
  isOpen,
  onClose,
  onSave,
  editingGroup,
}: SubjectGroupModalProps) {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(editingGroup?.name || "");
    setError(null);
  }, [editingGroup, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSave({ name: name.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save group");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[200]" onClick={onClose} />
      <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-neutral-800">
            <h2 className="text-lg font-bold text-gray-900 dark:text-neutral-100">
              {editingGroup ? "Edit Group" : "Create Group"}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-neutral-100 mb-1">
                Group Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Social Studies"
                className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
                autoFocus
              />
              <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                Groups bundle related subjects together in the dashboard list.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 rounded-full hover:border-black dark:hover:border-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-bold text-white bg-black dark:bg-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 disabled:opacity-50 transition-all"
            >
              {isSaving ? "Saving..." : editingGroup ? "Update Group" : "Create Group"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
