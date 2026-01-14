"use client";

import { useEffect } from "react";

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

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-75"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {isDefaultReference ? "Reference Sheet" : "Reference"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
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

        {/* Content - Image */}
        <div className="p-4 overflow-auto max-h-[calc(90vh-4rem)]">
          <img
            src={contentUrl}
            alt={isDefaultReference ? "Reference Sheet" : "Reference"}
            className="w-full h-auto rounded"
          />
        </div>
      </div>
    </div>
  );
}
