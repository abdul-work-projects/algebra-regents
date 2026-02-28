"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

interface LiveScoreBeaverProps {
  scaledScore: number;
  rawScore: number;
  totalPoints: number;
  pointsGained: number;
}

export default function LiveScoreBeaver({
  scaledScore,
  rawScore,
  totalPoints,
  pointsGained,
}: LiveScoreBeaverProps) {
  const [isJumping, setIsJumping] = useState(false);
  const [showPlus, setShowPlus] = useState(false);

  useEffect(() => {
    if (pointsGained > 0) {
      setIsJumping(true);
      setShowPlus(true);

      const jumpTimer = setTimeout(() => setIsJumping(false), 1400);
      const plusTimer = setTimeout(() => setShowPlus(false), 1600);

      return () => {
        clearTimeout(jumpTimer);
        clearTimeout(plusTimer);
      };
    }
  }, [pointsGained, rawScore]);

  const percentage = Math.min(100, scaledScore);

  const getBarGradient = () => {
    if (scaledScore >= 85) return "from-emerald-400 to-green-500";
    if (scaledScore >= 65) return "from-blue-400 to-cyan-500";
    if (scaledScore >= 50) return "from-amber-400 to-yellow-500";
    return "from-orange-400 to-red-400";
  };

  return (
    <>
      <style>{`
        @keyframes beaver-idle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes beaver-jump {
          0% { transform: translateY(0) scale(1); }
          10% { transform: translateY(4px) scale(1.08, 0.92); }
          30% { transform: translateY(-50px) scale(0.92, 1.08); }
          45% { transform: translateY(-58px) scale(1.1) rotate(-6deg); }
          55% { transform: translateY(-55px) scale(1.08) rotate(6deg); }
          70% { transform: translateY(-8px) scale(1); }
          82% { transform: translateY(3px) scale(1.06, 0.94); }
          92% { transform: translateY(-2px) scale(0.98, 1.02); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes score-pop {
          0% { transform: scale(1); }
          25% { transform: scale(1.3); }
          50% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes plus-float {
          0% { opacity: 1; transform: translateY(0) scale(0.8); }
          30% { opacity: 1; transform: translateY(-12px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-35px) scale(0.9); }
        }
        @keyframes bar-pulse {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          50% { box-shadow: 0 0 12px 4px rgba(34,197,94,0.25); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
      `}</style>

      <div className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 z-[90] flex-col items-center">
        {/* Label */}
        <span className="text-[8px] md:text-[9px] font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-wider text-center mb-1">
          Projected<br />Test Score
        </span>

        {/* Score */}
        <div className="relative mb-2">
          {showPlus && (
            <span
              className="absolute -top-5 left-1/2 -translate-x-1/2 text-sm font-bold text-green-500 whitespace-nowrap"
              style={{ animation: "plus-float 1s ease-out forwards" }}
            >
              +{pointsGained}
            </span>
          )}
          <span
            className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tabular-nums block text-center"
            style={{
              animation: isJumping ? "score-pop 0.5s ease-out" : "none",
            }}
          >
            {scaledScore}
          </span>
          <span className="text-[9px] md:text-[10px] text-gray-400 dark:text-neutral-500 text-center block -mt-0.5">
            / 100
          </span>
        </div>

        {/* Vertical progress bar */}
        <div className="relative w-5 md:w-6 h-[180px] md:h-[220px] rounded-full bg-gray-200 dark:bg-neutral-800 overflow-visible">
          {/* Pass line at 65% (measured from bottom) */}
          <div
            className="absolute -left-1.5 -right-1.5 h-[2px] bg-gray-400 dark:bg-neutral-500 z-10"
            style={{ bottom: "65%" }}
            title="Passing: 65"
          />

          {/* Filled portion (grows from bottom) */}
          <div
            className={`absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t ${getBarGradient()} transition-all duration-700 ease-out overflow-hidden`}
            style={{
              height: `${Math.max(percentage, 3)}%`,
              animation: isJumping ? "bar-pulse 0.8s ease-out" : "none",
            }}
          >
            {/* Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-transparent opacity-60" />
          </div>
        </div>

        {/* Beaver at bottom */}
        <div className="mt-1.5">
          <div
            style={{
              animation: isJumping
                ? "beaver-jump 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
                : "beaver-idle 2.5s ease-in-out infinite",
            }}
          >
            <Image
              src="/beaver-images/beaver.gif"
              alt="Score beaver"
              width={48}
              height={48}
              className="drop-shadow-sm"
              unoptimized
            />
          </div>
        </div>
      </div>
    </>
  );
}
