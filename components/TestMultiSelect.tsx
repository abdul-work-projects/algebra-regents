"use client";

import { useState, useRef, useEffect } from "react";
import { Test } from "@/lib/types";

interface TestMultiSelectProps {
  tests: Test[];
  selectedTestIds: string[];
  onChange: (testIds: string[]) => void;
  placeholder?: string;
}

export default function TestMultiSelect({
  tests,
  selectedTestIds,
  onChange,
  placeholder = "Select tests...",
}: TestMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTests = tests.filter((test) =>
    test.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTests = tests.filter((test) => selectedTestIds.includes(test.id));

  const toggleTest = (testId: string) => {
    if (selectedTestIds.includes(testId)) {
      onChange(selectedTestIds.filter((id) => id !== testId));
    } else {
      onChange([...selectedTestIds, testId]);
    }
  };

  const removeTest = (testId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedTestIds.filter((id) => id !== testId));
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected tests display / trigger */}
      <div
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={`min-h-[38px] px-2 py-1.5 border rounded-lg cursor-pointer transition-all dark:bg-neutral-800 ${
          isOpen
            ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
            : "border-gray-300 dark:border-neutral-600 hover:border-gray-400 dark:hover:border-neutral-500"
        }`}
      >
        {selectedTests.length === 0 ? (
          <span className="text-gray-400 dark:text-neutral-500 text-sm">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {selectedTests.map((test) => (
              <span
                key={test.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded text-xs font-medium"
              >
                {test.name}
                <button
                  onClick={(e) => removeTest(test.id, e)}
                  className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100 dark:border-neutral-700">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tests..."
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-neutral-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400"
            />
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredTests.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-neutral-400">No tests found</div>
            ) : (
              filteredTests.map((test) => {
                const isSelected = selectedTestIds.includes(test.id);
                return (
                  <div
                    key={test.id}
                    onClick={() => toggleTest(test.id)}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                      isSelected ? "bg-blue-50 dark:bg-blue-900/30" : "hover:bg-gray-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-gray-300 dark:border-neutral-600 pointer-events-none"
                    />
                    <span className="text-sm text-gray-700 dark:text-neutral-300 flex-1">{test.name}</span>
                    {!test.isActive && (
                      <span className="text-xs text-gray-400 dark:text-neutral-500">(inactive)</span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-neutral-500">
                      {test.questionCount || 0} Q
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
