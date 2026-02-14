'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  pointerWithin,
} from '@dnd-kit/core';
import MathText from './MathText';

interface BucketOrderAnswerProps {
  items: string[];
  answerImageUrls?: (string | undefined)[];
  correctOrder: string[];
  isChecked: boolean;
  onOrderChange: (newOrder: string[]) => void;
  onCheck: () => void;
  canAttempt: boolean;
  orientation?: 'vertical' | 'horizontal';
}

// --- Sub-components ---

function DraggableChip({
  id,
  item,
  disabled,
}: {
  id: string;
  item: string;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    disabled,
    data: { item },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`px-3 py-2 rounded-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 select-none transition-all ${
        isDragging ? 'opacity-0' : ''
      } ${disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
      style={{ fontFamily: "'Times New Roman', Times, serif", touchAction: 'none' }}
    >
      <MathText text={item} className="text-sm whitespace-nowrap" />
    </div>
  );
}

function DroppableSlot({
  id,
  index,
  item,
  isChecked,
  isCorrect,
  disabled,
}: {
  id: string;
  index: number;
  item: string | null;
  isChecked: boolean;
  isCorrect: boolean;
  disabled: boolean;
}) {
  const { isOver, setNodeRef: setDropRef } = useDroppable({ id });

  let borderClass = 'border-gray-300 dark:border-gray-600 border-dashed';
  let bgClass = 'bg-gray-50 dark:bg-gray-800/50';

  if (item) {
    borderClass = 'border-gray-400 dark:border-gray-500 border-solid';
    bgClass = 'bg-white dark:bg-gray-800';
  }

  if (isOver && !isChecked) {
    borderClass = 'border-blue-400 dark:border-blue-500 border-solid';
    bgClass = 'bg-blue-50 dark:bg-blue-900/30';
  }

  if (isChecked && item) {
    if (isCorrect) {
      borderClass = 'border-green-500 dark:border-green-400 border-solid';
      bgClass = 'bg-green-50 dark:bg-green-900/30';
    } else {
      borderClass = 'border-rose-500 dark:border-rose-400 border-solid';
      bgClass = 'bg-rose-50 dark:bg-rose-900/30';
    }
  }

  return (
    <div
      ref={setDropRef}
      className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 ${borderClass} ${bgClass} flex flex-col items-center justify-center transition-all`}
    >
      {/* Slot number label */}
      <span className={`absolute -top-2 -left-1 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
        isChecked && item
          ? isCorrect
            ? 'bg-green-500 dark:bg-green-600 text-white'
            : 'bg-rose-500 dark:bg-rose-600 text-white'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
      }`}>
        {index + 1}
      </span>

      {item ? (
        <div className="flex items-center gap-1">
          {/* Item chip inside slot — also draggable to allow moving */}
          <DraggableChip id={id + '-chip'} item={item} disabled={disabled} />
          {/* Checked indicator */}
          {isChecked && (
            <div className="absolute -bottom-1 -right-1">
              {isCorrect ? (
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
      ) : (
        <span className="text-gray-400 dark:text-gray-500 text-lg font-medium">{index + 1}</span>
      )}
    </div>
  );
}

function BucketDropZone({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: 'bucket', disabled });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-wrap gap-2 min-h-[56px] p-3 rounded-xl border-2 transition-all ${
        isOver && !disabled
          ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
      }`}
    >
      {children}
    </div>
  );
}

// --- Main component ---

export default function BucketOrderAnswer({
  items,
  correctOrder,
  isChecked,
  onOrderChange,
  onCheck,
  canAttempt,
  orientation = 'horizontal',
}: BucketOrderAnswerProps) {
  const vertical = orientation === 'vertical';
  const n = correctOrder.length;

  const [slots, setSlots] = useState<(string | null)[]>(() =>
    isChecked ? [...items] : Array(n).fill(null)
  );
  const [bucket, setBucket] = useState<string[]>(() =>
    isChecked ? [] : [...items]
  );
  const [activeItem, setActiveItem] = useState<string | null>(null);

  // Sync parent when slots/bucket change
  const syncParent = useCallback(
    (newSlots: (string | null)[], newBucket: string[]) => {
      const ordered: string[] = [];
      for (const s of newSlots) {
        if (s !== null) ordered.push(s);
      }
      for (const b of newBucket) {
        ordered.push(b);
      }
      onOrderChange(ordered);
    },
    [onOrderChange]
  );

  // If items change externally (e.g. toggling view), re-initialize
  useEffect(() => {
    if (isChecked) {
      setSlots([...items]);
      setBucket([]);
    } else {
      // Check if items already has an ordering that partially matches slots
      const allInBucket = slots.every((s) => s === null);
      if (allInBucket && bucket.length === 0 && items.length > 0) {
        setBucket([...items]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChecked]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Parse drag source from the active id
  const parseDragId = (id: string): { source: 'bucket' | 'slot'; index: number } | null => {
    if (id.startsWith('bucket-')) {
      return { source: 'bucket', index: parseInt(id.replace('bucket-', ''), 10) };
    }
    if (id.startsWith('slot-') && id.endsWith('-chip')) {
      return { source: 'slot', index: parseInt(id.replace('slot-', '').replace('-chip', ''), 10) };
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = active.data.current?.item as string | undefined;
    setActiveItem(item ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    const from = parseDragId(active.id as string);
    if (!from) return;

    const overId = over.id as string;

    // Determine target
    let target: { dest: 'bucket' } | { dest: 'slot'; index: number };
    if (overId === 'bucket') {
      target = { dest: 'bucket' };
    } else if (overId.startsWith('slot-')) {
      const slotIndex = parseInt(overId.replace('slot-', '').replace('-chip', ''), 10);
      target = { dest: 'slot', index: slotIndex };
    } else {
      return;
    }

    const newSlots = [...slots];
    const newBucket = [...bucket];

    if (from.source === 'bucket' && target.dest === 'slot') {
      // Bucket → Slot
      const draggedItem = newBucket[from.index];
      const existingInSlot = newSlots[target.index];

      // Remove from bucket
      newBucket.splice(from.index, 1);
      // Place in slot
      newSlots[target.index] = draggedItem;
      // If slot was occupied, send back to bucket
      if (existingInSlot !== null) {
        newBucket.push(existingInSlot);
      }
    } else if (from.source === 'slot' && target.dest === 'slot') {
      // Slot → Slot: swap
      if (from.index !== target.index) {
        const temp = newSlots[target.index];
        newSlots[target.index] = newSlots[from.index];
        newSlots[from.index] = temp;
      }
    } else if (from.source === 'slot' && target.dest === 'bucket') {
      // Slot → Bucket
      const draggedItem = newSlots[from.index];
      if (draggedItem !== null) {
        newSlots[from.index] = null;
        newBucket.push(draggedItem);
      }
    }
    // Bucket → Bucket: no-op

    setSlots(newSlots);
    setBucket(newBucket);
    syncParent(newSlots, newBucket);
  };

  const allSlotsFilled = slots.every((s) => s !== null);
  const isCorrect = JSON.stringify(items) === JSON.stringify(correctOrder);

  return (
    <div className="space-y-4 relative z-[60]" style={{ pointerEvents: 'auto' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Drag items into the correct slots:
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Slots */}
        <div className={vertical ? 'flex flex-col gap-3 items-center' : 'flex flex-wrap gap-4 justify-center'}>
          {slots.map((item, i) => (
            <DroppableSlot
              key={`slot-${i}`}
              id={`slot-${i}`}
              index={i}
              item={item}
              isChecked={isChecked}
              isCorrect={isChecked && item === correctOrder[i]}
              disabled={isChecked}
            />
          ))}
        </div>

        {/* Bucket */}
        {!isChecked && (
          <BucketDropZone disabled={isChecked}>
            {bucket.length === 0 ? (
              <span className="text-sm text-gray-400 dark:text-gray-500 py-1">
                {allSlotsFilled ? 'All items placed!' : 'Drop items here to remove from slots'}
              </span>
            ) : (
              bucket.map((item, i) => (
                <DraggableChip
                  key={`bucket-${i}`}
                  id={`bucket-${i}`}
                  item={item}
                  disabled={isChecked}
                />
              ))
            )}
          </BucketDropZone>
        )}

        {/* Drag overlay */}
        <DragOverlay>
          {activeItem ? (
            <div
              className="px-3 py-2 rounded-full border-2 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-lg"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              <MathText text={activeItem} className="text-sm whitespace-nowrap" />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Check button — only when all slots filled */}
      {!isChecked && canAttempt && (
        <button
          onClick={onCheck}
          disabled={!allSlotsFilled}
          className={`mt-1 px-4 py-2 text-sm font-bold rounded-lg shadow-md transition-all ${
            allSlotsFilled
              ? 'bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 active:scale-95 text-white dark:text-black'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
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
