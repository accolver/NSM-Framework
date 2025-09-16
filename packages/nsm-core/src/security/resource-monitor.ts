/**
 * Advanced Resource Monitoring for NSM Framework
 * Monitors memory, CPU, network, and connection resources with alerts and throttling
 */

import { EventEmitter } from 'events';

// Resource Monitoring Configuration
export interface ResourceLimits {
  maxMemoryMB: number;
  maxCPUPercent: number;
  maxConnections: number;
  maxNetworkMbps: number;
  maxEventQueueSize: number;
  maxCacheSize: number;
}

export interface AlertThresholds {
  memory: { warning: number; critical: number };
  cpu: { warning: number; critical: number };
  connections: { warning: number; critical: number };
  network: { warning: number; critical: number };
  eventQueue: { warning: number; critical: number };
}

export interface ResourceUsage {
  memoryUsageMB: number;
  cpuPercent: number;
  connections: number;
  bandwidthMbps: number;
}

export interface ResourceMetrics {
  timestamp: number;
  memory: {
    used: number;
    available: number;
    percentUsed: number;
    heapSize: number;
    heapUsed: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  network: {
    inbound: number;
    outbound: number;
    totalBandwidth: number;
    activeConnections: number;
  };
  connections: {
    active: number;
    idle: number;
    total: number;
    connectionRate: number;
  };
  eventQueue: {
    size: number;
    processingRate: number;
    averageWaitTime: number;
  };
  cache: {
    size: number;
    hitRate: number;
    memoryUsage: number;
  };
}

export interface AlertEvent {
  type: 'warning' | 'critical' | 'recovery';
  resource: string;
  current: number;
  threshold: number;
  message: string;
  timestamp: number;
  metadata?: any;
}

export interface ResourceMonitorConfig {
  limits: ResourceLimits;
  alertThresholds: AlertThresholds;
  monitoringInterval: number;
  historySize: number;
  enableAlerts: boolean;
  enableAutoThrottling: boolean;
  enableGracefulDegradation: boolean;
}

export class ResourceMonitor extends EventEmitter {
  private config: ResourceMonitorConfig;
  private metrics: ResourceMetrics[] = [];
  private currentMetrics?: ResourceMetrics;
  private connections = new Set<string>();
  private eventQueue: Array<{ id: string; timestamp: number; size: number }> = [];
  private networkStats = {
    inbound: 0,
    outbound: 0,
    lastCheck: Date.now()
  };
  private cacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    memoryUsage: 0
  };
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;
  private alertHistory: AlertEvent[] = [];

  constructor(config: ResourceMonitorConfig) {
    super();
    this.config = config;
    this.currentMetrics = this.initializeMetrics();
  }

