import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DeveloperMode from '../components/DeveloperMode';
import StateMachineVisualizer from '../components/StateMachineVisualizer';
import PerformanceMonitor from '../components/PerformanceMonitor';

// Mock XState inspector
vi.mock('@xstate/inspect', () => ({
  inspect: vi.fn(),
  createInspectorAdapter: vi.fn().mockReturnValue({
    next: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn()
  })
}));

// Mock performance observer
const mockPerformanceObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  disconnect: vi.fn()
}));

Object.defineProperty(window, 'PerformanceObserver', {
  value: mockPerformanceObserver
});

// Mock application data
const mockApplication = {
  name: 'Test App',
  description: 'Test application for debugging',
  author: 'npub1dev...',
  timestamp: Date.now() / 1000,
  machine: JSON.stringify({
    id: 'testMachine',
    initial: 'idle',
    context: { count: 0 },
    states: {
      idle: {
        on: {
          START: 'running',
          INCREMENT: { actions: 'increment' }
        }
      },
      running: {
        on: {
          PAUSE: 'paused',
          STOP: 'idle'
        }
      },
      paused: {
        on: {
          RESUME: 'running',
          STOP: 'idle'
        }
      }
    }
  })
};

describe('Developer Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Debug Mode Toggle', () => {
    it('should render debug mode toggle', () => {
      render(<DeveloperMode application={mockApplication} />);

      expect(screen.getByText(/developer mode/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /enable debug mode/i })).toBeInTheDocument();
    });

    it('should enable debug features when toggled on', async () => {
      const user = userEvent.setup();
      render(<DeveloperMode application={mockApplication} />);

      const debugToggle = screen.getByRole('checkbox', { name: /enable debug mode/i });
      await user.click(debugToggle);

      expect(screen.getByTestId('debug-panel')).toBeInTheDocument();
    });

    it('should hide debug features when toggled off', async () => {
      const user = userEvent.setup();
      render(<DeveloperMode application={mockApplication} debugEnabled={true} />);

      const debugToggle = screen.getByRole('checkbox', { name: /enable debug mode/i });
      await user.click(debugToggle);

      expect(screen.queryByTestId('debug-panel')).not.toBeInTheDocument();
    });
  });

  describe('State Machine Inspector', () => {
    it('should show current state in debug panel', () => {
      render(<DeveloperMode application={mockApplication} debugEnabled={true} />);

      expect(screen.getByText(/current state/i)).toBeInTheDocument();
      expect(screen.getByText('idle')).toBeInTheDocument();
    });

    it('should display available transitions', () => {
      render(<DeveloperMode application={mockApplication} debugEnabled={true} />);

      expect(screen.getByText(/available transitions/i)).toBeInTheDocument();
      expect(screen.getByText('START')).toBeInTheDocument();
      expect(screen.getByText('INCREMENT')).toBeInTheDocument();
    });

    it('should show context values', () => {
      render(<DeveloperMode application={mockApplication} debugEnabled={true} />);

      expect(screen.getByText(/context/i)).toBeInTheDocument();
      expect(screen.getByText('"count": 0')).toBeInTheDocument();
    });

    it('should allow manual event triggering', async () => {
      const user = userEvent.setup();
      const mockOnEvent = vi.fn();

      render(
        <DeveloperMode
          application={mockApplication}
          debugEnabled={true}
          onDebugEvent={mockOnEvent}
        />
      );

      const startButton = screen.getByText('START');
      await user.click(startButton);

      expect(mockOnEvent).toHaveBeenCalledWith({
        type: 'START',
        source: 'debug'
      });
    });

    it('should update when state changes', () => {
      const { rerender } = render(
        <DeveloperMode application={mockApplication} debugEnabled={true} />
      );

      // Simulate state change
      rerender(
        <DeveloperMode
          application={mockApplication}
          debugEnabled={true}
          currentState={{
            value: 'running',
            context: { count: 1 }
          }}
        />
      );

      expect(screen.getByText('running')).toBeInTheDocument();
      expect(screen.getByText('"count": 1')).toBeInTheDocument();
    });
  });

  describe('Event History', () => {
    it('should display event history panel', () => {
      render(<DeveloperMode application={mockApplication} debugEnabled={true} />);

      expect(screen.getByText(/event history/i)).toBeInTheDocument();
    });

    it('should log events to history', () => {
      const events = [
        { type: 'START', timestamp: Date.now() - 1000 },
        { type: 'INCREMENT', timestamp: Date.now() - 500 },
        { type: 'PAUSE', timestamp: Date.now() }
      ];

      render(
        <DeveloperMode
          application={mockApplication}
          debugEnabled={true}
          eventHistory={events}
        />
      );

      expect(screen.getByText('START')).toBeInTheDocument();
      expect(screen.getByText('INCREMENT')).toBeInTheDocument();
      expect(screen.getByText('PAUSE')).toBeInTheDocument();
    });

    it('should show timestamps for events', () => {
      const events = [
        { type: 'START', timestamp: Date.now() - 1000 }
      ];

      render(
        <DeveloperMode
          application={mockApplication}
          debugEnabled={true}
          eventHistory={events}
        />
      );

      expect(screen.getByText(/1.*second.*ago/i)).toBeInTheDocument();
    });

    it('should allow clearing event history', async () => {
      const user = userEvent.setup();
      const mockOnClearHistory = vi.fn();

      const events = [
        { type: 'START', timestamp: Date.now() - 1000 }
      ];

      render(
        <DeveloperMode
          application={mockApplication}
          debugEnabled={true}
          eventHistory={events}
          onClearHistory={mockOnClearHistory}
        />
      );

      const clearButton = screen.getByText(/clear history/i);
      await user.click(clearButton);

      expect(mockOnClearHistory).toHaveBeenCalled();
    });

    it('should limit history to last 50 events', () => {
      const events = Array.from({ length: 60 }, (_, i) => ({
        type: `EVENT_${i}`,
        timestamp: Date.now() - (i * 100)
      }));

      render(
        <DeveloperMode
          application={mockApplication}
          debugEnabled={true}
          eventHistory={events}
        />
      );

      // Should only show first 50 events
      expect(screen.getByText('EVENT_0')).toBeInTheDocument();
      expect(screen.getByText('EVENT_49')).toBeInTheDocument();
      expect(screen.queryByText('EVENT_50')).not.toBeInTheDocument();
    });
  });

  describe('Developer Console', () => {
    it('should show developer console panel', () => {
      render(<DeveloperMode application={mockApplication} debugEnabled={true} />);

      expect(screen.getByText(/developer console/i)).toBeInTheDocument();
    });

    it('should display console messages', () => {
      const consoleMessages = [
        { level: 'info', message: 'Application started', timestamp: Date.now() - 1000 },
        { level: 'warn', message: 'State transition warning', timestamp: Date.now() - 500 },
        { level: 'error', message: 'Action failed', timestamp: Date.now() }
      ];

      render(
        <DeveloperMode
          application={mockApplication}
          debugEnabled={true}
          consoleMessages={consoleMessages}
        />
      );

      expect(screen.getByText('Application started')).toBeInTheDocument();
      expect(screen.getByText('State transition warning')).toBeInTheDocument();
      expect(screen.getByText('Action failed')).toBeInTheDocument();
    });

    it('should filter console messages by level', async () => {
      const user = userEvent.setup();
      const consoleMessages = [
        { level: 'info', message: 'Info message', timestamp: Date.now() },
        { level: 'error', message: 'Error message', timestamp: Date.now() }
      ];

      render(
        <DeveloperMode
          application={mockApplication}
          debugEnabled={true}
          consoleMessages={consoleMessages}
        />
      );

      const errorFilter = screen.getByLabelText(/show errors only/i);
      await user.click(errorFilter);

      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Info message')).not.toBeInTheDocument();
    });

    it('should allow clearing console', async () => {
      const user = userEvent.setup();
      const mockOnClearConsole = vi.fn();

      render(
        <DeveloperMode
          application={mockApplication}
          debugEnabled={true}
          onClearConsole={mockOnClearConsole}
        />
      );

      const clearButton = screen.getByText(/clear console/i);
      await user.click(clearButton);

      expect(mockOnClearConsole).toHaveBeenCalled();
    });
  });
});

