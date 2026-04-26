'use client';

import { TestSection } from '@/lib/types';
import FormattedText from '@/components/FormattedText';

interface SectionHeaderProps {
  section: TestSection;
  sectionNumber: number;
  totalSections: number;
}

export default function SectionHeader({ section, sectionNumber, totalSections }: SectionHeaderProps) {
  return (
    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-xl">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-blue-900 dark:text-blue-200">
          {section.name}
        </h2>
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800/50 px-2 py-0.5 rounded-full">
          Part {sectionNumber} of {totalSections}
        </span>
      </div>
      {section.description && (
        <FormattedText
          text={section.description}
          className="text-sm text-blue-700 dark:text-blue-300 mt-1 text-left"
        />
      )}
      {section.questionCount !== undefined && (
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
          {section.questionCount} question{section.questionCount !== 1 ? 's' : ''} in this section
        </p>
      )}
    </div>
  );
}
