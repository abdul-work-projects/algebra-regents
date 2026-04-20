const TEST_ATTEMPTS_KEY = 'algebra-regents-test-attempts';

export interface TestAttempt {
  id: string;                // stable across /results reloads (derived from session.startTime)
  testId: string;
  testName: string;
  completedAt: number;       // ms epoch
  rawScore: number;
  scaledScore: number;
  earnedPoints: number;
  totalPoints: number;
  correctCount: number;
  totalQuestions: number;
  accuracyPercent: number;
  timeSpentSeconds: number;
  testMode?: 'practice' | 'test';
}

export const loadTestAttempts = (): TestAttempt[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TEST_ATTEMPTS_KEY);
    return raw ? (JSON.parse(raw) as TestAttempt[]) : [];
  } catch (error) {
    console.error('Error loading test attempts:', error);
    return [];
  }
};

const writeAll = (list: TestAttempt[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TEST_ATTEMPTS_KEY, JSON.stringify(list));
  } catch (error) {
    console.error('Error saving test attempts:', error);
  }
};

// Idempotent upsert: if an attempt with the same id already exists, update it in place.
export const saveTestAttempt = (attempt: TestAttempt): void => {
  const list = loadTestAttempts();
  const idx = list.findIndex((a) => a.id === attempt.id);
  if (idx === -1) {
    list.unshift(attempt);
  } else {
    list[idx] = attempt;
  }
  writeAll(list);
};

export const clearAllTestAttempts = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TEST_ATTEMPTS_KEY);
  } catch (error) {
    console.error('Error clearing test attempts:', error);
  }
};

export const getAttemptsForTest = (testId: string): TestAttempt[] => {
  return loadTestAttempts()
    .filter((a) => a.testId === testId)
    .sort((a, b) => b.completedAt - a.completedAt);
};

export const getTestAttemptCount = (): number => loadTestAttempts().length;
