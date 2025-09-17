import React, { useEffect, useState } from 'react';
import { createActor, setup } from 'xstate';
import { createInspectorService, inspectActor } from '../services/inspector-service';

/**
 * Simple demo machine to test XState Inspector functionality
 */
const demoMachine = setup({
  types: {} as {
    context: { count: number };
    events: { type: 'INCREMENT' } | { type: 'DECREMENT' } | { type: 'RESET' };
  }
}).createMachine({
  id: 'demo',
  initial: 'idle',
  context: { count: 0 },
  states: {
    idle: {
      on: {
        INCREMENT: {
          actions: ({ context }) => {
            context.count += 1;
          }
        },
        DECREMENT: {
          actions: ({ context }) => {
            context.count -= 1;
          }
        },
        RESET: {
          actions: ({ context }) => {
            context.count = 0;
          }
        }
      }
    }
  }
});

/**
 * Demo component that showcases XState Inspector integration
 */
export function InspectorDemo(): React.ReactElement {
  const [actor, setActor] = useState<any>(null);
  const [count, setCount] = useState(0);
  const [inspectorConnected, setInspectorConnected] = useState(false);

  useEffect(() => {
    // Create actor
    const demoActor = createActor(demoMachine);

    // Subscribe to state changes
    demoActor.subscribe((state) => {
      setCount(state.context.count);
    });

    // Start the actor
    demoActor.start();
    setActor(demoActor);

    // Try to connect inspector and register the actor
    const setupInspector = async () => {
      try {
        const inspector = createInspectorService({ devOnly: false });
        const connected = await inspector.connect();

        if (connected) {
          const registered = inspector.registerActor(demoActor, 'demo-counter');
          setInspectorConnected(registered);
        }
      } catch (error) {
        console.warn('Inspector setup failed:', error);
      }
    };

    setupInspector();

    // Cleanup on unmount
    return () => {
      if (demoActor) {
        demoActor.stop();
      }
    };
  }, []);

  const handleIncrement = () => {
    actor?.send({ type: 'INCREMENT' });
  };

  const handleDecrement = () => {
    actor?.send({ type: 'DECREMENT' });
  };

  const handleReset = () => {
    actor?.send({ type: 'RESET' });
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', margin: '20px' }}>
      <h3>XState Inspector Demo</h3>

      <div style={{ marginBottom: '20px' }}>
        <p><strong>Count:</strong> {count}</p>
        <p><strong>Inspector Status:</strong> {inspectorConnected ? '🟢 Connected' : '🔴 Not Connected'}</p>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={handleIncrement} disabled={!actor}>
          Increment (+)
        </button>
        <button onClick={handleDecrement} disabled={!actor}>
          Decrement (-)
        </button>
        <button onClick={handleReset} disabled={!actor}>
          Reset (0)
        </button>
      </div>

      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px', fontSize: '14px' }}>
        <h4>Instructions:</h4>
        <ul>
          <li>Click the buttons above to change the state</li>
          <li>If the inspector is connected, you should see state changes in the XState Inspector popup</li>
          <li>The inspector will automatically open in a new window/tab when connected</li>
          <li>In development, the inspector is enabled by default</li>
          <li>In production, the inspector is disabled for performance</li>
        </ul>
      </div>
    </div>
  );
}

export default InspectorDemo;