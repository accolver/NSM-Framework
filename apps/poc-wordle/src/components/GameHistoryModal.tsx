import React, { useState, useEffect } from 'react';
import { ReplayViewer } from './ReplayViewer';
import type { SavedGame, GameReplay } from '../persistence/types';

interface GameHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedGames: SavedGame[];
  onLoadReplay: (gameId: string) => Promise<GameReplay | null>;
}

export const GameHistoryModal: React.FC<GameHistoryModalProps> = ({
  isOpen,
  onClose,
  savedGames,
  onLoadReplay
}) => {
  const [selectedReplay, setSelectedReplay] = useState<GameReplay | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'outcome' | 'attempts'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'won' | 'lost'>('all');

  if (!isOpen) return null;

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const filteredGames = savedGames
    .filter(game => {
      if (filterBy === 'all') return true;
      return game.outcome === filterBy;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.endTime.getTime() - a.endTime.getTime();
        case 'outcome':
          if (a.outcome === b.outcome) {
            return b.endTime.getTime() - a.endTime.getTime();
          }
          return a.outcome === 'won' ? -1 : 1;
        case 'attempts':
          if (a.attemptCount === b.attemptCount) {
            return b.endTime.getTime() - a.endTime.getTime();
          }
          return a.attemptCount - b.attemptCount;
        default:
          return 0;
      }
    });

  const handleViewReplay = async (gameId: string) => {
    const replay = await onLoadReplay(gameId);
    if (replay) {
      setSelectedReplay(replay);
    }
  };

  if (selectedReplay) {
    return (
      <ReplayViewer
        replay={selectedReplay}
        onClose={() => setSelectedReplay(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Game History</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close game history"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters and Sorting */}
        <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as 'all' | 'won' | 'lost')}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Games</option>
              <option value="won">Won Games</option>
              <option value="lost">Lost Games</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'outcome' | 'attempts')}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="date">Date</option>
              <option value="outcome">Outcome</option>
              <option value="attempts">Attempts</option>
            </select>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            Showing {filteredGames.length} of {savedGames.length} games
          </div>
        </div>

        {/* Games List */}
        <div className="flex-1 overflow-y-auto">
          {filteredGames.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-lg">No games found</p>
              <p className="text-sm">Play some games to see your history here!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGames.map((game) => (
                <div
                  key={game.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              game.outcome === 'won'
                                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                            }`}
                          >
                            {game.outcome === 'won' ? '🎉 Won' : '😞 Lost'}
                          </span>
                          <span className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                            {game.hiddenWord}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {game.attemptCount}/6 attempts
                        </div>

                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatTime(game.timeToComplete)}
                        </div>

                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {game.endTime.toLocaleDateString()} {game.endTime.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>

                      {/* Guess Preview */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {game.guesses.map((guess, index) => (
                          <div key={index} className="flex space-x-0.5">
                            {guess.word.split('').map((letter, letterIndex) => (
                              <div
                                key={letterIndex}
                                className={`w-6 h-6 flex items-center justify-center text-xs font-bold text-white rounded ${
                                  guess.letterStatus[letterIndex] === 'correct'
                                    ? 'bg-green-500'
                                    : guess.letterStatus[letterIndex] === 'present'
                                    ? 'bg-yellow-500'
                                    : 'bg-gray-500'
                                }`}
                              >
                                {letter}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="ml-4">
                      <button
                        onClick={() => handleViewReplay(game.id)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                      >
                        View Replay
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};