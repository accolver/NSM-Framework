import { AnyStateMachine, AnyActor } from 'xstate';

/**
 * Options for serializing state machines
 */
export interface SerializationOptions {
  /** Whether to include sensitive data like hidden values */
  includeSensitiveData?: boolean;
  /** Whether to sanitize collaborative session data */
  sanitizeCollaboration?: boolean;
  /** Pretty print the JSON output */
  prettyPrint?: boolean;
  /** Custom replacer function for JSON.stringify */
  replacer?: (key: string, value: any) => any;
  /** Whether to preserve function source code instead of just names */
  preserveFunctionCode?: boolean;
}

/**
 * Sanitizes machine context by removing or masking sensitive data
 */
const sanitizeContext = (context: any, options: SerializationOptions): any => {
  if (!context || typeof context !== 'object') {
    return context;
  }

  const sanitized = { ...context };

  // Remove sensitive data if not explicitly included
  if (!options.includeSensitiveData) {
    // Sanitize hidden values
    if ('hiddenWord' in sanitized) {
      sanitized.hiddenWord = '[HIDDEN]';
    }
  }

  // Remove collaboration services and active session data
  if (options.sanitizeCollaboration) {
    sanitized.collaborationService = null;
    sanitized.realTimeCollaborationService = null;

    // Reset user session data for clean template
    if ('userId' in sanitized) {
      sanitized.userId = '';
    }
    if ('userName' in sanitized) {
      sanitized.userName = '';
    }
    if ('collaborators' in sanitized) {
      sanitized.collaborators = [];
    }
  }

  return sanitized;
};

/**
 * Enhanced JSON replacer that can preserve function source code
 */
const createReplacer = (options: SerializationOptions) => (key: string, value: any): any => {
  // Handle named actions with implementations
  if (value && typeof value === 'object' && value.__type === 'named_action') {
    if (options.preserveFunctionCode && value.implementation) {
      return {
        __type: 'named_action',
        name: value.name,
        implementation: createReplacer(options)('implementation', value.implementation)
      };
    } else {
      return {
        __type: 'named_action',
        name: value.name
      };
    }
  }

  // Handle direct actions with implementations (common in XState v5)
  if (value && typeof value === 'object' && value.__type === 'direct_action') {
    const result: any = {
      __type: 'direct_action',
      name: value.name
    };

    // Always include implementation if preserveFunctionCode is true and implementation exists
    if (options.preserveFunctionCode && value.implementation) {
      result.implementation = value.implementation; // Let this be processed naturally by JSON.stringify
    }

    return result;
  }

  // Handle named guards with implementations
  if (value && typeof value === 'object' && value.__type === 'named_guard') {
    if (options.preserveFunctionCode && value.implementation) {
      return {
        __type: 'named_guard',
        name: value.name,
        implementation: createReplacer(options)('implementation', value.implementation)
      };
    } else {
      return {
        __type: 'named_guard',
        name: value.name
      };
    }
  }

  // Handle direct guards with implementations (common in XState v5)
  if (value && typeof value === 'object' && value.__type === 'direct_guard') {
    const result: any = {
      __type: 'direct_guard',
      name: value.name
    };

    // Always include implementation if preserveFunctionCode is true and implementation exists
    if (options.preserveFunctionCode && value.implementation) {
      result.implementation = value.implementation; // Let this be processed naturally by JSON.stringify
    }

    return result;
  }

  // Handle XState assign functions specially
  if (typeof value === 'function' && value.type === 'xstate.assign' && value.assignment) {
    if (options.preserveFunctionCode) {
      try {
        const assignmentFunctions: { [key: string]: any } = {};

        // Extract the actual assignment functions
        for (const [assignKey, assignValue] of Object.entries(value.assignment)) {
          if (typeof assignValue === 'function') {
            const sourceCode = assignValue.toString();
            if (!sourceCode.includes('[native code]')) {
              assignmentFunctions[assignKey] = {
                __type: 'function',
                name: assignValue.name || 'anonymous',
                source: sourceCode
              };
            } else {
              assignmentFunctions[assignKey] = `[Native Function: ${assignValue.name || 'anonymous'}]`;
            }
          } else {
            assignmentFunctions[assignKey] = assignValue;
          }
        }

        return {
          __type: 'xstate.assign',
          assignment: assignmentFunctions
        };
      } catch (error) {
        return `[XState Assign Function: ${value.name || 'anonymous'}]`;
      }
    } else {
      return `[XState Assign Function: ${value.name || 'anonymous'}]`;
    }
  }

  // Handle regular functions with optional source code preservation
  if (typeof value === 'function') {
    if (options.preserveFunctionCode) {
      try {
        // Get the function source code
        const sourceCode = value.toString();

        // Check if it's a native function (they can't be serialized with source)
        if (sourceCode.includes('[native code]')) {
          return `[Native Function: ${value.name || 'anonymous'}]`;
        }

        // For arrow functions and regular functions, preserve the source
        return {
          __type: 'function',
          name: value.name || 'anonymous',
          source: sourceCode
        };
      } catch (error) {
        // Fallback if source extraction fails
        return `[Function: ${value.name || 'anonymous'}]`;
      }
    } else {
      return `[Function: ${value.name || 'anonymous'}]`;
    }
  }

  // Handle Date objects
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Handle circular references by returning a reference indicator
  if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, '_circular')) {
    return '[Circular Reference]';
  }

  return value;
};

