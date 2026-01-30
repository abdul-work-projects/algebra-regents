export interface Passage {
  id: string;
  passageText?: string;
  passageImageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Question {
  id: string;
  questionText?: string; // Optional question text (can have text, image, or both)
  imageFilename?: string; // Optional question image (can have text, image, or both)
  referenceImageUrl?: string; // Reference image URL
  answers: string[];
  answerImageUrls?: (string | undefined)[]; // Optional image URLs for each answer (1-4), can be undefined to preserve indices
  answerLayout?: 'grid' | 'list'; // 'grid' = 2x2, 'list' = 1x4 (default)
  correctAnswer: number; // 1-4
  explanation: string;
  explanationImageUrl?: string; // Explanation image URL
  skills: string[]; // Skills tested by this question (renamed from topics)
  tags: string[]; // Broader categorization tags
  difficulty?: 'easy' | 'medium' | 'hard' | null; // Question difficulty level
  points?: number; // Points for this question (default: 2)
  passageId?: string; // Reference to shared passage for grouped questions
  passage?: Passage; // Joined passage data
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
  createdAt?: string;
  updatedAt?: string;
}

export interface TestQuestion {
  id: string;
  testId: string;
  questionId: string;
  displayOrder?: number;
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

export interface QuizSession {
  testId?: string; // ID of the test being taken
  currentQuestionIndex: number;
  userAnswers: { [questionId: string]: number | null };
  checkedAnswers: { [questionId: string]: number[] }; // Array of checked answers
  firstAttemptAnswers: { [questionId: string]: number | null }; // First attempt answer (for tracking)
  questionTimes: { [questionId: string]: number }; // time spent in seconds
  drawings: { [questionId: string]: string }; // base64 encoded canvas data
  graphs: { [questionId: string]: GraphData }; // Graph data per question
  markedForReview: { [questionId: string]: boolean }; // Questions marked for review
  startTime: number;
  lastQuestionStartTime: number;
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
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
