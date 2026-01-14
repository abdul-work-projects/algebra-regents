'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * MathText Component
 *
 * Renders text with LaTeX math equations using KaTeX
 * Supports:
 * - Display math: $$...$$ or \[...\]
 * - Inline math: $...$ or \(...\)
 */

interface MathTextProps {
  text: string;
  className?: string;
}

export default function MathText({ text, className = '' }: MathTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !text) return;

    const container = containerRef.current;
    container.innerHTML = '';

    // Parse text to find all math delimiters
    // Supports: $$...$$ (display), \[...\] (display), $...$ (inline), \(...\) (inline)
    const parts: { type: 'text' | 'inline' | 'display'; content: string }[] = [];

    // Regex to match all math delimiters in order
    // Priority: \[...\], $$...$$, \(...\), $...$
    const mathRegex = /\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\\\(([\s\S]*?)\\\)|\$([\s\S]*?)\$/g;

    let lastIndex = 0;
    let match;

    while ((match = mathRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }

      // Determine type and content based on which group matched
      if (match[1] !== undefined) {
        // \[...\] - display math
        parts.push({ type: 'display', content: match[1] });
      } else if (match[2] !== undefined) {
        // $$...$$ - display math
        parts.push({ type: 'display', content: match[2] });
      } else if (match[3] !== undefined) {
        // \(...\) - inline math
        parts.push({ type: 'inline', content: match[3] });
      } else if (match[4] !== undefined) {
        // $...$ - inline math
        parts.push({ type: 'inline', content: match[4] });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    // If no math found, just display as text
    if (parts.length === 0) {
      container.textContent = text;
      return;
    }

    // Render each part
    parts.forEach((part) => {
      if (part.type === 'text') {
        const textNode = document.createTextNode(part.content);
        container.appendChild(textNode);
      } else {
        const span = document.createElement('span');
        try {
          katex.render(part.content, span, {
            displayMode: part.type === 'display',
            throwOnError: false,
            errorColor: '#cc0000',
          });
        } catch (e) {
          console.error('KaTeX render error:', e);
          span.textContent = part.type === 'display' ? `\\[${part.content}\\]` : `$${part.content}$`;
        }
        container.appendChild(span);
      }
    });
  }, [text]);

  if (!text) return null;

  return <div ref={containerRef} className={className} />;
}
