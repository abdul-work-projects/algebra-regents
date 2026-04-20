export interface Passage {
  id: string;
  type?: 'grouped' | 'parts';
  aboveText?: string;
  passageText?: string;
  passageImageUrl?: string;
  iframeUrl?: string;
  iframePage?: number;
  imageSize?: 'small' | 'medium' | 'large' | 'extra-large';
  createdAt?: string;
  updatedAt?: string;
}

export interface Question {
  id: string;
  questionText?: string; // Optional question text (can have text, image, or both)
  aboveImageText?: string; // Text displayed above the question image
  imageFilename?: string; // Optional question image (can have text, image, or both)
  referenceImageUrl?: string; // Reference image URL
  answers: string[];
  answerImageUrls?: (string | undefined)[]; // Optional image URLs for each answer (1-4), can be undefined to preserve indices
  answerLayout?: 'grid' | 'list' | 'row'; // 'grid' = 2x2, 'list' = 1x4 (default), 'row' = 4x1
  imageSize?: 'small' | 'medium' | 'large' | 'extra-large'; // Display size for question image
  questionType?: 'multiple-choice' | 'drag-order'; // Default: 'multiple-choice'
  correctAnswer: number; // 1-4 (ignored for drag-order)
  explanation: string;
  explanationImageUrl?: string; // Explanation image URL
  skills: string[]; // Skills tested by this question (renamed from topics)
  tags: string[]; // Broader categorization tags
  difficulty?: 'easy' | 'medium' | 'hard' | null; // Question difficulty level
  notes?: string; // Admin notes for this question
  points?: number; // Points for this question (default: 2)
  passageId?: string; // Reference to shared passage for grouped questions
  passage?: Passage; // Joined passage data
  sectionId?: string; // Section this question belongs to (within a test)
  sectionName?: string; // Joined section name for display
}

export interface TestSection {
  id: string;
  testId: string;
  name: string;
  description?: string;
  referenceImageUrl?: string; // Section-specific reference sheet
  displayOrder: number;
  questionCount?: number; // computed field
}

export interface Test {
  id: string;
  name: string;
  description?: string;
  scaledScoreTable?: { [rawScore: number]: number }; // raw score -> scaled score mapping
  isActive: boolean;
  questionCount?: number; // computed field, not stored in DB
  subjectId: string; // Required - which subject this test belongs to
  subjectName?: string; // Joined field for display
  sections?: TestSection[]; // Sections for this test
  createdAt?: string;
  updatedAt?: string;
}

export interface TestQuestion {
  id: string;
  testId: string;
  questionId: string;
  displayOrder?: number;
  sectionId?: string; // Which section this question belongs to
}

export interface GraphPoint {
  x: number;
  y: number;
  isOpen: boolean;
}

export interface GraphLine {
  id: string;
  color: string;
  isDashed: boolean;
  points: GraphPoint[];
  shade?: 'above' | 'below' | null;
}

export interface GraphData {
  lines: GraphLine[];
  gridBounds: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  };
}

export interface PassageHighlight {
  id: string;
  startOffset: number; // Character offset in passage text
  endOffset: number;
  color: string; // Highlight color
  note?: string; // Optional annotation text
}

export interface QuizSession {
  testId?: string; // ID of the test being taken
  testMode?: 'practice' | 'test'; // How the test is being taken
  currentQuestionIndex: number;
  currentSectionIndex: number; // Track which section user is in
  userAnswers: { [questionId: string]: number | null };
  checkedAnswers: { [questionId: string]: number[] }; // Array of checked answers
  firstAttemptAnswers: { [questionId: string]: number | null }; // First attempt answer (for tracking)
  dragOrderAnswers: { [questionId: string]: string[] }; // Ordered array of answer strings for drag-order questions
  questionTimes: { [questionId: string]: number }; // time spent in seconds
  drawings: { [questionId: string]: string }; // base64 encoded canvas data
  graphs: { [questionId: string]: GraphData }; // Graph data per question
  markedForReview: { [questionId: string]: boolean }; // Questions marked for review
  passageHighlights: { [passageId: string]: PassageHighlight[] }; // Highlights on passages
  startTime: number;
  lastQuestionStartTime: number;
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  totalDisplayQuestions: number; // Logical count where part-groups = 1
  earnedPoints: number;
  totalPoints: number;
  averageTime: number;
  missedOnFirstAttemptCount: number; // Count of questions missed on first attempt
  questionResults: {
    questionId: string;
    userAnswer: number | null;
    correctAnswer: number;
    isCorrect: boolean;
    timeSpent: number;
    skills: string[]; // Skills tested (renamed from topics)
    points: number;
    firstAttemptAnswer: number | null; // What they answered on first attempt
    missedOnFirstAttempt: boolean; // True if first attempt was wrong
    questionType?: 'multiple-choice' | 'drag-order';
    dragOrderAnswer?: string[]; // The student's ordering (for drag-order)
    dragOrderCorrect?: string[]; // The correct ordering (for drag-order)
  }[];
  skillAccuracy: {
    [skill: string]: {
      correct: number;
      total: number;
      percentage: number;
    };
  };
}

export interface BugReport {
  id: string;
  questionId: string | null;
  testId: string | null;
  questionNumber: number | null;
  description: string;
  screenshotUrl: string | null;
  status: 'open' | 'reviewed' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  color: string; // Hex color code for the subject
  isActive: boolean;
  displayOrder: number;
  testCount?: number; // computed field, not stored in DB
  questionCount?: number; // computed field for question bank
  createdAt?: string;
  updatedAt?: string;
}
