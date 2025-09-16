/**
 * XState Performance Monitoring Middleware
 * Integrates performance tracking with XState state machines
 */

import type { StateNode, State, Transition, ActionObject, EventObject } from 'xstate';
import { getPerformanceMonitor } from './performance-monitor';

export interface StateMachinePerformanceEntry {
  machineId: string;
  fromState: string;
  toState: string;
  event: string;
  duration: number;
  timestamp: number;
  transitionId: string;
  success: boolean;
  error?: Error;
  context?: any;
}

export interface StateMachinePerformanceConfig {
  enabled: boolean;
  trackTransitions: boolean;
  trackActions: boolean;
  trackGuards: boolean;
  trackServices: boolean;
  trackContextChanges: boolean;
  maxContextSize: number; // Limit context size in tracking to prevent memory issues
  samplingRate: number; // 0-1, percentage of transitions to track
}

const DEFAULT_CONFIG: StateMachinePerformanceConfig = {
  enabled: true,
  trackTransitions: true,
  trackActions: true,
  trackGuards: true,
  trackServices: true,
  trackContextChanges: false, // Can be expensive
  maxContextSize: 1000, // 1KB
  samplingRate: 1.0
};

class StateMachinePerformanceTracker {
  private config: StateMachinePerformanceConfig;
  private performanceMonitor = getPerformanceMonitor();
  private transitionStarts = new Map<string, number>();
  private actionStarts = new Map<string, number>();
  private serviceStarts = new Map<string, number>();

