'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import MathText from './MathText';

interface SortableItemProps {
  id: string;
  index: number;
  text: string;
  imageUrl?: string;
  isChecked: boolean;
  isCorrectPosition: boolean;
  disabled: boolean;
}

function SortableItem({ id, index, text, imageUrl, isChecked, isCorrectPosition, disabled }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    fontFamily: "'Times New Roman', Times, serif",
  };

  let borderClass = 'border-gray-300 dark:border-gray-600';
  let bgClass = 'bg-white dark:bg-gray-800';

  if (isChecked) {
    if (isCorrectPosition) {
      borderClass = 'border-green-500 dark:border-green-400';
      bgClass = 'bg-green-50 dark:bg-green-900/30';
    } else {
      borderClass = 'border-rose-500 dark:border-rose-400';
      bgClass = 'bg-rose-50 dark:bg-rose-900/30';
    }
  }

  if (isDragging) {
    bgClass = 'bg-blue-50 dark:bg-blue-900/30';
    borderClass = 'border-blue-400 dark:border-blue-500';
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 ${borderClass} ${bgClass} transition-colors ${
        isDragging ? 'shadow-lg z-10 opacity-90' : ''
      } ${disabled ? '' : 'cursor-grab active:cursor-grabbing'}`}
    >
      {/* Drag handle */}
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 touch-none"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 3h2v2H9V3zm4 0h2v2h-2V3zM9 7h2v2H9V7zm4 0h2v2h-2V7zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2z" />
          </svg>
        </div>
      )}

      {/* Position number */}
      <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
        isChecked
          ? isCorrectPosition
            ? 'bg-green-500 dark:bg-green-600 text-white'
            : 'bg-rose-500 dark:bg-rose-600 text-white'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
      }`}>
        {index + 1}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {text && <MathText text={text} className="text-left" />}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={`Option ${index + 1}`}
            className="max-w-full h-auto rounded border border-gray-300 dark:border-gray-600 mt-1"
          />
        )}
      </div>

      {/* Status indicator */}
      {isChecked && (
        <div className="flex-shrink-0">
          {isCorrectPosition ? (
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

interface DragOrderAnswerProps {
  items: string[]; // Current order of items
  answerImageUrls?: (string | undefined)[]; // Optional images for answers
  correctOrder: string[]; // The correct ordering
  isChecked: boolean;
  onOrderChange: (newOrder: string[]) => void;
  onCheck: () => void;
  canAttempt: boolean;
}

export default function DragOrderAnswer({
  items,
  answerImageUrls,
  correctOrder,
  isChecked,
  onOrderChange,
  onCheck,
  canAttempt,
}: DragOrderAnswerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Create stable IDs for items (use index-based since items can have duplicates)
  const itemIds = items.map((_, i) => `item-${i}`);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = itemIds.indexOf(active.id as string);
      const newIndex = itemIds.indexOf(over.id as string);
      const newItems = arrayMove(items, oldIndex, newIndex);
      onOrderChange(newItems);
    }
  };

  const isCorrect = JSON.stringify(items) === JSON.stringify(correctOrder);

  // Build a map from item text to its correct index for position checking
  const getIsCorrectPosition = (itemText: string, currentIndex: number): boolean => {
    return correctOrder[currentIndex] === itemText;
  };

  return (
    <div className="space-y-2 relative z-[60]" style={{ pointerEvents: 'auto' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Drag items into the correct order:
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item, index) => (
              <SortableItem
                key={itemIds[index]}
                id={itemIds[index]}
                index={index}
                text={item}
                imageUrl={answerImageUrls?.[correctOrder.indexOf(item)]}
                isChecked={isChecked}
                isCorrectPosition={getIsCorrectPosition(item, index)}
                disabled={isChecked}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Check button */}
      {!isChecked && canAttempt && (
        <button
          onClick={onCheck}
          className="mt-3 px-4 py-2 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 active:scale-95 text-white dark:text-black text-sm font-bold rounded-lg shadow-md transition-all"
        >
          CHECK ORDER
        </button>
      )}

      {/* Result message */}
      {isChecked && (
        <div className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium ${
          isCorrect
            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700'
            : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-700'
        }`}>
          {isCorrect ? 'Correct! Items are in the right order.' : (
            <div>
              <p>Incorrect. The correct order is:</p>
              <ol className="mt-1.5 ml-4 list-decimal space-y-0.5">
                {correctOrder.map((item, i) => (
                  <li key={i}>
                    <MathText text={item} className="inline" />
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
