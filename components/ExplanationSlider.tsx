'use client';

import { useEffect } from 'react';
import MathText from './MathText';

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
  hasAnswered: boolean; // New prop to check if user selected an answer
}

export default function ExplanationSlider({
  isOpen,
  onClose,
  explanationText,
  explanationImageUrl,
  correctAnswer,
  isCorrect,
  hasAnswered,
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
          className="fixed inset-0 bg-black bg-opacity-50 z-[110] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slider Panel - Duolingo Style */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-[120] transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header - Duolingo Style */}
          <div className={`p-5 border-b-2 ${
            !hasAnswered ? 'bg-gray-50 border-gray-200' :
            isCorrect ? 'bg-green-50 border-green-200' : 'bg-rose-50 border-rose-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                {hasAnswered ? (
                  <>
                    <h2 className="text-xl font-bold">
                      {isCorrect ? (
                        <span className="text-green-600">✓ Correct!</span>
                      ) : (
                        <span className="text-rose-600">✗ Incorrect</span>
                      )}
                    </h2>
                    <div className="text-sm text-gray-600 mt-1.5 font-medium flex items-baseline gap-1 flex-wrap">
                      <span>Correct answer:</span>
                      <MathText text={correctAnswer} className="text-gray-800 inline text-base" />
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-gray-700">
                      Explanation
                    </h2>
                    <div className="text-sm text-gray-600 mt-1.5 font-medium flex items-baseline gap-1 flex-wrap">
                      <span>Correct answer:</span>
                      <MathText text={correctAnswer} className="text-gray-800 inline text-base" />
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white active:scale-95 transition-all"
                aria-label="Close explanation"
              >
                <svg
                  className="w-5 h-5 text-gray-700"
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
          <div className="flex-1 overflow-y-auto p-5">
            <div className="bg-white rounded-xl border-2 border-gray-200 p-4 mb-4">
              <h3 className="text-base font-bold text-gray-900 mb-2">
                Explanation
              </h3>
              <MathText
                text={explanationText}
                className="text-gray-700 leading-relaxed text-sm"
              />
            </div>

            {explanationImageUrl && (
              <div className="bg-white rounded-xl border-2 border-gray-200 p-3 overflow-hidden">
                <img
                  src={explanationImageUrl}
                  alt="Explanation"
                  className="w-full rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Footer - Duolingo Style */}
          <div className="p-5 border-t-2 border-gray-200 bg-white">
            <button
              onClick={onClose}
              className="w-full px-5 py-3 text-sm font-bold text-white bg-black hover:bg-gray-800 active:scale-[0.98] rounded-xl shadow-md transition-all"
            >
              CONTINUE
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