  /**
   * Start resource monitoring
   */
  public start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoringInterval);

    this.emit('started');
  }

  /**
   * Stop resource monitoring
   */
  public stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.emit('stopped');
  }

  /**
   * Get current resource metrics
   */
  public getCurrentMetrics(): ResourceMetrics {
    if (!this.currentMetrics) {
      this.currentMetrics = this.initializeMetrics();
    }

    // Update real-time data
    this.currentMetrics.connections = this.collectConnectionMetrics();
    this.currentMetrics.eventQueue = this.collectEventQueueMetrics();
    this.currentMetrics.cache = this.collectCacheMetrics();
    this.currentMetrics.timestamp = Date.now();

    return { ...this.currentMetrics };
  }

  /**
   * Get historical metrics
   */
  public getHistory(maxEntries?: number): ResourceMetrics[] {
    const entries = maxEntries || this.config.historySize;
    return this.metrics.slice(-entries);
  }

  /**
   * Check if resource limits are exceeded
   */
  public checkLimits(): {
    exceeded: boolean;
    violations: Array<{ resource: string; current: number; limit: number }>;
  } {
    if (!this.currentMetrics) {
      return { exceeded: false, violations: [] };
    }

    const violations: Array<{ resource: string; current: number; limit: number }> = [];
    const limits = this.config.limits;
    const metrics = this.currentMetrics;

    if (metrics.memory.used > limits.maxMemoryMB) {
      violations.push({
        resource: 'memory',
        current: metrics.memory.used,
        limit: limits.maxMemoryMB
      });
    }

    if (metrics.cpu.usage > limits.maxCPUPercent) {
      violations.push({
        resource: 'cpu',
        current: metrics.cpu.usage,
        limit: limits.maxCPUPercent
      });
    }

    if (metrics.connections.total > limits.maxConnections) {
      violations.push({
        resource: 'connections',
        current: metrics.connections.total,
        limit: limits.maxConnections
      });
    }

    if (metrics.network.totalBandwidth > limits.maxNetworkMbps) {
      violations.push({
        resource: 'network',
        current: metrics.network.totalBandwidth,
        limit: limits.maxNetworkMbps
      });
    }

    if (metrics.eventQueue.size > limits.maxEventQueueSize) {
      violations.push({
        resource: 'eventQueue',
        current: metrics.eventQueue.size,
        limit: limits.maxEventQueueSize
      });
    }

    return {
      exceeded: violations.length > 0,
      violations
    };
  }

  /**
   * Get resource utilization percentages
   */
  public getUtilization(): {
    memory: number;
    cpu: number;
    connections: number;
    network: number;
    eventQueue: number;
  } {
    if (!this.currentMetrics) {
      return { memory: 0, cpu: 0, connections: 0, network: 0, eventQueue: 0 };
    }

    const metrics = this.currentMetrics;
    const limits = this.config.limits;

    return {
      memory: (metrics.memory.used / limits.maxMemoryMB) * 100,
      cpu: metrics.cpu.usage,
      connections: (metrics.connections.total / limits.maxConnections) * 100,
      network: (metrics.network.totalBandwidth / limits.maxNetworkMbps) * 100,
      eventQueue: (metrics.eventQueue.size / limits.maxEventQueueSize) * 100
    };
  }

  /**
   * Register a new connection
   */
  public addConnection(connectionId: string, metadata?: any): void {
    this.connections.add(connectionId);
    // Update current metrics immediately
    if (this.currentMetrics) {
      this.currentMetrics.connections = this.collectConnectionMetrics();
    }
    this.emit('connectionAdded', { connectionId, metadata, total: this.connections.size });
  }

  /**
   * Remove a connection
   */
  public removeConnection(connectionId: string): void {
    this.connections.delete(connectionId);
    // Update current metrics immediately
    if (this.currentMetrics) {
      this.currentMetrics.connections = this.collectConnectionMetrics();
    }
    this.emit('connectionRemoved', { connectionId, total: this.connections.size });
  }

  /**
   * Track event processing
   */
  public addToEventQueue(eventId: string, eventSize: number): void {
    this.eventQueue.push({
      id: eventId,
      timestamp: Date.now(),
      size: eventSize
    });

    // Clean up old events
    const maxAge = 300000; // 5 minutes
    const now = Date.now();
    this.eventQueue = this.eventQueue.filter(event => now - event.timestamp < maxAge);

    // Update current metrics immediately
    if (this.currentMetrics) {
      this.currentMetrics.eventQueue = this.collectEventQueueMetrics();
    }

    this.emit('eventQueued', { eventId, queueSize: this.eventQueue.length });
  }

  /**
   * Remove event from processing queue
   */
  public removeFromEventQueue(eventId: string): void {
    const index = this.eventQueue.findIndex(event => event.id === eventId);
    if (index !== -1) {
      this.eventQueue.splice(index, 1);
      // Update current metrics immediately
      if (this.currentMetrics) {
        this.currentMetrics.eventQueue = this.collectEventQueueMetrics();
      }
      this.emit('eventProcessed', { eventId, queueSize: this.eventQueue.length });
    }
  }

  /**
   * Track network usage
   */
  public trackNetworkUsage(inboundBytes: number, outboundBytes: number): void {
    this.networkStats.inbound += inboundBytes;
    this.networkStats.outbound += outboundBytes;
  }

  /**
   * Track cache operations
   */
  public trackCacheOperation(hit: boolean, memoryDelta: number = 0): void {
    if (hit) {
      this.cacheStats.hits++;
    } else {
      this.cacheStats.misses++;
    }
    this.cacheStats.memoryUsage += memoryDelta;
  }

  /**
   * Update cache size
   */
  public updateCacheSize(newSize: number): void {
    this.cacheStats.size = newSize;
    // Update current metrics immediately
    if (this.currentMetrics) {
      this.currentMetrics.cache = this.collectCacheMetrics();
    }
  }

  /**
   * Get performance recommendations based on current metrics
   */
  public getRecommendations(): Array<{
    type: 'memory' | 'cpu' | 'network' | 'connections' | 'cache';
    severity: 'low' | 'medium' | 'high';
    message: string;
    action: string;
  }> {
    const recommendations: Array<{
      type: 'memory' | 'cpu' | 'network' | 'connections' | 'cache';
      severity: 'low' | 'medium' | 'high';
      message: string;
      action: string;
    }> = [];

    if (!this.currentMetrics) {
      return recommendations;
    }

    const utilization = this.getUtilization();
    const metrics = this.currentMetrics;

    // Memory recommendations
    if (utilization.memory > 80) {
      recommendations.push({
        type: 'memory',
        severity: 'high',
        message: `Memory usage at ${utilization.memory.toFixed(1)}%`,
        action: 'Consider reducing cache size or implementing memory-efficient data structures'
      });
    } else if (utilization.memory > 60) {
      recommendations.push({
        type: 'memory',
        severity: 'medium',
        message: `Memory usage at ${utilization.memory.toFixed(1)}%`,
        action: 'Monitor memory usage and prepare for scaling'
      });
    }

    // CPU recommendations
    if (utilization.cpu > 80) {
      recommendations.push({
        type: 'cpu',
        severity: 'high',
        message: `CPU usage at ${utilization.cpu.toFixed(1)}%`,
        action: 'Consider horizontal scaling or optimizing CPU-intensive operations'
      });
    }

    // Connection recommendations
    if (utilization.connections > 80) {
      recommendations.push({
        type: 'connections',
        severity: 'high',
        message: `Connection usage at ${utilization.connections.toFixed(1)}%`,
        action: 'Implement connection pooling or increase connection limits'
      });
    }

    // Cache recommendations
    if (metrics.cache.hitRate < 0.5) {
      recommendations.push({
        type: 'cache',
        severity: 'medium',
        message: `Low cache hit rate: ${(metrics.cache.hitRate * 100).toFixed(1)}%`,
        action: 'Review cache strategy and expiration policies'
      });
    }

    return recommendations;
  }

  /**
   * Get recent alerts
   */
  public getAlertHistory(maxAlerts: number = 50): AlertEvent[] {
    return this.alertHistory.slice(-maxAlerts);
  }

  /**
   * Manually update resource usage metrics
   * This method allows external systems to provide resource usage data
   * and triggers the same alert logic as automatic collection
   */
  public updateResourceUsage(usage: ResourceUsage): void {
    if (!this.currentMetrics) {
      this.currentMetrics = this.initializeMetrics();
    }

    const timestamp = Date.now();

    // Update the current metrics with provided usage data
    const updatedMetrics: ResourceMetrics = {
      ...this.currentMetrics,
      timestamp,
      memory: {
        ...this.currentMetrics.memory,
        used: usage.memoryUsageMB,
        percentUsed: (usage.memoryUsageMB / this.config.limits.maxMemoryMB) * 100
      },
      cpu: {
        ...this.currentMetrics.cpu,
        usage: usage.cpuPercent
      },
      connections: {
        ...this.currentMetrics.connections,
        total: usage.connections,
        active: usage.connections
      },
      network: {
        ...this.currentMetrics.network,
        totalBandwidth: usage.bandwidthMbps
      }
    };

    this.currentMetrics = updatedMetrics;
    this.metrics.push(updatedMetrics);

    // Trim history if it exceeds the configured size
    if (this.metrics.length > this.config.historySize) {
      this.metrics = this.metrics.slice(-this.config.historySize);
    }

    // Check for alerts if enabled
    if (this.config.enableAlerts) {
      this.checkAlerts(updatedMetrics);
    }

    this.emit('metricsCollected', updatedMetrics);
  }

  /**
   * Cleanup resources and stop monitoring
   */
  public cleanup(): void {
    this.stop();
    this.connections.clear();
    this.eventQueue = [];
    this.metrics = [];
    this.alertHistory = [];
    this.removeAllListeners();
  }

  // Private Implementation Methods

  private async collectMetrics(): Promise<void> {
    const timestamp = Date.now();

    try {
      const metrics: ResourceMetrics = {
        timestamp,
        memory: await this.collectMemoryMetrics(),
        cpu: await this.collectCPUMetrics(),
        network: this.collectNetworkMetrics(),
        connections: this.collectConnectionMetrics(),
        eventQueue: this.collectEventQueueMetrics(),
        cache: this.collectCacheMetrics()
      };

      this.currentMetrics = metrics;
      this.metrics.push(metrics);

      // Trim history if it exceeds the configured size
      if (this.metrics.length > this.config.historySize) {
        this.metrics = this.metrics.slice(-this.config.historySize);
      }

      // Check for alerts
      if (this.config.enableAlerts) {
        this.checkAlerts(metrics);
      }

      this.emit('metricsCollected', metrics);

    } catch (error) {
      this.emit('error', { type: 'metrics_collection', error });
    }
  }

  private async collectMemoryMetrics(): Promise<ResourceMetrics['memory']> {
    let memoryInfo: any = { used: 0, available: 0, heapSize: 0, heapUsed: 0 };

    try {
      // Browser environment
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        const perfMemory = (performance as any).memory;
        memoryInfo = {
          used: perfMemory.usedJSHeapSize / (1024 * 1024), // MB
          available: perfMemory.jsHeapSizeLimit / (1024 * 1024), // MB
          heapSize: perfMemory.totalJSHeapSize / (1024 * 1024), // MB
          heapUsed: perfMemory.usedJSHeapSize / (1024 * 1024) // MB
        };
      }
      // Node.js environment
      else if (typeof process !== 'undefined' && process.memoryUsage) {
        const memUsage = process.memoryUsage();
        memoryInfo = {
          used: memUsage.rss / (1024 * 1024), // MB
          available: memUsage.heapTotal / (1024 * 1024), // MB
          heapSize: memUsage.heapTotal / (1024 * 1024), // MB
          heapUsed: memUsage.heapUsed / (1024 * 1024) // MB
        };
      }
    } catch (error) {
      // Fallback to estimates
      memoryInfo = {
        used: this.estimateMemoryUsage(),
        available: this.config.limits.maxMemoryMB,
        heapSize: 100, // Rough estimate
        heapUsed: this.estimateMemoryUsage()
      };
    }

    return {
      ...memoryInfo,
      percentUsed: (memoryInfo.used / memoryInfo.available) * 100
    };
  }

  private async collectCPUMetrics(): Promise<ResourceMetrics['cpu']> {
    let cpuInfo = { usage: 0, loadAverage: [0, 0, 0] };

    try {
      // Node.js environment
      if (typeof process !== 'undefined' && process.cpuUsage) {
        // This is a simplified CPU calculation
        // In a real implementation, you'd want more sophisticated CPU monitoring
        const usage = process.cpuUsage();
        cpuInfo.usage = ((usage.user + usage.system) / 1000000) * 100; // Convert to percentage

        if (typeof require !== 'undefined') {
          try {
            const os = require('os');
            cpuInfo.loadAverage = os.loadavg();
          } catch (e) {
            // os module not available
          }
        }
      } else {
        // Browser environment - estimate based on performance
        cpuInfo.usage = this.estimateCPUUsage();
      }
    } catch (error) {
      cpuInfo.usage = 10; // Conservative estimate
    }

    return cpuInfo;
  }

  private collectNetworkMetrics(): ResourceMetrics['network'] {
    const now = Date.now();
    const timeDiff = (now - this.networkStats.lastCheck) / 1000; // seconds

    const inboundMbps = (this.networkStats.inbound * 8) / (1024 * 1024 * timeDiff);
    const outboundMbps = (this.networkStats.outbound * 8) / (1024 * 1024 * timeDiff);

    // Reset counters
    this.networkStats.inbound = 0;
    this.networkStats.outbound = 0;
    this.networkStats.lastCheck = now;

    return {
      inbound: inboundMbps,
      outbound: outboundMbps,
      totalBandwidth: inboundMbps + outboundMbps,
      activeConnections: this.connections.size
    };
  }

  private collectConnectionMetrics(): ResourceMetrics['connections'] {
    // Calculate connection rate (connections per minute)
    const oneMinuteAgo = Date.now() - 60000;
    const recentConnections = Array.from(this.connections).length; // Simplified

    return {
      active: this.connections.size,
      idle: 0, // Would need more sophisticated tracking
      total: this.connections.size,
      connectionRate: recentConnections
    };
  }

  private collectEventQueueMetrics(): ResourceMetrics['eventQueue'] {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Calculate processing rate (events per minute)
    const recentEvents = this.eventQueue.filter(event => event.timestamp > oneMinuteAgo);
    const processingRate = recentEvents.length;

    // Calculate average wait time
    let totalWaitTime = 0;
    let processedEvents = 0;

    for (const event of this.eventQueue) {
      if (event.timestamp > oneMinuteAgo) {
        totalWaitTime += now - event.timestamp;
        processedEvents++;
      }
    }

    const averageWaitTime = processedEvents > 0 ? totalWaitTime / processedEvents : 0;

    return {
      size: this.eventQueue.length,
      processingRate,
      averageWaitTime
    };
  }

  private collectCacheMetrics(): ResourceMetrics['cache'] {
    const totalOperations = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = totalOperations > 0 ? this.cacheStats.hits / totalOperations : 0;

    return {
      size: this.cacheStats.size,
      hitRate,
      memoryUsage: this.cacheStats.memoryUsage
    };
  }

  private checkAlerts(metrics: ResourceMetrics): void {
    const thresholds = this.config.alertThresholds;

    // Memory alerts
    this.checkResourceAlert('memory', metrics.memory.percentUsed, thresholds.memory);

    // CPU alerts
    this.checkResourceAlert('cpu', metrics.cpu.usage, thresholds.cpu);

    // Connection alerts
    const connectionPercent = (metrics.connections.total / this.config.limits.maxConnections) * 100;
    this.checkResourceAlert('connections', connectionPercent, thresholds.connections);

    // Network alerts
    const networkPercent = (metrics.network.totalBandwidth / this.config.limits.maxNetworkMbps) * 100;
    this.checkResourceAlert('network', networkPercent, thresholds.network);

    // Event queue alerts
    const queuePercent = (metrics.eventQueue.size / this.config.limits.maxEventQueueSize) * 100;
    this.checkResourceAlert('eventQueue', queuePercent, thresholds.eventQueue);
  }

  private checkResourceAlert(
    resource: string,
    currentValue: number,
    thresholds: { warning: number; critical: number }
  ): void {
    const lastAlert = this.alertHistory
      .filter(alert => alert.resource === resource)
      .pop();

    let alertType: 'warning' | 'critical' | 'recovery' | null = null;
    let message = '';

    if (currentValue >= thresholds.critical) {
      if (!lastAlert || lastAlert.type !== 'critical') {
        alertType = 'critical';
        message = `${resource} usage critical: ${currentValue.toFixed(1)}%`;
      }
    } else if (currentValue >= thresholds.warning) {
      if (!lastAlert || lastAlert.type === 'recovery') {
        alertType = 'warning';
        message = `${resource} usage warning: ${currentValue.toFixed(1)}%`;
      }
    } else if (lastAlert && (lastAlert.type === 'warning' || lastAlert.type === 'critical')) {
      alertType = 'recovery';
      message = `${resource} usage recovered: ${currentValue.toFixed(1)}%`;
    }

    if (alertType) {
      const alert: AlertEvent = {
        type: alertType,
        resource,
        current: currentValue,
        threshold: alertType === 'critical' ? thresholds.critical : thresholds.warning,
        message,
        timestamp: Date.now()
      };

      this.alertHistory.push(alert);

      // Keep only recent alerts
      if (this.alertHistory.length > 1000) {
        this.alertHistory = this.alertHistory.slice(-1000);
      }

      this.emit('alert', alert);
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimate based on tracked resources
    let usage = 0;
    usage += this.connections.size * 0.1; // ~100KB per connection
    usage += this.eventQueue.length * 0.01; // ~10KB per queued event
    usage += this.metrics.length * 0.005; // ~5KB per metrics entry
    usage += this.cacheStats.memoryUsage;
    return Math.max(10, usage); // Minimum 10MB baseline
  }

  private estimateCPUUsage(): number {
    // Simple CPU estimation based on activity
    const connectionsLoad = (this.connections.size / this.config.limits.maxConnections) * 20;
    const queueLoad = (this.eventQueue.length / this.config.limits.maxEventQueueSize) * 30;
    return Math.min(100, Math.max(5, connectionsLoad + queueLoad));
  }

  private initializeMetrics(): ResourceMetrics {
    return {
      timestamp: Date.now(),
      memory: {
        used: 0,
        available: this.config.limits.maxMemoryMB,
        percentUsed: 0,
        heapSize: 0,
        heapUsed: 0
      },
      cpu: {
        usage: 0,
        loadAverage: [0, 0, 0]
      },
      network: {
        inbound: 0,
        outbound: 0,
        totalBandwidth: 0,
        activeConnections: 0
      },
      connections: {
        active: 0,
        idle: 0,
        total: 0,
        connectionRate: 0
      },
      eventQueue: {
        size: 0,
        processingRate: 0,
        averageWaitTime: 0
      },
      cache: {
        size: 0,
        hitRate: 0,
        memoryUsage: 0
      }
    };
  }
}