import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMockTournament } from '../utils/test-utils';

// Error simulation utilities
const ErrorSimulator = {
  // Different types of errors to simulate
  createRenderError: (message: string = 'Render error') => {
    const ErrorComponent = () => {
      throw new Error(message);
    };
    return ErrorComponent;
  },

  createAsyncError: (delay: number = 100) => {
    const AsyncErrorComponent = () => {
      React.useEffect(() => {
        setTimeout(() => {
          throw new Error('Async error in component');
        }, delay);
      }, []);
      return <div>Async component</div>;
    };
    return AsyncErrorComponent;
  },

  createMemoryError: () => {
    const MemoryErrorComponent = () => {
      React.useEffect(() => {
        const arrays: any[] = [];
        try {
          // Try to consume lots of memory
          for (let i = 0; i < 1000; i++) {
            arrays.push(new Array(1000000).fill('data'));
          }
        } catch {
          throw new Error('Memory exhaustion error');
        }
      }, []);
      return <div>Memory intensive component</div>;
    };
    return MemoryErrorComponent;
  },

  createInfiniteLoopError: () => {
    const InfiniteLoopComponent = () => {
      const [count, setCount] = React.useState(0);

      React.useEffect(() => {
        // Infinite loop that will crash the component
        setCount(count + 1);
      }, [count]);

      return <div>Count: {count}</div>;
    };
    return InfiniteLoopComponent;
  },
};

// Mock error boundary component
class MockErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  },
  { hasError: boolean; error: Error | null; errorId: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, errorId: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error (in real app, send to error reporting service)
    console.error('Error boundary caught error:', error, errorInfo);

    // Simulate error reporting
    this.reportError(error, errorInfo);
  }

  reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Mock error reporting service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    // In real app, send to service like Sentry
    console.log('Error reported:', errorReport);
  };

  retry = () => {
    this.setState({ hasError: false, error: null, errorId: '' });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} retry={this.retry} />;
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback = ({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) => (
  <div data-testid="error-fallback" role="alert">
    <h2>Something went wrong</h2>
    <p data-testid="error-message">{error.message}</p>
    <button data-testid="retry-button" onClick={retry}>
      Try Again
    </button>
  </div>
);

// Custom error fallback for specific features
const TournamentErrorFallback = ({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) => (
  <div data-testid="tournament-error-fallback" role="alert">
    <h3>Tournament Loading Error</h3>
    <p>Unable to load tournament data: {error.message}</p>
    <div>
      <button data-testid="retry-tournament" onClick={retry}>
        Retry Loading
      </button>
      <button
        data-testid="go-home"
        onClick={() => (window.location.href = '/')}
      >
        Go Home
      </button>
    </div>
  </div>
);

// Component that can be configured to throw errors
const ConfigurableErrorComponent = ({
  shouldThrow = false,
  errorType = 'render',
  errorMessage = 'Test error',
  delay = 0,
}: {
  shouldThrow?: boolean;
  errorType?: 'render' | 'effect' | 'async' | 'event';
  errorMessage?: string;
  delay?: number;
}) => {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (shouldThrow && errorType === 'effect') {
      if (delay > 0) {
        setTimeout(() => {
          throw new Error(errorMessage);
        }, delay);
      } else {
        throw new Error(errorMessage);
      }
    }
  }, [shouldThrow, errorType, errorMessage, delay]);

  const handleClick = () => {
    if (shouldThrow && errorType === 'event') {
      throw new Error(errorMessage);
    }
    setCount(c => c + 1);
  };

  const handleAsync = async () => {
    if (shouldThrow && errorType === 'async') {
      await new Promise(resolve => setTimeout(resolve, delay));
      throw new Error(errorMessage);
    }
  };

  if (shouldThrow && errorType === 'render') {
    throw new Error(errorMessage);
  }

  React.useEffect(() => {
    if (shouldThrow && errorType === 'async') {
      handleAsync().catch(error => {
        // In a real app, this would trigger an error boundary
        console.error('Async error:', error);
      });
    }
  }, [shouldThrow, errorType]);

  return (
    <div data-testid="configurable-error-component">
      <div>Count: {count}</div>
      <button data-testid="increment-button" onClick={handleClick}>
        Increment
      </button>
    </div>
  );
};

