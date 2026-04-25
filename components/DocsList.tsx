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

  return (
    <div className={`${spacingClass} ${className}`}>
      {docs.map((doc, idx) => {
        if (doc.type === 'pdf') {
          return (
            <div key={`pdf-${idx}-${doc.url}`} style={{ height: pdfHeight, position: 'relative', zIndex: 60 }}>
              <PassageIframe url={doc.url} page={doc.page} className="h-full" />
            </div>
          );
        }
        const widthClass = doc.size ? SIZE_TO_CLASS[doc.size] : imageMaxWidthClass;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`img-${idx}-${doc.url}`}
            src={doc.url}
            alt={doc.label || `Document ${idx + 1}`}
            className={`mx-auto h-auto rounded-lg w-full ${widthClass}`}
          />
        );
      })}
    </div>
  );
}
