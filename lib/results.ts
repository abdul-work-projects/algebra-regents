import { Question, QuizSession, QuizResult } from './types';

// Default Raw Score to Scaled Score mapping table (fallback if test doesn't have one)
const defaultRawToScaledScoreMap: { [key: number]: number } = {
  82: 100, 81: 100, 80: 98, 79: 97, 78: 95, 77: 94, 76: 93, 75: 92, 74: 90, 73: 89,
  72: 88, 71: 87, 70: 86, 69: 86, 68: 85, 67: 84, 66: 83, 65: 83, 64: 82, 63: 81,
  62: 81, 61: 80, 60: 79, 59: 79, 58: 78, 57: 78, 56: 77, 55: 77, 54: 76, 53: 76,
  52: 75, 51: 75, 50: 74, 49: 74, 48: 73, 47: 73, 46: 73, 45: 72, 44: 72, 43: 71,
  42: 71, 41: 70, 40: 70, 39: 70, 38: 69, 37: 69, 36: 68, 35: 68, 34: 67, 33: 67,
  32: 66, 31: 66, 30: 66, 29: 65, 28: 64, 27: 63, 26: 63, 25: 62, 24: 61, 23: 60,
  22: 59, 21: 58, 20: 57, 19: 56, 18: 55, 17: 53, 16: 52, 15: 50, 14: 48, 13: 47,
  12: 45, 11: 42, 10: 40, 9: 37, 8: 34, 7: 31, 6: 28, 5: 24, 4: 20, 3: 16, 2: 11, 1: 6, 0: 0
};

// Convert raw score to scaled score using custom or default table
export function getScaledScore(
  rawScore: number,
  customScoreTable?: { [key: number]: number }
): number {
  const scoreTable = customScoreTable || defaultRawToScaledScoreMap;
  const maxRaw = Math.max(...Object.keys(scoreTable).map(Number));

  // Clamp raw score to valid range
  const clampedScore = Math.max(0, Math.min(maxRaw, rawScore));

  // If exact match exists, use it
  if (scoreTable[clampedScore] !== undefined) {
    return scoreTable[clampedScore];
  }

  // Otherwise, find the closest lower value (interpolation fallback)
  const sortedKeys = Object.keys(scoreTable).map(Number).sort((a, b) => a - b);
  for (let i = sortedKeys.length - 1; i >= 0; i--) {
    if (sortedKeys[i] <= clampedScore) {
      return scoreTable[sortedKeys[i]];
    }
  }

  return 0;
}

// Get the default score table (for UI display or copying)
export function getDefaultScoreTable(): { [key: number]: number } {
  return { ...defaultRawToScaledScoreMap };
}

export function calculateResults(
  questions: Question[],
  session: QuizSession
): QuizResult {
  let correctCount = 0;
  let earnedPoints = 0;
  let totalPoints = 0;
  let missedOnFirstAttemptCount = 0;

  // Ensure firstAttemptAnswers exists (backward compatibility)
  const firstAttemptAnswers = session.firstAttemptAnswers || {};

  const questionResults = questions.map((question) => {
    const userAnswer = session.userAnswers[question.id] ?? null;
    // Only correct if user actually answered and the answer matches
    const isCorrect = userAnswer !== null && userAnswer === question.correctAnswer;
    const points = question.points || 1; // Default 1 point per question

    // First attempt tracking
    // missedOnFirstAttempt is only true when first attempt was wrong BUT final answer is correct
    // (i.e., student recovered on second attempt)
    const firstAttemptAnswer = firstAttemptAnswers[question.id] ?? null;
    const missedOnFirstAttempt = firstAttemptAnswer !== null && firstAttemptAnswer !== question.correctAnswer && isCorrect;

    if (missedOnFirstAttempt) {
      missedOnFirstAttemptCount++;
    }

    totalPoints += points;
    if (isCorrect) {
      correctCount++;
      earnedPoints += points;
    }

    return {
      questionId: question.id,
      userAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      timeSpent: session.questionTimes[question.id] || 0,
      topics: question.topics,
      points,
      firstAttemptAnswer,
      missedOnFirstAttempt,
    };
  });

  // Calculate topic accuracy
  const topicMap: {
    [topic: string]: { correct: number; total: number };
  } = {};

  questionResults.forEach((result) => {
    result.topics.forEach((topic) => {
      if (!topicMap[topic]) {
        topicMap[topic] = { correct: 0, total: 0 };
      }
      topicMap[topic].total++;
      if (result.isCorrect) {
        topicMap[topic].correct++;
      }
    });
  });

  const topicAccuracy: QuizResult['topicAccuracy'] = {};
  Object.entries(topicMap).forEach(([topic, stats]) => {
    topicAccuracy[topic] = {
      correct: stats.correct,
      total: stats.total,
      percentage: Math.round((stats.correct / stats.total) * 100),
    };
  });

  // Calculate average time
  const totalTime = Object.values(session.questionTimes).reduce(
    (sum, time) => sum + time,
    0
  );
  const averageTime = Math.round(totalTime / questions.length);

  return {
    score: correctCount,
    totalQuestions: questions.length,
    earnedPoints,
    totalPoints,
    averageTime,
    missedOnFirstAttemptCount,
    questionResults,
    topicAccuracy,
  };
}

export function getPerformanceLevel(percentage: number): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (percentage >= 80) {
    return {
      label: 'Excellent',
      color: 'text-green-800',
      bgColor: 'bg-green-100 border-green-300',
    };
  } else if (percentage >= 65) {
    return {
      label: 'Good',
      color: 'text-blue-800',
      bgColor: 'bg-blue-100 border-blue-300',
    };
  } else if (percentage >= 50) {
    return {
      label: 'Fair',
      color: 'text-yellow-800',
      bgColor: 'bg-yellow-100 border-yellow-300',
    };
  } else {
    return {
      label: 'Needs Practice',
      color: 'text-red-800',
      bgColor: 'bg-red-100 border-red-300',
    };
  }
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

// Get performance level based on scaled score
export function getScoreComment(scaledScore: number): {
  status: string;
  message: string;
  color: string;
  bgColor: string;
  circleColor: string;
} {
  if (scaledScore >= 85) {
    return {
      status: 'Pass Advanced',
      message: 'Outstanding performance! You have mastered the material.',
      color: 'text-green-700',
      bgColor: 'bg-green-50 border-green-500',
      circleColor: 'bg-green-500',
    };
  } else if (scaledScore >= 65) {
    return {
      status: 'Pass',
      message: 'Great job! You have demonstrated solid understanding.',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50 border-blue-500',
      circleColor: 'bg-blue-500',
    };
  } else if (scaledScore >= 56) {
    return {
      status: 'Failed, but close',
      message: 'You\'re almost there! Review the material and try again.',
      color: 'text-orange-700',
      bgColor: 'bg-orange-50 border-orange-500',
      circleColor: 'bg-orange-500',
    };
  } else {
    return {
      status: 'Failed',
      message: 'Keep practicing! Review the material and try again.',
      color: 'text-rose-700',
      bgColor: 'bg-rose-50 border-rose-500',
      circleColor: 'bg-rose-500',
    };
  }
}
