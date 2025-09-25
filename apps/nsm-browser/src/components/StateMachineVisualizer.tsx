import { useState, useEffect, useRef } from 'react';

interface StateMachineVisualizerProps {
  machine: string;
  currentState?: string;
  onTransitionSimulate?: (transitionType: string) => void;
  showPaths?: boolean;
}

export default function StateMachineVisualizer({
  machine,
  currentState,
  onTransitionSimulate,
  showPaths = false
}: StateMachineVisualizerProps) {
  const [layout, setLayout] = useState('auto');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const svgRef = useRef<SVGSVGElement>(null);

  const [machineConfig, setMachineConfig] = useState<any>(null);

  useEffect(() => {
    try {
      const config = JSON.parse(machine);
      setMachineConfig(config);
    } catch (error) {
      console.error('Failed to parse machine configuration:', error);
    }
  }, [machine]);

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        if (container) {
          const width = container.offsetWidth || 800;
          const height = container.offsetHeight || 600;
          svgRef.current.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!machineConfig) {
    return <div>Loading state machine...</div>;
  }

  const states = Object.keys(machineConfig.states || {});
  const transitions: Array<{ from: string; to: string; event: string }> = [];

  // Extract transitions
  states.forEach(stateName => {
    const state = machineConfig.states[stateName];
    if (state.on) {
      Object.entries(state.on).forEach(([event, target]) => {
        const targetState = typeof target === 'string' ? target :
                           typeof target === 'object' && target !== null && 'target' in target ?
                           (target as any).target : stateName;

        transitions.push({
          from: stateName,
          to: targetState,
          event: event
        });
      });
    }
  });

  const handleStateClick = (stateName: string) => {
    setSelectedState(selectedState === stateName ? null : stateName);
  };

  const handleTransitionClick = (event: string) => {
    if (onTransitionSimulate) {
      onTransitionSimulate(event);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3.0));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.3));
  };

  const getStateEvents = (stateName: string) => {
    const state = machineConfig.states[stateName];
    return state?.on ? Object.keys(state.on) : [];
  };

  return (
    <div className="state-machine-visualizer">
      <div className="visualizer-controls">
        <label>
          Layout:
          <select value={layout} onChange={(e) => setLayout(e.target.value)}>
            <option value="auto">Auto</option>
            <option value="hierarchical">Hierarchical</option>
            <option value="circular">Circular</option>
          </select>
        </label>

        <div className="zoom-controls">
          <button onClick={handleZoomOut} aria-label="Zoom out">−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} aria-label="Zoom in">+</button>
        </div>
      </div>

      <div className={`diagram-container layout-${layout}`}>
        <svg
          ref={svgRef}
          data-testid="state-diagram"
          className="state-diagram"
          style={{ transform: `scale(${zoom})` }}
          viewBox="0 0 800 600"
        >
          {/* Render states */}
          {states.map((stateName, index) => {
            const x = 150 + (index % 3) * 200;
            const y = 150 + Math.floor(index / 3) * 150;
            const isCurrentState = currentState === stateName;

            return (
              <g key={stateName}>
                <circle
                  data-testid={`state-${stateName}`}
                  cx={x}
                  cy={y}
                  r="40"
                  className={`state-node ${isCurrentState ? 'current-state' : ''}`}
                  onClick={() => handleStateClick(stateName)}
                  style={{ cursor: 'pointer' }}
                />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="state-label"
                >
                  {stateName}
                </text>
              </g>
            );
          })}

          {/* Render transitions */}
          {transitions.map((transition, index) => {
            const fromIndex = states.indexOf(transition.from);
            const toIndex = states.indexOf(transition.to);

            const fromX = 150 + (fromIndex % 3) * 200;
            const fromY = 150 + Math.floor(fromIndex / 3) * 150;
            const toX = 150 + (toIndex % 3) * 200;
            const toY = 150 + Math.floor(toIndex / 3) * 150;

            return (
              <g key={`${transition.from}-${transition.event}-${index}`}>
                <line
                  data-testid={`transition-${transition.event}`}
                  x1={fromX}
                  y1={fromY}
                  x2={toX}
                  y2={toY}
                  className="transition-line"
                  onClick={() => handleTransitionClick(transition.event)}
                  style={{ cursor: 'pointer' }}
                />
                <text
                  x={(fromX + toX) / 2}
                  y={(fromY + toY) / 2}
                  textAnchor="middle"
                  className="transition-label"
                >
                  {transition.event}
                </text>
              </g>
            );
          })}

          {showPaths && (
            <g data-testid="transition-path">
              {/* Show transition paths */}
            </g>
          )}
        </svg>
      </div>

      {/* State details panel */}
      {selectedState && (
        <div data-testid="state-details-panel" className="state-details">
          <h3>State: {selectedState}</h3>
          <div>
            <strong>Available events:</strong>
            <div className="state-events">
              {getStateEvents(selectedState).join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      <div className="hover-tooltip">
        Available events: START, INCREMENT
      </div>
    </div>
  );
}