'use client';

import { useState, useEffect, useRef } from 'react';
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
  horizontalListSortingStrategy,
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
  horizontal: boolean;
}

function SortableItem({ id, index, text, imageUrl, isChecked, isCorrectPosition, disabled, horizontal }: SortableItemProps) {
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

  // Exam-style: bare "(N) text" with subtle background tint for state. Keep grab cursor for drag affordance.
  let textColor = 'text-gray-900 dark:text-neutral-100';
  let bgClass = 'hover:bg-gray-100 dark:hover:bg-neutral-800';
  if (isChecked) {
    if (isCorrectPosition) {
      textColor = 'text-green-700 dark:text-green-300';
      bgClass = 'bg-green-50 dark:bg-green-900/30';
    } else {
      textColor = 'text-rose-700 dark:text-rose-300';
      bgClass = 'bg-rose-50 dark:bg-rose-900/30';
    }
  }
  if (isDragging) {
    bgClass = 'bg-sky-50 dark:bg-sky-900/30';
  }

  const grabClass = disabled ? '' : 'cursor-grab active:cursor-grabbing touch-none';
  const draggingClass = isDragging ? 'shadow-md z-10 opacity-90' : '';

  if (horizontal) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`flex flex-col items-center gap-1 px-2 py-1 rounded-md min-w-[60px] transition-colors ${textColor} ${bgClass} ${draggingClass} ${grabClass}`}
      >
        <span className="shrink-0 text-sm">({index + 1})</span>
        <div className="text-center min-w-0">
          {text && <MathText text={text} className="text-sm" />}
          {imageUrl && (
            <img src={imageUrl} alt={`Option ${index + 1}`} className="max-w-[80px] h-auto rounded border border-gray-300 dark:border-neutral-600 mt-1" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-start gap-1.5 px-2 py-1 rounded-md transition-colors ${textColor} ${bgClass} ${draggingClass} ${grabClass}`}
    >
      <span className="shrink-0">({index + 1})</span>
      <div className="flex-1 min-w-0">
        {text && <MathText text={text} className="text-left" />}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={`Option ${index + 1}`}
            className="h-auto rounded border border-gray-300 dark:border-neutral-600 mt-1"
            style={{ maxWidth: '100%', display: 'block' }}
          />
        )}
      </div>
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
  orientation?: 'vertical' | 'horizontal';
}

export default function DragOrderAnswer({
  items,
  answerImageUrls,
  correctOrder,
  isChecked,
  onOrderChange,
  onCheck,
  canAttempt,
  orientation = 'vertical',
}: DragOrderAnswerProps) {
  const horizontal = orientation === 'horizontal';
  const idCounter = useRef(0);

  // Maintain internal state with stable IDs so dnd-kit animates correctly
  const [orderedItems, setOrderedItems] = useState(() =>
    items.map(text => ({ id: `item-${idCounter.current++}`, text }))
  );
  const lastEmittedRef = useRef<string[]>(items);

  // Sync from parent when items change externally (not from our own reorders)
  useEffect(() => {
    if (JSON.stringify(items) !== JSON.stringify(lastEmittedRef.current)) {
      setOrderedItems(items.map(text => ({ id: `item-${idCounter.current++}`, text })));
      lastEmittedRef.current = items;
    }
  }, [items]);

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

  const sortableIds = orderedItems.map(item => item.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedItems.findIndex(item => item.id === active.id);
      const newIndex = orderedItems.findIndex(item => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const newArr = arrayMove(orderedItems, oldIndex, newIndex);
      const newTexts = newArr.map(item => item.text);
      lastEmittedRef.current = newTexts;
      setOrderedItems(newArr);
      onOrderChange(newTexts);
    }
  };

  const isCorrect = JSON.stringify(items) === JSON.stringify(correctOrder);

  return (
    <div
      className="space-y-2 relative z-[60]"
      style={{ pointerEvents: 'auto', fontFamily: "'Times New Roman', Times, serif", fontSize: '1.125rem' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium text-gray-600 dark:text-neutral-400">
          Drag items into the correct order:
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableIds} strategy={horizontal ? horizontalListSortingStrategy : verticalListSortingStrategy}>
          <div className={horizontal ? 'flex flex-wrap gap-2' : 'space-y-1'}>
            {orderedItems.map((item, index) => (
              <SortableItem
                key={item.id}
                id={item.id}
                index={index}
                text={item.text}
                imageUrl={answerImageUrls?.[correctOrder.indexOf(item.text)]}
                isChecked={isChecked}
                isCorrectPosition={correctOrder[index] === item.text}
                disabled={isChecked}
                horizontal={horizontal}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Check button */}
      {!isChecked && canAttempt && (
        <button
          onClick={onCheck}
          className="mt-3 px-4 py-2 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 text-white dark:text-black text-sm font-bold rounded-lg shadow-md transition-all"
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