/**
 * Default JSON replacer that handles common serialization issues (legacy)
 */
const defaultReplacer = createReplacer({ preserveFunctionCode: false });

/**
 * Recursively processes state configurations to include action implementations
 */
const processStatesWithActions = (states: any, machine: AnyStateMachine): any => {
  if (!states || typeof states !== 'object') {
    return states;
  }

  const processedStates: any = {};

  for (const [stateName, stateConfig] of Object.entries(states)) {
    processedStates[stateName] = processStateConfig(stateConfig as any, machine);
  }

  return processedStates;
};

/**
 * Processes a single state configuration to include action implementations
 */
const processStateConfig = (stateConfig: any, machine: AnyStateMachine): any => {
  if (!stateConfig || typeof stateConfig !== 'object') {
    return stateConfig;
  }

  const processed = { ...stateConfig };

  // Process nested states
  if (stateConfig.states) {
    processed.states = processStatesWithActions(stateConfig.states, machine);
  }

  // Process transitions
  if (stateConfig.on) {
    processed.on = {};
    for (const [eventType, transition] of Object.entries(stateConfig.on)) {
      processed.on[eventType] = processTransition(transition, machine);
    }
  }

  // Process entry/exit actions
  if (stateConfig.entry) {
    processed.entry = processActions(stateConfig.entry, machine);
  }
  if (stateConfig.exit) {
    processed.exit = processActions(stateConfig.exit, machine);
  }

  return processed;
};

/**
 * Processes transitions to include action implementations
 */
const processTransition = (transition: any, machine: AnyStateMachine): any => {
  if (Array.isArray(transition)) {
    return transition.map(t => processTransition(t, machine));
  }

  if (!transition || typeof transition !== 'object') {
    return transition;
  }

  const processed = { ...transition };

  if (transition.actions) {
    processed.actions = processActions(transition.actions, machine);
  }

  if (transition.guard || transition.cond) {
    const guard = transition.guard || transition.cond;
    processed.guard = processGuard(guard, machine);
  }

  return processed;
};

/**
 * Processes actions to include their implementations
 */
const processActions = (actions: any, machine: AnyStateMachine): any => {
  if (!actions) {
    return actions;
  }

  if (Array.isArray(actions)) {
    return actions.map(action => processAction(action, machine));
  }

  return processAction(actions, machine);
};

/**
 * Processes a single action to include its implementation
 */
const processAction = (action: any, machine: AnyStateMachine): any => {
  if (typeof action === 'string') {
    // Try to find the action implementation in the machine
    try {
      const machineActions = (machine as any).implementations?.actions;
      if (machineActions && machineActions[action]) {
        return {
          __type: 'named_action',
          name: action,
          implementation: machineActions[action]
        };
      }
    } catch (error) {
      // If we can't access the implementation, just return the name
    }
    return action;
  }

  if (typeof action === 'function') {
    // Direct function reference - this is the common case in XState v5
    return {
      __type: 'direct_action',
      name: action.name || 'anonymous',
      implementation: action
    };
  }

  if (action && typeof action === 'object' && action.type) {
    // It's an action object, preserve it and process its properties
    const processed = { ...action };

    // Check if it has function properties that need processing
    for (const [key, value] of Object.entries(action)) {
      if (typeof value === 'function') {
        processed[key] = value; // Let createReplacer handle the function
      }
    }

    return processed;
  }

  return action;
};

