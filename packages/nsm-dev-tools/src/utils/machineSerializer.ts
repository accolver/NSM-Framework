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
 * Default JSON replacer that handles common serialization issues
 */
const defaultReplacer = (key: string, value: any): any => {
  // Handle functions by converting to string representation
  if (typeof value === 'function') {
    return `[Function: ${value.name || 'anonymous'}]`;
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
    states: machine.config.states,
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
  const defaultOptions: SerializationOptions = {
    includeSensitiveData: false,
    sanitizeCollaboration: true,
    prettyPrint: true,
    replacer: defaultReplacer,
    ...options
  };

  try {
    const config = extractMachineConfig(machineOrActor);

    // Sanitize context
    config.context = sanitizeContext(config.context, defaultOptions);

    // Serialize to JSON
    const jsonString = JSON.stringify(
      config,
      defaultOptions.replacer,
      defaultOptions.prettyPrint ? 2 : 0
    );

    return jsonString;
  } catch (error) {
    console.error('Failed to serialize machine:', error);

    // Return a fallback JSON with error information
    return JSON.stringify({
      error: 'Serialization failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      id: 'unknown-machine',
      initial: 'error',
      context: {},
      states: {
        error: {
          type: 'final'
        }
      }
    }, null, defaultOptions.prettyPrint ? 2 : 0);
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