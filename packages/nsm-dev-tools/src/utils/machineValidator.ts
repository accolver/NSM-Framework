/**
 * Validation utilities for serialized state machines
 */

export interface MachineValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a serialized state machine configuration
 */
export function validateSerializedMachine(serializedMachine: string): MachineValidationResult {
  const result: MachineValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  try {
    // Parse the JSON
    const config = JSON.parse(serializedMachine);

    // Check basic structure
    if (!config || typeof config !== 'object') {
      result.errors.push('Machine configuration must be an object');
      result.isValid = false;
      return result;
    }

    // Check for required properties
    if (!config.states) {
      result.errors.push('Machine must have a states property');
      result.isValid = false;
    } else if (typeof config.states !== 'object') {
      result.errors.push('States must be an object');
      result.isValid = false;
    } else {
      // Check that states is not empty
      const stateKeys = Object.keys(config.states);
      if (stateKeys.length === 0) {
        result.errors.push('Machine must have at least one state');
        result.isValid = false;
      }

      // Validate initial state
      if (config.initial) {
        if (typeof config.initial === 'string') {
          if (!config.states[config.initial]) {
            result.errors.push(`Initial state "${config.initial}" is not defined in states`);
            result.isValid = false;
          }
        } else if (typeof config.initial === 'object') {
          // XState 5 format - check target array
          if (config.initial.target && Array.isArray(config.initial.target)) {
            const targetState = config.initial.target[0];
            if (targetState && typeof targetState === 'string') {
              const stateName = targetState.split('.').pop();
              if (stateName && !config.states[stateName]) {
                result.warnings.push(`Initial target state "${stateName}" may not be defined`);
              }
            }
          }
        }
      }

      // Validate state configurations
      for (const [stateName, stateConfig] of Object.entries(config.states)) {
        if (!stateConfig || typeof stateConfig !== 'object') {
          result.errors.push(`State "${stateName}" must be an object`);
          result.isValid = false;
          continue;
        }

        // Check for function preservation
        if (hasSerializedFunctions(stateConfig)) {
          result.warnings.push(`State "${stateName}" contains serialized functions that may need reconstruction`);
        }
      }
    }

    // Check for machine ID
    if (!config.id) {
      result.warnings.push('Machine should have an ID for better debugging');
    }

    // Check for context
    if (config.context === undefined) {
      result.warnings.push('Machine should define an initial context');
    }

    // Check for serialization artifacts
    if (config.error) {
      result.errors.push(`Machine contains serialization error: ${config.error}`);
      result.isValid = false;
    }

  } catch (parseError) {
    result.errors.push(`Invalid JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    result.isValid = false;
  }

  return result;
}

/**
 * Checks if an object contains serialized functions
 */
function hasSerializedFunctions(obj: any): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  // Check for our function serialization format
  if (obj.__type === 'function' || obj.__type === 'xstate.assign') {
    return true;
  }

  // Recursively check properties
  for (const value of Object.values(obj)) {
    if (hasSerializedFunctions(value)) {
      return true;
    }
  }

  return false;
}

/**
 * Estimates the complexity of a serialized machine for performance warnings
 */
export function estimateMachineComplexity(serializedMachine: string): {
  stateCount: number;
  transitionCount: number;
  functionCount: number;
  complexity: 'low' | 'medium' | 'high';
} {
  try {
    const config = JSON.parse(serializedMachine);
    let stateCount = 0;
    let transitionCount = 0;
    let functionCount = 0;

    if (config.states) {
      stateCount = Object.keys(config.states).length;

      for (const state of Object.values(config.states)) {
        if (state && typeof state === 'object') {
          const stateObj = state as any;

          // Count transitions
          if (stateObj.on) {
            transitionCount += Object.keys(stateObj.on).length;
          }

          // Count functions
          functionCount += countFunctions(stateObj);
        }
      }
    }

    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (stateCount > 20 || transitionCount > 50 || functionCount > 30) {
      complexity = 'high';
    } else if (stateCount > 10 || transitionCount > 20 || functionCount > 15) {
      complexity = 'medium';
    }

    return { stateCount, transitionCount, functionCount, complexity };
  } catch {
    return { stateCount: 0, transitionCount: 0, functionCount: 0, complexity: 'low' };
  }
}

/**
 * Recursively counts serialized functions in an object
 */
function countFunctions(obj: any): number {
  if (!obj || typeof obj !== 'object') {
    return 0;
  }

  let count = 0;

  if (obj.__type === 'function') {
    count++;
  } else if (obj.__type === 'xstate.assign' && obj.assignment) {
    // Count functions in assignment
    for (const value of Object.values(obj.assignment)) {
      if (value && typeof value === 'object' && (value as any).__type === 'function') {
        count++;
      }
    }
  }

  // Recursively check properties
  for (const value of Object.values(obj)) {
    count += countFunctions(value);
  }

  return count;
}