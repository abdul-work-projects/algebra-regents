export interface Question {
  id: string;
  imageFilename: string;
  referenceImageUrl?: string; // Reference image URL
  answers: string[];
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
