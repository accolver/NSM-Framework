export interface ValidationResult {
  isValid: boolean;
  machine?: any;
  error?: string;
}

export function validateXStateJSON(jsonString: string): ValidationResult {
  try {
    const parsed = JSON.parse(jsonString);

    // Check for required XState properties
    if (!parsed.states || typeof parsed.states !== 'object') {
      return {
        isValid: false,
        error: 'Missing required XState properties: states must be an object'
      };
    }

    // Check that states object has at least one state
    if (Object.keys(parsed.states).length === 0) {
      return {
        isValid: false,
        error: 'States object cannot be empty'
      };
    }

    // Check for initial state
    if (parsed.initial && typeof parsed.initial === 'string') {
      if (!parsed.states[parsed.initial]) {
        return {
          isValid: false,
          error: `Initial state "${parsed.initial}" is not defined in states`
        };
      }
    }

    // Validate state structure
    for (const [stateName, stateConfig] of Object.entries(parsed.states)) {
      if (typeof stateConfig !== 'object' || stateConfig === null) {
        return {
          isValid: false,
          error: `State "${stateName}" must be an object`
        };
      }
    }

    return {
      isValid: true,
      machine: parsed
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}