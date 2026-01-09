import { Question, QuizSession, QuizResult } from './types';

export function calculateResults(
  questions: Question[],
  session: QuizSession
): QuizResult {
  let correctCount = 0;
  const questionResults = questions.map((question) => {
    const userAnswer = session.userAnswers[question.id] || null;
    const isCorrect = userAnswer === question.correctAnswer;
    if (isCorrect) correctCount++;

    return {
      questionId: question.id,
      userAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      timeSpent: session.questionTimes[question.id] || 0,
      topics: question.topics,
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
    averageTime,
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
