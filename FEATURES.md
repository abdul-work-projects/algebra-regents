# Feature Documentation

Complete documentation of all features in the Algebra I Regents Practice Web App.

## Core Features

### 1. Question Display System

**What it does:**
- Displays questions as image screenshots
- Shows 4 multiple-choice answers per question
- Each answer includes both number and full value/expression (e.g., "(1) 35", "(2) 3x + 5")
- Simple number matching for answer checking (1-4)

**Technical details:**
- Questions stored in TypeScript array (`lib/data.ts`)
- Images served from `public/images/` directory
- No math evaluation or symbolic logic required

**User experience:**
- Clean, focused question display
- Clear visual hierarchy
- Large, readable answer buttons
- Selected answer highlighted in blue

---

### 2. Drawing Tool

**What it does:**
- Overlay canvas on top of question images
- Scratch-work space for solving problems
- Tools: Pen, Eraser, Undo, Clear
- Drawings persist per question

**Technical details:**
- HTML5 Canvas API
- Touch and mouse event support
- Base64 encoding for storage
- Per-question drawing persistence in localStorage

**User experience:**
- Intuitive toolbar at the top
- Pen for writing/drawing
- Eraser for corrections
- Undo for step-by-step reversal
- Clear to start over
- Drawings automatically saved
- Restored when returning to a question

**Mobile support:**
- Touch events for finger drawing
- Prevents scroll while drawing
- Responsive canvas sizing

---

### 3. Timer System

**What it does:**
- Visible timer above each question
- Tracks time spent per question
- Records total quiz time
- Shows time in results

**Technical details:**
- Real-time JavaScript timer
- Updates every second
- Stores time per question in session
- Time format: MM:SS

**User experience:**
- Always visible in header
- Non-intrusive design
- Helps pace quiz taking
- Detailed time breakdown in results

---

### 4. Session Analytics

**What it does:**
- Tracks all user progress
- Calculates performance metrics
- Generates detailed results

**Metrics tracked:**
- Overall score (correct/total)
- Score percentage
- Average time per question
- Time per individual question
- Performance by topic
- Question-by-question results

**Technical details:**
- Calculated on results page load
- Uses session data from localStorage
- Color-coded performance indicators:
  - 🟢 Excellent (80%+)
  - 🔵 Good (65-79%)
  - 🟡 Fair (50-64%)
  - 🔴 Needs Practice (<50%)

---

### 5. Topic Categorization

**What it does:**
- Each question tagged with 1-2 topics
- Results show accuracy by topic
- Color-coded strength/weakness indicators

**Topics included:**
- Solving Linear Equations
- Solving Quadratic Equations
- Factoring
- Systems of Equations
- Linear Functions
- Polynomial Operations
- And more...

**User experience:**
- See which topics you excel in
- Identify areas needing practice
- Visual progress bars per topic
- Sorted by performance (best to worst)

---

### 6. Calculator Integration

**What it does:**
- Button opens external calculator in new tab
- Uses Desmos scientific calculator
- Doesn't disrupt quiz progress

**Technical details:**
- Opens `https://www.desmos.com/scientific`
- Target: `_blank` (new tab)
- Always accessible from quiz header

---

### 7. Session Persistence

**What it does:**
- Saves progress automatically
- Works without user accounts
- Persists across browser refreshes
- Same device/browser only

**What's saved:**
- Selected answers for all questions
- Drawing data per question
- Current question index
- Time tracking data
- Quiz start time

**Technical details:**
- Uses browser localStorage
- JSON serialization
- Automatic save on every change
- No server required

**User experience:**
- "Continue Quiz" button on home if session exists
- Option to start fresh
- Never lose progress
- Resume exactly where you left off

---

### 8. Progress Tracking

**What it does:**
- Shows current question number
- Displays progress bar
- Shows answered/unanswered count
- Quick navigation grid

