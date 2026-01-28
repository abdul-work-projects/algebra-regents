'use client';

import { Text, View } from '@react-pdf/renderer';
import { parseTextWithMath, mathToPlainText } from '@/lib/mathToSvg';
import type { Style } from '@react-pdf/types';

interface MathPdfProps {
  text: string;
  style?: Style | Style[];
  fontSize?: number;
}

/**
 * Renders text with LaTeX math expressions in react-pdf
 * Math expressions are converted to readable Unicode text
 */
export default function MathPdf({ text, style, fontSize = 8 }: MathPdfProps) {
  if (!text) return null;

  // Convert the text with math to plain readable text
  const plainText = mathToPlainText(text);

  return (
    <Text style={[{ fontSize, color: '#6b7280' }, style].flat().filter(Boolean) as Style[]}>
      {plainText}
    </Text>
  );
}
