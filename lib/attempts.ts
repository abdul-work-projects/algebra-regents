import { Question, QuizSession } from './types';

const ATTEMPTS_KEY = 'algebra-regents-question-attempts';

export interface QuestionAttempt {
  userAnswer: number | null;
  firstAttemptAnswer: number | null;
  checkedAnswers: number[];
  dragOrderAnswer?: string[];
  isCorrect: boolean;
  timestamp: number;
  timeSpent: number;
}

export type AttemptsStore = { [questionId: string]: QuestionAttempt };

export const loadAttempts = (): AttemptsStore => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    return raw ? (JSON.parse(raw) as AttemptsStore) : {};
  } catch (error) {
    console.error('Error loading attempts from localStorage:', error);
    return {};
  }
};

export const saveAttempts = (store: AttemptsStore): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(store));
  } catch (error) {
    console.error('Error saving attempts to localStorage:', error);
  }
};

export const clearAllAttempts = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ATTEMPTS_KEY);
  } catch (error) {
    console.error('Error clearing attempts from localStorage:', error);
  }
};

export const getAttemptCount = (): number => {
  return Object.keys(loadAttempts()).length;
};

// Compute whether a question's answer is correct given the session state.
export const computeIsCorrect = (q: Question, session: QuizSession): boolean => {
  if (q.questionType === 'drag-order') {
    const order = session.dragOrderAnswers[q.id];
    return !!order && JSON.stringify(order) === JSON.stringify(q.answers);
  }
  const checked = session.checkedAnswers[q.id] || [];
  const effective = checked.length > 0 ? checked[checked.length - 1] : session.userAnswers[q.id];
  return effective === q.correctAnswer;
};

// Merge stored attempts into a freshly-created session so the question-navigation
// popup shows prior correct/incorrect markers and answers are pre-filled for retake.
export const mergeAttemptsIntoSession = (
  session: QuizSession,
  questions: Question[],
): QuizSession => {
  const attempts = loadAttempts();
  const userAnswers = { ...session.userAnswers };
  const firstAttemptAnswers = { ...session.firstAttemptAnswers };
  const checkedAnswers = { ...session.checkedAnswers };
  const dragOrderAnswers = { ...session.dragOrderAnswers };

  for (const q of questions) {
    const a = attempts[q.id];
    if (!a) continue;
    if (a.userAnswer != null) userAnswers[q.id] = a.userAnswer;
    if (a.firstAttemptAnswer != null) firstAttemptAnswers[q.id] = a.firstAttemptAnswer;
    if (a.checkedAnswers.length > 0) checkedAnswers[q.id] = [...a.checkedAnswers];
    if (a.dragOrderAnswer && a.dragOrderAnswer.length > 0) {
      dragOrderAnswers[q.id] = [...a.dragOrderAnswer];
    }
  }

  return { ...session, userAnswers, firstAttemptAnswers, checkedAnswers, dragOrderAnswers };
};

// Persist all questions that have any state in the current session. Returns true if anything changed.
export const syncSessionToAttempts = (
  session: QuizSession,
  questions: Question[],
): boolean => {
  const store = loadAttempts();
  let changed = false;

  for (const q of questions) {
    const userAnswer = session.userAnswers[q.id] ?? null;
    const checked = session.checkedAnswers[q.id] || [];
    const firstAttemptAnswer = session.firstAttemptAnswers[q.id] ?? null;
    const dragOrder = session.dragOrderAnswers[q.id];
    const hasState = userAnswer !== null || checked.length > 0 || (dragOrder && dragOrder.length > 0);
    if (!hasState) continue;

    const next: QuestionAttempt = {
      userAnswer,
      firstAttemptAnswer,
      checkedAnswers: [...checked],
      dragOrderAnswer: dragOrder ? [...dragOrder] : undefined,
      isCorrect: computeIsCorrect(q, session),
      timestamp: Date.now(),
      timeSpent: session.questionTimes[q.id] ?? store[q.id]?.timeSpent ?? 0,
    };

    const prev = store[q.id];
    const unchanged =
      prev &&
      prev.userAnswer === next.userAnswer &&
      prev.firstAttemptAnswer === next.firstAttemptAnswer &&
      JSON.stringify(prev.checkedAnswers) === JSON.stringify(next.checkedAnswers) &&
      JSON.stringify(prev.dragOrderAnswer) === JSON.stringify(next.dragOrderAnswer);
    if (unchanged) continue;

    store[q.id] = next;
    changed = true;
  }

  if (changed) saveAttempts(store);
  return changed;
};
