/**
 * Math to PDF utilities
 *
 * For now, this provides a simple text-based fallback for math expressions.
 * LaTeX delimiters are stripped and expressions are shown as plain text.
 */

export interface TextPart {
  type: 'text' | 'math';
  content: string;
  displayMode?: boolean;
}

/**
 * Parse text containing LaTeX expressions and return parts
 * Math expressions have delimiters removed for plain text display
 */
export function parseTextWithMath(text: string): TextPart[] {
  if (!text) return [];

  const parts: TextPart[] = [];

  // Use a placeholder for escaped dollar signs
  const ESCAPED_DOLLAR = '\u0000ESCAPED\u0000';
  let processedText = text.replace(/\\\$/g, ESCAPED_DOLLAR);

  // Regex to match math delimiters: \[...\], $$...$$, \(...\), $...$
  const mathRegex = /\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\\\(([\s\S]*?)\\\)|\$([\s\S]*?)\$/g;

  let lastIndex = 0;
  let match;

  while ((match = mathRegex.exec(processedText)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      const textContent = processedText.slice(lastIndex, match.index).replace(new RegExp(ESCAPED_DOLLAR, 'g'), '$');
      if (textContent) {
        parts.push({ type: 'text', content: textContent });
      }
    }

    // Determine type and content
    let latex: string;
    let displayMode: boolean;

    if (match[1] !== undefined) {
      latex = match[1];
      displayMode = true;
    } else if (match[2] !== undefined) {
      latex = match[2];
      displayMode = true;
    } else if (match[3] !== undefined) {
      latex = match[3];
      displayMode = false;
    } else if (match[4] !== undefined) {
      latex = match[4];
      displayMode = false;
    } else {
      continue;
    }

    // Convert common LaTeX to readable text
    const readableText = latexToReadable(latex);
    parts.push({
      type: 'math',
      content: readableText,
      displayMode,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < processedText.length) {
    const textContent = processedText.slice(lastIndex).replace(new RegExp(ESCAPED_DOLLAR, 'g'), '$');
    if (textContent) {
      parts.push({ type: 'text', content: textContent });
    }
  }

  return parts;
}

/**
 * Convert LaTeX to ASCII-safe plain text (for PDF fonts that don't support Unicode math)
 */
function latexToReadable(latex: string): string {
  let result = latex.trim();

  // ASCII-safe replacements - order matters!
  const replacements: [RegExp, string][] = [
    // Fractions with braces: \frac{a}{b} or \dfrac{a}{b} -> (a)/(b)
    [/\\d?frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)'],
    // Fractions without braces: \frac12 or \dfrac12 -> (1)/(2)
    [/\\d?frac(\d)(\d)/g, '($1)/($2)'],
    [/\\d?frac\{([^}]+)\}(\d)/g, '($1)/($2)'],
    [/\\d?frac(\d)\{([^}]+)\}/g, '($1)/($2)'],
    // Square root: \sqrt{x} -> sqrt(x)
    [/\\sqrt\{([^}]+)\}/g, 'sqrt($1)'],
    [/\\sqrt\s*(\w)/g, 'sqrt($1)'],
    [/\\sqrt/g, 'sqrt'],
    // Powers: keep as ^
    [/\^{([^}]+)}/g, '^($1)'],
    // Subscripts: keep as _
    [/_{([^}]+)}/g, '_($1)'],
    // Greek letters - use names
    [/\\alpha/g, 'alpha'],
    [/\\beta/g, 'beta'],
    [/\\gamma/g, 'gamma'],
    [/\\delta/g, 'delta'],
    [/\\pi/g, 'pi'],
    [/\\theta/g, 'theta'],
    [/\\lambda/g, 'lambda'],
    [/\\mu/g, 'mu'],
    [/\\sigma/g, 'sigma'],
    [/\\omega/g, 'omega'],
    [/\\Delta/g, 'Delta'],
    [/\\Sigma/g, 'Sigma'],
    [/\\Omega/g, 'Omega'],
    // Operators - ASCII safe
    [/\\times/g, '*'],
    [/\\div/g, '/'],
    [/\\pm/g, '+/-'],
    [/\\mp/g, '-/+'],
    [/\\cdot/g, '*'],
    [/\\neq/g, '!='],
    [/\\ne/g, '!='],
    [/\\leq/g, '<='],
    [/\\le/g, '<='],
    [/\\geq/g, '>='],
    [/\\ge/g, '>='],
    [/\\approx/g, '~='],
    [/\\equiv/g, '==='],
    [/\\infty/g, 'infinity'],
    [/\\perp/g, 'perp'],
    [/\\parallel/g, '||'],
    [/\\angle/g, 'angle '],
    // Dots
    [/\\ldots/g, '...'],
    [/\\cdots/g, '...'],
    [/\\dots/g, '...'],
    [/\\vdots/g, '...'],
    // Arrows
    [/\\rightarrow/g, '->'],
    [/\\leftarrow/g, '<-'],
    [/\\Rightarrow/g, '=>'],
    [/\\Leftarrow/g, '<='],
    [/\\to/g, '->'],
    // Set notation
    [/\\in/g, ' in '],
    [/\\notin/g, ' not in '],
    [/\\subset/g, ' subset '],
    [/\\subseteq/g, ' subseteq '],
    [/\\cup/g, ' union '],
    [/\\cap/g, ' intersect '],
    [/\\emptyset/g, '{}'],
    // Other symbols
    [/\\sum/g, 'sum'],
    [/\\prod/g, 'prod'],
    [/\\int/g, 'integral'],
    [/\\partial/g, 'd'],
    [/\\degree/g, ' degrees'],
    [/\\circ/g, ' degrees'],
    [/\\plusmn/g, '+/-'],
    // Absolute value
    [/\\lvert/g, '|'],
    [/\\rvert/g, '|'],
    [/\\vert/g, '|'],
    [/\\mid/g, '|'],
    [/\\abs\{([^}]+)\}/g, '|$1|'],
    // Text commands
    [/\\text\{([^}]+)\}/g, '$1'],
    [/\\textbf\{([^}]+)\}/g, '$1'],
    [/\\textit\{([^}]+)\}/g, '$1'],
    [/\\mathrm\{([^}]+)\}/g, '$1'],
    [/\\mathbf\{([^}]+)\}/g, '$1'],
    [/\\operatorname\{([^}]+)\}/g, '$1'],
    // Spacing
    [/\\quad/g, '  '],
    [/\\qquad/g, '    '],
    [/\\,/g, ' '],
    [/\\;/g, ' '],
    [/\\:/g, ' '],
    [/\\ /g, ' '],
    [/\\!/g, ''],
    // Remove remaining backslash commands
    [/\\left/g, ''],
    [/\\right/g, ''],
    [/\\big/g, ''],
    [/\\Big/g, ''],
    [/\\bigg/g, ''],
    [/\\Bigg/g, ''],
    [/\\displaystyle/g, ''],
    [/\\textstyle/g, ''],
    // Clean up braces that were just for grouping
    [/\{([^{}]+)\}/g, '$1'],
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  // Run brace cleanup again for any remaining nested braces
  for (let i = 0; i < 3; i++) {
    result = result.replace(/\{([^{}]+)\}/g, '$1');
  }

  // Clean up any remaining empty braces
  result = result.replace(/\{\}/g, '');

  // Clean up any remaining backslash commands we missed
  result = result.replace(/\\[a-zA-Z]+/g, '');

  // Clean up multiple spaces
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Convert text with math to a single plain text string
 */
export function mathToPlainText(text: string): string {
  const parts = parseTextWithMath(text);
  return parts.map(p => p.content).join('');
}
