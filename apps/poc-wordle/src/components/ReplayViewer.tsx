import React, { useState, useEffect } from 'react';
import { ReplayPlayback } from '../persistence/game-replay';
import { WordGrid } from './WordGrid';
import { Keyboard } from './Keyboard';
import type { GameReplay, ReplayStep } from '../persistence/types';

interface ReplayViewerProps {
  replay: GameReplay;
  onClose: () => void;
}

export const ReplayViewer: React.FC<ReplayViewerProps> = ({ replay, onClose }) => {
  const [playback, setPlayback] = useState<ReplayPlayback | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x speed
  const [gameState, setGameState] = useState({
    currentGuess: '',
    guesses: [] as Array<{ word: string; letterStatus: string[] }>,
    isComplete: false,
    outcome: replay.outcome
  });

  useEffect(() => {
    const newPlayback = new ReplayPlayback(replay);
    setPlayback(newPlayback);
    setCurrentStep(0);

    // Initialize game state
    setGameState({
      currentGuess: '',
      guesses: [],
      isComplete: false,
      outcome: replay.outcome
    });
  }, [replay]);

  useEffect(() => {
    if (!playback) return;

    // Apply all steps up to current step to reconstruct game state
    const steps = playback.getStepsUpToCurrent();
    let currentGuess = '';
    const guesses: Array<{ word: string; letterStatus: string[] }> = [];
    let isComplete = false;

    for (const step of steps) {
      switch (step.type) {
        case 'keypress':
          if (step.data?.letter) {
            currentGuess += step.data.letter;
          }
          break;
        case 'backspace':
          currentGuess = currentGuess.slice(0, -1);
          break;
        case 'submit':
          if (step.data?.guess) {
            guesses.push(step.data.guess);
            currentGuess = '';
          }
          break;
        case 'game_end':
          isComplete = true;
          break;
      }
    }

    setGameState({
      currentGuess,
      guesses,
      isComplete,
      outcome: replay.outcome
    });
  }, [currentStep, playback, replay.outcome]);

  useEffect(() => {
    if (!isPlaying || !playback) return;

    const interval = setInterval(() => {
      if (playback.hasNextStep()) {
        playback.nextStep();
        setCurrentStep(playback.getCurrentStep());
      } else {
        setIsPlaying(false);
      }
    }, 500 / playbackSpeed); // Adjust timing based on speed

    return () => clearInterval(interval);
  }, [isPlaying, playback, playbackSpeed]);

  const handleStepForward = () => {
    if (playback?.hasNextStep()) {
      playback.nextStep();
      setCurrentStep(playback.getCurrentStep());
    }
  };

  const handleStepBack = () => {
    if (playback && currentStep > 0) {
      playback.previousStep();
      setCurrentStep(playback.getCurrentStep());
    }
  };

  const handleJumpToStep = (stepIndex: number) => {
    if (playback) {
      playback.goToStep(stepIndex);
      setCurrentStep(stepIndex);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    if (playback) {
      playback.reset();
      setCurrentStep(0);
      setIsPlaying(false);
    }
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Create grid data from game state
  const gridData: (string | null)[][] = [];

  // Add completed guesses
  for (const guess of gameState.guesses) {
    gridData.push(guess.word.split(''));
  }

  // Add current guess if not complete
  if (!gameState.isComplete && gameState.currentGuess) {
    const currentRow = gameState.currentGuess.split('');
    while (currentRow.length < 5) {
      currentRow.push(null);
    }
    gridData.push(currentRow);
  }

  // Fill remaining rows
  while (gridData.length < 6) {
    gridData.push([null, null, null, null, null]);
  }

  // Create letter status grid
  const letterStatusGrid: (string | null)[][] = [];
  for (const guess of gameState.guesses) {
    letterStatusGrid.push(guess.letterStatus);
  }
  while (letterStatusGrid.length < 6) {
    letterStatusGrid.push([null, null, null, null, null]);
  }

  // Calculate keyboard status
  const keyboardStatus: Record<string, string> = {};
  for (const guess of gameState.guesses) {
    for (let i = 0; i < guess.word.length; i++) {
      const letter = guess.word[i];
      const status = guess.letterStatus[i];

      if (keyboardStatus[letter] === 'correct') continue;
      if (keyboardStatus[letter] === 'present' && status === 'absent') continue;

      keyboardStatus[letter] = status;
    }
  }

  if (!playback) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Game Replay
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Word: {replay.hiddenWord} • {replay.outcome === 'won' ? 'Won' : 'Lost'} •
              Duration: {formatTime(replay.duration)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close replay"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Game Display */}
        <div className="mb-6">
          <WordGrid
            wordGrid={gridData}
            statusGrid={letterStatusGrid}
          />
          <div className="mt-4">
            <Keyboard
              keyboardStatus={keyboardStatus}
              onKeyPress={() => {}}
              onBackspace={() => {}}
              onEnter={() => {}}
            />
          </div>
        </div>

        {/* Playback Controls */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Step {currentStep + 1} of {playback.getTotalSteps()}</span>
              <span>{Math.round(playback.getProgress() * 100)}%</span>
            </div>
            <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${playback.getProgress() * 100}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max={playback.getTotalSteps() - 1}
              value={currentStep}
              onChange={(e) => handleJumpToStep(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={handleReset}
              className="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              title="Reset to beginning"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>

            <button
              onClick={handleStepBack}
              disabled={currentStep <= 0}
              className="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous step"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={handlePlayPause}
              className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-5-4v4" />
                </svg>
              )}
            </button>

            <button
              onClick={handleStepForward}
              disabled={!playback.hasNextStep()}
              className="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next step"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Speed Control */}
          <div className="flex items-center justify-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Speed:</span>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </div>

          {/* Current Step Info */}
          {playback.getCurrentStepData() && (
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Current: {playback.getCurrentStepData()?.type}
              {playback.getCurrentStepData()?.data?.letter &&
                ` (${playback.getCurrentStepData()?.data?.letter})`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};