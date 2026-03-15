import { Question } from './types';

export interface QuestionDisplayInfo {
  flatIndex: number;
  displayNumber: number;       // 1-based logical question number
  partLabel: string | null;    // null for non-parts, 'a'/'b'/'c' for parts
  displayLabel: string;        // "5" or "5a" — ready to render
  groupId: string | null;      // passageId
  groupType: 'grouped' | 'parts' | null;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

export interface GroupingInfo {
  totalDisplayQuestions: number;
  questionMap: QuestionDisplayInfo[];
  displayToFlatIndices: number[][]; // displayNumber (0-based) -> flat indices
}

const PART_LABELS = 'abcdefghijklmnopqrstuvwxyz';

export function computeGroupingInfo(questions: Question[]): GroupingInfo {
  const questionMap: QuestionDisplayInfo[] = [];
  const displayToFlatIndices: number[][] = [];
  let currentDisplayNumber = 0;

  // Track which passageIds we've already processed for 'parts' type
  const processedPartGroups = new Set<string>();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const passageId = q.passageId || null;
    const passageType = q.passage?.type || null;

    if (passageType === 'parts' && passageId) {
      if (processedPartGroups.has(passageId)) {
        // Already assigned a display number for this group — find it
        const existingEntry = questionMap.find(
          (m) => m.groupId === passageId && m.groupType === 'parts'
        );
        const displayNum = existingEntry!.displayNumber;
        const displayIdx = displayNum - 1;

        // Count how many parts already in this group
        const partCount = displayToFlatIndices[displayIdx].length;
        const partLabel = PART_LABELS[partCount] || String(partCount + 1);

        displayToFlatIndices[displayIdx].push(i);

        questionMap.push({
          flatIndex: i,
          displayNumber: displayNum,
          partLabel,
          displayLabel: `${displayNum}${partLabel}`,
          groupId: passageId,
          groupType: 'parts',
          isFirstInGroup: false,
          isLastInGroup: false, // will fix below
        });
      } else {
        // First question in this parts group
        processedPartGroups.add(passageId);
        currentDisplayNumber++;
        const displayIdx = currentDisplayNumber - 1;
        displayToFlatIndices[displayIdx] = [i];

        questionMap.push({
          flatIndex: i,
          displayNumber: currentDisplayNumber,
          partLabel: 'a',
          displayLabel: `${currentDisplayNumber}a`,
          groupId: passageId,
          groupType: 'parts',
          isFirstInGroup: true,
          isLastInGroup: false, // will fix below
        });
      }
    } else {
      // Regular question or 'grouped' type — each gets its own display number
      currentDisplayNumber++;
      const displayIdx = currentDisplayNumber - 1;
      displayToFlatIndices[displayIdx] = [i];

      questionMap.push({
        flatIndex: i,
        displayNumber: currentDisplayNumber,
        partLabel: null,
        displayLabel: `${currentDisplayNumber}`,
        groupId: passageId,
        groupType: passageType === 'grouped' ? 'grouped' : null,
        isFirstInGroup: true,
        isLastInGroup: true,
      });
    }
  }

  // Fix isLastInGroup for parts groups
  for (const indices of displayToFlatIndices) {
    if (indices.length > 1) {
      // Mark the last flat index in the group
      const lastFlatIdx = indices[indices.length - 1];
      const entry = questionMap.find(
        (m) => m.flatIndex === lastFlatIdx && m.groupType === 'parts'
      );
      if (entry) {
        entry.isLastInGroup = true;
      }
      // Also ensure first is marked
      const firstFlatIdx = indices[0];
      const firstEntry = questionMap.find(
        (m) => m.flatIndex === firstFlatIdx && m.groupType === 'parts'
      );
      if (firstEntry) {
        firstEntry.isFirstInGroup = true;
      }
    }
  }

  return {
    totalDisplayQuestions: currentDisplayNumber,
    questionMap,
    displayToFlatIndices,
  };
}

/** Get all flat indices for the same display group as the given flat index */
export function getGroupFlatIndices(
  groupingInfo: GroupingInfo,
  flatIndex: number
): number[] {
  const info = groupingInfo.questionMap[flatIndex];
  if (!info) return [flatIndex];
  const displayIdx = info.displayNumber - 1;
  return groupingInfo.displayToFlatIndices[displayIdx] || [flatIndex];
}

/** Check if a display group (by display number, 1-based) is fully answered */
export function isDisplayGroupAnswered(
  groupingInfo: GroupingInfo,
  displayNumber: number,
  userAnswers: { [questionId: string]: number | null },
  dragOrderAnswers: { [questionId: string]: string[] },
  questions: Question[]
): boolean {
  const displayIdx = displayNumber - 1;
  const flatIndices = groupingInfo.displayToFlatIndices[displayIdx];
  if (!flatIndices) return false;

  return flatIndices.every((fi) => {
    const q = questions[fi];
    if (!q) return false;
    if (q.questionType === 'drag-order') {
      return (dragOrderAnswers[q.id]?.length || 0) > 0;
    }
    return userAnswers[q.id] !== null && userAnswers[q.id] !== undefined;
  });
}