  constructor(config: Partial<StateMachinePerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private shouldTrack(): boolean {
    return this.config.enabled && Math.random() < this.config.samplingRate;
  }

  private getTransitionKey(state: State<any>, event: EventObject): string {
    return `${state.value}-${event.type}-${Date.now()}`;
  }

  private sanitizeContext(context: any): any {
    if (!context || typeof context !== 'object') return context;

    const serialized = JSON.stringify(context);
    if (serialized.length <= this.config.maxContextSize) {
      return context;
    }

    // Truncate large contexts
    return {
      ...context,
      _truncated: true,
      _originalSize: serialized.length
    };
  }

  // Transition Performance Tracking
  public onTransitionStart(state: State<any>, event: EventObject): void {
    if (!this.config.trackTransitions || !this.shouldTrack()) return;

    const key = this.getTransitionKey(state, event);
    this.transitionStarts.set(key, performance.now());
  }

  public onTransitionEnd(
    fromState: State<any>,
    toState: State<any>,
    event: EventObject,
    transition?: Transition<any, any>
  ): void {
    if (!this.config.trackTransitions) return;

    const key = this.getTransitionKey(fromState, event);
    const startTime = this.transitionStarts.get(key);

    if (startTime === undefined) return;

    const duration = performance.now() - startTime;
    this.transitionStarts.delete(key);

    const fromStateString = typeof fromState.value === 'string'
      ? fromState.value
      : JSON.stringify(fromState.value);
    const toStateString = typeof toState.value === 'string'
      ? toState.value
      : JSON.stringify(toState.value);

    // Track in performance monitor
    this.performanceMonitor.trackStateTransition(fromStateString, toStateString, duration);

    // Create detailed performance entry
    const entry: StateMachinePerformanceEntry = {
      machineId: fromState.machine?.id || 'unknown',
      fromState: fromStateString,
      toState: toStateString,
      event: event.type,
      duration,
      timestamp: Date.now(),
      transitionId: key,
      success: true,
      context: this.config.trackContextChanges ? this.sanitizeContext(toState.context) : undefined
    };

    this.performanceMonitor.emit('stateTransition', entry);
  }

  public onTransitionError(
    state: State<any>,
    event: EventObject,
    error: Error
  ): void {
    if (!this.config.trackTransitions) return;

    const key = this.getTransitionKey(state, event);
    const startTime = this.transitionStarts.get(key);
    this.transitionStarts.delete(key);

    const duration = startTime ? performance.now() - startTime : 0;
    const stateString = typeof state.value === 'string'
      ? state.value
      : JSON.stringify(state.value);

    // Track error in performance monitor
    this.performanceMonitor.trackStateMachineError(error, {
      state: stateString,
      event: event.type,
      duration
    });

    const entry: StateMachinePerformanceEntry = {
      machineId: state.machine?.id || 'unknown',
      fromState: stateString,
      toState: stateString, // No transition occurred
      event: event.type,
      duration,
      timestamp: Date.now(),
      transitionId: key,
      success: false,
      error,
      context: this.config.trackContextChanges ? this.sanitizeContext(state.context) : undefined
    };

    this.performanceMonitor.emit('stateTransitionError', entry);
  }

  // Action Performance Tracking
  public onActionStart(action: ActionObject<any, any>, context: any): void {
    if (!this.config.trackActions || !this.shouldTrack()) return;

    const key = `${action.type}-${Date.now()}`;
    this.actionStarts.set(key, performance.now());
  }

  public onActionEnd(action: ActionObject<any, any>, context: any, key?: string): void {
    if (!this.config.trackActions) return;

    const actionKey = key || `${action.type}-${Date.now()}`;
    const startTime = this.actionStarts.get(actionKey);

    if (startTime === undefined) return;

    const duration = performance.now() - startTime;
    this.actionStarts.delete(actionKey);

    this.performanceMonitor.emit('actionExecuted', {
      actionType: action.type,
      duration,
      timestamp: Date.now(),
      success: true,
      context: this.config.trackContextChanges ? this.sanitizeContext(context) : undefined
    });
  }

  public onActionError(action: ActionObject<any, any>, error: Error, context: any): void {
    if (!this.config.trackActions) return;

    this.performanceMonitor.emit('actionError', {
      actionType: action.type,
      error,
      timestamp: Date.now(),
      context: this.config.trackContextChanges ? this.sanitizeContext(context) : undefined
    });
  }

  // Service Performance Tracking
  public onServiceStart(serviceId: string, serviceDef: any): void {
    if (!this.config.trackServices || !this.shouldTrack()) return;

    this.serviceStarts.set(serviceId, performance.now());
  }

  public onServiceStop(serviceId: string, result?: any): void {
    if (!this.config.trackServices) return;

    const startTime = this.serviceStarts.get(serviceId);
    if (startTime === undefined) return;

    const duration = performance.now() - startTime;
    this.serviceStarts.delete(serviceId);

    this.performanceMonitor.emit('serviceCompleted', {
      serviceId,
      duration,
      timestamp: Date.now(),
      success: true,
      result: result !== undefined ? { hasResult: true } : undefined
    });
  }

  public onServiceError(serviceId: string, error: Error): void {
    if (!this.config.trackServices) return;

    const startTime = this.serviceStarts.get(serviceId);
    const duration = startTime ? performance.now() - startTime : 0;
    this.serviceStarts.delete(serviceId);

    this.performanceMonitor.emit('serviceError', {
      serviceId,
      duration,
      error,
      timestamp: Date.now(),
      success: false
    });
  }

  // Configuration Management
  public updateConfig(newConfig: Partial<StateMachinePerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): StateMachinePerformanceConfig {
    return { ...this.config };
  }

  public reset(): void {
    this.transitionStarts.clear();
    this.actionStarts.clear();
    this.serviceStarts.clear();
  }
}

// Global tracker instance
let globalTracker: StateMachinePerformanceTracker | null = null;

export function getStateMachinePerformanceTracker(
  config?: Partial<StateMachinePerformanceConfig>
): StateMachinePerformanceTracker {
  if (!globalTracker) {
    globalTracker = new StateMachinePerformanceTracker(config);
  }
  return globalTracker;
}

// XState Integration Helpers

/**
 * Creates a performance-aware interpreter factory
 */
export function createPerformanceInterpreter<TContext, TEvent extends EventObject>(
  machine: any,
  config?: Partial<StateMachinePerformanceConfig>
) {
  const tracker = getStateMachinePerformanceTracker(config);

  return (interpreterOptions: any = {}) => {
    const interpreter = machine.withConfig({
      ...interpreterOptions,
      actions: {
        ...interpreterOptions.actions,
        // Wrap all actions with performance tracking
        ...Object.keys(interpreterOptions.actions || {}).reduce((acc, key) => {
          const originalAction = interpreterOptions.actions[key];
          acc[key] = (context: TContext, event: TEvent) => {
            const actionKey = `${key}-${Date.now()}`;
            tracker.onActionStart({ type: key } as ActionObject<TContext, TEvent>, context);

            try {
              const result = originalAction(context, event);
              tracker.onActionEnd({ type: key } as ActionObject<TContext, TEvent>, context, actionKey);
              return result;
            } catch (error) {
              tracker.onActionError({ type: key } as ActionObject<TContext, TEvent>, error as Error, context);
              throw error;
            }
          };
          return acc;
        }, {} as any)
      }
    });

    // Add transition tracking
    interpreter.onTransition((state: State<TContext>, event: TEvent) => {
      if (state.changed) {
        // This is a simplified approach - in a real implementation,
        // you would need to track the previous state more carefully
        const fromState = state.history || state;
        tracker.onTransitionEnd(fromState, state, event);
      }
    });

    return interpreter;
  };
}

/**
 * XState middleware for performance tracking
 */
export function createPerformanceMiddleware(
  config?: Partial<StateMachinePerformanceConfig>
) {
  const tracker = getStateMachinePerformanceTracker(config);

  return {
    // Middleware hooks for different XState events
    onTransition: (state: State<any>, event: EventObject, meta: any) => {
      if (meta?.prevState) {
        tracker.onTransitionEnd(meta.prevState, state, event);
      }
    },

    onError: (state: State<any>, event: EventObject, error: Error) => {
      tracker.onTransitionError(state, event, error);
    },

    onAction: (action: ActionObject<any, any>, context: any) => {
      tracker.onActionStart(action, context);
    },

    onService: (serviceId: string, serviceDef: any) => {
      tracker.onServiceStart(serviceId, serviceDef);
    },

    getTracker: () => tracker
  };
}

// React Hook for XState Performance Monitoring
export function useStateMachinePerformance(
  machineId?: string,
  config?: Partial<StateMachinePerformanceConfig>
) {
  const tracker = getStateMachinePerformanceTracker(config);
  const performanceMonitor = getPerformanceMonitor();

  const trackTransition = (from: string, to: string, duration: number) => {
    tracker.onTransitionEnd(
      { value: from, machine: { id: machineId } } as any,
      { value: to, machine: { id: machineId } } as any,
      { type: 'TRANSITION' }
    );
  };

  const trackAction = (actionType: string, duration: number, success: boolean = true) => {
    if (success) {
      tracker.onActionEnd({ type: actionType } as any, {});
    } else {
      tracker.onActionError({ type: actionType } as any, new Error('Action failed'), {});
    }
  };

  const trackService = (serviceId: string, duration: number, success: boolean = true) => {
    if (success) {
      tracker.onServiceStop(serviceId);
    } else {
      tracker.onServiceError(serviceId, new Error('Service failed'));
    }
  };

  const getPerformanceData = () => {
    return performanceMonitor.getCurrentMetrics();
  };

  return {
    trackTransition,
    trackAction,
    trackService,
    getPerformanceData,
    tracker
  };
}

export { StateMachinePerformanceTracker };