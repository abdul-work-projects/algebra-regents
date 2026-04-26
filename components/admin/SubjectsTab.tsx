'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Subject, SubjectGroup, Test } from '@/lib/types';
import {
  updateSubjectOrders,
  updateTestOrders,
  updateSubjectGroupOrders,
  assignSubjectToGroup,
} from '@/lib/supabase';

const UNGROUPED_ID = '__ungrouped__';

interface SubjectsTabProps {
  subjects: Subject[];
  tests: Test[];
  groups: SubjectGroup[];
  isLoading: boolean;
  onCreateSubject: () => void;
  onEditSubject: (subject: Subject) => void;
  onDeleteSubject: (subject: Subject) => void;
  onCreateGroup: () => void;
  onEditGroup: (group: SubjectGroup) => void;
  onDeleteGroup: (group: SubjectGroup) => void;
  onReorderPersisted?: () => void;
}

function DragHandle({ listeners, attributes, label }: { listeners: any; attributes: any; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label || 'Drag to reorder'}
      {...attributes}
      {...listeners}
      className="p-1 -ml-1 text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-200 cursor-grab active:cursor-grabbing touch-none"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <circle cx="7" cy="5" r="1.4" /><circle cx="13" cy="5" r="1.4" />
        <circle cx="7" cy="10" r="1.4" /><circle cx="13" cy="10" r="1.4" />
        <circle cx="7" cy="15" r="1.4" /><circle cx="13" cy="15" r="1.4" />
      </svg>
    </button>
  );
}

function SortableTestRow({ test }: { test: Test }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `test:${test.id}` });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-neutral-800/60 border border-gray-100 dark:border-neutral-800"
    >
      <DragHandle listeners={listeners} attributes={attributes} />
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900 dark:text-neutral-100 truncate">
          {test.name}
        </span>
        {!test.isActive && (
          <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-200 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 rounded-full">
            Inactive
          </span>
        )}
      </div>
      <span className="text-xs text-gray-500 dark:text-neutral-400 shrink-0">
        {test.questionCount ?? 0} questions
      </span>
    </div>
  );
}

interface SubjectCardProps {
  subject: Subject;
  tests: Test[];
  onEdit: () => void;
  onDelete: () => void;
  onTestsReorder: (subjectId: string, orderedTestIds: string[]) => void;
}

