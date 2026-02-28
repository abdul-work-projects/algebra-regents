import { useState } from "react";
import { DatabaseQuestion } from "@/lib/supabase";
import MathText from "@/components/MathText";

interface LinkQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedQuestions: string[];
  questions: DatabaseQuestion[];
  onConfirm: (passageText: string, passageImage: File | null) => Promise<void>;
}

export default function LinkQuestionsModal({
  isOpen,
  onClose,
  selectedQuestions,
  questions,
  onConfirm,
}: LinkQuestionsModalProps) {
  const [passageText, setPassageText] = useState("");
  const [passageImage, setPassageImage] = useState<File | null>(null);
  const [passageImagePreview, setPassageImagePreview] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [draggedOver, setDraggedOver] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setPassageText("");
    setPassageImage(null);
    setPassageImagePreview(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!passageText.trim() && !passageImage) return;
    setIsLinking(true);
    try {
      await onConfirm(passageText, passageImage);
      setPassageText("");
      setPassageImage(null);
      setPassageImagePreview(null);
    } finally {
      setIsLinking(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setPassageImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPassageImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-neutral-800 bg-purple-50 dark:bg-purple-900/30">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-full">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-neutral-100">Group Questions</h2>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-neutral-400 mb-4">
            Add a shared passage for these questions. The passage will be displayed above both questions when students take the quiz.
          </p>

          {/* Selected Questions Preview */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-neutral-950 rounded-2xl border border-gray-100 dark:border-neutral-800">
            <p className="text-xs font-bold text-gray-700 dark:text-neutral-300 mb-2">Selected Questions:</p>
            <div className="space-y-1">
              {selectedQuestions.map((id, idx) => {
                const q = questions.find((q) => q.id === id);
                return (
                  <div key={id} className="text-sm text-gray-900 dark:text-neutral-100 truncate">
                    {idx + 1}. <MathText text={q?.name || q?.question_text?.slice(0, 50) || `Question ${idx + 1}`} className="inline" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Passage Text */}
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-900 dark:text-neutral-100 mb-1">Passage Text</label>
            <textarea
              value={passageText}
              onChange={(e) => setPassageText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
              rows={4}
              placeholder="Enter the shared passage text... (supports LaTeX: $x^2$)"
            />
          </div>

          {/* Passage Image */}
          <div>
            <label className="block text-sm font-bold text-gray-900 dark:text-neutral-100 mb-1">Passage Image (Optional)</label>
            <input
              type="file"
              id="link-passage-image"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setPassageImage(file);
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setPassageImagePreview(ev.target?.result as string);
                  reader.readAsDataURL(file);
                } else {
                  setPassageImagePreview(null);
                }
              }}
              className="hidden"
            />
            <label
              htmlFor="link-passage-image"
              className="cursor-pointer block"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {passageImagePreview ? (
                <div
                  className={`relative w-full h-32 rounded-xl border overflow-hidden transition-all ${
                    draggedOver ? "border-purple-500 ring-2 ring-purple-200" : "border-gray-200 dark:border-neutral-700"
                  }`}
                >
                  <img src={passageImagePreview} alt="Passage preview" className="w-full h-full object-contain bg-gray-50 dark:bg-neutral-800" />
                  {draggedOver && (
                    <div className="absolute inset-0 bg-purple-500 bg-opacity-20 flex items-center justify-center">
                      <span className="text-sm font-bold text-purple-700">Drop to replace</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPassageImage(null);
                      setPassageImagePreview(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 shadow-md"
                  >
                    x
                  </button>
                </div>
              ) : (
                <div
                  className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-gray-400 dark:text-neutral-500 transition-colors ${
                    draggedOver ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30" : "border-gray-200 dark:border-neutral-700 hover:border-purple-500"
                  }`}
                >
                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium">Drop image here</span>
                  <span className="text-xs">or click to browse</span>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950">
          <button
            onClick={handleClose}
            disabled={isLinking}
            className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 rounded-full hover:border-black dark:hover:border-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLinking || (!passageText.trim() && !passageImage)}
            className="px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-full hover:bg-purple-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLinking ? "Linking..." : "Group Questions"}
          </button>
        </div>
      </div>
    </div>
  );
}
