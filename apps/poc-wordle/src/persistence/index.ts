// Main persistence exports
export { GamePersistence } from './game-persistence';
export { GameReplayManager, ReplayPlayback, AutoRecorder } from './game-replay';

// Type exports
export type {
  SavedGame,
  GameStatistics,
  ReplayStep,
  GameReplay,
  StorageConfig,
  StorageInfo
} from './types';