function SubjectCard({ subject, tests, onEdit, onDelete, onTestsReorder }: SubjectCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `subject:${subject.id}` });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 20 : 'auto',
  };

  const testSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleTestDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = tests.map((t) => `test:${t.id}`);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(tests, oldIndex, newIndex).map((t) => t.id);
    onTestsReorder(subject.id, reordered);
  };

  const testItems = tests.map((t) => `test:${t.id}`);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl shadow-sm p-4 hover:border-gray-200 dark:hover:border-neutral-700 transition-all"
    >
      <div className="flex items-start gap-2">
        <DragHandle listeners={listeners} attributes={attributes} label="Drag subject" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900 dark:text-neutral-100 truncate">{subject.name}</h3>
            {!subject.isActive && (
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 rounded-full">
                Inactive
              </span>
            )}
          </div>
          {subject.description && (
            <p className="text-sm text-gray-600 dark:text-neutral-400 truncate mb-2">{subject.description}</p>
          )}
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-neutral-400">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {tests.length} tests
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-4 shrink-0">
          <button
            onClick={onEdit}
            className="p-2 text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full active:scale-95 transition-all"
            title="Edit subject"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full active:scale-95 transition-all"
            title="Delete subject"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {tests.length > 0 ? (
        <div className="mt-3 pl-6">
          <DndContext sensors={testSensors} collisionDetection={closestCenter} onDragEnd={handleTestDragEnd}>
            <SortableContext items={testItems} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {tests.map((test) => (
                  <SortableTestRow key={test.id} test={test} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <div className="mt-3 pl-6 text-xs text-gray-400 dark:text-neutral-500 italic">
          No tests in this subject yet
        </div>
      )}
    </div>
  );
}

interface GroupSectionProps {
  groupId: string;
  groupName: string;
  isUngrouped: boolean;
  subjects: Subject[];
  testsBySubject: Record<string, Test[]>;
  onEditGroup?: () => void;
  onDeleteGroup?: () => void;
  onEditSubject: (subject: Subject) => void;
  onDeleteSubject: (subject: Subject) => void;
  onTestsReorder: (subjectId: string, orderedTestIds: string[]) => void;
}

function GroupSection({
  groupId,
  groupName,
  isUngrouped,
  subjects,
  testsBySubject,
  onEditGroup,
  onDeleteGroup,
  onEditSubject,
  onDeleteSubject,
  onTestsReorder,
}: GroupSectionProps) {
  const sortable = useSortable({ id: `group:${groupId}`, disabled: isUngrouped });
  const dropzone = useDroppable({ id: `dropzone:${groupId}` });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.85 : 1,
    zIndex: sortable.isDragging ? 30 : 'auto',
  };

  const subjectItems = subjects.map((s) => `subject:${s.id}`);

  return (
    <div ref={sortable.setNodeRef} style={style} className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isUngrouped && (
            <DragHandle listeners={sortable.listeners} attributes={sortable.attributes} label="Drag group" />
          )}
          <h3 className={`font-bold ${isUngrouped ? 'text-gray-500 dark:text-neutral-400 text-sm uppercase tracking-wider' : 'text-gray-900 dark:text-neutral-100 text-base'}`}>
            {groupName}
          </h3>
          <span className="text-xs text-gray-500 dark:text-neutral-400">
            · {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
          </span>
        </div>
        {!isUngrouped && (
          <div className="flex items-center gap-1">
            <button
              onClick={onEditGroup}
              className="p-1.5 text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full active:scale-95 transition-all"
              title="Edit group"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDeleteGroup}
              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full active:scale-95 transition-all"
              title="Delete group"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div
        ref={dropzone.setNodeRef}
        className={`rounded-xl transition-colors ${dropzone.isOver ? 'bg-blue-50/60 dark:bg-blue-950/30 outline outline-2 outline-blue-300 dark:outline-blue-700' : ''}`}
      >
        <SortableContext items={subjectItems} strategy={verticalListSortingStrategy}>
          {subjects.length === 0 ? (
            <div className="text-xs text-gray-400 dark:text-neutral-500 italic px-3 py-6 border border-dashed border-gray-200 dark:border-neutral-800 rounded-xl text-center">
              Drop a subject here to add it to this group
            </div>
          ) : (
            <div className="space-y-3">
              {subjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  tests={testsBySubject[subject.id] || []}
                  onEdit={() => onEditSubject(subject)}
                  onDelete={() => onDeleteSubject(subject)}
                  onTestsReorder={onTestsReorder}
                />
              ))}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export default function SubjectsTab({
  subjects,
  tests,
  groups,
  isLoading,
  onCreateSubject,
  onEditSubject,
  onDeleteSubject,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
  onReorderPersisted,
}: SubjectsTabProps) {
  const [orderedGroups, setOrderedGroups] = useState<SubjectGroup[]>(groups);
  const [subjectsByGroup, setSubjectsByGroup] = useState<Record<string, Subject[]>>({});
  const [testsBySubject, setTestsBySubject] = useState<Record<string, Test[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setOrderedGroups(groups);
  }, [groups]);

  useEffect(() => {
    const map: Record<string, Subject[]> = { [UNGROUPED_ID]: [] };
    for (const g of groups) map[g.id] = [];
    for (const s of subjects) {
      const key = s.groupId && map[s.groupId] !== undefined ? s.groupId : UNGROUPED_ID;
      map[key].push(s);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    }
    setSubjectsByGroup(map);
  }, [subjects, groups]);

  useEffect(() => {
    const map: Record<string, Test[]> = {};
    for (const t of tests) {
      const sid = t.subjectId;
      if (!sid) continue;
      if (!map[sid]) map[sid] = [];
      map[sid].push(t);
    }
    for (const sid of Object.keys(map)) {
      map[sid].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    }
    setTestsBySubject(map);
  }, [tests]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findGroupOfSubject = (subjectId: string, map = subjectsByGroup): string | null => {
    for (const [gid, list] of Object.entries(map)) {
      if (list.some((s) => s.id === subjectId)) return gid;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  // Handle live cross-group movement of subjects so the UI updates while dragging.
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    if (!activeIdStr.startsWith('subject:')) return;

    const activeSubjectId = activeIdStr.slice('subject:'.length);
    const fromGroup = findGroupOfSubject(activeSubjectId);
    if (!fromGroup) return;

    let toGroup: string | null = null;
    if (overIdStr.startsWith('subject:')) {
      const overSubjectId = overIdStr.slice('subject:'.length);
      toGroup = findGroupOfSubject(overSubjectId);
    } else if (overIdStr.startsWith('dropzone:')) {
      toGroup = overIdStr.slice('dropzone:'.length);
    }
    if (!toGroup || toGroup === fromGroup) return;

    setSubjectsByGroup((prev) => {
      const next = { ...prev };
      const fromList = [...(next[fromGroup] || [])];
      const toList = [...(next[toGroup!] || [])];
      const movingIdx = fromList.findIndex((s) => s.id === activeSubjectId);
      if (movingIdx < 0) return prev;
      const [moving] = fromList.splice(movingIdx, 1);
      let insertAt = toList.length;
      if (overIdStr.startsWith('subject:')) {
        const overSubjectId = overIdStr.slice('subject:'.length);
        const idx = toList.findIndex((s) => s.id === overSubjectId);
        if (idx >= 0) insertAt = idx;
      }
      toList.splice(insertAt, 0, moving);
      next[fromGroup] = fromList;
      next[toGroup!] = toList;
      return next;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Group reorder
    if (activeIdStr.startsWith('group:') && overIdStr.startsWith('group:') && activeIdStr !== overIdStr) {
      const ids = orderedGroups.map((g) => `group:${g.id}`);
      const oldIndex = ids.indexOf(activeIdStr);
      const newIndex = ids.indexOf(overIdStr);
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(orderedGroups, oldIndex, newIndex);
      setOrderedGroups(next);
      const orders = next.map((g, idx) => ({ id: g.id, display_order: idx }));
      const ok = await updateSubjectGroupOrders(orders);
      if (ok) onReorderPersisted?.();
      return;
    }

    // Subject move + reorder (possibly across groups)
    if (activeIdStr.startsWith('subject:')) {
      const activeSubjectId = activeIdStr.slice('subject:'.length);
      const targetGroup = findGroupOfSubject(activeSubjectId);
      if (!targetGroup) return;

      // Re-sort within the over's container if dropped on a sibling subject
      let finalGroupSubjects = subjectsByGroup[targetGroup] || [];
      if (overIdStr.startsWith('subject:') && overIdStr !== activeIdStr) {
        const overSubjectId = overIdStr.slice('subject:'.length);
        const oldIndex = finalGroupSubjects.findIndex((s) => s.id === activeSubjectId);
        const newIndex = finalGroupSubjects.findIndex((s) => s.id === overSubjectId);
        if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
          finalGroupSubjects = arrayMove(finalGroupSubjects, oldIndex, newIndex);
          setSubjectsByGroup((prev) => ({ ...prev, [targetGroup]: finalGroupSubjects }));
        }
      }

      // Persist: assign group_id (null for ungrouped) and update display order in target group
      const newGroupId = targetGroup === UNGROUPED_ID ? null : targetGroup;
      const subject = subjects.find((s) => s.id === activeSubjectId);
      const previousGroupId = subject?.groupId ?? null;
      const groupChanged = previousGroupId !== newGroupId;

      let ok = true;
      if (groupChanged) {
        ok = await assignSubjectToGroup(activeSubjectId, newGroupId);
      }
      if (ok) {
        const orders = finalGroupSubjects.map((s, idx) => ({ id: s.id, display_order: idx }));
        if (orders.length > 0) await updateSubjectOrders(orders);
        // Also reindex the previous group if changed (so removed-from positions are clean)
        if (groupChanged) {
          const prevList = subjectsByGroup[previousGroupId ?? UNGROUPED_ID] || [];
          const prevOrders = prevList
            .filter((s) => s.id !== activeSubjectId)
            .map((s, idx) => ({ id: s.id, display_order: idx }));
          if (prevOrders.length > 0) await updateSubjectOrders(prevOrders);
        }
        onReorderPersisted?.();
      }
      return;
    }
  };

  const handleTestsReorder = async (subjectId: string, orderedTestIds: string[]) => {
    setTestsBySubject((prev) => {
      const list = prev[subjectId] || [];
      const byId = new Map(list.map((t) => [t.id, t]));
      const next = orderedTestIds.map((id) => byId.get(id)).filter(Boolean) as Test[];
      return { ...prev, [subjectId]: next };
    });
    const orders = orderedTestIds.map((id, idx) => ({ id, display_order: idx }));
    const ok = await updateTestOrders(orders);
    if (ok) onReorderPersisted?.();
  };

  const groupItems = useMemo(() => orderedGroups.map((g) => `group:${g.id}`), [orderedGroups]);

  // Use activeId so React doesn't strip it (avoids unused-var lint and serves as a hook for future overlay).
  void activeId;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-neutral-100 tracking-tight">
            Subjects
          </h2>
          <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
            {orderedGroups.length > 0 ? ` · ${orderedGroups.length} group${orderedGroups.length !== 1 ? 's' : ''}` : ''}
            {' · drag subjects between groups to reassign'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateGroup}
            className="px-4 py-2.5 text-sm font-bold border border-gray-300 dark:border-neutral-700 text-gray-900 dark:text-neutral-100 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
          >
            + NEW GROUP
          </button>
          <button
            onClick={onCreateSubject}
            className="px-4 py-2.5 text-sm font-bold bg-black text-white dark:bg-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 transition-all"
          >
            + NEW SUBJECT
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-neutral-400">
          Loading subjects...
        </div>
      ) : subjects.length === 0 && orderedGroups.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-neutral-400">
          No subjects yet. Create your first subject to get started.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={groupItems} strategy={verticalListSortingStrategy}>
            <div className="space-y-8">
              {orderedGroups.map((group) => (
                <GroupSection
                  key={group.id}
                  groupId={group.id}
                  groupName={group.name}
                  isUngrouped={false}
                  subjects={subjectsByGroup[group.id] || []}
                  testsBySubject={testsBySubject}
                  onEditGroup={() => onEditGroup(group)}
                  onDeleteGroup={() => onDeleteGroup(group)}
                  onEditSubject={onEditSubject}
                  onDeleteSubject={onDeleteSubject}
                  onTestsReorder={handleTestsReorder}
                />
              ))}
              <GroupSection
                groupId={UNGROUPED_ID}
                groupName="Ungrouped"
                isUngrouped
                subjects={subjectsByGroup[UNGROUPED_ID] || []}
                testsBySubject={testsBySubject}
                onEditSubject={onEditSubject}
                onDeleteSubject={onDeleteSubject}
                onTestsReorder={handleTestsReorder}
              />
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
