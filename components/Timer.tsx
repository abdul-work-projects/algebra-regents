'use client';

import { useEffect, useState } from 'react';

interface TimerProps {
  startTime: number;
  onTick?: (elapsedSeconds: number) => void;
}

export default function Timer({ startTime, onTick }: TimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [pausedTime, setPausedTime] = useState(0);
  const [pauseStartTime, setPauseStartTime] = useState(0);

  useEffect(() => {
    if (isPaused) return;

    const calculateElapsed = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime - pausedTime) / 1000);
      setElapsedSeconds(elapsed);
      if (onTick) {
        onTick(elapsed);
      }
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime, onTick, isPaused, pausedTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePauseToggle = () => {
    if (isPaused) {
      // Resume
      const pauseDuration = Date.now() - pauseStartTime;
      setPausedTime(prev => prev + pauseDuration);
      setIsPaused(false);
    } else {
      // Pause
      setPauseStartTime(Date.now());
      setIsPaused(true);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* Timer Display */}
      {!isHidden && (
        <div className="flex items-center gap-1 text-gray-700">
          <svg
            className="w-3.5 h-3.5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs font-mono font-medium">
            {formatTime(elapsedSeconds)}
          </span>
          {isPaused && (
            <span className="text-[10px] text-orange-600 font-medium">PAUSED</span>
          )}
        </div>
      )}

      {/* Timer Controls - Always Visible */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={handlePauseToggle}
          className="p-1 rounded hover:bg-gray-100 active:scale-95 transition-all"
          title={isPaused ? 'Resume timer' : 'Pause timer'}
        >
          {isPaused ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          )}
        </button>
        <button
          onClick={() => setIsHidden(!isHidden)}
          className="p-1 rounded hover:bg-gray-100 active:scale-95 transition-all"
          title={isHidden ? "Show timer" : "Hide timer"}
        >
          {isHidden ? (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
