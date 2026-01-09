# Algebra I Regents Practice Web App

A professional, clean MVP for an online Algebra I Regents test-prep application built with Next.js.

## Features

- **40-50 Practice Questions** - Full Algebra I Regents question set
- **Drawing Tool** - Scratch-work overlay on questions with pen, eraser, undo, and clear tools
- **Timer & Analytics** - Track time per question and overall performance
- **Topic Categorization** - Detailed breakdown by math topic with color-coded performance indicators
- **Local Session Persistence** - Your answers and drawings are saved in browser storage
- **Mobile & Desktop Support** - Touch and mouse input supported
- **Calculator Integration** - Quick access to external calculator (Desmos)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Storage**: Browser localStorage (no backend required)
- **Deployment**: Ready for Vercel/Netlify

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd algebra-regents-app
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
algebra-regents-app/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home/landing page
│   ├── quiz/
│   │   └── page.tsx        # Main quiz interface
│   ├── results/
│   │   └── page.tsx        # Results and analytics
│   └── globals.css         # Global styles
├── components/
│   ├── DrawingCanvas.tsx   # Canvas-based drawing tool
│   └── Timer.tsx           # Timer component
├── lib/
│   ├── types.ts            # TypeScript type definitions
│   ├── data.ts             # Sample question data
│   ├── storage.ts          # localStorage utilities
│   └── results.ts          # Results calculation logic
└── public/
    └── images/             # Question images (to be added)
```

## Adding Your Questions

To add your actual Regents questions:

1. **Add question images** to `public/images/` directory

2. **Update** `lib/data.ts` with your question data:
```typescript
{
  id: 'NYREG-ALG1-2025-06-P1-Q01',
  imageFilename: 'question-1.png',
  answers: [
    '(1) 35',
    '(2) 45',
    '(3) 55',
    '(4) 65'
  ],
  correctAnswer: 2, // 1-4
  explanation: 'Explanation text...',
  topics: ['Topic 1', 'Topic 2']
}
```

3. **Update the image path** in `app/quiz/page.tsx`:
   - Replace the placeholder URL with: `/images/${currentQuestion.imageFilename}`

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Deploy with one click

### Netlify

1. Push your code to GitHub
2. Connect repository to Netlify
3. Build command: `npm run build`
4. Publish directory: `.next`

## Features Explained

### Drawing Tool
- Uses HTML5 Canvas API
- Supports both mouse and touch events
- Drawings persist per question in localStorage
- Tools: Pen, Eraser, Undo, Clear

### Session Persistence
- All progress saved automatically to browser localStorage
- Includes: selected answers, drawings, time tracking
- Resume quiz after browser refresh or return visits

### Analytics
- Overall score percentage
- Time per question tracking
- Topic-based performance with color-coded indicators:
  - Green (80%+): Excellent
  - Blue (65-79%): Good
  - Yellow (50-64%): Fair
  - Red (<50%): Needs Practice

### Timer
- Runs continuously during quiz
- Tracks time per question
- Shows average time in results

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements (Phase 2+)

- User authentication
- Cross-device sync
- More exam types (Geometry, Algebra II, etc.)
- Progress tracking over time
- Admin interface for question management
- Backend analytics dashboard

## License

All rights reserved. Code ownership transfers to client upon payment.

## Support

For issues or questions, please contact the development team.
