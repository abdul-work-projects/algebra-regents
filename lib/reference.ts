import { Question, TestSection } from './types';

// Resolve which reference image to show for a question
// Priority: question-level > section-level > undefined (falls back to default in modal)
export function resolveReferenceImage(
  question: Question,
  section?: TestSection
): string | undefined {
  return question.referenceImageUrl || section?.referenceImageUrl || undefined;
}
