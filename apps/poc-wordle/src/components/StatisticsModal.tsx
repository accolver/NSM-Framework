import React, { useState, useEffect } from 'react';
import type { GameStatistics } from '../persistence/types';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  statistics: GameStatistics | null;
}

export const StatisticsModal: React.FC<StatisticsModalProps> = ({
  isOpen,
  onClose,
  statistics
}) => {
  if (!isOpen || !statistics) return null;

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const maxGuessCount = Math.max(...Object.values(statistics.guessDistribution));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Statistics</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close statistics"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {statistics.totalGames}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Played</div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {statistics.winPercentage}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Win %</div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {statistics.currentStreak}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Current Streak</div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {statistics.bestStreak}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Best Streak</div>
            </div>
          </div>

          {/* Additional Statistics */}
          {statistics.gamesWon > 0 && (
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {statistics.averageGuesses.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Guesses</div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatTime(statistics.averageTime)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Time</div>
              </div>
            </div>
          )}

          {/* Guess Distribution */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Guess Distribution
            </h3>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((guessNumber) => {
                const count = statistics.guessDistribution[guessNumber as keyof typeof statistics.guessDistribution];
                const percentage = maxGuessCount > 0 ? (count / maxGuessCount) * 100 : 0;

                return (
                  <div key={guessNumber} className="flex items-center space-x-2">
                    <div className="text-sm font-medium text-gray-900 dark:text-white w-4">
                      {guessNumber}
                    </div>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-sm h-6 relative">
                      {percentage > 0 && (
                        <div
                          className="bg-green-500 h-full rounded-sm flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(percentage, 10)}%` }}
                        >
                          <span className="text-xs font-medium text-white">
                            {count}
                          </span>
                        </div>
                      )}
                      {count === 0 && (
                        <div className="absolute inset-0 flex items-center justify-end pr-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            0
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Additional Info */}
          {statistics.lastPlayed && (
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Last played: {statistics.lastPlayed.toLocaleDateString()}
            </div>
          )}

          {statistics.fastestWin && (
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Fastest win: {formatTime(statistics.fastestWin)}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};