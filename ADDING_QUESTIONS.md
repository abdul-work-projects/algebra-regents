# Adding Your Algebra I Regents Questions

This guide explains how to replace the sample data with your actual Regents questions.

## Step 1: Prepare Your Question Images

1. **Organize your images**
   - Create a folder with all question image files
   - Name them clearly (e.g., `question-1.png`, `question-2.png`, etc.)
   - Supported formats: PNG, JPG, WEBP

2. **Add images to the project**
   ```bash
   # Copy your images to the public/images folder
   cp /path/to/your/images/* public/images/
   ```

## Step 2: Prepare Your Spreadsheet Data

Your spreadsheet should have these columns:
- **ID**: Unique question ID (e.g., `NYREG-ALG1-2025-06-P1-Q01`)
- **Image Filename**: Image file name (e.g., `question-1.png`)
- **Answer 1**: First answer choice text
- **Answer 2**: Second answer choice text
- **Answer 3**: Third answer choice text
- **Answer 4**: Fourth answer choice text
- **Correct Answer**: Number from 1-4
- **Explanation**: Explanation text for the correct answer
- **Topics**: Comma-separated topic tags (e.g., `Solving Linear Equations, Algebraic Manipulation`)

## Step 3: Convert Spreadsheet to TypeScript

### Option A: Manual Entry (Small dataset)

Edit `lib/data.ts`:

```typescript
import { Question } from './types';

export const questions: Question[] = [
  {
    id: 'NYREG-ALG1-2025-06-P1-Q01',
    imageFilename: 'question-1.png',
    answers: [
      '(1) 35',
      '(2) 45',
      '(3) 55',
      '(4) 65'
    ],
    correctAnswer: 2,
    explanation: 'To solve this equation, first distribute and combine like terms...',
    topics: ['Solving Linear Equations', 'Algebraic Manipulation']
  },
  {
    id: 'NYREG-ALG1-2025-06-P1-Q02',
    imageFilename: 'question-2.png',
    answers: [
      '(1) x = -3',
      '(2) x = 3',
      '(3) x = -2',
      '(4) x = 2'
    ],
    correctAnswer: 1,
    explanation: 'Factor the quadratic expression...',
    topics: ['Solving Quadratic Equations', 'Factoring']
  },
  // ... add all your questions
];
```

### Option B: Use a Script (Large dataset)

1. **Export your spreadsheet as CSV**
   - File > Download > Comma-separated values (.csv)

2. **Create a conversion script**

Create `scripts/convert-csv.js`:

```javascript
const fs = require('fs');
const path = require('path');

// Read CSV file
const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/convert-csv.js path/to/questions.csv');
  process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');
const headers = lines[0].split(',');

// Parse CSV to questions array
const questions = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;

  const values = line.split(',');

  const question = {
    id: values[0].trim(),
    imageFilename: values[1].trim(),
    answers: [
      `(1) ${values[2].trim()}`,
      `(2) ${values[3].trim()}`,
      `(3) ${values[4].trim()}`,
      `(4) ${values[5].trim()}`
    ],
    correctAnswer: parseInt(values[6].trim()),
    explanation: values[7].trim(),
    topics: values[8].split(';').map(t => t.trim())
  };

  questions.push(question);
}

// Generate TypeScript file
const output = `import { Question } from './types';

export const questions: Question[] = ${JSON.stringify(questions, null, 2)};
`;

// Write to file
fs.writeFileSync(path.join(__dirname, '../lib/data.ts'), output);
console.log(`✓ Converted ${questions.length} questions to lib/data.ts`);
```

3. **Run the script**
```bash
node scripts/convert-csv.js path/to/your/questions.csv
```

### Option C: Use Online Tool

1. Use a CSV to JSON converter: [https://csvjson.com/csv2json](https://csvjson.com/csv2json)
2. Paste your CSV data
3. Convert to JSON
4. Manually format into TypeScript format

## Step 4: Update Image References

In `app/quiz/page.tsx`, replace the placeholder image URL:

**Current (line ~185):**
```typescript
<DrawingCanvas
  imageUrl={`https://via.placeholder.com/600x400/f3f4f6/1f2937?text=Question+${session.currentQuestionIndex + 1}`}
  initialDrawing={session.drawings[currentQuestion.id]}
  onDrawingChange={handleDrawingChange}
/>
```

**Replace with:**
```typescript
<DrawingCanvas
  imageUrl={`/images/${currentQuestion.imageFilename}`}
  initialDrawing={session.drawings[currentQuestion.id]}
  onDrawingChange={handleDrawingChange}
/>
```

## Step 5: Test Your Questions

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Test checklist:**
   - [ ] All images load correctly
   - [ ] All answer choices display properly
   - [ ] Answer selection works
   - [ ] Drawing tool works on each image
   - [ ] Navigation between questions works
   - [ ] Correct answers are marked properly in results
   - [ ] Topics display correctly in results

## Answer Choice Formatting

Make sure your answer choices follow this format:

✅ **Correct format:**
```
(1) 35
(2) 3x + 5
(3) x² - 4x + 4
(4) (x + 2)(x - 2)
```

❌ **Incorrect format:**
```
35
3x + 5
```

Each answer must include:
1. The number in parentheses: `(1)`, `(2)`, `(3)`, or `(4)`
2. A space
3. The answer value/expression

## Common Topics

Here are common Algebra I topic tags you might use:

- Solving Linear Equations
- Solving Quadratic Equations
- Factoring
- Systems of Equations
- Linear Functions
- Slope-Intercept Form
- Polynomial Operations
- Combining Like Terms
- Pythagorean Theorem
- Geometry Applications
- Evaluating Expressions
- Order of Operations
- Solving Inequalities
- Algebraic Manipulation
- GCF (Greatest Common Factor)
- Word Problems
- Functions
- Graphing
- Exponents
- Radicals

## Tips

1. **Image Quality**: Use clear, high-resolution images (at least 1000px wide)
2. **File Size**: Optimize images to keep file sizes under 500KB each
3. **Consistent Naming**: Use a consistent naming scheme for easy management
4. **Test First**: Start with 5-10 questions, test thoroughly, then add the rest
5. **Backup**: Keep a backup of your original spreadsheet and images

## Troubleshooting

**Problem**: Images are too large
**Solution**: Use an image optimizer like [TinyPNG](https://tinypng.com) or ImageOptim

**Problem**: Special characters in answers don't display correctly
**Solution**: Make sure your CSV is saved with UTF-8 encoding

**Problem**: Topics not showing correctly
**Solution**: Ensure topics are separated by semicolons in your CSV, not commas

## Need Help?

If you run into issues, check:
1. Browser console for errors (F12 > Console tab)
2. Verify file paths are correct
3. Ensure all required fields are filled in
4. Check that image files exist in `public/images/`
