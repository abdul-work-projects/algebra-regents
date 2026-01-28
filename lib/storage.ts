import { QuizSession } from './types';

const STORAGE_KEY = 'algebra-regents-quiz-session';
const SKILL_PROGRESS_KEY = 'algebra-regents-skill-progress';
const MARKED_FOR_REVIEW_KEY = 'algebra-regents-marked-for-review';
const SELECTED_SUBJECT_KEY = 'algebra-regents-selected-subject';

// Skill progress tracking
export interface SkillProgress {
  correct: number;
  wrong: number;
  attemptedQuestionIds: string[];
}

export interface AllSkillProgress {
  [skill: string]: SkillProgress;
}

export const loadSkillProgress = (): AllSkillProgress => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(SKILL_PROGRESS_KEY);
      if (stored) {
        return JSON.parse(stored) as AllSkillProgress;
      }
    } catch (error) {
      console.error('Error loading skill progress from localStorage:', error);
    }
  }
  return {};
};

export const saveSkillProgress = (progress: AllSkillProgress): void => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SKILL_PROGRESS_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving skill progress to localStorage:', error);
    }
  }
};

export const updateSkillProgress = (
  skill: string,
  questionId: string,
  isCorrect: boolean
): void => {
  const progress = loadSkillProgress();

  if (!progress[skill]) {
    progress[skill] = { correct: 0, wrong: 0, attemptedQuestionIds: [] };
  }

  // Only count if not already attempted
  if (!progress[skill].attemptedQuestionIds.includes(questionId)) {
    progress[skill].attemptedQuestionIds.push(questionId);
    if (isCorrect) {
      progress[skill].correct++;
    } else {
      progress[skill].wrong++;
    }
    saveSkillProgress(progress);
  }
};

export const resetSkillProgress = (skill?: string): void => {
  if (skill) {
    const progress = loadSkillProgress();
    delete progress[skill];
    saveSkillProgress(progress);
  } else {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SKILL_PROGRESS_KEY);
    }
  }
};

// Marked for review questions (persists across sessions for question bank)
export interface MarkedForReviewData {
  questionIds: Set<string>;
}

export const loadMarkedForReview = (): Set<string> => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(MARKED_FOR_REVIEW_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        return new Set(data as string[]);
      }
    } catch (error) {
      console.error('Error loading marked for review from localStorage:', error);
    }
  }
  return new Set();
};

export const saveMarkedForReview = (questionIds: Set<string>): void => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(MARKED_FOR_REVIEW_KEY, JSON.stringify(Array.from(questionIds)));
    } catch (error) {
      console.error('Error saving marked for review to localStorage:', error);
    }
  }
};

export const toggleMarkedForReview = (questionId: string): boolean => {
  const marked = loadMarkedForReview();
  const isNowMarked = !marked.has(questionId);
  if (isNowMarked) {
    marked.add(questionId);
  } else {
    marked.delete(questionId);
  }
  saveMarkedForReview(marked);
  return isNowMarked;
};

export const isQuestionMarkedForReview = (questionId: string): boolean => {
  const marked = loadMarkedForReview();
  return marked.has(questionId);
};

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

export const createNewSession = (testId?: string): QuizSession => {
  const now = Date.now();
  return {
    testId,
    currentQuestionIndex: 0,
    userAnswers: {},
    checkedAnswers: {},
    firstAttemptAnswers: {},
    questionTimes: {},
    drawings: {},
    graphs: {},
    markedForReview: {},
    startTime: now,
    lastQuestionStartTime: now,
  };
};

// Selected subject preference
export const saveSelectedSubject = (subjectId: string): void => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SELECTED_SUBJECT_KEY, subjectId);
    } catch (error) {
      console.error('Error saving selected subject to localStorage:', error);
    }
  }
};

export const loadSelectedSubject = (): string | null => {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(SELECTED_SUBJECT_KEY);
    } catch (error) {
      console.error('Error loading selected subject from localStorage:', error);
    }
  }
  return null;
};
