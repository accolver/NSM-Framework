# 🎹 Wordle Keyboard Debug Testing Plan

## Current Status
✅ Clean development environment established
✅ Wordle app running on http://localhost:3000
✅ Comprehensive debug logging added to all keyboard event handlers
✅ State machine logging enabled

## Debug Logging Added

### 🎮 App Component Events
- **Component Lifecycle**: Mount/unmount logging
- **State Machine**: All state changes and context updates
- **Focus Events**: Main element focus gain/loss detection

### 🎹 Physical Keyboard Events
- **Raw Key Events**: All keydown, keyup, keypress events
- **Key Processing**: Raw key values and processed uppercase versions
- **Event Handler Calls**: Detailed logging for letter, backspace, enter handlers
- **State Machine Events**: KEYPRESS, BACKSPACE, SUBMIT_GUESS event sending

### 📱 Virtual Keyboard Events
- **Button Clicks**: All virtual keyboard button interactions
- **Event Handler Calls**: Virtual button → handler function calls

## Testing Protocol

### Step 1: Open Browser & Console
1. Open browser to http://localhost:3000
2. Open browser Developer Tools (F12)
3. Go to Console tab
4. Look for initial setup messages:
   ```
   🎮 App component mounted - starting state machine
   🔄 State machine update: playing {...}
   ```

### Step 2: Test Focus
1. Click on the game area (should see focus message)
2. Expected console output:
   ```
   🎯 Main element gained focus
   ```

### Step 3: Test Virtual Keyboard
1. Click any letter button on virtual keyboard
2. Expected console output:
   ```
   Virtual keyboard button clicked: [LETTER]
   📤 handleKeyPress called with letter: [LETTER]
   📤 Sending KEYPRESS event to state machine
   🔄 State machine update: playing {...}
   ```

### Step 4: Test Physical Keyboard
1. Make sure game area is focused (click on it if needed)
2. Press letter keys (A-Z)
3. Expected console output for each key:
   ```
   🎹 Physical keyboard event detected: {key: "a", keyCode: 65, ...}
   🔤 Processed key: A
   🔤 Letter key detected - calling handleKeyPress with: A
   📤 handleKeyPress called with letter: A
   📤 Sending KEYPRESS event to state machine
   🔄 State machine update: playing {...}
   ```

### Step 5: Test Special Keys
1. Press BACKSPACE key
2. Expected output:
   ```
   🎹 Physical keyboard event detected: {key: "Backspace", ...}
   🔤 Processed key: BACKSPACE
   ⬅️ Backspace key detected - calling handleBackspace
   📤 handleBackspace called
   📤 Sending BACKSPACE event to state machine
   ```

3. Press ENTER key
4. Expected output:
   ```
   🎹 Physical keyboard event detected: {key: "Enter", ...}
   🔤 Processed key: ENTER
   ✅ Enter key detected - calling handleEnter
   📤 handleEnter called
   📤 Sending SUBMIT_GUESS event to state machine
   ```

## Diagnostic Questions

Based on console output, identify where the chain breaks:

### 🔍 No Console Activity at All
- Check if page loaded correctly
- Verify Developer Tools console is open and not filtered
- Refresh page and look for initial setup messages

### 🔍 Virtual Keyboard Works, Physical Doesn't
- Check if main element has focus (click on game area)
- Look for focus/blur messages in console
- Verify physical keyboard events are being detected

### 🔍 Physical Keyboard Events Detected, But No Handler Calls
- Check the key processing logic
- Look for "Key not recognized" messages
- Verify event.preventDefault() is working

### 🔍 Handler Functions Called, But No State Updates
- Check state machine event logging
- Verify actor.send() calls are working
- Look for state machine errors

### 🔍 State Machine Updates, But No Visual Changes
- Check React re-rendering
- Verify component state updates
- Look for UI rendering issues

## Quick Fixes to Try

### Fix 1: Force Focus
Add this to browser console:
```javascript
document.querySelector('main').focus();
console.log('Forced focus on main element');
```

### Fix 2: Test Event Listener
Add this to browser console:
```javascript
document.addEventListener('keydown', (e) => {
  console.log('Global keydown event:', e.key);
});
```

### Fix 3: Check Element Properties
Add this to browser console:
```javascript
const main = document.querySelector('main');
console.log('Main element:', main);
console.log('TabIndex:', main.tabIndex);
console.log('Has focus:', document.activeElement === main);
```

## Next Steps Based on Results

1. **If virtual keyboard works**: Focus/event binding issue
2. **If physical keyboard partially works**: Key processing issue
3. **If events detected but no handlers called**: Event handler binding issue
4. **If handlers called but no state updates**: State machine issue
5. **If state updates but no visual changes**: React rendering issue

## Contact Information
Report findings with:
- Console output screenshots
- Which test steps work/fail
- Any error messages
- Browser and OS information