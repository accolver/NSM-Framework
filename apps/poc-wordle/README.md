# Wordle Proof of Concept - NSM Framework

A complete Wordle game implementation built with XState v5 state machines and React UI components as part of the NSM (Network State Manager) framework demonstration.

## 🎯 Overview

This proof-of-concept demonstrates the NSM framework's capabilities by implementing a fully functional Wordle game with:

- **XState v5 State Machine**: Complete game logic and state management
- **React UI Components**: Full interactive UI with accessibility features
- **TDD Approach**: Comprehensive test coverage with 48 passing tests
- **Clean API**: WordleGame wrapper class for easy integration
- **NSM Integration**: Built on the NSM framework architecture

## 🏗️ Architecture

### State Machine (`wordle-machine.ts`)

The core game logic is implemented as an XState v5 state machine with:

- **States**: `playing`, `won`, `lost`
- **Events**: `KEYPRESS`, `BACKSPACE`, `SUBMIT_GUESS`, `RESET_GAME`
- **Context**: Game state including hidden word, guesses, current guess, and game status

### Game Wrapper (`wordle-game.ts`)

A clean API wrapper providing:

- Game control methods (`pressKey`, `submitGuess`, `resetGame`)
- State retrieval (`getState`, `isGameOver`, `hasWon`)
- Display helpers (`getWordGrid`, `getLetterStatusGrid`, `getKeyboardStatus`)

### React UI Components (`components/`)

Full interactive React UI with:

- **WordGrid**: 6x5 grid displaying guesses with color-coded feedback
- **Keyboard**: Virtual QWERTY keyboard with letter status visualization
- **GameStatus**: Game state display with win/loss messages and statistics
- **App**: Main component integrating XState machine with React

### Features

- ✅ Complete Wordle game mechanics
- ✅ Letter status tracking (correct, present, absent)
- ✅ 6-attempt limit with win/loss conditions
- ✅ Input validation and word checking
- ✅ Game reset functionality
- ✅ Keyboard state management for UI
- ✅ Full React UI with accessibility features
- ✅ Responsive design for mobile and desktop
- ✅ Physical and virtual keyboard input
- ✅ Visual feedback and animations

## 🧪 Testing

Built following TDD methodology with comprehensive test coverage:

```bash
# Run all tests
bun test

# Run specific test files
bun test wordle-machine.test.ts
bun test wordle-game.test.ts
```

**Test Coverage**:
- 16 state machine tests (state transitions, game logic, letter status)
- 12 wrapper class tests (API methods, display helpers, game control)
- 20 React component tests (rendering, user interactions, accessibility)
- All 48 tests passing

## 🚀 Usage

### Basic Game Instance

```typescript
import { WordleGame } from './wordle-game';

// Create and start a game
const game = new WordleGame();
game.start();

// Play the game
game.pressKey('S');
game.pressKey('T');
game.pressKey('A');
game.pressKey('R');
game.pressKey('T');
game.submitGuess();

// Check game state
console.log('Game state:', game.getState().gameState);
console.log('Has won:', game.hasWon());
console.log('Word grid:', game.getWordGrid());
```

### Testing with Known Words

```typescript
import { createWordleMachine } from './wordle-machine';
import { createActor } from 'xstate';

// Create machine with specific word for testing
const machine = createWordleMachine('ABOUT');
const actor = createActor(machine);
actor.start();

// Or use the wrapper
const game = new WordleGame('ABOUT');
game.start();
```

### Display Integration

```typescript
// Get data for UI rendering
const wordGrid = game.getWordGrid();          // 6x5 grid of letters
const statusGrid = game.getLetterStatusGrid(); // Letter status for styling
const keyboardStatus = game.getKeyboardStatus(); // Keyboard letter status

// Example: Current guess display
const state = game.getState();
console.log('Current guess:', state.currentGuess);
console.log('Attempts:', state.attemptNumber);
console.log('Game over:', state.gameOver);
```

