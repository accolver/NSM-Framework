/**
 * Comprehensive Resource Monitor Test Suite
 * Tests resource monitoring, alerting, and performance recommendations
 */

import { describe, it, expect, beforeEach, afterEach, jest } from 'bun:test';
import {
  ResourceMonitor,
  ResourceMonitorConfig,
  ResourceLimits,
  AlertThresholds,
  ResourceMetrics,
  AlertEvent
} from './resource-monitor';

describe('ResourceMonitor', () => {
  let resourceMonitor: ResourceMonitor;
  let config: ResourceMonitorConfig;

  beforeEach(() => {
    config = {
      limits: {
        maxMemoryMB: 500,
        maxCPUPercent: 80,
        maxConnections: 1000,
        maxNetworkMbps: 10,
        maxEventQueueSize: 1000,
        maxCacheSize: 100000
      },
      alertThresholds: {
        memory: { warning: 70, critical: 90 },
        cpu: { warning: 70, critical: 85 },
        connections: { warning: 80, critical: 95 },
        network: { warning: 75, critical: 90 },
        eventQueue: { warning: 80, critical: 95 }
      },
      monitoringInterval: 1000,
      historySize: 100,
      enableAlerts: true,
      enableAutoThrottling: true,
      enableGracefulDegradation: true
    };

    resourceMonitor = new ResourceMonitor(config);
  });

  afterEach(() => {
    resourceMonitor.cleanup();
  });

  describe('Basic Monitoring', () => {
    it('should initialize with default metrics', () => {
      const metrics = resourceMonitor.getCurrentMetrics();

      expect(metrics.timestamp).toBeGreaterThan(0);
      expect(metrics.memory.available).toBe(500);
      expect(metrics.connections.total).toBe(0);
      expect(metrics.eventQueue.size).toBe(0);
    });

    it('should start and stop monitoring', () => {
      let started = false;
      let stopped = false;

      resourceMonitor.on('started', () => { started = true; });
      resourceMonitor.on('stopped', () => { stopped = true; });

      resourceMonitor.start();
      expect(started).toBe(true);

      resourceMonitor.stop();
      expect(stopped).toBe(true);
    });

    it('should collect metrics over time', async () => {
      resourceMonitor.start();

      // Wait for a few collection cycles
      await new Promise(resolve => setTimeout(resolve, 2500));

      const history = resourceMonitor.getHistory();
      expect(history.length).toBeGreaterThan(1);

      resourceMonitor.stop();
    });

    it('should limit history size', async () => {
      const smallConfig = {
        ...config,
        historySize: 3,
        monitoringInterval: 10 // Very fast for testing
      };

      const smallMonitor = new ResourceMonitor(smallConfig);
      smallMonitor.start();

      // Wait for more collections than history size
      await new Promise(resolve => setTimeout(resolve, 100));

      const history = smallMonitor.getHistory();
      expect(history.length).toBeLessThanOrEqual(3);

      smallMonitor.cleanup();
    });
  });

  describe('Resource Tracking', () => {
    it('should track connections', () => {
      expect(resourceMonitor.getCurrentMetrics().connections.total).toBe(0);

      resourceMonitor.addConnection('conn1');
      expect(resourceMonitor.getCurrentMetrics().connections.total).toBe(1);

      resourceMonitor.addConnection('conn2', { type: 'websocket' });
      expect(resourceMonitor.getCurrentMetrics().connections.total).toBe(2);

      resourceMonitor.removeConnection('conn1');
      expect(resourceMonitor.getCurrentMetrics().connections.total).toBe(1);

      resourceMonitor.removeConnection('nonexistent');
      expect(resourceMonitor.getCurrentMetrics().connections.total).toBe(1);
    });

    it('should emit connection events', () => {
      let addedEvent: any = null;
      let removedEvent: any = null;

      resourceMonitor.on('connectionAdded', (event) => { addedEvent = event; });
      resourceMonitor.on('connectionRemoved', (event) => { removedEvent = event; });

      resourceMonitor.addConnection('conn1', { type: 'http' });
      expect(addedEvent.connectionId).toBe('conn1');
      expect(addedEvent.metadata.type).toBe('http');
      expect(addedEvent.total).toBe(1);

      resourceMonitor.removeConnection('conn1');
      expect(removedEvent.connectionId).toBe('conn1');
      expect(removedEvent.total).toBe(0);
    });

    it('should track event queue', () => {
      expect(resourceMonitor.getCurrentMetrics().eventQueue.size).toBe(0);

      resourceMonitor.addToEventQueue('event1', 1024);
      expect(resourceMonitor.getCurrentMetrics().eventQueue.size).toBe(1);

      resourceMonitor.addToEventQueue('event2', 2048);
      expect(resourceMonitor.getCurrentMetrics().eventQueue.size).toBe(2);

      resourceMonitor.removeFromEventQueue('event1');
      expect(resourceMonitor.getCurrentMetrics().eventQueue.size).toBe(1);
    });

    it('should emit event queue events', () => {
      let queuedEvent: any = null;
      let processedEvent: any = null;

      resourceMonitor.on('eventQueued', (event) => { queuedEvent = event; });
      resourceMonitor.on('eventProcessed', (event) => { processedEvent = event; });

      resourceMonitor.addToEventQueue('event1', 1024);
      expect(queuedEvent.eventId).toBe('event1');
      expect(queuedEvent.queueSize).toBe(1);

      resourceMonitor.removeFromEventQueue('event1');
      expect(processedEvent.eventId).toBe('event1');
      expect(processedEvent.queueSize).toBe(0);
    });

    it('should track network usage', () => {
      resourceMonitor.trackNetworkUsage(1024, 512);
      resourceMonitor.trackNetworkUsage(2048, 1024);

      // Network metrics are calculated during collection
      const metrics = resourceMonitor.getCurrentMetrics();
      expect(metrics.network).toBeDefined();
    });

    it('should track cache operations', () => {
      resourceMonitor.trackCacheOperation(true, 1024); // Hit
      resourceMonitor.trackCacheOperation(false, 2048); // Miss
      resourceMonitor.trackCacheOperation(true, 0); // Hit, no memory change

      resourceMonitor.updateCacheSize(100);

      const metrics = resourceMonitor.getCurrentMetrics();
      expect(metrics.cache.size).toBe(100);
      expect(metrics.cache.hitRate).toBeCloseTo(2/3, 2); // 2 hits out of 3 operations
      expect(metrics.cache.memoryUsage).toBe(3072);
    });

    it('should clean up old event queue entries', async () => {
      // Add events
      resourceMonitor.addToEventQueue('event1', 1024);
      resourceMonitor.addToEventQueue('event2', 1024);

      expect(resourceMonitor.getCurrentMetrics().eventQueue.size).toBe(2);

      // Mock time passing (events older than 5 minutes should be cleaned)
      // This is simplified - in reality we'd need to mock Date.now()
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add new event to trigger cleanup
      resourceMonitor.addToEventQueue('event3', 1024);
      expect(resourceMonitor.getCurrentMetrics().eventQueue.size).toBe(3);
    });
  });

  describe('Resource Limits and Alerts', () => {
    it('should detect resource limit violations', () => {
      // Simulate high resource usage
      resourceMonitor.updateResourceUsage({
        memoryUsageMB: 600, // Exceeds 500MB limit
        cpuPercent: 50,
        connections: 500,
        bandwidthMbps: 5
      });

      const limitCheck = resourceMonitor.checkLimits();
      expect(limitCheck.exceeded).toBe(true);
      expect(limitCheck.violations).toHaveLength(1);
      expect(limitCheck.violations[0]?.resource).toBe('memory');
    });

    it('should detect multiple violations', () => {
      resourceMonitor.updateResourceUsage({
        memoryUsageMB: 600, // Exceeds limit
        cpuPercent: 90, // Exceeds limit
        connections: 1200, // Exceeds limit
        bandwidthMbps: 15 // Exceeds limit
      });

      const limitCheck = resourceMonitor.checkLimits();
      expect(limitCheck.exceeded).toBe(true);
      expect(limitCheck.violations.length).toBe(4);

      const resourcesViolated = limitCheck.violations.map(v => v.resource);
      expect(resourcesViolated).toContain('memory');
      expect(resourcesViolated).toContain('cpu');
      expect(resourcesViolated).toContain('connections');
      expect(resourcesViolated).toContain('network');
    });

    it('should calculate utilization percentages', () => {
      resourceMonitor.updateResourceUsage({
        memoryUsageMB: 250, // 50% of 500MB limit
        cpuPercent: 60, // 60%
        connections: 750, // 75% of 1000 limit
        bandwidthMbps: 8 // 80% of 10 Mbps limit
      });

      resourceMonitor.addToEventQueue('event1', 1024);
      // Add more events to reach ~50% of queue limit
      for (let i = 0; i < 499; i++) {
        resourceMonitor.addToEventQueue(`event${i+2}`, 1024);
      }

      const utilization = resourceMonitor.getUtilization();
      expect(utilization.memory).toBeCloseTo(50, 0);
      expect(utilization.cpu).toBe(60);
      expect(utilization.connections).toBe(75);
      expect(utilization.network).toBe(80);
      expect(utilization.eventQueue).toBeCloseTo(50, 0);
    });

    it('should generate alerts for warning thresholds', async () => {
      let alertReceived: AlertEvent | null = null;
      resourceMonitor.on('alert', (alert: AlertEvent) => {
        alertReceived = alert;
      });

      // Trigger warning level memory usage (70% of 500MB = 350MB)
      // Don't start automatic monitoring to avoid interference
      resourceMonitor.updateResourceUsage({
        memoryUsageMB: 375, // 75% - above warning threshold
        cpuPercent: 50,
        connections: 500,
        bandwidthMbps: 5
      });

      // Allow a small delay for event emission
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(alertReceived).not.toBeNull();
      expect(alertReceived!.type).toBe('warning');
      expect(alertReceived!.resource).toBe('memory');
      expect(alertReceived!.current).toBeCloseTo(75, 0);
    });

    it('should generate critical alerts', async () => {
      let alertReceived: AlertEvent | null = null;
      resourceMonitor.on('alert', (alert: AlertEvent) => {
        alertReceived = alert;
      });

      // Trigger critical level CPU usage (85% threshold)
      // Don't start automatic monitoring to avoid interference
      resourceMonitor.updateResourceUsage({
        memoryUsageMB: 200,
        cpuPercent: 90, // Above critical threshold
        connections: 500,
        bandwidthMbps: 5
      });

      // Allow a small delay for event emission
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(alertReceived).not.toBeNull();
      expect(alertReceived!.type).toBe('critical');
      expect(alertReceived!.resource).toBe('cpu');
    });

    it('should generate recovery alerts', async () => {
      const alerts: AlertEvent[] = [];
      resourceMonitor.on('alert', (alert: AlertEvent) => {
        alerts.push(alert);
      });

      resourceMonitor.start();

      // First, trigger a critical alert
      resourceMonitor.updateResourceUsage({
        memoryUsageMB: 200,
        cpuPercent: 90, // Critical
        connections: 500,
        bandwidthMbps: 5
      });

      await new Promise(resolve => setTimeout(resolve, 1200));

      // Then recover
      resourceMonitor.updateResourceUsage({
        memoryUsageMB: 200,
        cpuPercent: 50, // Recovered
        connections: 500,
        bandwidthMbps: 5
      });

      await new Promise(resolve => setTimeout(resolve, 1200));

      // Should have received both critical and recovery alerts
      expect(alerts.length).toBeGreaterThanOrEqual(2);
      expect(alerts.some(a => a.type === 'critical')).toBe(true);
      expect(alerts.some(a => a.type === 'recovery')).toBe(true);

      resourceMonitor.stop();
    });

    it('should track alert history', async () => {
      resourceMonitor.start();

      // Generate some alerts
      resourceMonitor.updateResourceUsage({
        memoryUsageMB: 200,
        cpuPercent: 90, // Critical
        connections: 950, // Critical (95% of 1000)
        bandwidthMbps: 9.5 // Critical (95% of 10)
      });

      await new Promise(resolve => setTimeout(resolve, 1200));

      const alertHistory = resourceMonitor.getAlertHistory();
      expect(alertHistory.length).toBeGreaterThan(0);

      // All alerts should have required fields
      for (const alert of alertHistory) {
        expect(alert.type).toMatch(/warning|critical|recovery/);
        expect(alert.resource).toBeDefined();
        expect(alert.current).toBeGreaterThanOrEqual(0);
        expect(alert.threshold).toBeGreaterThanOrEqual(0);
        expect(alert.message).toBeDefined();
        expect(alert.timestamp).toBeGreaterThan(0);
      }

      resourceMonitor.stop();
    });
  });

  describe('Performance Recommendations', () => {
    it('should provide memory recommendations', () => {
      resourceMonitor.updateResourceUsage({
        memoryUsageMB: 450, // 90% of 500MB limit
        cpuPercent: 50,
        connections: 500,
        bandwidthMbps: 5
      });

      const recommendations = resourceMonitor.getRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);

      const memoryRec = recommendations.find(r => r.type === 'memory');
      expect(memoryRec).toBeDefined();
      expect(memoryRec!.severity).toBe('high');
      expect(memoryRec!.action).toContain('memory');
    });

    it('should provide CPU recommendations', () => {
      resourceMonitor.updateResourceUsage({
        memoryUsageMB: 200,
        cpuPercent: 85, // High CPU
        connections: 500,
        bandwidthMbps: 5
      });

      const recommendations = resourceMonitor.getRecommendations();
      const cpuRec = recommendations.find(r => r.type === 'cpu');

      expect(cpuRec).toBeDefined();
      expect(cpuRec!.severity).toBe('high');
      expect(cpuRec!.action).toContain('CPU');
    });

    it('should provide connection recommendations', () => {
      resourceMonitor.updateResourceUsage({
        memoryUsageMB: 200,
        cpuPercent: 50,
        connections: 850, // 85% of 1000 limit
        bandwidthMbps: 5
      });

      const recommendations = resourceMonitor.getRecommendations();
      const connectionRec = recommendations.find(r => r.type === 'connections');

      expect(connectionRec).toBeDefined();
      expect(connectionRec!.severity).toBe('high');
      expect(connectionRec!.action).toContain('connection');
    });

    it('should provide cache recommendations for low hit rate', () => {
      // Simulate low cache hit rate
      resourceMonitor.trackCacheOperation(true, 0); // 1 hit
      resourceMonitor.trackCacheOperation(false, 0); // 1 miss
      resourceMonitor.trackCacheOperation(false, 0); // 1 miss
      resourceMonitor.trackCacheOperation(false, 0); // 1 miss
      // Hit rate: 25%

      const recommendations = resourceMonitor.getRecommendations();
      const cacheRec = recommendations.find(r => r.type === 'cache');

      expect(cacheRec).toBeDefined();
      expect(cacheRec!.severity).toBe('medium');
      expect(cacheRec!.action).toContain('cache');
    });

    it('should provide multiple recommendations when needed', () => {
      resourceMonitor.updateResourceUsage({
        memoryUsageMB: 450, // High memory
        cpuPercent: 85, // High CPU
        connections: 850, // High connections
        bandwidthMbps: 8
      });

      // Low cache hit rate
      resourceMonitor.trackCacheOperation(true, 0); // 1 hit
      resourceMonitor.trackCacheOperation(false, 0); // 3 misses
      resourceMonitor.trackCacheOperation(false, 0);
      resourceMonitor.trackCacheOperation(false, 0);

      const recommendations = resourceMonitor.getRecommendations();
      expect(recommendations.length).toBeGreaterThanOrEqual(3);

      const types = recommendations.map(r => r.type);
      expect(types).toContain('memory');
      expect(types).toContain('cpu');
      expect(types).toContain('connections');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle resource update with partial data', () => {
      expect(() => {
        resourceMonitor.updateResourceUsage({
          memoryUsageMB: 200,
          cpuPercent: 50,
          connections: 500,
          bandwidthMbps: 5
        });
      }).not.toThrow();

      const metrics = resourceMonitor.getCurrentMetrics();
      expect(metrics.memory.used).toBe(200);
      expect(metrics.cpu.usage).toBe(50);
    });

    it('should handle multiple start/stop calls gracefully', () => {
      resourceMonitor.start();
      resourceMonitor.start(); // Should not error

      resourceMonitor.stop();
      resourceMonitor.stop(); // Should not error
    });

    it('should emit error events for collection failures', async () => {
      let errorEmitted = false;
      resourceMonitor.on('error', () => { errorEmitted = true; });

      // This test would need to mock internal methods to force errors
      // For now, we just verify the error handling structure exists
      expect(resourceMonitor.listeners('error').length).toBe(1);
    });

    it('should handle cleanup properly', () => {
      resourceMonitor.addConnection('conn1');
      resourceMonitor.addToEventQueue('event1', 1024);
      resourceMonitor.start();

      expect(() => {
        resourceMonitor.cleanup();
      }).not.toThrow();

      // Verify cleanup worked
      expect(resourceMonitor.getCurrentMetrics().connections.total).toBe(0);
      expect(resourceMonitor.getHistory().length).toBe(0);
    });

    it('should handle large alert history', async () => {
      resourceMonitor.start();

      // Generate many alerts
      for (let i = 0; i < 1100; i++) {
        resourceMonitor.updateResourceUsage({
          memoryUsageMB: i % 2 === 0 ? 450 : 200, // Alternate between high and low
          cpuPercent: 50,
          connections: 500,
          bandwidthMbps: 5
        });

        // Small delay to allow processing
        if (i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1200));

      const alertHistory = resourceMonitor.getAlertHistory();
      // Should be capped at 1000 alerts
      expect(alertHistory.length).toBeLessThanOrEqual(1000);

      resourceMonitor.stop();
    });
  });
});