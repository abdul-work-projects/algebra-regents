"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("./PdfViewer"), { ssr: false });

/**
 * ReferenceImageModal Component
 *
 * Modal to display reference image or default PDF reference sheet
 */

interface ReferenceImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string; // Optional - if not provided, shows default PDF
}

export default function ReferenceImageModal({
  isOpen,
  onClose,
  imageUrl,
}: ReferenceImageModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // If no imageUrl provided, use default reference sheet image
  const isDefaultReference = !imageUrl;
  const contentUrl = imageUrl || "/Reference Sheet.jpg";
  const isPdf = contentUrl.toLowerCase().endsWith('.pdf') || contentUrl.includes('.pdf?');

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-75"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-700 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
            {isDefaultReference ? "Reference Sheet" : "Reference"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6 dark:text-neutral-300"
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
        <div className="p-4 overflow-auto flex-1 min-h-0">
          {isPdf ? (
            <PdfViewer url={contentUrl} />
          ) : (
            <img
              src={contentUrl}
              alt={isDefaultReference ? "Reference Sheet" : "Reference"}
              className="w-full h-auto rounded"
            />
          )}
        </div>
      </div>
    </div>
  );
}
