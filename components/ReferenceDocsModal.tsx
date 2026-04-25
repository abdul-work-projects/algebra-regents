"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { QuestionDocument } from "@/lib/types";
import PassageIframe from "@/components/PassageIframe";

const PdfViewer = dynamic(() => import("./PdfViewer"), { ssr: false });

interface ReferenceDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  docs: QuestionDocument[];
}

const DEFAULT_REFERENCE_DOC: QuestionDocument = {
  type: "image",
  url: "/Reference Sheet.jpg",
  label: "Reference Sheet",
};

function isPdfUrl(url: string): boolean {
  return url.toLowerCase().endsWith(".pdf") || url.toLowerCase().includes(".pdf?");
}

export default function ReferenceDocsModal({ isOpen, onClose, docs }: ReferenceDocsModalProps) {
  const list = docs.length > 0 ? docs : [DEFAULT_REFERENCE_DOC];
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (isOpen) setActiveIdx(0);
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const active = list[Math.min(activeIdx, list.length - 1)];
  const showThumbnails = list.length > 1;

  const renderActive = () => {
    if (active.type === "pdf") {
      // External PDFs (often copyrighted) — embed via PassageIframe (FitH, hidden chrome).
      return <PassageIframe url={active.url} page={active.page} className="h-full" />;
    }
    if (isPdfUrl(active.url)) {
      // Locally-served PDF (e.g. the default reference sheet) — use PdfViewer.
      return <PdfViewer url={active.url} />;
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={active.url} alt={active.label || `Reference ${activeIdx + 1}`} className="w-full h-auto rounded" />
    );
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black bg-opacity-75" onClick={onClose} />

      <div className="relative bg-white dark:bg-neutral-900 rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-700 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
            {active.label || (list.length > 1 ? `Reference ${activeIdx + 1} of ${list.length}` : "Reference")}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 flex">
          {showThumbnails && (
            <div className="w-28 shrink-0 border-r border-gray-200 dark:border-neutral-700 overflow-y-auto p-2 space-y-2 bg-gray-50 dark:bg-neutral-950">
              {list.map((d, i) => {
                const selected = i === activeIdx;
                const ringClass = selected
                  ? "ring-2 ring-black dark:ring-white"
                  : "ring-1 ring-gray-200 dark:ring-neutral-700 hover:ring-gray-400 dark:hover:ring-neutral-500";
                return (
                  <button
                    key={`${i}-${d.url}`}
                    onClick={() => setActiveIdx(i)}
                    className={`block w-full aspect-[4/5] rounded-md overflow-hidden bg-white dark:bg-neutral-900 ${ringClass} transition`}
                    title={d.label || `Document ${i + 1}`}
                  >
                    {d.type === "pdf" || isPdfUrl(d.url) ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[10px] font-bold text-gray-500 dark:text-neutral-400 p-2">
                        <span className="text-xs mb-1">📄</span>
                        <span>PDF</span>
                        {d.page && <span className="mt-0.5 font-normal">p. {d.page}</span>}
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.url} alt="" className="w-full h-full object-cover" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-1 min-w-0 p-4 overflow-auto">{renderActive()}</div>
        </div>
      </div>
    </div>
  );
}
