'use client';

import { QuestionDocument, DocumentSize } from '@/lib/types';
import PassageIframe from '@/components/PassageIframe';

interface DocsListProps {
  docs: QuestionDocument[];
  pdfHeight?: string;          // CSS height for embedded PDFs
  imageMaxWidthClass?: string; // fallback tailwind max-w-* class when a doc has no `size`
  spacingClass?: string;       // tailwind spacing class between docs
  className?: string;
}

const SIZE_TO_CLASS: Record<DocumentSize, string> = {
  'small': 'max-w-xs',
  'medium': 'max-w-lg',
  'large': 'max-w-2xl',
  'extra-large': 'max-w-full',
};

export default function DocsList({
  docs,
  pdfHeight = '60vh',
  imageMaxWidthClass = 'max-w-2xl',
  spacingClass = 'space-y-3',
  className = '',
}: DocsListProps) {
  if (!docs || docs.length === 0) return null;

  const renderSource = (doc: QuestionDocument, idx: number) => {
    if (!doc.sourceUrl && !doc.sourceLabel) return null;
    const text = doc.sourceLabel || doc.sourceUrl || '';
    return (
      <div key={`src-${idx}`} className="text-[11px] text-gray-500 dark:text-neutral-400 italic mt-1 text-left">
        {doc.sourceUrl ? (
          <a
            href={doc.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-800 dark:hover:text-neutral-200 no-underline"
          >
            {text}
          </a>
        ) : (
          text
        )}
      </div>
    );
  };

  return (
    <div className={`${spacingClass} ${className}`}>
      {docs.map((doc, idx) => {
        if (doc.type === 'pdf') {
          return (
            <div key={`pdf-${idx}-${doc.url}`}>
              <div style={{ height: pdfHeight, position: 'relative', zIndex: 60 }}>
                <PassageIframe url={doc.url} page={doc.page} className="h-full" />
              </div>
              {renderSource(doc, idx)}
            </div>
          );
        }
        const widthClass = doc.size ? SIZE_TO_CLASS[doc.size] : imageMaxWidthClass;
        return (
          <div key={`img-${idx}-${doc.url}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={doc.url}
              alt={doc.label || `Document ${idx + 1}`}
              className={`mx-auto h-auto rounded-lg w-full ${widthClass}`}
            />
            {renderSource(doc, idx)}
          </div>
        );
      })}
    </div>
  );
}
