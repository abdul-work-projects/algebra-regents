interface UngroupQuestionsModalProps {
  isOpen: boolean;
  questionCount: number;
  isUngrouping: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function UngroupQuestionsModal({
  isOpen,
  questionCount,
  isUngrouping,
  onClose,
  onConfirm,
}: UngroupQuestionsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-neutral-800 bg-purple-50 dark:bg-purple-900/30">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-full">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-neutral-100">Ungroup Questions</h2>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="text-gray-700 dark:text-neutral-300 mb-4">
            Are you sure you want to ungroup these{" "}
            <span className="font-bold">{questionCount} questions</span>? The shared passage will be deleted.
          </p>

          <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-2xl p-3">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-purple-700 dark:text-purple-400">
                <span className="font-bold">Warning:</span> The shared passage text and image will be permanently removed. The questions themselves will remain as individual questions.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950">
          <button
            onClick={onClose}
            disabled={isUngrouping}
            className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 rounded-full hover:border-black dark:hover:border-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 disabled:opacity-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isUngrouping}
            className="px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-full hover:bg-purple-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isUngrouping ? "Ungrouping..." : "Ungroup"}
          </button>
        </div>
      </div>
    </div>
  );
}
