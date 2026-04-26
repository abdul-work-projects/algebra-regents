"use client";

import { useState, useEffect } from "react";
import { Subject, SubjectGroup } from "@/lib/types";

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
    group_id: string | null;
    tool_graph_paper: boolean;
    tool_graphing_tool: boolean;
    tool_calculator: boolean;
  }) => Promise<void>;
  editingSubject?: Subject | null;
  groups?: SubjectGroup[];
}

export default function SubjectModal({
  isOpen,
  onClose,
  onSave,
  editingSubject,
  groups = [],
}: SubjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#67E8F9");
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [toolGraphPaper, setToolGraphPaper] = useState(true);
  const [toolGraphingTool, setToolGraphingTool] = useState(true);
  const [toolCalculator, setToolCalculator] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingSubject) {
      setName(editingSubject.name);
      setDescription(editingSubject.description || "");
      setColor(editingSubject.color || "#67E8F9");
      setIsActive(editingSubject.isActive);
      setDisplayOrder(editingSubject.displayOrder);
      setGroupId(editingSubject.groupId ?? null);
      setToolGraphPaper(editingSubject.toolGraphPaper ?? true);
      setToolGraphingTool(editingSubject.toolGraphingTool ?? true);
      setToolCalculator(editingSubject.toolCalculator ?? true);
    } else {
      setName("");
      setDescription("");
      setColor("#67E8F9");
      setIsActive(true);
      setDisplayOrder(0);
      setGroupId(null);
      setToolGraphPaper(true);
      setToolGraphingTool(true);
      setToolCalculator(true);
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
        group_id: groupId,
        tool_graph_paper: toolGraphPaper,
        tool_graphing_tool: toolGraphingTool,
        tool_calculator: toolCalculator,
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
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[200]"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-neutral-800 flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-neutral-100">
              {editingSubject ? "Edit Subject" : "Create New Subject"}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
            >
              <svg
                className="w-5 h-5 text-gray-500 dark:text-neutral-400"
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
              <label className="block text-sm font-bold text-gray-900 dark:text-neutral-100 mb-1">
                Subject Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Algebra I Regents"
                className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-neutral-100 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for this subject"
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
              />
            </div>

            {/* Group */}
            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-neutral-100 mb-1">
                Group
              </label>
              <select
                value={groupId ?? ""}
                onChange={(e) => setGroupId(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
              >
                <option value="">Ungrouped</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                Optionally group related subjects (e.g., Global History + US History under Social Studies).
              </p>
            </div>

            {/* Color Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-neutral-100 mb-2">
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
                        ? "border-gray-900 dark:border-white scale-110"
                        : "border-gray-200 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-400"
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
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none text-sm font-mono bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
                />
              </div>
              <div
                className="mt-3 p-4 rounded-2xl text-center"
                style={{ backgroundColor: color }}
              >
                <span className="font-bold text-gray-900 text-lg" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.5)' }}>
                  {name || "Subject Name"}
                </span>
              </div>
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-neutral-100 mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
              />
              <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                Lower numbers appear first. Subjects with the same order are sorted alphabetically.
              </p>
            </div>

            {/* Quiz Tools */}
            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-neutral-100 mb-2">
                Quiz Tools
              </label>
              <div className="space-y-2">
                <ToggleRow label="Graph paper" checked={toolGraphPaper} onChange={setToolGraphPaper} />
                <ToggleRow label="Graphing tool" checked={toolGraphingTool} onChange={setToolGraphingTool} />
                <ToggleRow label="Calculator" checked={toolCalculator} onChange={setToolCalculator} />
              </div>
              <p className="text-xs text-gray-500 dark:text-neutral-400 mt-2">
                Reference sheet is automatic — it appears only when a question or section provides reference material.
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-200 dark:border-neutral-700"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-neutral-300">
                Active (visible to students)
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 flex-shrink-0">
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
              {isSaving ? "Saving..." : editingSubject ? "Update Subject" : "Create Subject"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-gray-700 dark:text-neutral-300 cursor-pointer select-none">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white ${
          checked ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-neutral-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-neutral-950 shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}
