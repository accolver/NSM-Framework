/**
 * NSM Client Validation Integration
 * Provides client-side validation integration with the NSM framework
 */

import {
  validateNostrEventComprehensive,
  validateXStateMachine,
  sanitizeUserInput,
  validateFileUpload,
  validateURL,
  RateLimiter,
  RateLimitAlgorithm,
  type ValidationResult
} from "@nsm/core";
import type { INostrEvent } from "@nsm/core";

/**
 * Client-side validation configuration
 */
export interface ClientValidationConfig {
  /** Enable rate limiting for validation operations */
  enableRateLimit?: boolean;
  /** User identifier for rate limiting */
  userId?: string;
  /** Enable strict validation mode */
  strictMode?: boolean;
  /** Maximum allowed state machine complexity */
  maxMachineComplexity?: number;
  /** Enable signature verification for Nostr events */
  verifySignatures?: boolean;
  /** Allowed domains for URL validation */
  allowedDomains?: string[];
}

/**
 * Default client validation configuration
 */
const DEFAULT_CONFIG: Required<ClientValidationConfig> = {
  enableRateLimit: true,
  userId: "anonymous",
  strictMode: true,
  maxMachineComplexity: 500,
  verifySignatures: true,
  allowedDomains: []
};

/**
 * NSM Client Validator
 * Provides a high-level interface for all validation operations
 */
export class NSMClientValidator {
  private config: Required<ClientValidationConfig>;
  private rateLimiter: RateLimiter;

  constructor(config: ClientValidationConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rateLimiter = new RateLimiter({
      algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
      capacity: 100,
      refillRate: 10
    });
  }

  /**
   * Validate a Nostr event with client-specific settings
   */
  validateEvent(event: unknown): ValidationResult<INostrEvent> {
    const rateLimitId = this.config.enableRateLimit ? this.config.userId : undefined;

    return validateNostrEventComprehensive(event, {
      checkSignature: this.config.verifySignatures,
      validateTimestamp: this.config.strictMode,
      rateLimitId
    });
  }

  /**
   * Validate a state machine definition
   */
  validateStateMachine(machineDefinition: unknown): ValidationResult<any> {
    return validateXStateMachine(machineDefinition, {
      maxComplexity: this.config.maxMachineComplexity,
      allowFunctions: !this.config.strictMode,
      maxStates: this.config.strictMode ? 50 : 100
    });
  }

  /**
   * Validate and sanitize user input
   */
  validateUserInput(input: string, options: {
    allowHTML?: boolean;
    maxLength?: number;
  } = {}): ValidationResult<string> {
    const { allowHTML = false, maxLength = 1024 } = options;

    return sanitizeUserInput(input, {
      allowHTML: this.config.strictMode ? false : allowHTML,
      maxLength
    });
  }

  /**
   * Validate file upload
   */
  validateFile(file: File | { name: string; size: number; type: string }, options: {
    allowedTypes?: string[];
    maxSize?: number;
  } = {}): ValidationResult<{ name: string; size: number; type: string }> {
    const { allowedTypes, maxSize } = options;

    return validateFileUpload(file, {
      allowedTypes,
      maxSize,
      allowedExtensions: this.config.strictMode
        ? ['.png', '.jpg', '.jpeg', '.txt', '.json']
        : undefined
    });
  }

  /**
   * Validate URL
   */
  validateURL(url: string, options: {
    allowPrivateIPs?: boolean;
  } = {}): ValidationResult<string> {
    const { allowPrivateIPs = false } = options;

    return validateURL(url, {
      allowedDomains: this.config.allowedDomains.length > 0 ? this.config.allowedDomains : undefined,
      blockPrivateIPs: this.config.strictMode ? !allowPrivateIPs : false
    });
  }