describe('State Machine Visualizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visual Representation', () => {
    it('should render state machine diagram', () => {
      render(<StateMachineVisualizer machine={mockApplication.machine} />);

      expect(screen.getByTestId('state-diagram')).toBeInTheDocument();
    });

    it('should show all states as nodes', () => {
      render(<StateMachineVisualizer machine={mockApplication.machine} />);

      expect(screen.getByText('idle')).toBeInTheDocument();
      expect(screen.getByText('running')).toBeInTheDocument();
      expect(screen.getByText('paused')).toBeInTheDocument();
    });

    it('should highlight current state', () => {
      render(
        <StateMachineVisualizer
          machine={mockApplication.machine}
          currentState="running"
        />
      );

      const runningState = screen.getByTestId('state-running');
      expect(runningState).toHaveClass('current-state');
    });

    it('should show transitions as edges', () => {
      render(<StateMachineVisualizer machine={mockApplication.machine} />);

      expect(screen.getByTestId('transition-START')).toBeInTheDocument();
      expect(screen.getByTestId('transition-PAUSE')).toBeInTheDocument();
      expect(screen.getByTestId('transition-STOP')).toBeInTheDocument();
    });

    it('should allow zooming and panning', async () => {
      const user = userEvent.setup();
      render(<StateMachineVisualizer machine={mockApplication.machine} />);

      const diagram = screen.getByTestId('state-diagram');

      // Test zoom in
      await user.click(screen.getByLabelText(/zoom in/i));
      expect(diagram).toHaveStyle({ transform: expect.stringMatching(/scale\(1\.[1-9]/) });

      // Test zoom out
      await user.click(screen.getByLabelText(/zoom out/i));
      expect(diagram).toHaveStyle({ transform: expect.stringMatching(/scale\(1\.0?/) });
    });
  });

  describe('Interactive Features', () => {
    it('should show state details on hover', async () => {
      const user = userEvent.setup();
      render(<StateMachineVisualizer machine={mockApplication.machine} />);

      const idleState = screen.getByTestId('state-idle');
      await user.hover(idleState);

      expect(screen.getByText(/available events:/i)).toBeInTheDocument();
      expect(screen.getByText('START, INCREMENT')).toBeInTheDocument();
    });

    it('should allow clicking states to see details', async () => {
      const user = userEvent.setup();
      render(<StateMachineVisualizer machine={mockApplication.machine} />);

      const runningState = screen.getByTestId('state-running');
      await user.click(runningState);

      expect(screen.getByTestId('state-details-panel')).toBeInTheDocument();
      expect(screen.getByText(/state: running/i)).toBeInTheDocument();
    });

    it('should simulate transitions on click', async () => {
      const user = userEvent.setup();
      const mockOnTransition = vi.fn();

      render(
        <StateMachineVisualizer
          machine={mockApplication.machine}
          onTransitionSimulate={mockOnTransition}
        />
      );

      const startTransition = screen.getByTestId('transition-START');
      await user.click(startTransition);

      expect(mockOnTransition).toHaveBeenCalledWith('START');
    });

    it('should show transition paths', () => {
      render(
        <StateMachineVisualizer
          machine={mockApplication.machine}
          showPaths={true}
        />
      );

      expect(screen.getByTestId('transition-path')).toBeInTheDocument();
    });
  });

  describe('Layout Options', () => {
    it('should support different layout algorithms', async () => {
      const user = userEvent.setup();
      render(<StateMachineVisualizer machine={mockApplication.machine} />);

      const layoutSelect = screen.getByLabelText(/layout/i);
      await user.selectOptions(layoutSelect, 'hierarchical');

      expect(screen.getByTestId('state-diagram')).toHaveClass('layout-hierarchical');
    });

    it('should adjust to container size', () => {
      const { container } = render(<StateMachineVisualizer machine={mockApplication.machine} />);

      // Simulate container resize
      Object.defineProperty(container.firstChild, 'offsetWidth', { value: 800 });
      Object.defineProperty(container.firstChild, 'offsetHeight', { value: 600 });

      fireEvent(window, new Event('resize'));

      const diagram = screen.getByTestId('state-diagram');
      expect(diagram).toHaveAttribute('viewBox', '0 0 800 600');
    });
  });
});