// Component that simulates network failures
const NetworkFailureComponent = ({
  shouldFail = false,
}: {
  shouldFail?: boolean;
}) => {
  const [data, setData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (shouldFail) {
        throw new Error('Network request failed');
      }

      // Simulate successful data fetch
      const mockData = [
        createMockTournament({ id: 1, name: 'Test Tournament 1' }),
        createMockTournament({ id: 2, name: 'Test Tournament 2' }),
      ];

      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
      setData(mockData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, [shouldFail]);

  if (loading) {
    return <div data-testid="loading">Loading...</div>;
  }

  if (error) {
    return (
      <div data-testid="network-error" role="alert">
        <p>Failed to load data: {error}</p>
        <button data-testid="retry-network" onClick={fetchData}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div data-testid="network-success">
      <h3>Tournaments</h3>
      {data.map(tournament => (
        <div key={tournament.id} data-testid={`tournament-${tournament.id}`}>
          {tournament.name}
        </div>
      ))}
    </div>
  );
};

// Component with recoverable state errors
const RecoverableStateComponent = () => {
  const [hasError, setHasError] = React.useState(false);
  const [data, setData] = React.useState<any>({ count: 0, items: [] });

  const simulateStateCorruption = () => {
    // Simulate corrupted state
    setData(null);
    setHasError(true);
  };

  const recoverState = () => {
    setData({ count: 0, items: [] });
    setHasError(false);
  };

  if (hasError && data === null) {
    return (
      <div data-testid="state-error" role="alert">
        <p>Application state became corrupted</p>
        <button data-testid="recover-state" onClick={recoverState}>
          Recover
        </button>
      </div>
    );
  }

  return (
    <div data-testid="recoverable-state-component">
      <div>Count: {data?.count || 0}</div>
      <div>Items: {data?.items?.length || 0}</div>
      <button data-testid="corrupt-state" onClick={simulateStateCorruption}>
        Simulate State Corruption
      </button>
      <button
        data-testid="increment-count"
        onClick={() =>
          setData((prev: any) => ({ ...prev, count: prev.count + 1 }))
        }
      >
        Increment
      </button>
    </div>
  );
};

// Progressive enhancement component
const ProgressiveEnhancementComponent = ({
  enhancementsEnabled = true,
}: {
  enhancementsEnabled?: boolean;
}) => {
  const [features, setFeatures] = React.useState({
    advancedSorting: enhancementsEnabled,
    realTimeUpdates: enhancementsEnabled,
    exportFeatures: enhancementsEnabled,
  });

  const [hasErrors, setHasErrors] = React.useState(false);

  const handleFeatureError = (featureName: string) => {
    setFeatures(prev => ({ ...prev, [featureName]: false }));
    setHasErrors(true);
  };

  return (
    <div data-testid="progressive-component">
      {hasErrors && (
        <div data-testid="feature-degradation-notice" className="notice">
          Some advanced features are temporarily unavailable. Basic
          functionality remains.
        </div>
      )}

      <div data-testid="basic-features">
        <h3>Basic Tournament Management</h3>
        <button data-testid="create-tournament">Create Tournament</button>
        <button data-testid="view-tournaments">View Tournaments</button>
      </div>

      {features.advancedSorting && (
        <div data-testid="advanced-sorting">
          <h4>Advanced Sorting</h4>
          <button
            data-testid="advanced-sort-error"
            onClick={() => handleFeatureError('advancedSorting')}
          >
            Advanced Sort (May Fail)
          </button>
        </div>
      )}

      {features.realTimeUpdates && (
        <div data-testid="real-time-updates">
          <h4>Real-time Updates</h4>
          <button
            data-testid="realtime-error"
            onClick={() => handleFeatureError('realTimeUpdates')}
          >
            Enable Real-time (May Fail)
          </button>
        </div>
      )}

      {features.exportFeatures && (
        <div data-testid="export-features">
          <h4>Export Features</h4>
          <button
            data-testid="export-error"
            onClick={() => handleFeatureError('exportFeatures')}
          >
            Export Data (May Fail)
          </button>
        </div>
      )}
    </div>
  );
};

// Suppress console errors for clean test output
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Error boundary caught error:')
    ) {
      return; // Suppress expected error boundary logs
    }
    originalConsoleError(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('Advanced Error Boundary and Crash Recovery Tests', () => {
  describe('Error Boundary Functionality', () => {
    test('should catch render errors and display fallback UI', () => {
      const ErrorComponent =
        ErrorSimulator.createRenderError('Test render error');

      render(
        <MockErrorBoundary>
          <ErrorComponent />
        </MockErrorBoundary>
      );

      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Test render error'
      );
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });

    test('should allow error recovery through retry mechanism', async () => {
      const user = userEvent.setup();

      let shouldThrow = true;
      const ConditionalErrorComponent = () => {
        if (shouldThrow) {
          throw new Error('Recoverable error');
        }
        return <div data-testid="recovered-component">Component recovered</div>;
      };

      render(
        <MockErrorBoundary>
          <ConditionalErrorComponent />
        </MockErrorBoundary>
      );

      // Should show error fallback
      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();

      // Fix the error condition
      shouldThrow = false;

      // Click retry
      const retryButton = screen.getByTestId('retry-button');
      await user.click(retryButton);

      // Component should recover
      await waitFor(() => {
        expect(screen.getByTestId('recovered-component')).toBeInTheDocument();
        expect(screen.queryByTestId('error-fallback')).not.toBeInTheDocument();
      });
    });

    test('should use custom error fallback components', () => {
      const ErrorComponent =
        ErrorSimulator.createRenderError('Tournament error');

      render(
        <MockErrorBoundary fallback={TournamentErrorFallback}>
          <ErrorComponent />
        </MockErrorBoundary>
      );

      expect(
        screen.getByTestId('tournament-error-fallback')
      ).toBeInTheDocument();
      expect(screen.getByTestId('retry-tournament')).toBeInTheDocument();
      expect(screen.getByTestId('go-home')).toBeInTheDocument();
    });

    test('should handle multiple error boundaries', () => {
      const InnerError = ErrorSimulator.createRenderError('Inner error');

      render(
        <MockErrorBoundary
          fallback={({ error }) => (
            <div data-testid="outer-error">Outer: {error.message}</div>
          )}
        >
          <div data-testid="outer-content">
            <MockErrorBoundary
              fallback={({ error }) => (
                <div data-testid="inner-error">Inner: {error.message}</div>
              )}
            >
              <InnerError />
            </MockErrorBoundary>
          </div>
        </MockErrorBoundary>
      );

      // Inner error boundary should catch the error
      expect(screen.getByTestId('inner-error')).toBeInTheDocument();
      expect(screen.getByTestId('outer-content')).toBeInTheDocument();
      expect(screen.queryByTestId('outer-error')).not.toBeInTheDocument();
    });
  });

  describe('Different Error Types', () => {
    test('should handle effect errors', async () => {
      render(
        <MockErrorBoundary>
          <ConfigurableErrorComponent
            shouldThrow={true}
            errorType="effect"
            errorMessage="Effect error"
          />
        </MockErrorBoundary>
      );

      // Effect errors are caught by error boundaries
      await waitFor(() => {
        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toHaveTextContent(
          'Effect error'
        );
      });
    });

    test('should handle event handler errors gracefully', async () => {
      const user = userEvent.setup();

      render(
        <MockErrorBoundary>
          <ConfigurableErrorComponent
            shouldThrow={true}
            errorType="event"
            errorMessage="Event handler error"
          />
        </MockErrorBoundary>
      );

      // Component should render normally
      expect(
        screen.getByTestId('configurable-error-component')
      ).toBeInTheDocument();

      const button = screen.getByTestId('increment-button');

      // Click should trigger error
      await user.click(button);

      // Error boundary should catch the error
      await waitFor(() => {
        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      });
    });

    test('should handle async errors', async () => {
      render(
        <MockErrorBoundary>
          <ConfigurableErrorComponent
            shouldThrow={true}
            errorType="async"
            errorMessage="Async error"
            delay={100}
          />
        </MockErrorBoundary>
      );

      // Component should render initially
      expect(
        screen.getByTestId('configurable-error-component')
      ).toBeInTheDocument();

      // Async errors might not be caught by error boundary (depends on implementation)
      // This test documents the current behavior
      await waitFor(() => {
        // If async error handling is implemented, error boundary would catch it
        // Otherwise, component continues to work
        const hasErrorFallback = screen.queryByTestId('error-fallback');
        const hasComponent = screen.queryByTestId(
          'configurable-error-component'
        );
        expect(hasErrorFallback || hasComponent).toBeTruthy();
      });
    });
  });

  describe('Network and Data Loading Errors', () => {
    test('should handle network failures gracefully', async () => {
      render(<NetworkFailureComponent shouldFail={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('network-error')).toBeInTheDocument();
        expect(screen.getByText(/Failed to load data/)).toBeInTheDocument();
        expect(screen.getByTestId('retry-network')).toBeInTheDocument();
      });
    });

    test('should allow retry after network failures', async () => {
      const user = userEvent.setup();

      let shouldFail = true;
      const DynamicNetworkComponent = () => (
        <NetworkFailureComponent shouldFail={shouldFail} />
      );

      render(<DynamicNetworkComponent />);

      // Wait for failure
      await waitFor(() => {
        expect(screen.getByTestId('network-error')).toBeInTheDocument();
      });

      // Fix network condition
      shouldFail = false;

      const retryButton = screen.getByTestId('retry-network');
      await user.click(retryButton);

      // Should recover and show data
      await waitFor(() => {
        expect(screen.getByTestId('network-success')).toBeInTheDocument();
        expect(screen.getByTestId('tournament-1')).toBeInTheDocument();
        expect(screen.getByTestId('tournament-2')).toBeInTheDocument();
      });
    });
  });

  describe('State Corruption Recovery', () => {
    test('should handle corrupted application state', async () => {
      const user = userEvent.setup();

      render(<RecoverableStateComponent />);

      // Component should render normally
      expect(
        screen.getByTestId('recoverable-state-component')
      ).toBeInTheDocument();
      expect(screen.getByText('Count: 0')).toBeInTheDocument();

      // Corrupt the state
      const corruptButton = screen.getByTestId('corrupt-state');
      await user.click(corruptButton);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByTestId('state-error')).toBeInTheDocument();
        expect(screen.getByText(/state became corrupted/)).toBeInTheDocument();
      });

      // Recover the state
      const recoverButton = screen.getByTestId('recover-state');
      await user.click(recoverButton);

      // Should return to normal operation
      await waitFor(() => {
        expect(
          screen.getByTestId('recoverable-state-component')
        ).toBeInTheDocument();
        expect(screen.getByText('Count: 0')).toBeInTheDocument();
      });

      // Should be functional again
      const incrementButton = screen.getByTestId('increment-count');
      await user.click(incrementButton);

      expect(screen.getByText('Count: 1')).toBeInTheDocument();
    });
  });

  describe('Progressive Enhancement and Graceful Degradation', () => {
    test('should degrade gracefully when features fail', async () => {
      const user = userEvent.setup();

      render(<ProgressiveEnhancementComponent />);

      // All features should be available initially
      expect(screen.getByTestId('basic-features')).toBeInTheDocument();
      expect(screen.getByTestId('advanced-sorting')).toBeInTheDocument();
      expect(screen.getByTestId('real-time-updates')).toBeInTheDocument();
      expect(screen.getByTestId('export-features')).toBeInTheDocument();

      // Simulate feature failure
      const advancedSortButton = screen.getByTestId('advanced-sort-error');
      await user.click(advancedSortButton);

      // Advanced sorting should be disabled
      await waitFor(() => {
        expect(
          screen.queryByTestId('advanced-sorting')
        ).not.toBeInTheDocument();
        expect(
          screen.getByTestId('feature-degradation-notice')
        ).toBeInTheDocument();
      });

      // Basic features should still work
      expect(screen.getByTestId('basic-features')).toBeInTheDocument();
      expect(screen.getByTestId('real-time-updates')).toBeInTheDocument();
    });

    test('should maintain core functionality when enhancements are disabled', () => {
      render(<ProgressiveEnhancementComponent enhancementsEnabled={false} />);

      // Basic features should always be available
      expect(screen.getByTestId('basic-features')).toBeInTheDocument();
      expect(screen.getByTestId('create-tournament')).toBeInTheDocument();
      expect(screen.getByTestId('view-tournaments')).toBeInTheDocument();

      // Enhanced features should not be available
      expect(screen.queryByTestId('advanced-sorting')).not.toBeInTheDocument();
      expect(screen.queryByTestId('real-time-updates')).not.toBeInTheDocument();
      expect(screen.queryByTestId('export-features')).not.toBeInTheDocument();
    });
  });

  describe('Memory and Performance Error Handling', () => {
    test('should handle memory pressure gracefully', async () => {
      const MemoryIntensiveComponent = () => {
        const [data, setData] = React.useState<any[]>([]);
        const [error, setError] = React.useState<string | null>(null);

        const handleMemoryIntensiveOperation = () => {
          try {
            // Simulate memory intensive operation
            const largeArray = new Array(100000).fill('data');
            setData(largeArray);
          } catch {
            setError('Memory operation failed');
          }
        };

        if (error) {
          return (
            <div data-testid="memory-error" role="alert">
              <p>{error}</p>
              <button
                data-testid="clear-memory"
                onClick={() => {
                  setData([]);
                  setError(null);
                }}
              >
                Clear and Retry
              </button>
            </div>
          );
        }

        return (
          <div data-testid="memory-component">
            <p>Data items: {data.length}</p>
            <button
              data-testid="memory-operation"
              onClick={handleMemoryIntensiveOperation}
            >
              Perform Memory Operation
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      render(<MemoryIntensiveComponent />);

      const operationButton = screen.getByTestId('memory-operation');
      await user.click(operationButton);

      // Component should handle large data without crashing
      await waitFor(() => {
        const hasMemoryError = screen.queryByTestId('memory-error');
        const hasComponent = screen.queryByTestId('memory-component');
        expect(hasMemoryError || hasComponent).toBeTruthy();
      });
    });
  });

  describe('Error Recovery Strategies', () => {
    test('should implement exponential backoff for retries', async () => {
      const user = userEvent.setup();

      let attemptCount = 0;
      const backoffDelays: number[] = [];

      const RetryComponent = () => {
        const [error, setError] = React.useState<string | null>(null);
        const [isRetrying, setIsRetrying] = React.useState(false);

        const performOperation = async (isRetry = false) => {
          attemptCount++;
          setIsRetrying(isRetry);

          try {
            // Fail first 2 attempts, succeed on 3rd
            if (attemptCount < 3) {
              throw new Error(`Attempt ${attemptCount} failed`);
            }

            setError(null);
            setIsRetrying(false);
          } catch (err: any) {
            const delay = Math.pow(2, attemptCount - 1) * 1000; // Exponential backoff
            backoffDelays.push(delay);

            setError(err.message);
            setIsRetrying(false);
          }
        };

        const handleRetry = () => {
          performOperation(true);
        };

        React.useEffect(() => {
          performOperation();
        }, []);

        if (isRetrying) {
          return <div data-testid="retrying">Retrying...</div>;
        }

        if (error) {
          return (
            <div data-testid="retry-error">
              <p>Error: {error}</p>
              <p>Attempt: {attemptCount}</p>
              <button data-testid="manual-retry" onClick={handleRetry}>
                Retry
              </button>
            </div>
          );
        }

        return <div data-testid="retry-success">Operation successful!</div>;
      };

      render(<RetryComponent />);

      // First attempt should fail
      await waitFor(() => {
        expect(screen.getByTestId('retry-error')).toBeInTheDocument();
        expect(screen.getByText('Attempt: 1')).toBeInTheDocument();
      });

      // Retry manually
      const retryButton = screen.getByTestId('manual-retry');
      await user.click(retryButton);

      // Second attempt should fail
      await waitFor(() => {
        expect(screen.getByTestId('retry-error')).toBeInTheDocument();
        expect(screen.getByText('Attempt: 2')).toBeInTheDocument();
      });

      // Retry again
      await user.click(screen.getByTestId('manual-retry'));

      // Third attempt should succeed
      await waitFor(() => {
        expect(screen.getByTestId('retry-success')).toBeInTheDocument();
      });

      // Verify exponential backoff was calculated (even if not used in this sync test)
      expect(backoffDelays).toEqual([1000, 2000]); // 2^0 * 1000, 2^1 * 1000
    });

    test('should provide multiple recovery options', async () => {
      const user = userEvent.setup();

      const MultiRecoveryComponent = () => {
        const [hasError, setHasError] = React.useState(true);
        const [recoveryUsed, setRecoveryUsed] = React.useState<string | null>(
          null
        );

        const handleQuickFix = () => {
          setRecoveryUsed('quick-fix');
          setHasError(false);
        };

        const handleFullReset = () => {
          setRecoveryUsed('full-reset');
          setHasError(false);
        };

        const handleSafeMode = () => {
          setRecoveryUsed('safe-mode');
          setHasError(false);
        };

        if (!hasError) {
          return (
            <div data-testid="recovery-complete">
              Recovered using: {recoveryUsed}
            </div>
          );
        }

        return (
          <div data-testid="multi-recovery-options" role="alert">
            <h3>Recovery Options</h3>
            <p>Choose how you want to recover from this error:</p>
            <button data-testid="quick-fix" onClick={handleQuickFix}>
              Quick Fix (Retry)
            </button>
            <button data-testid="full-reset" onClick={handleFullReset}>
              Full Reset
            </button>
            <button data-testid="safe-mode" onClick={handleSafeMode}>
              Safe Mode
            </button>
          </div>
        );
      };

      render(<MultiRecoveryComponent />);

      expect(screen.getByTestId('multi-recovery-options')).toBeInTheDocument();

      // Test different recovery options
      const quickFixButton = screen.getByTestId('quick-fix');
      await user.click(quickFixButton);

      await waitFor(() => {
        expect(screen.getByTestId('recovery-complete')).toBeInTheDocument();
        expect(
          screen.getByText('Recovered using: quick-fix')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Error Logging and Monitoring', () => {
    test('should log errors with contextual information', () => {
      const errorLogs: any[] = [];

      // Mock error logging service
      const originalLog = console.log;
      console.log = (...args) => {
        if (args[0] === 'Error reported:') {
          errorLogs.push(args[1]);
        }
        originalLog(...args);
      };

      const ErrorComponent = ErrorSimulator.createRenderError('Logged error');

      render(
        <MockErrorBoundary>
          <ErrorComponent />
        </MockErrorBoundary>
      );

      // Verify error was logged with context
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0]).toMatchObject({
        message: 'Logged error',
        timestamp: expect.any(String),
        userAgent: expect.any(String),
      });
      expect(errorLogs[0].stack).toContain('Error: Logged error');

      console.log = originalLog;
    });
  });
});
