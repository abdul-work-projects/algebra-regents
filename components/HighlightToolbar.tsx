'use client';

interface HighlightToolbarProps {
  position: { x: number; y: number };
  onHighlight: (color: string) => void;
  onClose: () => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Pink', value: '#fbcfe8' },
];

export default function HighlightToolbar({ position, onHighlight, onClose }: HighlightToolbarProps) {
  return (
    <>
      {/* Backdrop to close toolbar */}
      <div className="fixed inset-0 z-[300]" onClick={onClose} />

      {/* Toolbar */}
      <div
        className="fixed z-[301] bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-xl p-1.5 flex items-center gap-1.5"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -100%) translateY(-8px)',
        }}
      >
        {/* Arrow pointing down */}
        <div
          className="absolute left-1/2 -bottom-1.5 w-3 h-3 bg-white dark:bg-neutral-900 border-r border-b border-gray-200 dark:border-neutral-600 rotate-45 transform -translate-x-1/2"
        />

        <span className="text-xs font-medium text-gray-500 dark:text-neutral-400 px-1">Highlight:</span>
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => onHighlight(color.value)}
            className="w-6 h-6 rounded-md border border-gray-300 dark:border-neutral-500 hover:scale-110 active:scale-95 transition-transform"
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
      </div>
    </>
  );
}
