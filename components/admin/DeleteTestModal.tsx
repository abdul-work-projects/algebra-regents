import { Test } from "@/lib/types";

interface DeleteTestModalProps {
  isOpen: boolean;
  test: Test | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (deleteQuestions: boolean) => void;
}

import { useState } from "react";

export default function DeleteTestModal({
  isOpen,
  test,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteTestModalProps) {
  const [deleteQuestions, setDeleteQuestions] = useState(false);

  if (!isOpen || !test) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-neutral-800 bg-red-50 dark:bg-red-900/30">
          <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-neutral-100">Delete Test</h2>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="text-gray-700 dark:text-neutral-300 mb-4">
            Are you sure you want to delete{" "}
            <span className="font-bold">&quot;{test.name}&quot;</span>?
          </p>

          {test.questionCount && test.questionCount > 0 ? (
            <div className="bg-gray-50 dark:bg-neutral-950 border border-gray-100 dark:border-neutral-800 rounded-2xl p-3 mb-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteQuestions}
                  onChange={(e) => setDeleteQuestions(e.target.checked)}
                  className="mt-1 w-4 h-4 text-red-600 border-gray-300 dark:border-neutral-600 rounded focus:ring-red-500 dark:bg-neutral-800"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-neutral-100">
                    Also delete {test.questionCount} question
                    {test.questionCount !== 1 ? "s" : ""} assigned to this test
                  </span>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                    This will permanently remove the questions from the question bank
                  </p>
                </div>
              </label>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-neutral-400 mb-4">
              This test has no questions assigned to it.
            </p>
          )}

          {deleteQuestions && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl p-3 mb-4">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-400">
                  <span className="font-bold">Warning:</span> This action cannot be undone. All selected questions will be permanently deleted.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 rounded-full hover:border-black dark:hover:border-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 disabled:opacity-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(deleteQuestions)}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-full hover:bg-red-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isDeleting
              ? "Deleting..."
              : deleteQuestions
              ? "Delete Test & Questions"
              : "Delete Test"}
          </button>
        </div>
      </div>
    </div>
  );
}
