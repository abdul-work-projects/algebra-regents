import { QuizSession } from './types';

const STORAGE_KEY = 'algebra-regents-quiz-session';
const SKILL_PROGRESS_KEY = 'algebra-regents-skill-progress';

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
