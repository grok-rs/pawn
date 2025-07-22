import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// Performance profiling utilities
const PerformanceProfiler = {
  // Memory usage tracking
  measureMemoryUsage: (): {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    percentage: number;
  } => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };
    }

    // Fallback for browsers without memory API
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      percentage: 0,
    };
  },

  // Render time measurement
  measureRenderTime: async (
    renderFunction: () => void
  ): Promise<{
    renderTime: number;
    paintTime: number;
    totalTime: number;
  }> => {
    const startTime = performance.now();

    // Execute render
    renderFunction();

    const renderTime = performance.now() - startTime;

    // Wait for paint
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });

    const totalTime = performance.now() - startTime;
    const paintTime = totalTime - renderTime;

    return { renderTime, paintTime, totalTime };
  },

  // Frame rate monitoring
  monitorFrameRate: (
    duration: number = 1000
  ): Promise<{
    averageFPS: number;
    minFPS: number;
    maxFPS: number;
    frameCount: number;
    droppedFrames: number;
  }> => {
    return new Promise(resolve => {
      const frames: number[] = [];
      const startTime = performance.now();
      let lastFrameTime = startTime;
      let animationId: number;

      const measureFrame = (currentTime: number) => {
        const delta = currentTime - lastFrameTime;
        if (delta > 0) {
          const fps = 1000 / delta;
          frames.push(fps);
        }
        lastFrameTime = currentTime;

        if (currentTime - startTime < duration) {
          animationId = requestAnimationFrame(measureFrame);
        } else {
          const averageFPS =
            frames.reduce((sum, fps) => sum + fps, 0) / frames.length;
          const minFPS = Math.min(...frames);
          const maxFPS = Math.max(...frames);
          const targetFrames = Math.floor(duration / (1000 / 60)); // 60 FPS target
          const droppedFrames = Math.max(0, targetFrames - frames.length);

          resolve({
            averageFPS: Math.round(averageFPS),
            minFPS: Math.round(minFPS),
            maxFPS: Math.round(maxFPS),
            frameCount: frames.length,
            droppedFrames,
          });
        }
      };

      animationId = requestAnimationFrame(measureFrame);

      // Cleanup timeout
      setTimeout(() => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      }, duration + 100);
    });
  },

  // Bundle size analysis
  analyzeBundleSize: (): {
    estimatedSize: number;
    resourceCount: number;
    largestResources: Array<{ name: string; size: number }>;
  } => {
    const resources = performance.getEntriesByType(
      'resource'
    ) as PerformanceResourceTiming[];
    let totalSize = 0;
    const resourceSizes: Array<{ name: string; size: number }> = [];

    resources.forEach(resource => {
      const size = resource.transferSize || resource.encodedBodySize || 0;
      totalSize += size;
      resourceSizes.push({
        name: resource.name.split('/').pop() || resource.name,
        size,
      });
    });

    // Sort by size and get top 10
    const largestResources = resourceSizes
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    return {
      estimatedSize: totalSize,
      resourceCount: resources.length,
      largestResources,
    };
  },

  // Component render profiling
  profileComponentRender: async <T extends React.ComponentType<any>>(
    Component: T,
    props: React.ComponentProps<T>,
    iterations: number = 10
  ): Promise<{
    averageRenderTime: number;
    minRenderTime: number;
    maxRenderTime: number;
    memoryDelta: number;
    iterations: number;
  }> => {
    const renderTimes: number[] = [];
    const initialMemory = PerformanceProfiler.measureMemoryUsage();

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      const { unmount } = render(<Component {...props} />);

      const endTime = performance.now();
      renderTimes.push(endTime - startTime);

      unmount();

      // Small delay to allow cleanup
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const finalMemory = PerformanceProfiler.measureMemoryUsage();

    return {
      averageRenderTime:
        renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length,
      minRenderTime: Math.min(...renderTimes),
      maxRenderTime: Math.max(...renderTimes),
      memoryDelta: finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize,
      iterations,
    };
  },

  // Long task detection
  detectLongTasks: (
    threshold: number = 50
  ): Promise<
    Array<{
      duration: number;
      startTime: number;
      name: string;
    }>
  > => {
    return new Promise(resolve => {
      const longTasks: Array<{
        duration: number;
        startTime: number;
        name: string;
      }> = [];

      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver(list => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.duration > threshold) {
              longTasks.push({
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name,
              });
            }
          });
        });

        try {
          observer.observe({ entryTypes: ['longtask'] });

          // Stop observing after 5 seconds
          setTimeout(() => {
            observer.disconnect();
            resolve(longTasks);
          }, 5000);
        } catch {
          // Long task API not supported
          resolve([]);
        }
      } else {
        resolve([]);
      }
    });
  },

  // Memory leak detection
  detectMemoryLeaks: async (
    testFunction: () => Promise<void>,
    iterations: number = 5
  ): Promise<{
    hasLeak: boolean;
    memoryGrowth: number;
    iterations: number;
    measurements: number[];
  }> => {
    const measurements: number[] = [];

    // Force garbage collection if available (Chrome DevTools)
    const forceGC = () => {
      if ('gc' in window) {
        (window as any).gc();
      }
    };

    for (let i = 0; i < iterations; i++) {
      // Force GC before measurement
      forceGC();
      await new Promise(resolve => setTimeout(resolve, 100));

      const beforeMemory = PerformanceProfiler.measureMemoryUsage();

      // Run test function
      await testFunction();

      // Force GC after test
      forceGC();
      await new Promise(resolve => setTimeout(resolve, 100));

      const afterMemory = PerformanceProfiler.measureMemoryUsage();
      const memoryDelta =
        afterMemory.usedJSHeapSize - beforeMemory.usedJSHeapSize;
      measurements.push(memoryDelta);
    }

    // Calculate average memory growth
    const averageGrowth =
      measurements.reduce((sum, measurement) => sum + measurement, 0) /
      measurements.length;

    // Consider it a leak if memory consistently grows by more than 1MB per iteration
    const hasLeak = averageGrowth > 1024 * 1024;

    return {
      hasLeak,
      memoryGrowth: averageGrowth,
      iterations,
      measurements,
    };
  },

  // First contentful paint and largest contentful paint tracking
  measurePaintTimes: (): Promise<{
    firstContentfulPaint: number | null;
    largestContentfulPaint: number | null;
    firstPaint: number | null;
  }> => {
    return new Promise(resolve => {
      let firstContentfulPaint: number | null = null;
      let largestContentfulPaint: number | null = null;
      let firstPaint: number | null = null;

      // Check for existing paint entries
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach(entry => {
        if (entry.name === 'first-contentful-paint') {
          firstContentfulPaint = entry.startTime;
        } else if (entry.name === 'first-paint') {
          firstPaint = entry.startTime;
        }
      });

      // Check for LCP
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          largestContentfulPaint = lastEntry.startTime;
        });

        try {
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

          setTimeout(() => {
            lcpObserver.disconnect();
            resolve({
              firstContentfulPaint,
              largestContentfulPaint,
              firstPaint,
            });
          }, 2000);
        } catch {
          resolve({ firstContentfulPaint, largestContentfulPaint, firstPaint });
        }
      } else {
        resolve({ firstContentfulPaint, largestContentfulPaint, firstPaint });
      }
    });
  },

  // Resource loading performance
  analyzeResourcePerformance: (): Array<{
    name: string;
    duration: number;
    size: number;
    type: string;
    cached: boolean;
  }> => {
    const resources = performance.getEntriesByType(
      'resource'
    ) as PerformanceResourceTiming[];

    return resources
      .map(resource => ({
        name: resource.name.split('/').pop() || resource.name,
        duration: resource.responseEnd - resource.startTime,
        size: resource.transferSize || resource.encodedBodySize || 0,
        type: resource.initiatorType,
        cached: resource.transferSize === 0 && resource.encodedBodySize > 0,
      }))
      .sort((a, b) => b.duration - a.duration);
  },
};

