# React Frontend Development Research

## Overview
React is a JavaScript library for building user interfaces with a component-based architecture. For the NSM framework, React will be used without Next.js to maintain simplicity and alignment with the state-driven UI principles.

## Key Concepts for NSM Framework
- **State-Driven Rendering**: UI as a pure function of state
- **Unidirectional Data Flow**: Props down, events up
- **Component Composition**: Building UIs from reusable components
- **Hooks for State Management**: Integration with XState interpreters

## Integration with XState
```tsx
import { useMachine } from '@xstate/react';
import { wordleMachine } from './machines/wordle-machine';

function WordleGame() {
  const [state, send] = useMachine(wordleMachine);

  return (
    <div className="wordle-game">
      <h1>Nostr Wordle</h1>

      {state.matches('loading') && <LoadingSpinner />}

      {state.matches('playing') && (
        <>
          <WordGrid guesses={state.context.guesses} />
          <Keyboard
            onKeyPress={(key) => send({ type: 'KEYPRESS', key })}
            onSubmit={() => send({ type: 'SUBMIT_GUESS' })}
            letterStatuses={state.context.letterStatuses}
          />
        </>
      )}

      {state.matches('won') && <WinMessage />}
      {state.matches('lost') && <LoseMessage />}
    </div>
  );
}
```

## State-Driven Component Patterns
```tsx
// Pure function components based on state
interface WordGridProps {
  guesses: string[];
  currentGuess: string;
  maxGuesses: number;
}

function WordGrid({ guesses, currentGuess, maxGuesses }: WordGridProps) {
  return (
    <div className="word-grid">
      {Array.from({ length: maxGuesses }, (_, i) => (
        <GuessRow
          key={i}
          guess={i < guesses.length ? guesses[i] :
                 i === guesses.length ? currentGuess : ''}
          isActive={i === guesses.length}
        />
      ))}
    </div>
  );
}

// Event emission pattern
interface KeyboardProps {
  onKeyPress: (key: string) => void;
  onSubmit: () => void;
  letterStatuses: Record<string, 'correct' | 'present' | 'absent'>;
}

function Keyboard({ onKeyPress, onSubmit, letterStatuses }: KeyboardProps) {
  const handleKeyClick = (key: string) => {
    if (key === 'ENTER') {
      onSubmit();
    } else if (key === 'BACKSPACE') {
      onKeyPress('BACKSPACE');
    } else {
      onKeyPress(key);
    }
  };

  return (
    <div className="keyboard">
      {/* Render keyboard layout with click handlers */}
    </div>
  );
}
```

## Multi-User Application Patterns
```tsx
// Collaborative whiteboard component
function Whiteboard() {
  const [state, send] = useMachine(whiteboardMachine);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handlePointerDown = (event: PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    send({
      type: 'POINTER_DOWN',
      x,
      y,
      pointerId: event.pointerId
    });
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ cursor: getCursor(state.value) }}
    />
  );
}
```

## Development Tools Integration
```tsx
// Development panel with state visualization
function NSMDevPanel() {
  const [selectedMachine, setSelectedMachine] = useState(null);

  return (
    <div className="dev-panel">
      <MachineSelector
        machines={discoveredMachines}
        onSelect={setSelectedMachine}
      />

      {selectedMachine && (
        <>
          <StateVisualizer machine={selectedMachine} />
          <EventLog machine={selectedMachine} />
          <StateInspector machine={selectedMachine} />
        </>
      )}
    </div>
  );
}
```

## Performance Considerations
- Use React.memo for expensive pure components
- Implement proper key props for list rendering
- Leverage useMemo and useCallback for optimization
- Consider code splitting for large applications

## Testing Patterns
- Test components with @testing-library/react
- Mock XState machines for isolated component testing
- Test event emission and state integration
- Implement visual regression testing for UI components