## 📁 File Structure

```
src/
├── index.tsx                    # React entry point
├── wordle-machine.ts           # XState v5 state machine implementation
├── wordle-machine.test.ts      # State machine tests (16 tests)
├── wordle-game.ts              # Game wrapper class
├── wordle-game.test.ts         # Wrapper class tests (12 tests)
├── word-list.ts                # Wordle word list and validation
├── test-setup.ts               # React testing configuration
├── components/
│   ├── App.tsx                 # Main React component
│   ├── App.test.tsx            # App component tests (5 tests)
│   ├── WordGrid.tsx            # Game grid component
│   ├── WordGrid.test.tsx       # WordGrid tests (5 tests)
│   ├── Keyboard.tsx            # Virtual keyboard component
│   ├── Keyboard.test.tsx       # Keyboard tests (5 tests)
│   ├── GameStatus.tsx          # Game status display
│   ├── GameStatus.test.tsx     # GameStatus tests (5 tests)
│   └── styles.css              # Wordle-style CSS
├── index.html                  # HTML entry point
└── README.md                   # This file
```

## 🔧 Dependencies

- **XState v5.19.0**: State machine implementation
- **@xstate/react v4.1.3**: React integration for XState
- **React v18.2.0**: UI library
- **React DOM v18.2.0**: React rendering
- **@testing-library/react v14.1.2**: React component testing
- **@testing-library/user-event v14.5.1**: User interaction testing
- **happy-dom v12.10.3**: DOM environment for testing
- **@nsm/core**: NSM framework core
- **@nsm/client-sdk**: NSM client SDK
- **Bun**: Runtime and test runner
- **TypeScript**: Type safety and development

## 🎮 Game Rules

Standard Wordle rules implemented:

1. **Objective**: Guess the 5-letter word in 6 attempts
2. **Input**: Type letters to build your guess
3. **Submit**: Submit complete 5-letter words
4. **Feedback**: Letters are marked as:
   - 🟩 **Correct**: Right letter in right position
   - 🟨 **Present**: Right letter in wrong position
   - ⬜ **Absent**: Letter not in the word
5. **Win**: Guess the word correctly
6. **Lose**: Use all 6 attempts without guessing correctly

## 🚀 Next Steps

This implementation is ready for:

1. ✅ **React UI Components** (Task 5.2): Complete interactive UI implemented
2. **NSM Client Integration** (Task 5.3): Connect to NSM network for multiplayer features
3. **Persistence & Replay** (Task 5.4): Add game state persistence and replay functionality

## 🧪 Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run the demo (React version)
bun run dev

# Build the application
bun run build

# Type checking
bun run type-check
```

## 📊 Test Results

```bash
✅ 48 tests passing
✅ 131 expect() calls successful
✅ 0 failures
✅ Complete state machine coverage
✅ Full API wrapper coverage
✅ Complete React component coverage
✅ User interaction testing
✅ Accessibility compliance testing
```

## 🎨 UI Features

### Visual Design
- **Authentic Wordle styling**: Dark theme with green/yellow/gray color scheme
- **Responsive design**: Optimized for both mobile and desktop
- **Smooth animations**: Letter reveal animations and state transitions
- **Typography**: Clean, readable font stack

### Accessibility
- **ARIA labels**: Comprehensive labeling for screen readers
- **Keyboard navigation**: Full keyboard support for all interactions
- **Live regions**: Game status updates announced to screen readers
- **Color contrast**: WCAG-compliant color combinations
- **Focus management**: Clear focus indicators and logical tab order

### User Experience
- **Physical keyboard support**: Type directly on your keyboard
- **Virtual keyboard**: Click-to-type interface with visual feedback
- **Visual feedback**: Letters change color to show status
- **Game state**: Clear indication of attempts, win/loss status
- **Reset functionality**: Easy game restart with single click

Built with ❤️ using XState v5 and the NSM Framework.