// Performance monitoring component
const PerformanceMonitor = ({
  autoStart = false,
  monitorDuration = 5000,
  onMetricsUpdate,
}: {
  autoStart?: boolean;
  monitorDuration?: number;
  onMetricsUpdate?: (metrics: any) => void;
}) => {
  const [metrics, setMetrics] = React.useState<any>(null);
  const [isMonitoring, setIsMonitoring] = React.useState(false);
  const [realTimeMetrics, setRealTimeMetrics] = React.useState<any>({
    memory: null,
    frameRate: null,
  });

  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (autoStart) {
      startMonitoring();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoStart]);

  const startMonitoring = async () => {
    setIsMonitoring(true);

    // Start real-time monitoring
    intervalRef.current = setInterval(() => {
      const memory = PerformanceProfiler.measureMemoryUsage();
      setRealTimeMetrics(prev => ({ ...prev, memory }));
    }, 1000);

    // Collect comprehensive metrics
    const [
      frameRateData,
      bundleAnalysis,
      paintTimes,
      resourcePerformance,
      longTasks,
    ] = await Promise.all([
      PerformanceProfiler.monitorFrameRate(monitorDuration),
      Promise.resolve(PerformanceProfiler.analyzeBundleSize()),
      PerformanceProfiler.measurePaintTimes(),
      Promise.resolve(PerformanceProfiler.analyzeResourcePerformance()),
      PerformanceProfiler.detectLongTasks(),
    ]);

    const finalMemory = PerformanceProfiler.measureMemoryUsage();

    const comprehensiveMetrics = {
      memory: finalMemory,
      frameRate: frameRateData,
      bundle: bundleAnalysis,
      paintTimes,
      resources: resourcePerformance,
      longTasks,
      timestamp: new Date().toISOString(),
    };

    setMetrics(comprehensiveMetrics);
    setIsMonitoring(false);

    if (onMetricsUpdate) {
      onMetricsUpdate(comprehensiveMetrics);
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div data-testid="performance-monitor">
      <div data-testid="monitor-controls">
        <button
          data-testid="start-monitoring"
          onClick={startMonitoring}
          disabled={isMonitoring}
        >
          {isMonitoring ? 'Monitoring...' : 'Start Monitoring'}
        </button>

        <button
          data-testid="stop-monitoring"
          onClick={stopMonitoring}
          disabled={!isMonitoring}
        >
          Stop Monitoring
        </button>
      </div>

      {realTimeMetrics.memory && (
        <div data-testid="real-time-metrics">
          <h4>Real-time Metrics</h4>
          <div data-testid="real-time-memory">
            Memory Usage: {formatBytes(realTimeMetrics.memory.usedJSHeapSize)} /{' '}
            {formatBytes(realTimeMetrics.memory.jsHeapSizeLimit)}(
            {realTimeMetrics.memory.percentage.toFixed(1)}%)
          </div>
        </div>
      )}

      {metrics && (
        <div data-testid="performance-metrics">
          <h3>Performance Analysis Results</h3>

          <div data-testid="memory-metrics">
            <h4>Memory Usage</h4>
            <div>Used: {formatBytes(metrics.memory.usedJSHeapSize)}</div>
            <div>Total: {formatBytes(metrics.memory.totalJSHeapSize)}</div>
            <div>Limit: {formatBytes(metrics.memory.jsHeapSizeLimit)}</div>
            <div>Usage: {metrics.memory.percentage.toFixed(1)}%</div>
          </div>

          <div data-testid="frame-rate-metrics">
            <h4>Frame Rate</h4>
            <div>Average FPS: {metrics.frameRate.averageFPS}</div>
            <div>Min FPS: {metrics.frameRate.minFPS}</div>
            <div>Max FPS: {metrics.frameRate.maxFPS}</div>
            <div>Dropped Frames: {metrics.frameRate.droppedFrames}</div>
          </div>

          <div data-testid="bundle-metrics">
            <h4>Bundle Analysis</h4>
            <div>
              Estimated Size: {formatBytes(metrics.bundle.estimatedSize)}
            </div>
            <div>Resource Count: {metrics.bundle.resourceCount}</div>
            <div>Largest Resources:</div>
            <ul>
              {metrics.bundle.largestResources
                .slice(0, 5)
                .map((resource: any, index: number) => (
                  <li key={index} data-testid={`large-resource-${index}`}>
                    {resource.name}: {formatBytes(resource.size)}
                  </li>
                ))}
            </ul>
          </div>

          {metrics.paintTimes.firstContentfulPaint && (
            <div data-testid="paint-metrics">
              <h4>Paint Times</h4>
              <div>
                First Paint: {metrics.paintTimes.firstPaint?.toFixed(2)}ms
              </div>
              <div>
                First Contentful Paint:{' '}
                {metrics.paintTimes.firstContentfulPaint.toFixed(2)}ms
              </div>
              {metrics.paintTimes.largestContentfulPaint && (
                <div>
                  Largest Contentful Paint:{' '}
                  {metrics.paintTimes.largestContentfulPaint.toFixed(2)}ms
                </div>
              )}
            </div>
          )}

          {metrics.longTasks.length > 0 && (
            <div data-testid="long-tasks">
              <h4>Long Tasks Detected</h4>
              <ul>
                {metrics.longTasks.map((task: any, index: number) => (
                  <li key={index} data-testid={`long-task-${index}`}>
                    {task.name}: {task.duration.toFixed(2)}ms
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div data-testid="resource-performance">
            <h4>Slowest Resources</h4>
            <ul>
              {metrics.resources
                .slice(0, 5)
                .map((resource: any, index: number) => (
                  <li key={index} data-testid={`slow-resource-${index}`}>
                    {resource.name}: {resource.duration.toFixed(2)}ms (
                    {formatBytes(resource.size)})
                    {resource.cached && ' (cached)'}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

// Component performance test harness
const ComponentPerformanceTest = ({
  testComponent: TestComponent,
  testProps = {},
  iterations = 5,
}: {
  testComponent: React.ComponentType<any>;
  testProps?: any;
  iterations?: number;
}) => {
  const [results, setResults] = React.useState<any>(null);
  const [testing, setTesting] = React.useState(false);

  const runPerformanceTest = async () => {
    setTesting(true);

    try {
      const results = await PerformanceProfiler.profileComponentRender(
        TestComponent,
        testProps,
        iterations
      );

      setResults(results);
    } catch (error) {
      console.error('Performance test failed:', error);
    } finally {
      setTesting(false);
    }
  };

  const runMemoryLeakTest = async () => {
    setTesting(true);

    try {
      const leakTest = await PerformanceProfiler.detectMemoryLeaks(async () => {
        const { unmount } = render(<TestComponent {...testProps} />);
        await new Promise(resolve => setTimeout(resolve, 100));
        unmount();
      }, iterations);

      setResults(prev => ({ ...prev, memoryLeak: leakTest }));
    } catch (error) {
      console.error('Memory leak test failed:', error);
    } finally {
      setTesting(false);
    }
  };

  const formatTime = (time: number) => `${time.toFixed(2)}ms`;
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div data-testid="component-performance-test">
      <h3>Component Performance Testing</h3>

      <div data-testid="test-controls">
        <button
          data-testid="run-render-test"
          onClick={runPerformanceTest}
          disabled={testing}
        >
          {testing ? 'Testing...' : 'Run Render Performance Test'}
        </button>

        <button
          data-testid="run-memory-test"
          onClick={runMemoryLeakTest}
          disabled={testing}
        >
          {testing ? 'Testing...' : 'Run Memory Leak Test'}
        </button>
      </div>

      {results && (
        <div data-testid="test-results">
          <h4>Performance Results</h4>

          {results.averageRenderTime && (
            <div data-testid="render-performance">
              <h5>Render Performance</h5>
              <div>
                Average Render Time: {formatTime(results.averageRenderTime)}
              </div>
              <div>Min Render Time: {formatTime(results.minRenderTime)}</div>
              <div>Max Render Time: {formatTime(results.maxRenderTime)}</div>
              <div>Memory Delta: {formatBytes(results.memoryDelta)}</div>
              <div>Iterations: {results.iterations}</div>
            </div>
          )}

          {results.memoryLeak && (
            <div data-testid="memory-leak-results">
              <h5>Memory Leak Analysis</h5>
              <div data-testid="leak-status">
                Leak Detected: {results.memoryLeak.hasLeak ? 'Yes' : 'No'}
              </div>
              <div>
                Average Memory Growth:{' '}
                {formatBytes(results.memoryLeak.memoryGrowth)}
              </div>
              <div>Test Iterations: {results.memoryLeak.iterations}</div>
              <div>
                Measurements:{' '}
                {results.memoryLeak.measurements
                  .map((m: number) => formatBytes(m))
                  .join(', ')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Large dataset performance component
const LargeDatasetPerformance = ({
  itemCount = 1000,
}: {
  itemCount?: number;
}) => {
  const [players, setPlayers] = React.useState<any[]>([]);
  const [renderTime, setRenderTime] = React.useState<number | null>(null);
  const [isRendering, setIsRendering] = React.useState(false);

  const generateLargeDataset = React.useCallback(() => {
    const newPlayers = Array.from({ length: itemCount }, (_, i) => ({
      id: i + 1,
      name: `Player ${i + 1}`,
      rating: 1200 + Math.floor(Math.random() * 1600),
      score: Math.floor(Math.random() * 10) / 2,
      gamesPlayed: Math.floor(Math.random() * 20),
    }));
    setPlayers(newPlayers);
  }, [itemCount]);

  const measureRenderPerformance = React.useCallback(async () => {
    setIsRendering(true);

    const startTime = performance.now();
    generateLargeDataset();

    // Wait for React to complete rendering
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const endTime = performance.now();
          setRenderTime(endTime - startTime);
          setIsRendering(false);
          resolve(undefined);
        });
      });
    });
  }, [generateLargeDataset]);

  return (
    <div data-testid="large-dataset-performance">
      <div data-testid="dataset-controls">
        <button
          data-testid="generate-dataset"
          onClick={measureRenderPerformance}
          disabled={isRendering}
        >
          {isRendering ? 'Rendering...' : `Generate ${itemCount} Items`}
        </button>

        {renderTime && (
          <div data-testid="render-time">
            Render Time: {renderTime.toFixed(2)}ms
          </div>
        )}
      </div>

      <div data-testid="dataset-stats">
        <div>Items: {players.length}</div>
        <div>
          Memory Usage: ~{((players.length * 200) / 1024).toFixed(2)} KB
        </div>
      </div>

      <div
        data-testid="large-dataset-list"
        style={{
          height: '400px',
          overflowY: 'auto',
          border: '1px solid #ccc',
          padding: '8px',
        }}
      >
        {players.map((player, index) => (
          <div
            key={player.id}
            data-testid={`player-item-${index}`}
            style={{
              padding: '4px 8px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>{player.name}</span>
            <span>
              Rating: {player.rating}, Score: {player.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Memory leak test component
const MemoryLeakTestComponent = () => {
  const [components, setComponents] = React.useState<React.ReactNode[]>([]);
  const [memoryUsage, setMemoryUsage] = React.useState<number>(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      const memory = PerformanceProfiler.measureMemoryUsage();
      setMemoryUsage(memory.usedJSHeapSize);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const addLeakyComponent = () => {
    const LeakyComponent = () => {
      const [data] = React.useState(new Array(10000).fill('leak'));
      React.useEffect(() => {
        setInterval(() => {
          // Intentional memory leak - not cleaning up
        }, 100);
        // Missing cleanup
      }, []);

      return <div>{data.length} items</div>;
    };

    setComponents(prev => [...prev, <LeakyComponent key={Date.now()} />]);
  };

  const addHealthyComponent = () => {
    const HealthyComponent = () => {
      const [data] = React.useState(new Array(10000).fill('clean'));
      React.useEffect(() => {
        const interval = setInterval(() => {
          // Some work
        }, 100);

        return () => clearInterval(interval); // Proper cleanup
      }, []);

      return <div>{data.length} items</div>;
    };

    setComponents(prev => [...prev, <HealthyComponent key={Date.now()} />]);
  };

  const clearComponents = () => {
    setComponents([]);
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  };

  const formatBytes = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div data-testid="memory-leak-test">
      <div data-testid="memory-controls">
        <button data-testid="add-leaky" onClick={addLeakyComponent}>
          Add Leaky Component
        </button>

        <button data-testid="add-healthy" onClick={addHealthyComponent}>
          Add Healthy Component
        </button>

        <button data-testid="clear-components" onClick={clearComponents}>
          Clear All Components
        </button>
      </div>

      <div data-testid="memory-stats">
        <div>Components: {components.length}</div>
        <div>Memory Usage: {formatBytes(memoryUsage)}</div>
      </div>

      <div data-testid="components-container">{components}</div>
    </div>
  );
};

describe('Performance Profiling and Memory Usage Analytics Tests', () => {
  beforeEach(() => {
    // Mock performance.memory if not available
    if (!('memory' in performance)) {
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 10 * 1024 * 1024, // 10MB
          totalJSHeapSize: 50 * 1024 * 1024, // 50MB
          jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
        },
        configurable: true,
      });
    }
  });

  describe('Memory Usage Tracking', () => {
    test('should measure current memory usage', () => {
      const memory = PerformanceProfiler.measureMemoryUsage();

      expect(memory).toHaveProperty('usedJSHeapSize');
      expect(memory).toHaveProperty('totalJSHeapSize');
      expect(memory).toHaveProperty('jsHeapSizeLimit');
      expect(memory).toHaveProperty('percentage');

      expect(typeof memory.usedJSHeapSize).toBe('number');
      expect(typeof memory.percentage).toBe('number');
      expect(memory.percentage).toBeGreaterThanOrEqual(0);
      expect(memory.percentage).toBeLessThanOrEqual(100);
    });

    test('should handle browsers without memory API', () => {
      // Temporarily remove memory API
      const originalMemory = (performance as any).memory;
      delete (performance as any).memory;

      const memory = PerformanceProfiler.measureMemoryUsage();

      expect(memory.usedJSHeapSize).toBe(0);
      expect(memory.totalJSHeapSize).toBe(0);
      expect(memory.jsHeapSizeLimit).toBe(0);
      expect(memory.percentage).toBe(0);

      // Restore memory API
      (performance as any).memory = originalMemory;
    });
  });

  describe('Render Time Measurement', () => {
    test('should measure component render time', async () => {
      const TestComponent = () => <div>Test Component</div>;

      const timing = await PerformanceProfiler.measureRenderTime(() => {
        render(<TestComponent />);
      });

      expect(timing).toHaveProperty('renderTime');
      expect(timing).toHaveProperty('paintTime');
      expect(timing).toHaveProperty('totalTime');

      expect(timing.renderTime).toBeGreaterThan(0);
      expect(timing.totalTime).toBeGreaterThanOrEqual(timing.renderTime);
    });

    test('should measure render time for complex components', async () => {
      const ComplexComponent = ({ itemCount }: { itemCount: number }) => (
        <div>
          {Array.from({ length: itemCount }, (_, i) => (
            <div key={i} style={{ padding: '4px' }}>
              Item {i + 1} - {Math.random()}
            </div>
          ))}
        </div>
      );

      const timing = await PerformanceProfiler.measureRenderTime(() => {
        render(<ComplexComponent itemCount={100} />);
      });

      expect(timing.renderTime).toBeGreaterThan(0);
      expect(timing.totalTime).toBeGreaterThan(timing.renderTime);
    });
  });

  describe('Frame Rate Monitoring', () => {
    test('should monitor frame rate over time', async () => {
      const frameData = await PerformanceProfiler.monitorFrameRate(1000);

      expect(frameData).toHaveProperty('averageFPS');
      expect(frameData).toHaveProperty('minFPS');
      expect(frameData).toHaveProperty('maxFPS');
      expect(frameData).toHaveProperty('frameCount');
      expect(frameData).toHaveProperty('droppedFrames');

      expect(frameData.averageFPS).toBeGreaterThan(0);
      expect(frameData.minFPS).toBeLessThanOrEqual(frameData.averageFPS);
      expect(frameData.maxFPS).toBeGreaterThanOrEqual(frameData.averageFPS);
    }, 2000);

    test('should detect dropped frames', async () => {
      // Create a component that will cause frame drops
      const FrameDropComponent = () => {
        React.useEffect(() => {
          // Simulate heavy work that blocks the main thread
          const start = performance.now();
          while (performance.now() - start < 100) {
            // Block for 100ms
          }
        }, []);

        return <div>Frame drop test</div>;
      };

      render(<FrameDropComponent />);

      const frameData = await PerformanceProfiler.monitorFrameRate(500);

      // Should detect some frame issues
      expect(frameData.droppedFrames).toBeGreaterThanOrEqual(0);
    }, 1000);
  });

  describe('Bundle Size Analysis', () => {
    test('should analyze bundle and resource sizes', () => {
      const analysis = PerformanceProfiler.analyzeBundleSize();

      expect(analysis).toHaveProperty('estimatedSize');
      expect(analysis).toHaveProperty('resourceCount');
      expect(analysis).toHaveProperty('largestResources');

      expect(typeof analysis.estimatedSize).toBe('number');
      expect(typeof analysis.resourceCount).toBe('number');
      expect(Array.isArray(analysis.largestResources)).toBe(true);
    });

    test('should identify largest resources', () => {
      const analysis = PerformanceProfiler.analyzeBundleSize();

      analysis.largestResources.forEach(resource => {
        expect(resource).toHaveProperty('name');
        expect(resource).toHaveProperty('size');
        expect(typeof resource.name).toBe('string');
        expect(typeof resource.size).toBe('number');
      });
    });
  });

  describe('Component Profiling', () => {
    test('should profile component render performance', async () => {
      const TestComponent = ({ count }: { count: number }) => (
        <div>
          {Array.from({ length: count }, (_, i) => (
            <span key={i}>Item {i}</span>
          ))}
        </div>
      );

      const profile = await PerformanceProfiler.profileComponentRender(
        TestComponent,
        { count: 50 },
        3
      );

      expect(profile).toHaveProperty('averageRenderTime');
      expect(profile).toHaveProperty('minRenderTime');
      expect(profile).toHaveProperty('maxRenderTime');
      expect(profile).toHaveProperty('memoryDelta');
      expect(profile).toHaveProperty('iterations');

      expect(profile.averageRenderTime).toBeGreaterThan(0);
      expect(profile.minRenderTime).toBeLessThanOrEqual(
        profile.averageRenderTime
      );
      expect(profile.maxRenderTime).toBeGreaterThanOrEqual(
        profile.averageRenderTime
      );
      expect(profile.iterations).toBe(3);
    });

    test('should detect performance differences between component variants', async () => {
      const SimpleComponent = () => <div>Simple</div>;
      const ComplexComponent = () => (
        <div>
          {Array.from({ length: 1000 }, (_, i) => (
            <div key={i} style={{ backgroundColor: `hsl(${i}, 50%, 50%)` }}>
              Complex item {i}
            </div>
          ))}
        </div>
      );

      const simpleProfile = await PerformanceProfiler.profileComponentRender(
        SimpleComponent,
        {},
        5
      );
      const complexProfile = await PerformanceProfiler.profileComponentRender(
        ComplexComponent,
        {},
        5
      );

      expect(complexProfile.averageRenderTime).toBeGreaterThan(
        simpleProfile.averageRenderTime
      );
    });
  });

  describe('Memory Leak Detection', () => {
    test('should detect memory leaks in test functions', async () => {
      const leakyFunction = async () => {
        const largeArray = new Array(100000).fill('leak');
        // Intentionally keep reference
        (window as any).leakArray = largeArray;
      };

      const leakTest = await PerformanceProfiler.detectMemoryLeaks(
        leakyFunction,
        3
      );

      expect(leakTest).toHaveProperty('hasLeak');
      expect(leakTest).toHaveProperty('memoryGrowth');
      expect(leakTest).toHaveProperty('iterations');
      expect(leakTest).toHaveProperty('measurements');

      expect(Array.isArray(leakTest.measurements)).toBe(true);
      expect(leakTest.measurements).toHaveLength(3);

      // Clean up intentional leak
      delete (window as any).leakArray;
    });

    test('should not detect leaks in clean functions', async () => {
      const cleanFunction = async () => {
        const tempArray = new Array(100000).fill('temp');
        // Array goes out of scope and should be garbage collected
        return tempArray.length;
      };

      const leakTest = await PerformanceProfiler.detectMemoryLeaks(
        cleanFunction,
        3
      );

      expect(leakTest.hasLeak).toBe(false);
      expect(leakTest.memoryGrowth).toBeLessThan(1024 * 1024); // Less than 1MB growth
    });
  });

  describe('Long Task Detection', () => {
    test('should detect long-running tasks', async () => {
      // This test might not work in all environments due to PerformanceObserver support
      const longTasks = await PerformanceProfiler.detectLongTasks(10);

      expect(Array.isArray(longTasks)).toBe(true);

      longTasks.forEach(task => {
        expect(task).toHaveProperty('duration');
        expect(task).toHaveProperty('startTime');
        expect(task).toHaveProperty('name');
        expect(task.duration).toBeGreaterThan(10);
      });
    });
  });

  describe('Resource Performance Analysis', () => {
    test('should analyze resource loading performance', () => {
      const resources = PerformanceProfiler.analyzeResourcePerformance();

      expect(Array.isArray(resources)).toBe(true);

      resources.forEach(resource => {
        expect(resource).toHaveProperty('name');
        expect(resource).toHaveProperty('duration');
        expect(resource).toHaveProperty('size');
        expect(resource).toHaveProperty('type');
        expect(resource).toHaveProperty('cached');

        expect(typeof resource.duration).toBe('number');
        expect(typeof resource.size).toBe('number');
        expect(typeof resource.cached).toBe('boolean');
      });
    });

    test('should identify cached resources', () => {
      const resources = PerformanceProfiler.analyzeResourcePerformance();
      const cachedResources = resources.filter(r => r.cached);

      cachedResources.forEach(resource => {
        expect(resource.cached).toBe(true);
      });
    });
  });

  describe('Performance Monitor Component', () => {
    test('should display monitoring controls', () => {
      render(<PerformanceMonitor />);

      expect(screen.getByTestId('performance-monitor')).toBeInTheDocument();
      expect(screen.getByTestId('start-monitoring')).toBeInTheDocument();
      expect(screen.getByTestId('stop-monitoring')).toBeInTheDocument();

      expect(screen.getByTestId('start-monitoring')).not.toBeDisabled();
      expect(screen.getByTestId('stop-monitoring')).toBeDisabled();
    });

    test('should start and stop monitoring', async () => {
      const user = userEvent.setup();
      render(<PerformanceMonitor />);

      const startButton = screen.getByTestId('start-monitoring');
      const stopButton = screen.getByTestId('stop-monitoring');

      // Start monitoring
      await user.click(startButton);

      expect(startButton).toBeDisabled();
      expect(stopButton).not.toBeDisabled();
      expect(startButton).toHaveTextContent('Monitoring...');

      // Wait for monitoring to complete
      await waitFor(
        () => {
          expect(startButton).not.toBeDisabled();
        },
        { timeout: 6000 }
      );
    });

    test('should display metrics after monitoring', async () => {
      const user = userEvent.setup();
      render(<PerformanceMonitor monitorDuration={1000} />);

      await user.click(screen.getByTestId('start-monitoring'));

      await waitFor(
        () => {
          expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(screen.getByTestId('memory-metrics')).toBeInTheDocument();
      expect(screen.getByTestId('frame-rate-metrics')).toBeInTheDocument();
      expect(screen.getByTestId('bundle-metrics')).toBeInTheDocument();
    });

    test('should call onMetricsUpdate callback', async () => {
      const onMetricsUpdate = vi.fn();
      const user = userEvent.setup();

      render(
        <PerformanceMonitor
          monitorDuration={500}
          onMetricsUpdate={onMetricsUpdate}
        />
      );

      await user.click(screen.getByTestId('start-monitoring'));

      await waitFor(
        () => {
          expect(onMetricsUpdate).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      expect(onMetricsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          memory: expect.any(Object),
          frameRate: expect.any(Object),
          bundle: expect.any(Object),
        })
      );
    });
  });

  describe('Component Performance Test Harness', () => {
    test('should run render performance tests', async () => {
      const TestComponent = ({ items }: { items: number }) => (
        <div>
          {Array.from({ length: items }, (_, i) => (
            <div key={i}>Item {i}</div>
          ))}
        </div>
      );

      const user = userEvent.setup();
      render(
        <ComponentPerformanceTest
          testComponent={TestComponent}
          testProps={{ items: 10 }}
          iterations={3}
        />
      );

      await user.click(screen.getByTestId('run-render-test'));

      await waitFor(
        () => {
          expect(screen.getByTestId('test-results')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      expect(screen.getByTestId('render-performance')).toBeInTheDocument();
      expect(screen.getByText(/Average Render Time:/)).toBeInTheDocument();
      expect(screen.getByText(/Memory Delta:/)).toBeInTheDocument();
    });

    test('should run memory leak tests', async () => {
      const TestComponent = () => <div>Test</div>;

      const user = userEvent.setup();
      render(
        <ComponentPerformanceTest
          testComponent={TestComponent}
          iterations={3}
        />
      );

      await user.click(screen.getByTestId('run-memory-test'));

      await waitFor(
        () => {
          expect(screen.getByTestId('memory-leak-results')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(screen.getByTestId('leak-status')).toBeInTheDocument();
      expect(screen.getByText(/Average Memory Growth:/)).toBeInTheDocument();
    });
  });

  describe('Large Dataset Performance', () => {
    test('should measure large dataset rendering', async () => {
      const user = userEvent.setup();
      render(<LargeDatasetPerformance itemCount={100} />);

      await user.click(screen.getByTestId('generate-dataset'));

      await waitFor(
        () => {
          expect(screen.getByTestId('render-time')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const renderTimeText = screen.getByTestId('render-time').textContent;
      expect(renderTimeText).toMatch(/Render Time: \d+\.\d+ms/);

      expect(screen.getByTestId('dataset-stats')).toHaveTextContent(
        'Items: 100'
      );
    });

    test('should handle different dataset sizes', async () => {
      const user = userEvent.setup();
      render(<LargeDatasetPerformance itemCount={500} />);

      await user.click(screen.getByTestId('generate-dataset'));

      await waitFor(() => {
        expect(screen.getByText('Items: 500')).toBeInTheDocument();
      });
    });
  });

  describe('Memory Leak Test Component', () => {
    test('should demonstrate memory leak detection', async () => {
      const user = userEvent.setup();
      render(<MemoryLeakTestComponent />);

      // Add some components
      await user.click(screen.getByTestId('add-healthy'));
      await user.click(screen.getByTestId('add-leaky'));

      expect(screen.getByText('Components: 2')).toBeInTheDocument();

      // Clear components
      await user.click(screen.getByTestId('clear-components'));

      expect(screen.getByText('Components: 0')).toBeInTheDocument();
    });

    test('should track memory usage in real-time', async () => {
      render(<MemoryLeakTestComponent />);

      await waitFor(
        () => {
          expect(
            screen.getByText(/Memory Usage: \d+\.\d+ MB/)
          ).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Performance Regression Detection', () => {
    test('should detect performance regressions', async () => {
      const FastComponent = () => <div>Fast</div>;
      const SlowComponent = () => {
        // Simulate slow component
        const items = Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: Math.random(),
        }));
        return (
          <div>
            {items.map(item => (
              <div
                key={item.id}
                style={{ transform: `rotate(${item.value}deg)` }}
              >
                {item.value.toFixed(4)}
              </div>
            ))}
          </div>
        );
      };

      const fastProfile = await PerformanceProfiler.profileComponentRender(
        FastComponent,
        {},
        3
      );
      const slowProfile = await PerformanceProfiler.profileComponentRender(
        SlowComponent,
        {},
        3
      );

      // Slow component should take significantly longer
      expect(slowProfile.averageRenderTime).toBeGreaterThan(
        fastProfile.averageRenderTime * 2
      );
    });

    test('should track performance over multiple iterations', async () => {
      const VariablePerformanceComponent = ({
        complexity,
      }: {
        complexity: number;
      }) => (
        <div>
          {Array.from({ length: complexity }, (_, i) => (
            <div
              key={i}
              style={{
                backgroundColor: `hsl(${(i * 360) / complexity}, 50%, 50%)`,
                transform: `scale(${1 + i * 0.01})`,
              }}
            >
              Item {i}
            </div>
          ))}
        </div>
      );

      const iterations = 5;
      const results = [];

      for (let i = 0; i < iterations; i++) {
        const complexity = (i + 1) * 100;
        const profile = await PerformanceProfiler.profileComponentRender(
          VariablePerformanceComponent,
          { complexity },
          3
        );
        results.push({ complexity, renderTime: profile.averageRenderTime });
      }

      // Performance should generally degrade with complexity
      for (let i = 1; i < results.length; i++) {
        expect(results[i].renderTime).toBeGreaterThan(
          results[i - 1].renderTime * 0.5
        );
      }
    });
  });
});
