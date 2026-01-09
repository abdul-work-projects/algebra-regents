import { QuizSession } from './types';

const STORAGE_KEY = 'algebra-regents-quiz-session';

export const saveSession = (session: QuizSession): void => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Error saving session to localStorage:', error);
    }
  }
};

export const loadSession = (): QuizSession | null => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as QuizSession;
      }
    } catch (error) {
      console.error('Error loading session from localStorage:', error);
    }
  }
  return null;
};

export const clearSession = (): void => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing session from localStorage:', error);
    }
  }
};

export const createNewSession = (): QuizSession => {
  const now = Date.now();
  return {
    currentQuestionIndex: 0,
    userAnswers: {},
    questionTimes: {},
    drawings: {},
    startTime: now,
    lastQuestionStartTime: now,
  };
};
