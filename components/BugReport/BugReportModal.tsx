'use client';

import { useState } from 'react';
import { createBugReport, uploadBugScreenshot } from '@/lib/bugReports';
import ScreenshotCapture from './ScreenshotCapture';

const ISSUE_TYPES = [
  { value: 'incorrect_answer', label: 'Incorrect Answer' },
  { value: 'typo', label: 'Typo or Spelling Error' },
  { value: 'unclear_question', label: 'Unclear Question' },
  { value: 'missing_image', label: 'Missing or Broken Image' },
  { value: 'wrong_explanation', label: 'Wrong Explanation' },
  { value: 'other', label: 'Other' },
];

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionNumber: number;
  questionId: string;
  testId?: string;
  testName?: string;
}

export default function BugReportModal({
  isOpen,
  onClose,
  questionNumber,
  questionId,
  testId,
  testName,
}: BugReportModalProps) {
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleStartCapture = () => {
    setIsCapturing(true);
  };

  const handleCaptureComplete = (dataUrl: string) => {
    setScreenshot(dataUrl);
    setIsCapturing(false);
  };

  const handleCaptureCancel = () => {
    setIsCapturing(false);
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!issueType) {
      setErrorMessage('Please select an issue type');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Please describe the issue');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      let screenshotUrl: string | null = null;

      // Upload screenshot if captured
      if (screenshot) {
        const filename = `bug-${questionId}-${Date.now()}.png`;
        screenshotUrl = await uploadBugScreenshot(screenshot, filename);
      }

      // Create the bug report with issue type prepended to description
      const issueLabel = ISSUE_TYPES.find(t => t.value === issueType)?.label || issueType;
      const fullDescription = `[${issueLabel}] ${description.trim()}`;

      const result = await createBugReport({
        questionId,
        testId,
        questionNumber,
        description: fullDescription,
        screenshotUrl,
      });

      if (result) {
        setSubmitStatus('success');
        // Reset form
        setIssueType('');
        setDescription('');
        setScreenshot(null);
      } else {
        throw new Error('Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting bug report:', error);
      setSubmitStatus('error');
      setErrorMessage('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmitStatus('idle');
    setIssueType('');
    setDescription('');
    setScreenshot(null);
    setErrorMessage('');
    setIsCapturing(false);
    onClose();
  };

  if (!isOpen) return null;

  // Show screenshot capture overlay
  if (isCapturing) {
    return (
      <ScreenshotCapture
        onCapture={handleCaptureComplete}
        onCancel={handleCaptureCancel}
      />
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[200]"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[210] p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Report an Issue</h2>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
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
          <div className="p-4">
            {submitStatus === 'success' ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Report Submitted
                </h3>
                <p className="text-gray-600 mb-4">
                  Thank you for helping us improve! We&apos;ll review your report.
                </p>
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-black text-white font-bold rounded-xl hover:bg-gray-800 active:scale-95 transition-all"
                >
                  CLOSE
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Question Info */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Question:</span> #{questionNumber}
                  </p>
                  {testName && (
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Test:</span> {testName}
                    </p>
                  )}
                </div>

                {/* Issue Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issue Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    required
                  >
                    <option value="">Select an issue type...</option>
                    {ISSUE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Describe the issue <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please provide more details about the issue..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Screenshot Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Screenshot (optional)
                  </label>

                  {screenshot ? (
                    <div className="relative">
                      <img
                        src={screenshot}
                        alt="Screenshot preview"
                        className="w-full rounded-xl border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveScreenshot}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 active:scale-95 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={handleStartCapture}
                        className="absolute bottom-2 right-2 px-3 py-1.5 bg-white text-gray-700 text-xs font-bold rounded-lg border border-gray-300 hover:bg-gray-50 active:scale-95 transition-all"
                      >
                        Retake
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartCapture}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-medium">Capture Screenshot</span>
                    </button>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Click to select an area of the screen to capture
                  </p>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    {errorMessage}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-6 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? 'SUBMITTING...' : 'SUBMIT REPORT'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