/**
 * Processes guards to include their implementations
 */
const processGuard = (guard: any, machine: AnyStateMachine): any => {
  if (typeof guard === 'string') {
    // Try to find the guard implementation in the machine
    try {
      const machineGuards = (machine as any).implementations?.guards;
      if (machineGuards && machineGuards[guard]) {
        return {
          __type: 'named_guard',
          name: guard,
          implementation: machineGuards[guard]
        };
      }
    } catch (error) {
      // If we can't access the implementation, just return the name
    }
    return guard;
  }

  if (typeof guard === 'function') {
    // Direct function guard - common in XState v5
    return {
      __type: 'direct_guard',
      name: guard.name || 'anonymous',
      implementation: guard
    };
  }

  return guard;
};

/**
 * Extracts machine configuration from an XState machine or actor
 */
export const extractMachineConfig = (machineOrActor: AnyStateMachine | AnyActor): any => {
  let machine: AnyStateMachine;
  let currentContext: any = null;

  if ('getSnapshot' in machineOrActor) {
    // It's an actor
    const snapshot = machineOrActor.getSnapshot();
    machine = machineOrActor.logic as AnyStateMachine;
    currentContext = snapshot.context;
  } else {
    // It's a machine
    machine = machineOrActor;
    currentContext = machine.config.context;
  }

  return {
    id: machine.config.id || machine.id,
    initial: machine.config.initial,
    context: currentContext,
    states: processStatesWithActions(machine.config.states, machine),
    description: machine.config.description,
    version: machine.config.version,
    tags: machine.config.tags
  };
};

/**
 * Serializes a state machine to JSON string
 */
export const serializeMachine = (
  machineOrActor: AnyStateMachine | AnyActor,
  options: SerializationOptions = {}
): string => {
  // Validate input
  if (!machineOrActor) {
    throw new Error('Machine or actor is required for serialization');
  }

  const defaultOptions: SerializationOptions = {
    includeSensitiveData: false,
    sanitizeCollaboration: true,
    prettyPrint: true,
    preserveFunctionCode: true, // Default to true - users should explicitly set to false if they don't want function source
    ...options
  };



  // Create the appropriate replacer based on options
  const replacer = createReplacer(defaultOptions);

  try {
    const config = extractMachineConfig(machineOrActor);

    // Validate extracted config
    if (!config || typeof config !== 'object') {
      throw new Error('Failed to extract valid machine configuration');
    }

    if (!config.states || typeof config.states !== 'object') {
      throw new Error('Machine must have valid states configuration');
    }

    // Sanitize context
    config.context = sanitizeContext(config.context, defaultOptions);

    // Serialize to JSON with the enhanced replacer
    const jsonString = JSON.stringify(
      config,
      replacer,
      defaultOptions.prettyPrint ? 2 : 0
    );

    // Validate the serialized JSON can be parsed back
    try {
      JSON.parse(jsonString);
    } catch (parseError) {
      throw new Error('Serialized machine is not valid JSON');
    }

    return jsonString;
  } catch (error) {
    console.error('Failed to serialize machine:', error);

    // For development, throw the error to help debugging
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }

    // In production, return a fallback JSON with error information
    const fallbackJson = JSON.stringify({
      error: 'Serialization failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      id: 'unknown-machine',
      initial: 'error',
      context: {},
      states: {
        error: {
          type: 'final',
          meta: {
            errorDetails: error instanceof Error ? error.stack : 'No stack trace available'
          }
        }
      }
    }, null, defaultOptions.prettyPrint ? 2 : 0);

    return fallbackJson;
  }
};

/**
 * Creates a machine configuration suitable for stately.ai visualizer
 */
export const createVisualizerConfig = (
  machineOrActor: AnyStateMachine | AnyActor
): string => {
  return serializeMachine(machineOrActor, {
    includeSensitiveData: false,
    sanitizeCollaboration: true,
    prettyPrint: true,
    replacer: (key: string, value: any) => {
      // Special handling for visualizer compatibility
      if (key === 'actions' && Array.isArray(value)) {
        return value.map(action =>
          typeof action === 'string' ? action : `[${typeof action}]`
        );
      }

      return defaultReplacer(key, value);
    }
  });
};