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

      {/* Slider Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className={`p-6 border-b ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {isCorrect ? (
                    <span className="text-green-600">✓ Correct!</span>
                  ) : (
                    <span className="text-red-600">✗ Incorrect</span>
                  )}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Correct answer: {correctAnswer}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                aria-label="Close explanation"
              >
                <svg
                  className="w-6 h-6"
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
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Explanation
            </h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              {explanationText}
            </p>

            {explanationImageUrl && (
              <div className="mt-4">
                <img
                  src={explanationImageUrl}
                  alt="Explanation"
                  className="w-full rounded-lg border border-gray-200"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="btn-primary w-full"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
