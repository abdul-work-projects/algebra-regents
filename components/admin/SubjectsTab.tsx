import { Subject } from "@/lib/types";

interface SubjectsTabProps {
  subjects: Subject[];
  isLoading: boolean;
  onCreateSubject: () => void;
  onEditSubject: (subject: Subject) => void;
  onDeleteSubject: (subject: Subject) => void;
}

export default function SubjectsTab({
  subjects,
  isLoading,
  onCreateSubject,
  onEditSubject,
  onDeleteSubject,
}: SubjectsTabProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-neutral-100 tracking-tight">
            Subjects
          </h2>
          <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">
            {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onCreateSubject}
          className="px-4 py-2.5 text-sm font-bold bg-black text-white dark:bg-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 transition-all"
        >
          + NEW SUBJECT
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-neutral-400">
          Loading subjects...
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-neutral-400">
          No subjects yet. Create your first subject to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl shadow-sm p-4 hover:border-gray-200 dark:hover:border-neutral-700 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 dark:text-neutral-100 truncate">
                      {subject.name}
                    </h3>
                    {!subject.isActive && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  {subject.description && (
                    <p className="text-sm text-gray-600 dark:text-neutral-400 truncate mb-2">
                      {subject.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {subject.testCount || 0} tests
                    </span>
                    <span className="text-gray-400 dark:text-neutral-500">
                      Order: {subject.displayOrder}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => onEditSubject(subject)}
                    className="p-2 text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full active:scale-95 transition-all"
                    title="Edit subject"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDeleteSubject(subject)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full active:scale-95 transition-all"
                    title="Delete subject"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
