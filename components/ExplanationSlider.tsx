'use client';

import { useEffect } from 'react';
import MathText from './MathText';

/**
 * ExplanationSlider Component
 *
 * Slides in from the right to show the explanation after answering
 * Supports multiple explanations for grouped questions
 */

interface QuestionExplanation {
  questionNumber: number;
  explanationText: string;
  explanationImageUrl?: string;
  correctAnswer: string;
  isCorrect: boolean;
  hasAnswered: boolean;
}

interface ExplanationSliderProps {
  isOpen: boolean;
  onClose: () => void;
  explanationText: string;
  explanationImageUrl?: string;
  correctAnswer: string;
  isCorrect: boolean;
  hasAnswered: boolean;
  // Optional: additional explanations for grouped questions
  additionalExplanations?: QuestionExplanation[];
}

export default function ExplanationSlider({
  isOpen,
  onClose,
  explanationText,
  explanationImageUrl,
  correctAnswer,
  isCorrect,
  hasAnswered,
  additionalExplanations,
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

  const isGrouped = additionalExplanations && additionalExplanations.length > 0;

  // For grouped questions, calculate overall correctness
  const allCorrect = isGrouped
    ? isCorrect && additionalExplanations.every(e => e.isCorrect)
    : isCorrect;

  const anyAnswered = isGrouped
    ? hasAnswered || additionalExplanations.some(e => e.hasAnswered)
    : hasAnswered;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[250] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slider Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-[260] transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className={`p-5 border-b-2 ${
            !anyAnswered ? 'bg-gray-50 border-gray-200' :
            allCorrect ? 'bg-green-50 border-green-200' : 'bg-rose-50 border-rose-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                {anyAnswered ? (
                  <>
                    <h2 className="text-xl font-bold">
                      {allCorrect ? (
                        <span className="text-green-600">✓ {isGrouped ? 'All Correct!' : 'Correct!'}</span>
                      ) : (
                        <span className="text-rose-600">✗ {isGrouped ? 'Review Answers' : 'Incorrect'}</span>
                      )}
                    </h2>
                    {!isGrouped && (
                      <div className="text-sm text-gray-600 mt-1.5 font-medium flex items-baseline gap-1 flex-wrap">
                        <span>Correct answer:</span>
                        <MathText text={correctAnswer} className="text-gray-800 inline text-base" />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-gray-700">
                      {isGrouped ? 'Explanations' : 'Explanation'}
                    </h2>
                    {!isGrouped && (
                      <div className="text-sm text-gray-600 mt-1.5 font-medium flex items-baseline gap-1 flex-wrap">
                        <span>Correct answer:</span>
                        <MathText text={correctAnswer} className="text-gray-800 inline text-base" />
                      </div>
                    )}
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
            {isGrouped ? (
              // Grouped questions - show all explanations
              <div className="space-y-6">
                {/* First question explanation */}
                <div className={`rounded-xl border-2 p-4 ${
                  hasAnswered
                    ? isCorrect ? 'border-green-300 bg-green-50' : 'border-rose-300 bg-rose-50'
                    : 'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-gray-800 text-white text-xs font-bold rounded">
                      Q1
                    </span>
                    {hasAnswered && (
                      <span className={`text-sm font-bold ${isCorrect ? 'text-green-600' : 'text-rose-600'}`}>
                        {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mb-2 font-medium flex items-baseline gap-1 flex-wrap">
                    <span>Correct answer:</span>
                    <MathText text={correctAnswer} className="text-gray-800 inline" />
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-900 mb-2">Explanation</h4>
                    <MathText
                      text={explanationText}
                      className="text-gray-700 leading-relaxed text-sm"
                    />
                  </div>
                  {explanationImageUrl && (
                    <div className="mt-3 bg-white rounded-lg p-2 border border-gray-200">
                      <img
                        src={explanationImageUrl}
                        alt="Explanation"
                        className="w-full rounded"
                      />
                    </div>
                  )}
                </div>

                {/* Additional question explanations */}
                {additionalExplanations.map((exp, index) => (
                  <div
                    key={index}
                    className={`rounded-xl border-2 p-4 ${
                      exp.hasAnswered
                        ? exp.isCorrect ? 'border-green-300 bg-green-50' : 'border-rose-300 bg-rose-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 bg-gray-800 text-white text-xs font-bold rounded">
                        Q{index + 2}
                      </span>
                      {exp.hasAnswered && (
                        <span className={`text-sm font-bold ${exp.isCorrect ? 'text-green-600' : 'text-rose-600'}`}>
                          {exp.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-2 font-medium flex items-baseline gap-1 flex-wrap">
                      <span>Correct answer:</span>
                      <MathText text={exp.correctAnswer} className="text-gray-800 inline" />
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <h4 className="text-sm font-bold text-gray-900 mb-2">Explanation</h4>
                      <MathText
                        text={exp.explanationText}
                        className="text-gray-700 leading-relaxed text-sm"
                      />
                    </div>
                    {exp.explanationImageUrl && (
                      <div className="mt-3 bg-white rounded-lg p-2 border border-gray-200">
                        <img
                          src={exp.explanationImageUrl}
                          alt="Explanation"
                          className="w-full rounded"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Single question explanation
              <>
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
              </>
            )}
          </div>

          {/* Footer */}
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
