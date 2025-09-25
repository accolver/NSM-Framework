import { useState, useEffect, useRef } from 'react';
import { createMachine, interpret } from 'xstate';
import ProgressiveUIRenderer from './ProgressiveUIRenderer';
import { NSMUIEvent } from '@nsm/client/ui/ui-resolver';

interface ApplicationLauncherProps {
  application: {
    name: string;
    machine: string;
    [key: string]: any;
  };
}

export default function ApplicationLauncher({ application }: ApplicationLauncherProps) {
  const [currentState, setCurrentState] = useState<{ value: string; context: any }>({
    value: 'idle',
    context: {}
  });
  const [error, setError] = useState<string | null>(null);
  const machineServiceRef = useRef<any>(null);

  useEffect(() => {
    initializeStateMachine();

    return () => {
      if (machineServiceRef.current) {
        machineServiceRef.current.stop();
      }
    };
  }, [application]);

  useEffect(() => {
    // Save state to localStorage whenever it changes
    if (currentState.value !== 'idle' || Object.keys(currentState.context).length > 0) {
      localStorage.setItem(
        `nsm-app-state-${application.name}`,
        JSON.stringify(currentState)
      );
    }
  }, [currentState, application.name]);

  const initializeStateMachine = () => {
    try {
      // Parse the machine configuration
      const machineConfig = JSON.parse(application.machine);

      // Try to restore state from localStorage
      const savedState = localStorage.getItem(`nsm-app-state-${application.name}`);
      let initialState = null;

      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          initialState = parsed;
        } catch (e) {
          console.warn('Failed to parse saved state, using initial state');
        }
      }

      // Create XState machine
      const machine = createMachine(machineConfig);

      // Create and start service
      const service = interpret(machine);

      service.onTransition((state) => {
        setCurrentState({
          value: typeof state.value === 'string' ? state.value : String(state.value),
          context: state.context || {}
        });
      });

      service.start(initialState || undefined);
      machineServiceRef.current = service;

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize state machine');
    }
  };

  const handleNSMEvent = (event: NSMUIEvent) => {
    if (machineServiceRef.current) {
      machineServiceRef.current.send({
        type: event.type,
        ...event.data
      });
    }
  };

  const triggerStateChange = () => {
    // This is a test helper function
    if (machineServiceRef.current) {
      machineServiceRef.current.send('START');
    }
  };

  if (error) {
    return (
      <div className="application-launcher-error">
        <h3>Failed to load application</h3>
        <p>{error}</p>
        <button onClick={initializeStateMachine}>Retry</button>
      </div>
    );
  }

  return (
    <div className="application-launcher">
      <div className="debug-info">
        <div data-testid="xstate-machine">XState Machine Active</div>
        <div data-testid="current-state">{currentState.value}</div>
        <button
          data-testid="trigger-state-change"
          onClick={triggerStateChange}
          style={{ display: 'none' }} // Hidden test helper
        >
          Trigger Change
        </button>
      </div>

      <ProgressiveUIRenderer
        application={application}
        currentState={currentState}
        onNSMEvent={handleNSMEvent}
      />
    </div>
  );
}