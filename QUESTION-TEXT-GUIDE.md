# Question Text with Math Equations Guide

## Overview

Questions can now include text in addition to or instead of images. The text field supports LaTeX math notation for displaying mathematical equations, fractions, symbols, and more.

## Database Migration

### For New Installations
If you're setting up the database for the first time, simply run `supabase-setup.sql` which now includes the `question_text` column.

### For Existing Installations
Run the migration script to add question text support:
```sql
-- In Supabase SQL Editor, run:
supabase-migration-question-text.sql
```

This migration will:
- Add `question_text` column to the questions table
- Make `question_image_url` nullable
- Add a constraint to ensure at least one of text or image is provided

## Admin Panel Usage

### Adding Questions with Text

1. **Question Name** (Optional): Internal identifier for the question
2. **Question Text**: Enter the question text here
   - You can use text only, image only, or both
   - At least one (text or image) is required
3. **Question Image**: Upload an optional image

### LaTeX Math Notation

Use dollar signs to wrap LaTeX math expressions:

#### Inline Math (within text)
Use single dollar signs: `$expression$`

Examples:
- `$x^{2}$` → x²
- `$\frac{a}{b}$` → a/b (as fraction)
- `$\sqrt{x}$` → √x

#### Display Math (centered, larger)
Use double dollar signs: `$$expression$$`

Example:
```
$$\frac{-b \pm \sqrt{b^{2} - 4ac}}{2a}$$
```

### Common Math Expressions

#### Fractions
```
$\frac{numerator}{denominator}$
$\frac{x+1}{x-1}$
```

#### Exponents and Powers
```
$x^{2}$          → x²
$x^{n}$          → xⁿ
$2^{10}$         → 2¹⁰
$x^{2y+1}$       → x^(2y+1)
```

#### Square Roots
```
$\sqrt{x}$           → √x
$\sqrt{x^{2}+y^{2}}$ → √(x²+y²)
$\sqrt[3]{x}$        → ³√x (cube root)
```

#### Greek Letters
```
$\alpha$, $\beta$, $\gamma$, $\delta$
$\pi$, $\theta$, $\sigma$
$\Sigma$, $\Delta$, $\Pi$ (uppercase)
```

#### Operators and Symbols
```
$\times$    → ×
$\div$      → ÷
$\pm$       → ±
$\le$       → ≤
$\ge$       → ≥
$\ne$       → ≠
$\approx$   → ≈
```

#### Parentheses and Brackets
```
$\left( \frac{x}{y} \right)$    → Automatically sized parentheses
$\left[ x+y \right]$            → Brackets
$\left\{ x,y \right\}$          → Braces
```

#### Subscripts
```
$x_{1}$, $x_{2}$, $x_{n}$
$a_{n+1}$
```

### Full Examples

#### Example 1: Linear Equation
```
Solve for $x$: $2x + 5 = 15$
```

#### Example 2: Quadratic Formula
```
Use the quadratic formula to solve: $$x = \frac{-b \pm \sqrt{b^{2} - 4ac}}{2a}$$
```

#### Example 3: Systems of Equations
```
Solve the system:
$$\begin{cases}
2x + 3y = 7 \\
x - y = 1
\end{cases}$$
```

#### Example 4: Mixed Text and Math
```
If $f(x) = x^{2} + 3x - 2$, find $f(5)$.
```

#### Example 5: Fractions and Exponents
```
Simplify: $\frac{x^{3} \cdot x^{2}}{x^{4}}$
```

## Quiz Display

### How Questions Are Displayed

1. **Text Only**: Shows in a bordered card above the answer options
2. **Image Only**: Shows the drawing canvas as before
3. **Both Text and Image**: Shows text first, then image below

All math expressions in the text are rendered beautifully using KaTeX.

## Tips

1. **Preview**: Always preview your questions after creating them to ensure LaTeX renders correctly
2. **Braces**: Use curly braces `{}` to group multi-character exponents: `x^{10}` not `x^10`
3. **Spacing**: LaTeX handles spacing automatically, but you can use `\,` for thin space, `\quad` for medium space
4. **Errors**: If LaTeX fails to render, the raw text will be shown in red
5. **Complex Expressions**: For very complex equations, consider using an image instead

## LaTeX Resources

- [Detexify](http://detexify.kirelabs.org/classify.html) - Draw a symbol to find its LaTeX command
- [KaTeX Supported Functions](https://katex.org/docs/supported.html) - Full list of supported LaTeX commands
- [Overleaf Math Symbols](https://www.overleaf.com/learn/latex/List_of_Greek_letters_and_math_symbols) - Comprehensive symbol reference

## Troubleshooting

### Math Not Rendering
- Ensure you're using dollar signs correctly: `$math$` for inline, `$$math$$` for display
- Check for unmatched braces `{}` or brackets
- Verify the LaTeX command is supported by KaTeX

### Text Appears Raw
- Make sure you used `$` symbols to wrap math expressions
- Check that special characters are properly escaped

### Database Errors
- Ensure you ran the migration script
- Verify the constraint allows either text or image (not requiring both)
