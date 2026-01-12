'use client';

import { useEffect } from 'react';

/**
 * ExplanationSlider Component
 *
 * Slides in from the right to show the explanation after answering
 */

interface ExplanationSliderProps {
  isOpen: boolean;
  onClose: () => void;
  explanationText: string;
  explanationImageUrl?: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export default function ExplanationSlider({
  isOpen,
  onClose,
  explanationText,
  explanationImageUrl,
  correctAnswer,
  isCorrect,
}: ExplanationSliderProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slider Panel - Duolingo Style */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header - Duolingo Style */}
          <div className={`p-6 border-b-2 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {isCorrect ? (
                    <span className="text-emerald-600">✓ Correct!</span>
                  ) : (
                    <span className="text-rose-600">✗ Incorrect</span>
                  )}
                </h2>
                <p className="text-sm text-gray-600 mt-2 font-medium">
                  Correct answer: <span className="font-bold text-gray-800">{correctAnswer}</span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white active:scale-95 transition-all"
                aria-label="Close explanation"
              >
                <svg
                  className="w-6 h-6 text-gray-700"
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
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Explanation
              </h3>
              <p className="text-gray-700 leading-relaxed text-base">
                {explanationText}
              </p>
            </div>

            {explanationImageUrl && (
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 overflow-hidden">
                <img
                  src={explanationImageUrl}
                  alt="Explanation"
                  className="w-full rounded-xl"
                />
              </div>
            )}
          </div>

          {/* Footer - Duolingo Style */}
          <div className="p-6 border-t-2 border-gray-200 bg-white">
            <button
              onClick={onClose}
              className="w-full px-6 py-4 text-base font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] rounded-2xl shadow-md transition-all"
            >
              CONTINUE
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
