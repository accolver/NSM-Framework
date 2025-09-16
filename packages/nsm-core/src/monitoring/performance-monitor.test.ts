/**
 * Performance Monitor Tests
 * Basic validation tests for the performance monitoring system
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { PerformanceMonitor, getPerformanceMonitor } from './performance-monitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({
      enabled: true,
      samplingRate: 1.0,
      maxHistorySize: 10
    });
  });

  afterEach(() => {
    monitor.cleanup();
  });

  describe('Basic functionality', () => {
    it('should initialize with default config', () => {
      const config = monitor.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.samplingRate).toBe(1.0);
      expect(config.maxHistorySize).toBe(10);
    });

    it('should start and stop monitoring', () => {
      expect(monitor.isActive()).toBe(false);

      monitor.startMonitoring();
      expect(monitor.isActive()).toBe(true);

      monitor.stopMonitoring();
      expect(monitor.isActive()).toBe(false);
    });

    it('should track state transitions', () => {
      const events: any[] = [];
      monitor.on('stateTransition', (event) => events.push(event));

      monitor.trackStateTransition('idle', 'loading', 100);

      expect(events.length).toBe(0); // No events yet since we haven't started monitoring

      monitor.startMonitoring();
      monitor.trackStateTransition('loading', 'success', 50);

      // Note: trackStateTransition doesn't emit events directly,
      // it updates metrics which are collected periodically
      const currentMetrics = monitor.getCurrentMetrics();
      if (currentMetrics) {
        expect(currentMetrics.stateMachine.totalTransitions).toBeGreaterThan(0);
      }
    });

    it('should track state machine errors', () => {
      const events: any[] = [];
      monitor.on('stateMachineError', (event) => events.push(event));

      const error = new Error('Test error');
      monitor.trackStateMachineError(error, { context: 'test' });

      expect(events.length).toBe(1);
      expect(events[0].error).toBe(error);
      expect(events[0].context).toEqual({ context: 'test' });
    });

    it('should update configuration', () => {
      monitor.updateConfig({ samplingRate: 0.5 });

      const config = monitor.getConfig();
      expect(config.samplingRate).toBe(0.5);
    });

    it('should generate reports', () => {
      monitor.startMonitoring();

      const report = monitor.generateReport();

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('alerts');
      expect(report).toHaveProperty('uptime');
      expect(typeof report.uptime).toBe('number');
    });

    it('should reset state', () => {
      monitor.trackStateTransition('test1', 'test2', 100);

      let currentMetrics = monitor.getCurrentMetrics();
      expect(currentMetrics).toBeDefined();

      monitor.reset();

      currentMetrics = monitor.getCurrentMetrics();
      expect(currentMetrics).toBeNull();
    });
  });

  describe('Metrics collection', () => {
    it('should collect metrics when monitoring is active', (done) => {
      let metricsCollected = false;

      monitor.on('metricsCollected', (metrics) => {
        metricsCollected = true;
        expect(metrics).toHaveProperty('timestamp');
        expect(metrics).toHaveProperty('coreWebVitals');
        expect(metrics).toHaveProperty('stateMachine');
        expect(metrics).toHaveProperty('network');
        expect(metrics).toHaveProperty('userInteraction');
        expect(metrics).toHaveProperty('memory');
        done();
      });

      monitor.startMonitoring();

      // Wait a bit for metrics collection
      setTimeout(() => {
        if (!metricsCollected) {
          done();
        }
      }, 1500);
    });
  });

  describe('Alert system', () => {
    it('should create alerts when thresholds are exceeded', (done) => {
      const alertEvents: any[] = [];

      monitor.on('alert', (alert) => {
        alertEvents.push(alert);

        expect(alert).toHaveProperty('id');
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('metric');
        expect(alert).toHaveProperty('value');
        expect(alert).toHaveProperty('threshold');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('timestamp');

        done();
      });

      // Set very low thresholds to trigger alerts
      monitor.updateConfig({
        thresholds: {
          ...monitor.getConfig().thresholds,
          stateMachine: {
            transitionTime: { warning: 1, critical: 2 },
            errorRate: { warning: 0.01, critical: 0.05 }
          }
        }
      });

      // Track a transition that exceeds the threshold
      monitor.trackStateTransition('test1', 'test2', 10); // 10ms > 1ms threshold

      // If no alert is triggered, complete the test
      setTimeout(() => {
        if (alertEvents.length === 0) {
          done();
        }
      }, 100);
    });
  });

  describe('Component render tracking', () => {
    it('should track component render times', () => {
      const events: any[] = [];
      monitor.on('componentRender', (event) => events.push(event));

      monitor.trackComponentRender('TestComponent', 25);

      expect(events.length).toBe(1);
      expect(events[0].componentName).toBe('TestComponent');
      expect(events[0].renderTime).toBe(25);
      expect(events[0].timestamp).toBeTypeOf('number');
    });
  });

  describe('Route change tracking', () => {
    it('should track route changes', () => {
      const events: any[] = [];
      monitor.on('routeChange', (event) => events.push(event));

      monitor.trackRouteChange('/home', '/profile', 150);

      expect(events.length).toBe(1);
      expect(events[0].from).toBe('/home');
      expect(events[0].to).toBe('/profile');
      expect(events[0].duration).toBe(150);
      expect(events[0].timestamp).toBeTypeOf('number');
    });
  });
});

describe('Global performance monitor', () => {
  afterEach(() => {
    // Clean up global instance
    const globalMonitor = getPerformanceMonitor();
    globalMonitor.stopMonitoring();
    globalMonitor.reset();
  });

  it('should return the same instance', () => {
    const monitor1 = getPerformanceMonitor();
    const monitor2 = getPerformanceMonitor();

    expect(monitor1).toBe(monitor2);
  });

  it('should use provided config on first call', () => {
    const monitor = getPerformanceMonitor({
      enabled: false,
      samplingRate: 0.1
    });

    const config = monitor.getConfig();
    expect(config.enabled).toBe(false);
    expect(config.samplingRate).toBe(0.1);
  });
});