describe('Performance Monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Metrics Collection', () => {
    it('should display performance metrics panel', () => {
      render(<PerformanceMonitor application={mockApplication} />);

      expect(screen.getByText(/performance metrics/i)).toBeInTheDocument();
    });

    it('should track state transition times', () => {
      const metrics = {
        transitionTimes: [
          { from: 'idle', to: 'running', duration: 15 },
          { from: 'running', to: 'paused', duration: 8 },
          { from: 'paused', to: 'running', duration: 12 }
        ]
      };

      render(<PerformanceMonitor application={mockApplication} metrics={metrics} />);

      expect(screen.getByText(/avg.*12.*ms/i)).toBeInTheDocument();
    });

    it('should monitor UI rendering performance', () => {
      const metrics = {
        renderTimes: [45, 38, 52, 41, 47],
        frameDrops: 2
      };

      render(<PerformanceMonitor application={mockApplication} metrics={metrics} />);

      expect(screen.getByText(/avg.*44.*ms/i)).toBeInTheDocument();
      expect(screen.getByText(/2.*frames.*dropped/i)).toBeInTheDocument();
    });

    it('should track memory usage', () => {
      const mockPerformance = {
        memory: {
          usedJSHeapSize: 15000000, // 15MB
          totalJSHeapSize: 30000000, // 30MB
          jsHeapSizeLimit: 100000000 // 100MB
        }
      };

      Object.defineProperty(window, 'performance', { value: mockPerformance });

      render(<PerformanceMonitor application={mockApplication} />);

      expect(screen.getByText(/15.*MB.*used/i)).toBeInTheDocument();
    });

    it('should monitor network operations', () => {
      const metrics = {
        networkRequests: [
          { url: '/api/data', duration: 245, size: 1024 },
          { url: '/api/update', duration: 180, size: 512 }
        ]
      };

      render(<PerformanceMonitor application={mockApplication} metrics={metrics} />);

      expect(screen.getByText(/2.*requests/i)).toBeInTheDocument();
      expect(screen.getByText(/avg.*212.*ms/i)).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should update metrics in real-time', () => {
      const { rerender } = render(<PerformanceMonitor application={mockApplication} />);

      const initialMetrics = { transitionTimes: [{ duration: 15 }] };
      rerender(<PerformanceMonitor application={mockApplication} metrics={initialMetrics} />);

      const updatedMetrics = { transitionTimes: [{ duration: 15 }, { duration: 20 }] };
      rerender(<PerformanceMonitor application={mockApplication} metrics={updatedMetrics} />);

      expect(screen.getByText(/avg.*17.*ms/i)).toBeInTheDocument();
    });

    it('should highlight performance issues', () => {
      const metrics = {
        transitionTimes: [{ duration: 500 }], // Slow transition
        renderTimes: [100, 95, 120] // Slow renders
      };

      render(<PerformanceMonitor application={mockApplication} metrics={metrics} />);

      expect(screen.getByText(/performance warning/i)).toBeInTheDocument();
      expect(screen.getByTestId('slow-transition-warning')).toBeInTheDocument();
    });

    it('should provide optimization suggestions', () => {
      const metrics = {
        renderTimes: [80, 85, 95, 90], // Consistently slow
        frameDrops: 5
      };

      render(<PerformanceMonitor application={mockApplication} metrics={metrics} />);

      expect(screen.getByText(/suggestions/i)).toBeInTheDocument();
      expect(screen.getByText(/optimize.*rendering/i)).toBeInTheDocument();
    });
  });

  describe('Performance Profiling', () => {
    it('should start/stop profiling session', async () => {
      const user = userEvent.setup();
      render(<PerformanceMonitor application={mockApplication} />);

      const startButton = screen.getByText(/start profiling/i);
      await user.click(startButton);

      expect(screen.getByText(/stop profiling/i)).toBeInTheDocument();
      expect(screen.getByText(/profiling active/i)).toBeInTheDocument();
    });

    it('should export profiling results', async () => {
      const user = userEvent.setup();
      const mockCreateObjectURL = vi.fn();
      URL.createObjectURL = mockCreateObjectURL;

      render(<PerformanceMonitor application={mockApplication} isProfileActive={true} />);

      const stopButton = screen.getByText(/stop profiling/i);
      await user.click(stopButton);

      const exportButton = screen.getByText(/export results/i);
      await user.click(exportButton);

      expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    it('should show profiling timeline', () => {
      const profilingData = {
        timeline: [
          { event: 'STATE_CHANGE', timestamp: 1000, duration: 15 },
          { event: 'UI_RENDER', timestamp: 1015, duration: 25 },
          { event: 'ACTION_EXECUTE', timestamp: 1040, duration: 8 }
        ]
      };

      render(<PerformanceMonitor application={mockApplication} profilingData={profilingData} />);

      expect(screen.getByTestId('profiling-timeline')).toBeInTheDocument();
      expect(screen.getByText('STATE_CHANGE')).toBeInTheDocument();
      expect(screen.getByText('15ms')).toBeInTheDocument();
    });
  });

  describe('Performance Thresholds', () => {
    it('should allow setting custom performance thresholds', async () => {
      const user = userEvent.setup();
      render(<PerformanceMonitor application={mockApplication} />);

      const thresholdButton = screen.getByText(/thresholds/i);
      await user.click(thresholdButton);

      const transitionThreshold = screen.getByLabelText(/max transition time/i);
      await user.clear(transitionThreshold);
      await user.type(transitionThreshold, '50');

      expect(transitionThreshold).toHaveValue(50);
    });

    it('should alert when thresholds exceeded', () => {
      const metrics = {
        transitionTimes: [{ duration: 100 }] // Exceeds default 50ms threshold
      };

      render(
        <PerformanceMonitor
          application={mockApplication}
          metrics={metrics}
          thresholds={{ maxTransitionTime: 50 }}
        />
      );

      expect(screen.getByTestId('threshold-exceeded-alert')).toBeInTheDocument();
    });
  });
});