**User experience:**
- Always know your position in quiz
- See how much is completed
- Jump to any question quickly
- Visual indicators:
  - Blue: Current question
  - Green: Answered
  - Gray: Unanswered

---

### 9. Results & Analytics Page

**What it does:**
- Comprehensive performance summary
- Multiple views of your data
- Actionable insights

**Sections:**

**Overall Score Card:**
- Large percentage display
- Fraction (correct/total)
- Performance level badge
- Average time per question
- Topics covered count

**Topic Performance:**
- Bar chart per topic
- Correct/total breakdown
- Percentage per topic
- Color-coded bars
- Sorted by performance

**Question-by-Question:**
- Expandable detail view
- Shows your answer vs correct
- Time spent per question
- Topic tags
- Color-coded (green=correct, red=incorrect, gray=unanswered)

**Actions:**
- Retake Quiz (clears session)
- Back to Home

---

## Navigation Features

### Home Page
- Start new quiz
- Continue existing quiz
- Feature overview
- Clean, welcoming design

### Quiz Page
- Exit button (with confirmation)
- Progress indicator
- Timer display
- Calculator access
- Question navigator
- Previous/Next navigation
- Submit button (on last question)

### Results Page
- Performance summary
- Detailed analytics
- Action buttons

---

## Design & UX Features

### Professional Polish
- Clean, minimal interface
- Thoughtful spacing
- Consistent typography
- Clear visual hierarchy
- Intentional layout
- Not barebones

### Inspired by oneprep.xyz
- Similar question flow
- Comparable UX clarity
- Professional feel
- Test-focused experience

### Responsive Design
- Works on desktop
- Works on mobile
- Works on tablet
- Touch and mouse support
- Adaptive layouts

### Color System
- Blue primary color
- Gray neutrals
- Green for success
- Red for errors
- Yellow for warnings
- Consistent throughout

---

## Technical Features

### Performance
- Fast page loads
- Smooth animations
- Efficient rendering
- Minimal bundle size
- Optimized images

### Accessibility
- Semantic HTML
- Keyboard navigation
- Clear focus states
- Readable text sizes
- Good color contrast

### Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers
- No IE11 support needed

### No Backend Required
- Fully client-side
- No database
- No authentication
- No API calls
- Easy deployment

---

## Future Enhancements (Not in Phase 1)

### Not Included:
- ❌ User accounts
- ❌ Cross-device sync
- ❌ Backend database
- ❌ Admin interface
- ❌ Multiple exam types
- ❌ Historical progress tracking
- ❌ Social features
- ❌ Gamification

These are reserved for future phases.

---

## Mobile-Specific Features

### Touch Optimized
- Large touch targets
- Swipe-friendly
- Pinch-zoom disabled on canvas
- Touch drawing works perfectly
- No accidental clicks

### Mobile Layout
- Single column on small screens
- Stacked question and answers
- Full-width buttons
- Mobile-friendly navigation
- Responsive images

---

## Data Format

### Question Structure
```typescript
{
  id: string;              // Unique ID
  imageFilename: string;   // Image file name
  answers: string[];       // 4 answer choices
  correctAnswer: number;   // 1-4
  explanation: string;     // Explanation text
  topics: string[];        // 1-2 topic tags
}
```

### Session Structure
```typescript
{
  currentQuestionIndex: number;
  userAnswers: { [id: string]: number | null };
  questionTimes: { [id: string]: number };
  drawings: { [id: string]: string };
  startTime: number;
  lastQuestionStartTime: number;
}
```

---

## Summary

This MVP delivers a complete, professional test-taking experience with:
- ✅ 40-50 questions
- ✅ Drawing tool
- ✅ Timer & analytics
- ✅ Topic categorization
- ✅ Calculator access
- ✅ Session persistence
- ✅ Professional design
- ✅ Mobile support
- ✅ No backend needed
- ✅ Easy deployment

All features are production-ready and thoroughly tested.
