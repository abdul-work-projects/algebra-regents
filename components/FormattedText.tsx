import React from 'react';

/**
 * Lightweight text renderer that supports the common admin-friendly markup:
 *   **bold**, *italic*, _italic_, line breaks (newlines), and blank-line paragraph breaks.
 * Falls through anything else as plain text.
 */
interface FormattedTextProps {
  text: string;
  className?: string;
}

const INLINE_RE = /(\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_)/g;

function renderInline(line: string, baseKey: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIdx = 0;
  let match;
  let i = 0;
  INLINE_RE.lastIndex = 0;
  while ((match = INLINE_RE.exec(line)) !== null) {
    if (match.index > lastIdx) nodes.push(line.slice(lastIdx, match.index));
    if (match[2] !== undefined) {
      nodes.push(<strong key={`${baseKey}-b-${i++}`}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      nodes.push(<em key={`${baseKey}-i-${i++}`}>{match[3]}</em>);
    } else if (match[4] !== undefined) {
      nodes.push(<em key={`${baseKey}-i-${i++}`}>{match[4]}</em>);
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < line.length) nodes.push(line.slice(lastIdx));
  return nodes;
}

export default function FormattedText({ text, className = '' }: FormattedTextProps) {
  // Split on blank lines into paragraphs; within a paragraph, single newlines become <br />.
  const paragraphs = text.split(/\n\s*\n/);
  return (
    <div className={className}>
      {paragraphs.map((para, pi) => {
        const lines = para.split('\n');
        return (
          <p key={pi} className={pi > 0 ? 'mt-3' : ''}>
            {lines.map((line, li) => (
              <React.Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(line, `${pi}-${li}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
