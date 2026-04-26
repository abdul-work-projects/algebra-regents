import { Question, TestSection, QuestionDocument } from './types';

// Resolve the active reference documents.
// Priority: question-level docs > section-level docs > [] (modal then shows the default sheet).
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
  return [];
}
