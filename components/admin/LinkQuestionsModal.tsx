import { useState } from "react";
import { DatabaseQuestion } from "@/lib/supabase";
import MathText from "@/components/MathText";
import PassageTextEditor from "@/components/admin/PassageTextEditor";
import DocumentsEditor, { DocumentDraft } from "@/components/admin/DocumentsEditor";

interface LinkQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedQuestions: string[];
  questions: DatabaseQuestion[];
  onConfirm: (
    passageAboveText: string,
    passageText: string,
    passageDocuments: DocumentDraft[],
    type: 'grouped' | 'parts',
  ) => Promise<void>;
}

export default function LinkQuestionsModal({
  isOpen,
  onClose,
  selectedQuestions,
  questions,
  onConfirm,
}: LinkQuestionsModalProps) {
  const [passageAboveText, setPassageAboveText] = useState("");
  const [passageText, setPassageText] = useState("");
  const [passageDocuments, setPassageDocuments] = useState<DocumentDraft[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [passageType, setPassageType] = useState<'grouped' | 'parts'>('grouped');

  if (!isOpen) return null;

  const hasAnyDoc = passageDocuments.some(
    (d) => (d.type === 'image' && (d.file || d.url)) || (d.type === 'pdf' && d.url),
  );

  const handleClose = () => {
    setPassageAboveText("");
    setPassageText("");
    setPassageDocuments([]);
    setPassageType('grouped');
    onClose();
  };

  const handleConfirm = async () => {
    if (!passageAboveText.trim() && !passageText.trim() && !hasAnyDoc) return;
    setIsLinking(true);
    try {
      await onConfirm(passageAboveText, passageText, passageDocuments, passageType);
      setPassageAboveText("");
      setPassageText("");
      setPassageDocuments([]);
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-neutral-800 bg-purple-50 dark:bg-purple-900/30">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-full">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-neutral-100">Group Questions</h2>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          <p className="text-sm text-gray-600 dark:text-neutral-400 mb-4">
            Add a shared passage for these questions. The passage will be displayed alongside each question when students take the quiz.
          </p>

          {/* Selected Questions Preview */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-neutral-950 rounded-2xl border border-gray-100 dark:border-neutral-800">
            <p className="text-xs font-bold text-gray-700 dark:text-neutral-300 mb-2">
              Selected Questions ({selectedQuestions.length}):
            </p>
            <div className="space-y-1">
              {selectedQuestions.map((id, idx) => {
                const q = questions.find((q) => q.id === id);
                const displayText = q?.name || q?.question_text || `Question ${idx + 1}`;
                return (
                  <div key={id} className="text-sm text-gray-900 dark:text-neutral-100 flex items-baseline gap-1 min-w-0">
                    <span className="shrink-0">{idx + 1}.</span>
                    <span className="line-clamp-2 min-w-0" style={{ fontSize: '0.875rem' }}><MathText text={displayText} className="inline [&_.katex]:!text-[0.875rem]" /></span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Type Selector */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-2">Group Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPassageType('grouped')}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-full transition-all ${passageType === 'grouped' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700'}`}
              >
                Grouped (split-pane)
              </button>
              <button
                type="button"
                onClick={() => setPassageType('parts')}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-full transition-all ${passageType === 'parts' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700'}`}
              >
                Parts (stacked, 1 question)
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
              {passageType === 'grouped'
                ? 'Each question navigates individually in a split-pane layout.'
                : 'All parts shown stacked on one page, navigated as a single question.'}
            </p>
          </div>

          {/* Passage container — mirrors QuestionForm shared-passage block */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300">Shared Passage</h3>
            <PassageTextEditor
              value={passageAboveText}
              onChange={setPassageAboveText}
              label="Passage Text (above image)"
              labelClassName="block text-xs font-medium text-blue-800 dark:text-blue-400 mb-1"
              placeholder="Text displayed above the passage (supports LaTeX)..."
              rows={3}
              inputClassName="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 font-mono"
            />
            <DocumentsEditor
              title="Passage Documents"
              value={passageDocuments}
              onChange={setPassageDocuments}
              emptyHint="Add images or PDFs that appear with the passage."
            />
            <PassageTextEditor
              value={passageText}
              onChange={setPassageText}
              label="Passage Text (below image)"
              labelClassName="block text-xs font-medium text-blue-800 dark:text-blue-400 mb-1"
              placeholder="Enter the shared passage or summary text..."
              rows={10}
              inputClassName="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 font-mono"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950">
          <button
            onClick={handleClose}
            disabled={isLinking}
            className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 rounded-full hover:border-black dark:hover:border-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLinking || (!passageAboveText.trim() && !passageText.trim() && !hasAnyDoc)}
            className="px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-full hover:bg-purple-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLinking ? "Linking..." : "Group Questions"}
          </button>
        </div>
      </div>
    </div>
  );
}
