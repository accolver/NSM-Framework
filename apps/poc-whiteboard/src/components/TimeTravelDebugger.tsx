import React, { useState, useEffect, useCallback } from 'react';
import { type TimeTravelService, type StateSnapshot, type TimeTravelEvent } from '../services/time-travel-service';

interface TimeTravelDebuggerProps {
  timeTravelService: TimeTravelService;
  className?: string;
}

interface TimelinePosition {
  index: number;
  timestamp: number;
  eventType?: string;
  stateName?: string;
}

export const TimeTravelDebugger: React.FC<TimeTravelDebuggerProps> = ({
  timeTravelService,
  className = ''
}) => {
  const [snapshots, setSnapshots] = useState<StateSnapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isTimeTraveling, setIsTimeTraveling] = useState(false);
  const [selectedSnapshotIndex, setSelectedSnapshotIndex] = useState<number>(-1);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonIndex, setComparisonIndex] = useState<number>(-1);

  // Update state when service changes
  useEffect(() => {
    const updateState = () => {
      setSnapshots(timeTravelService.getSnapshots());
      setCurrentIndex(timeTravelService.getCurrentSnapshotIndex());
      setIsTimeTraveling(timeTravelService.isTimeTraveling());
    };

    // Initial update
    updateState();

    // Subscribe to snapshot captures
    const unsubscribeSnapshot = timeTravelService.onSnapshotCapture(() => {
      updateState();
    });

    // Subscribe to time travel events
    const unsubscribeTimeTravel = timeTravelService.onTimeTravel(() => {
      updateState();
    });

    return () => {
      unsubscribeSnapshot();
      unsubscribeTimeTravel();
    };
  }, [timeTravelService]);

  const handleStepBackward = useCallback(() => {
    timeTravelService.stepBackward();
  }, [timeTravelService]);

  const handleStepForward = useCallback(() => {
    timeTravelService.stepForward();
  }, [timeTravelService]);

  const handleJumpToSnapshot = useCallback((index: number) => {
    timeTravelService.replayToSnapshot(index);
    setSelectedSnapshotIndex(index);
  }, [timeTravelService]);

  const handleResumeExecution = useCallback(() => {
    timeTravelService.resumeExecution();
    setSelectedSnapshotIndex(-1);
  }, [timeTravelService]);

  const handleClearHistory = useCallback(() => {
    timeTravelService.clearHistory();
    setSelectedSnapshotIndex(-1);
    setComparisonIndex(-1);
    setShowComparison(false);
  }, [timeTravelService]);

  const handleToggleComparison = useCallback(() => {
    if (showComparison) {
      setShowComparison(false);
      setComparisonIndex(-1);
    } else if (selectedSnapshotIndex >= 0 && selectedSnapshotIndex < snapshots.length - 1) {
      setComparisonIndex(selectedSnapshotIndex + 1);
      setShowComparison(true);
    }
  }, [showComparison, selectedSnapshotIndex, snapshots.length]);

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const getStateDisplayName = (snapshot: StateSnapshot): string => {
    const state = snapshot.state;
    if (typeof state.value === 'string') {
      return state.value;
    }
    if (typeof state.value === 'object' && state.value !== null) {
      return JSON.stringify(state.value);
    }
    return 'unknown';
  };

  const getEventDisplayName = (snapshot: StateSnapshot): string => {
    if (!snapshot.event) return 'INITIAL';
    return snapshot.event.type || 'UNKNOWN_EVENT';
  };

  // Generate timeline positions for visualization
  const timelinePositions: TimelinePosition[] = snapshots.map((snapshot, index) => ({
    index,
    timestamp: snapshot.timestamp,
    eventType: getEventDisplayName(snapshot),
    stateName: getStateDisplayName(snapshot)
  }));

  const comparison = showComparison && comparisonIndex >= 0 && selectedSnapshotIndex >= 0
    ? timeTravelService.compareSnapshots(selectedSnapshotIndex, comparisonIndex)
    : null;

  if (!timeTravelService.isConnected) {
    return (
      <div className={`time-travel-debugger ${className}`}>
        <div className="time-travel-status">
          <span className="status-indicator offline">●</span>
          Time Travel Service Offline
        </div>
      </div>
    );
  }

  return (
    <div className={`time-travel-debugger ${className}`}>
      <style jsx>{`
        .time-travel-debugger {
          background: #1e1e1e;
          color: #d4d4d4;
          border-radius: 8px;
          padding: 16px;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 12px;
          border: 1px solid #333;
        }

        .time-travel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #333;
        }

        .status-indicator {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 6px;
        }

        .status-indicator.online {
          color: #4caf50;
        }

        .status-indicator.offline {
          color: #f44336;
        }

        .status-indicator.time-travel {
          color: #ff9800;
        }

        .time-travel-controls {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .control-button {
          background: #333;
          border: 1px solid #555;
          color: #d4d4d4;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          transition: background-color 0.2s;
        }

        .control-button:hover {
          background: #444;
        }

        .control-button:disabled {
          background: #222;
          color: #666;
          cursor: not-allowed;
        }

        .control-button.active {
          background: #0d7377;
        }

        .timeline {
          margin-bottom: 16px;
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid #333;
          border-radius: 4px;
          background: #252526;
        }

        .timeline-item {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          cursor: pointer;
          border-bottom: 1px solid #333;
          transition: background-color 0.2s;
        }

        .timeline-item:hover {
          background: #2d2d30;
        }

        .timeline-item.current {
          background: #0d7377;
        }

        .timeline-item.selected {
          background: #1e3a8a;
        }

        .timeline-item.comparison {
          background: #7c2d12;
        }

        .timeline-index {
          width: 30px;
          text-align: right;
          margin-right: 8px;
          color: #858585;
        }

        .timeline-event {
          flex: 1;
          margin-right: 8px;
          font-weight: bold;
        }

        .timeline-state {
          margin-right: 8px;
          color: #9cdcfe;
        }

        .timeline-timestamp {
          color: #608b4e;
          font-size: 10px;
        }

        .state-comparison {
          background: #252526;
          border: 1px solid #333;
          border-radius: 4px;
          padding: 12px;
          margin-top: 12px;
        }

        .comparison-header {
          font-weight: bold;
          margin-bottom: 8px;
          color: #4caf50;
        }

        .differences-list {
          margin-bottom: 8px;
        }

        .difference-item {
          padding: 2px 4px;
          margin: 2px 0;
          background: #1a1a1a;
          border-radius: 2px;
        }

        .difference-added {
          border-left: 3px solid #4caf50;
        }

        .difference-removed {
          border-left: 3px solid #f44336;
        }

        .difference-modified {
          border-left: 3px solid #ff9800;
        }

        .context-diff {
          font-size: 10px;
          color: #858585;
          margin-top: 4px;
        }

        .no-snapshots {
          text-align: center;
          color: #666;
          padding: 20px;
          font-style: italic;
        }
      `}</style>

      <div className="time-travel-header">
        <div className="time-travel-status">
          <span className={`status-indicator ${isTimeTraveling ? 'time-travel' : 'online'}`}>●</span>
          {isTimeTraveling ? 'Time Traveling' : 'Recording'} ({snapshots.length} snapshots)
        </div>
        <div className="current-position">
          {currentIndex >= 0 ? `#${currentIndex}` : 'No snapshots'}
        </div>
      </div>

      <div className="time-travel-controls">
        <button
          className="control-button"
          onClick={handleStepBackward}
          disabled={currentIndex <= 0}
          title="Step Backward"
        >
          ⏮ Step Back
        </button>

        <button
          className="control-button"
          onClick={handleStepForward}
          disabled={currentIndex >= snapshots.length - 1}
          title="Step Forward"
        >
          Step Forward ⏭
        </button>

        <button
          className="control-button"
          onClick={handleResumeExecution}
          disabled={!isTimeTraveling}
          title="Resume Normal Execution"
        >
          ▶ Resume
        </button>

        <button
          className="control-button"
          onClick={handleToggleComparison}
          disabled={selectedSnapshotIndex < 0 || selectedSnapshotIndex >= snapshots.length - 1}
          title="Toggle State Comparison"
        >
          {showComparison ? '✗ Hide Diff' : '⚡ Compare'}
        </button>

        <button
          className="control-button"
          onClick={handleClearHistory}
          title="Clear History"
        >
          🗑 Clear
        </button>
      </div>

      {snapshots.length === 0 ? (
        <div className="no-snapshots">
          No state snapshots captured yet.
          <br />
          Interact with the application to see state changes.
        </div>
      ) : (
        <div className="timeline">
          {timelinePositions.map((position) => (
            <div
              key={position.index}
              className={`timeline-item ${
                position.index === currentIndex ? 'current' : ''
              } ${
                position.index === selectedSnapshotIndex ? 'selected' : ''
              } ${
                position.index === comparisonIndex ? 'comparison' : ''
              }`}
              onClick={() => handleJumpToSnapshot(position.index)}
              title={`Click to jump to this state`}
            >
              <div className="timeline-index">#{position.index}</div>
              <div className="timeline-event">{position.eventType}</div>
              <div className="timeline-state">{position.stateName}</div>
              <div className="timeline-timestamp">
                {formatTimestamp(position.timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}

      {comparison && (
        <div className="state-comparison">
          <div className="comparison-header">
            State Comparison: #{selectedSnapshotIndex} → #{comparisonIndex}
          </div>

          {comparison.differences.length === 0 ? (
            <div>No differences found between these states.</div>
          ) : (
            <>
              <div className="differences-list">
                <strong>Changed Properties ({comparison.differences.length}):</strong>
                {comparison.differences.map((diff, index) => (
                  <div key={index} className="difference-item difference-modified">
                    {diff}
                  </div>
                ))}
              </div>

              {Object.keys(comparison.contextDiff.added).length > 0 && (
                <div className="differences-list">
                  <strong>Added:</strong>
                  {Object.entries(comparison.contextDiff.added).map(([key, value], index) => (
                    <div key={index} className="difference-item difference-added">
                      {key}: {JSON.stringify(value)}
                    </div>
                  ))}
                </div>
              )}

              {Object.keys(comparison.contextDiff.removed).length > 0 && (
                <div className="differences-list">
                  <strong>Removed:</strong>
                  {Object.entries(comparison.contextDiff.removed).map(([key, value], index) => (
                    <div key={index} className="difference-item difference-removed">
                      {key}: {JSON.stringify(value)}
                    </div>
                  ))}
                </div>
              )}

              {Object.keys(comparison.contextDiff.modified).length > 0 && (
                <div className="differences-list">
                  <strong>Modified:</strong>
                  {Object.entries(comparison.contextDiff.modified).map(([key, changes], index) => (
                    <div key={index} className="difference-item difference-modified">
                      <strong>{key}:</strong>
                      <div className="context-diff">
                        From: {JSON.stringify(changes.from)}
                      </div>
                      <div className="context-diff">
                        To: {JSON.stringify(changes.to)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};