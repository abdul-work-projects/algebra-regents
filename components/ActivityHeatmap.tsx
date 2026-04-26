'use client';

import { useMemo } from 'react';

interface ActivityHeatmapProps {
  // Map of millisecond-epoch event timestamps to counts. Each timestamp counts as 1 if not provided.
  events: number[];
  weeks?: number; // how many weeks back to show (default 53)
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function dayKey(d: Date): string {
  // YYYY-MM-DD in local time, stable for grouping.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ActivityHeatmap({ events, weeks = 53 }: ActivityHeatmapProps) {
  const { grid, total, monthLabels } = useMemo(() => {
    const today = startOfDay(new Date());

    // Anchor to the Sunday of the week that contains (today - (weeks-1) * 7 + ...).
    // We want exactly `weeks` columns ending with the column that contains today.
    const start = new Date(today);
    start.setDate(today.getDate() - (weeks - 1) * 7 - today.getDay());

    const counts = new Map<string, number>();
    for (const ts of events) {
      if (!ts) continue;
      const d = startOfDay(new Date(ts));
      if (d < start || d > today) continue;
      const k = dayKey(d);
      counts.set(k, (counts.get(k) || 0) + 1);
    }

    type Cell = { date: Date; count: number; inRange: boolean };
    const grid: Cell[][] = [];
    for (let w = 0; w < weeks; w++) {
      const col: Cell[] = [];
      for (let dow = 0; dow < 7; dow++) {
        const d = new Date(start);
        d.setDate(start.getDate() + w * 7 + dow);
        const inRange = d <= today;
        col.push({ date: d, count: inRange ? counts.get(dayKey(d)) || 0 : 0, inRange });
      }
      grid.push(col);
    }

    let total = 0;
    counts.forEach((c) => { total += c; });

    // For each column, derive the month label if this column is the first to fall in a new month.
    const monthLabels: { weekIdx: number; label: string }[] = [];
    let prevMonth = -1;
    for (let w = 0; w < grid.length; w++) {
      const m = grid[w][0].date.getMonth();
      if (m !== prevMonth) {
        monthLabels.push({ weekIdx: w, label: MONTH_LABELS[m] });
        prevMonth = m;
      }
    }

    return { grid, total, monthLabels };
  }, [events, weeks]);

  const colorFor = (count: number, inRange: boolean): string => {
    if (!inRange) return 'bg-transparent';
    if (count === 0) return 'bg-gray-100 dark:bg-neutral-800';
    if (count <= 2) return 'bg-green-200 dark:bg-green-900';
    if (count <= 5) return 'bg-green-400 dark:bg-green-700';
    if (count <= 10) return 'bg-green-500 dark:bg-green-500';
    return 'bg-green-700 dark:bg-green-400';
  };

  const CELL = 12; // px
  const GAP = 3;
  const colWidth = CELL + GAP;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-neutral-100 mb-1">Activity</h3>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold text-gray-900 dark:text-neutral-100">{total}</span>
        <span className="text-xs text-gray-500 dark:text-neutral-400">questions answered in the past year</span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-block">
          {/* Month labels */}
          <div className="relative h-4 ml-7" style={{ width: grid.length * colWidth }}>
            {monthLabels.map((m) => (
              <span
                key={`${m.weekIdx}-${m.label}`}
                className="absolute top-0 text-[10px] text-gray-500 dark:text-neutral-400"
                style={{ left: m.weekIdx * colWidth }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {/* Day-of-week column (Mon/Wed/Fri labels only) */}
            <div className="flex flex-col gap-[3px] mr-1.5 w-5 text-[10px] text-gray-500 dark:text-neutral-400">
              {DOW_LABELS.map((label, i) => (
                <div key={label} style={{ height: CELL, lineHeight: `${CELL}px` }}>
                  {i === 1 || i === 3 || i === 5 ? label : ''}
                </div>
              ))}
            </div>

            {/* Heatmap cells */}
            {grid.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[3px]">
                {col.map((cell, ri) => (
                  <div
                    key={ri}
                    title={cell.inRange ? `${cell.count} on ${cell.date.toLocaleDateString()}` : ''}
                    className={`rounded-[2px] ${colorFor(cell.count, cell.inRange)}`}
                    style={{ width: CELL, height: CELL }}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] text-gray-500 dark:text-neutral-400">
            <span>Less</span>
            <span className="w-3 h-3 rounded-[2px] bg-gray-100 dark:bg-neutral-800" />
            <span className="w-3 h-3 rounded-[2px] bg-green-200 dark:bg-green-900" />
            <span className="w-3 h-3 rounded-[2px] bg-green-400 dark:bg-green-700" />
            <span className="w-3 h-3 rounded-[2px] bg-green-500 dark:bg-green-500" />
            <span className="w-3 h-3 rounded-[2px] bg-green-700 dark:bg-green-400" />
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
