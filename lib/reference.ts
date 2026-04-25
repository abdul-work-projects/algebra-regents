import { Question, TestSection, QuestionDocument } from './types';

// Resolve which reference image to show for a question
// Priority: question-level > section-level > undefined (falls back to default in modal)
export function resolveReferenceImage(
  question: Question,
  section?: TestSection
): string | undefined {
  return question.referenceImageUrl || section?.referenceImageUrl || undefined;
}

// Resolve the active reference documents (multi-doc).
// Priority: question-level docs > section-level docs > legacy single image url > [].
export function resolveReferenceDocs(
  question: Question,
  section?: TestSection
): QuestionDocument[] {
  if (question.referenceDocuments && question.referenceDocuments.length > 0) {
    return question.referenceDocuments;
  }
  if (section?.referenceDocuments && section.referenceDocuments.length > 0) {
    return section.referenceDocuments;
  }
  if (question.referenceImageUrl) {
    return [{ type: 'image', url: question.referenceImageUrl }];
  }
  if (section?.referenceImageUrl) {
    return [{ type: 'image', url: section.referenceImageUrl }];
  }
  return [];
}
