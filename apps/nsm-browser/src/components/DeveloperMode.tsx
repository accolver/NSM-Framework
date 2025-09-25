import { useState, useEffect } from 'react';

interface DeveloperModeProps {
  application: {
    name: string;
    machine: string;
    [key: string]: any;
  };
  debugEnabled?: boolean;
  currentState?: {
    value: string;
    context: any;
  };
  eventHistory?: Array<{
    type: string;
    timestamp: number;
  }>;
  consoleMessages?: Array<{
    level: 'info' | 'warn' | 'error';
    message: string;
    timestamp: number;
  }>;
  onDebugEvent?: (event: { type: string; source: string }) => void;
  onClearHistory?: () => void;
  onClearConsole?: () => void;
}

export default function DeveloperMode({
  application,
  debugEnabled = false,
  currentState,
  eventHistory = [],
  consoleMessages = [],
  onDebugEvent,
  onClearHistory,
  onClearConsole
}: DeveloperModeProps) {
  const [isDebugEnabled, setIsDebugEnabled] = useState(debugEnabled);
  const [consoleFilter, setConsoleFilter] = useState('all');

  // Parse machine configuration to get available transitions
  const getMachineInfo = () => {
    try {
      const machineConfig = JSON.parse(application.machine);
      const currentStateValue = currentState?.value || machineConfig.initial || 'idle';
      const stateConfig = machineConfig.states?.[currentStateValue];
      const availableTransitions = stateConfig?.on ? Object.keys(stateConfig.on) : [];

      return {
        currentState: currentStateValue,
        context: currentState?.context || machineConfig.context || {},
        availableTransitions
      };
    } catch (error) {
      return {
        currentState: 'error',
        context: {},
        availableTransitions: []
      };
    }
  };

  const machineInfo = getMachineInfo();

  const handleTransitionClick = (transitionType: string) => {
    if (onDebugEvent) {
      onDebugEvent({
        type: transitionType,
        source: 'debug'
      });
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const secondsAgo = Math.floor((Date.now() - timestamp) / 1000);
    if (secondsAgo < 60) {
      return `${secondsAgo} second${secondsAgo !== 1 ? 's' : ''} ago`;
    }
    const minutesAgo = Math.floor(secondsAgo / 60);
    return `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`;
  };

  const filteredConsoleMessages = consoleMessages.filter(msg => {
    if (consoleFilter === 'all') return true;
    return msg.level === consoleFilter;
  });

  const limitedEventHistory = eventHistory.slice(0, 50);

  return (
    <div className="developer-mode">
      <div className="debug-header">
        <h2>Developer Mode</h2>
        <label>
          <input
            type="checkbox"
            checked={isDebugEnabled}
            onChange={(e) => setIsDebugEnabled(e.target.checked)}
          />
          Enable Debug Mode
        </label>
      </div>

      {isDebugEnabled && (
        <div data-testid="debug-panel" className="debug-panel">
          <div className="debug-section">
            <h3>State Machine Inspector</h3>

            <div className="state-info">
              <div>
                <strong>Current State:</strong> {machineInfo.currentState}
              </div>

              <div>
                <strong>Context:</strong>
                <pre>{JSON.stringify(machineInfo.context, null, 2)}</pre>
              </div>

              <div>
                <strong>Available Transitions:</strong>
                <div className="transitions">
                  {machineInfo.availableTransitions.map(transition => (
                    <button
                      key={transition}
                      onClick={() => handleTransitionClick(transition)}
                      className="transition-button"
                    >
                      {transition}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="debug-section">
            <div className="section-header">
              <h3>Event History</h3>
              {onClearHistory && (
                <button onClick={onClearHistory} className="clear-button">
                  Clear History
                </button>
              )}
            </div>

            <div className="event-history">
              {limitedEventHistory.map((event, index) => (
                <div key={`${event.type}-${event.timestamp}-${index}`} className="event-item">
                  <span className="event-type">{event.type}</span>
                  <span className="event-timestamp">
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="debug-section">
            <div className="section-header">
              <h3>Developer Console</h3>
              <div className="console-controls">
                <label>
                  <input
                    type="checkbox"
                    checked={consoleFilter === 'error'}
                    onChange={(e) => setConsoleFilter(e.target.checked ? 'error' : 'all')}
                  />
                  Show errors only
                </label>
                {onClearConsole && (
                  <button onClick={onClearConsole} className="clear-button">
                    Clear Console
                  </button>
                )}
              </div>
            </div>

            <div className="console-messages">
              {filteredConsoleMessages.map((msg, index) => (
                <div key={index} className={`console-message ${msg.level}`}>
                  <span className="message-level">[{msg.level.toUpperCase()}]</span>
                  <span className="message-text">{msg.message}</span>
                  <span className="message-timestamp">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}