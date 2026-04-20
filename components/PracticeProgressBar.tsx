'use client';

import { useEffect, useRef } from 'react';
import { Question, QuizSession } from '@/lib/types';

interface PracticeProgressBarProps {
  questions: Question[];
  session: QuizSession;
  revealedIds: Set<string>;
}

function isAnswered(q: Question, s: QuizSession): boolean {
  if (q.questionType === 'drag-order') {
    return (s.dragOrderAnswers[q.id]?.length ?? 0) > 0;
  }
  return s.userAnswers[q.id] != null;
}

function isCorrect(q: Question, s: QuizSession): boolean {
  if (q.questionType === 'drag-order') {
    const order = s.dragOrderAnswers[q.id];
    return !!order && JSON.stringify(order) === JSON.stringify(q.answers);
  }
  const checked = s.checkedAnswers[q.id] || [];
  const effective = checked.length > 0 ? checked[checked.length - 1] : s.userAnswers[q.id];
  return effective === q.correctAnswer;
}

export default function PracticeProgressBar({ questions, session, revealedIds }: PracticeProgressBarProps) {
  const currentRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentRef.current) return;
    currentRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [session.currentQuestionIndex]);

  // When a new question is revealed (user clicks Next), auto-scroll the latest marker into view.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [revealedIds.size]);

  // Only count revealed questions so the bar matches the user's progress-through-Next.
  let correctCount = 0;
  let wrongCount = 0;
  for (const q of questions) {
    if (!revealedIds.has(q.id)) continue;
    if (!isAnswered(q, session)) continue;
    if (isCorrect(q, session)) correctCount++;
    else wrongCount++;
  }

  return (
    <div className="hidden lg:flex fixed right-2 top-28 z-[201] flex-col items-center">
      <span className="text-[8px] font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-wider text-center mb-1">
        Progress
      </span>

      {/* Counts */}
      <div className="flex items-center gap-2 mb-2 text-xs font-bold tabular-nums">
        <span className="text-green-600 dark:text-green-400">✓ {correctCount}</span>
        <span className="text-rose-600 dark:text-rose-400">✗ {wrongCount}</span>
      </div>

      {/* Vertical markers — scrollable when list exceeds viewport */}
      <div
        ref={listRef}
        className="flex flex-col items-center gap-1.5 overflow-y-auto max-h-[60vh] pr-0.5"
        style={{ scrollbarWidth: 'none' }}
      >
        {questions.map((q, idx) => {
          const revealed = revealedIds.has(q.id);
          if (!revealed) return null;
          const answered = isAnswered(q, session);
          const correct = answered && isCorrect(q, session);
          const isCurrent = idx === session.currentQuestionIndex;

          let colorClass = 'bg-white dark:bg-neutral-800 border-2 border-gray-300 dark:border-neutral-600 text-gray-400 dark:text-neutral-500';
          if (answered) {
            colorClass = correct
              ? 'bg-green-500 border-2 border-green-500 text-white'
              : 'bg-rose-500 border-2 border-rose-500 text-white';
          }
          const ring = isCurrent
            ? 'ring-2 ring-blue-400 dark:ring-blue-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-neutral-950'
            : '';

          return (
            <div
              key={q.id}
              ref={isCurrent ? currentRef : null}
              title={`Question ${idx + 1}${answered ? (correct ? ' — correct' : ' — incorrect') : ''}`}
              className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${colorClass} ${ring}`}
            >
              {answered && (correct ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
