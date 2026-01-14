export interface Question {
  id: string;
  questionText?: string; // Optional question text (can have text, image, or both)
  imageFilename?: string; // Optional question image (can have text, image, or both)
  referenceImageUrl?: string; // Reference image URL
  answers: string[];
  answerImageUrls?: (string | undefined)[]; // Optional image URLs for each answer (1-4), can be undefined to preserve indices
  correctAnswer: number; // 1-4
  explanation: string;
  explanationImageUrl?: string; // Explanation image URL
  topics: string[];
  points?: number; // Points for this question (default: 2)
}

export interface QuizSession {
  currentQuestionIndex: number;
  userAnswers: { [questionId: string]: number | null };
  checkedAnswers: { [questionId: string]: number[] }; // Array of checked answers
  questionTimes: { [questionId: string]: number }; // time spent in seconds
  drawings: { [questionId: string]: string }; // base64 encoded canvas data
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
  questionResults: {
    questionId: string;
    userAnswer: number | null;
    correctAnswer: number;
    isCorrect: boolean;
    timeSpent: number;
    topics: string[];
    points: number;
  }[];
  topicAccuracy: {
    [topic: string]: {
      correct: number;
      total: number;
      percentage: number;
    };
  };
}
