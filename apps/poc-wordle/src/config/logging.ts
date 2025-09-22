/**
 * Logging configuration for the Wordle application
 */

export interface LoggingConfig {
  gameLogger: {
    enabled: boolean;
    levels: ('state' | 'guess' | 'game' | 'error')[];
  };
  developerMode: boolean;
  showDebugInfo: boolean;
}

// Default production configuration - clean logs only
export const DEFAULT_LOGGING_CONFIG: LoggingConfig = {
  gameLogger: {
    enabled: true,
    levels: ['state'] // Only state transitions
  },
  developerMode: false,
  showDebugInfo: false
};

// Development configuration - more verbose for debugging
export const DEVELOPMENT_LOGGING_CONFIG: LoggingConfig = {
  gameLogger: {
    enabled: true,
    levels: ['state', 'game'] // Include game events like keypresses
  },
  developerMode: true,
  showDebugInfo: false // Disable debug info for clean output
};

// Get current logging configuration based on environment
export const getLoggingConfig = (): LoggingConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return isDevelopment ? DEVELOPMENT_LOGGING_CONFIG : DEFAULT_LOGGING_CONFIG;
};

// Initialize logging with current configuration
export const initializeLogging = () => {
  const config = getLoggingConfig();
  // Silent initialization - no console output
  return config;
};