  /**
   * Validate NSM interaction payload
   */
  validateInteractionPayload(payload: unknown): ValidationResult<{
    type: string;
    [key: string]: any;
  }> {
    try {
      // Basic structure validation
      if (!payload || typeof payload !== 'object') {
        return {
          success: false,
          error: "Interaction payload must be an object"
        };
      }

      const payloadObj = payload as any;

      // Validate type field
      if (!payloadObj.type || typeof payloadObj.type !== 'string') {
        return {
          success: false,
          error: "Interaction payload must have a string 'type' field"
        };
      }

      // Validate type format
      if (!/^[A-Z_][A-Z0-9_]*$/.test(payloadObj.type)) {
        return {
          success: false,
          error: "Interaction type must follow SCREAMING_SNAKE_CASE format"
        };
      }

      // Size check
      const serialized = JSON.stringify(payload);
      if (serialized.length > 10240) { // 10KB limit
        return {
          success: false,
          error: "Interaction payload too large (max 10KB)"
        };
      }

      // Validate payload data doesn't contain dangerous patterns
      const inputResult = this.validateUserInput(serialized, { maxLength: 10240 });
      if (!inputResult.success) {
        return {
          success: false,
          error: `Unsafe content in payload: ${inputResult.error}`
        };
      }

      return {
        success: true,
        data: payloadObj
      };

    } catch (error) {
      return {
        success: false,
        error: `Payload validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate NSM state object
   */
  validateState(state: unknown): ValidationResult<object> {
    try {
      if (!state || typeof state !== 'object') {
        return {
          success: false,
          error: "State must be an object"
        };
      }

      // Size check
      const serialized = JSON.stringify(state);
      if (serialized.length > 50 * 1024) { // 50KB limit
        return {
          success: false,
          error: "State object too large (max 50KB)"
        };
      }

      // Validate state doesn't contain dangerous patterns
      const inputResult = this.validateUserInput(serialized, { maxLength: 50 * 1024 });
      if (!inputResult.success) {
        return {
          success: false,
          error: `Unsafe content in state: ${inputResult.error}`
        };
      }

      // Validate object depth and complexity
      const depthCheck = this.validateObjectDepth(state, 10);
      if (!depthCheck.success) {
        return {
          success: false,
          error: depthCheck.error
        };
      }

      const propertyCheck = this.validateObjectProperties(state, 1000);
      if (!propertyCheck.success) {
        return {
          success: false,
          error: propertyCheck.error
        };
      }

      return {
        success: true,
        data: state as object
      };

    } catch (error) {
      return {
        success: false,
        error: `State validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Batch validate multiple events
   */
  validateEventBatch(events: unknown[]): ValidationResult<INostrEvent[]> {
    try {
      if (!Array.isArray(events)) {
        return {
          success: false,
          error: "Events must be an array"
        };
      }

      if (events.length > 100) {
        return {
          success: false,
          error: "Too many events in batch (max 100)"
        };
      }

      const validatedEvents: INostrEvent[] = [];
      const errors: string[] = [];

      for (let i = 0; i < events.length; i++) {
        const result = this.validateEvent(events[i]);
        if (result.success && result.data) {
          validatedEvents.push(result.data);
        } else {
          errors.push(`Event ${i}: ${result.error}`);
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: `Validation errors:\n${errors.join('\n')}`
        };
      }

      return {
        success: true,
        data: validatedEvents
      };

    } catch (error) {
      return {
        success: false,
        error: `Batch validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Update validation configuration
   */
  updateConfig(newConfig: Partial<ClientValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<ClientValidationConfig> {
    return { ...this.config };
  }

  /**
   * Clean up rate limiting data
   */
  cleanup(): void {
    this.rateLimiter.cleanup();
  }

  // Helper methods

  private validateObjectDepth(obj: any, maxDepth: number, currentDepth: number = 0): ValidationResult<void> {
    if (currentDepth > maxDepth) {
      return {
        success: false,
        error: `Object nesting too deep: ${currentDepth} (max: ${maxDepth})`
      };
    }

    if (obj && typeof obj === 'object') {
      for (const value of Object.values(obj)) {
        const result = this.validateObjectDepth(value, maxDepth, currentDepth + 1);
        if (!result.success) {
          return result;
        }
      }
    }

    return { success: true };
  }

  private validateObjectProperties(obj: any, maxProperties: number): ValidationResult<void> {
    let count = 0;

    function countProperties(o: any): void {
      if (o && typeof o === 'object') {
        count += Object.keys(o).length;
        if (count > maxProperties) {
          return;
        }
        for (const value of Object.values(o)) {
          countProperties(value);
          if (count > maxProperties) {
            return;
          }
        }
      }
    }

    countProperties(obj);

    if (count > maxProperties) {
      return {
        success: false,
        error: `Too many object properties: ${count} (max: ${maxProperties})`
      };
    }

    return { success: true };
  }
}

/**
 * Create a default validator instance
 */
export function createValidator(config?: ClientValidationConfig): NSMClientValidator {
  return new NSMClientValidator(config);
}

/**
 * Convenience function for quick event validation
 */
export function quickValidateEvent(event: unknown, userId?: string): ValidationResult<INostrEvent> {
  const validator = createValidator({ userId });
  return validator.validateEvent(event);
}

/**
 * Convenience function for quick input sanitization
 */
export function quickSanitizeInput(input: string, maxLength?: number): ValidationResult<string> {
  const validator = createValidator();
  return validator.validateUserInput(input, { maxLength });
}