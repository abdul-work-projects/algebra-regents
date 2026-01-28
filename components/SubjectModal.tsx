"use client";

import { useState, useEffect } from "react";
import { Subject } from "@/lib/types";

// Preset colors for subjects
const PRESET_COLORS = [
  { name: "Cyan", value: "#67E8F9" },
  { name: "Pink", value: "#F9A8D4" },
  { name: "Orange", value: "#FDBA74" },
  { name: "Green", value: "#86EFAC" },
  { name: "Purple", value: "#C4B5FD" },
  { name: "Yellow", value: "#FDE047" },
  { name: "Blue", value: "#93C5FD" },
  { name: "Red", value: "#FCA5A5" },
];

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subject: {
    name: string;
    description?: string;
    color: string;
    is_active: boolean;
    display_order: number;
  }) => Promise<void>;
  editingSubject?: Subject | null;
}

export default function SubjectModal({
  isOpen,
  onClose,
  onSave,
  editingSubject,
}: SubjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#67E8F9");
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingSubject) {
      setName(editingSubject.name);
      setDescription(editingSubject.description || "");
      setColor(editingSubject.color || "#67E8F9");
      setIsActive(editingSubject.isActive);
      setDisplayOrder(editingSubject.displayOrder);
    } else {
      // Reset form for new subject
      setName("");
      setDescription("");
      setColor("#67E8F9");
      setIsActive(true);
      setDisplayOrder(0);
    }
    setError(null);
  }, [editingSubject, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Subject name is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        is_active: isActive,
        display_order: displayOrder,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save subject");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[200]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-900">
              {editingSubject ? "Edit Subject" : "Create New Subject"}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 active:scale-95 transition-all"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {/* Subject Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Algebra I Regents"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for this subject"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Color Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Color
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setColor(preset.value)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      color === preset.value
                        ? "border-gray-900 scale-110"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#67E8F9"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                />
              </div>
              {/* Preview */}
              <div
                className="mt-3 p-4 rounded-xl text-center"
                style={{ backgroundColor: color }}
              >
                <span className="font-bold text-gray-900 text-lg" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.5)' }}>
                  {name || "Subject Name"}
                </span>
              </div>
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lower numbers appear first. Subjects with the same order are sorted alphabetically.
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Active (visible to students)
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-bold text-white bg-black hover:bg-gray-800 active:scale-95 disabled:opacity-50 rounded-lg transition-all"
            >
              {isSaving ? "Saving..." : editingSubject ? "Update Subject" : "Create Subject"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
