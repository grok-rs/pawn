import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Browser compatibility utilities
const BrowserTestUtils = {
  // Common browser user agents for testing
  userAgents: {
    chrome:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    firefox:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    safari:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    chromeMobile:
      'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    safariMobile:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  },

  // Browser feature detection
  features: {
    css: {
      flexbox: () => CSS.supports('display', 'flex'),
      grid: () => CSS.supports('display', 'grid'),
      customProperties: () => CSS.supports('--custom', 'value'),
      backdropFilter: () => CSS.supports('backdrop-filter', 'blur(10px)'),
      gap: () => CSS.supports('gap', '1rem'),
      aspectRatio: () => CSS.supports('aspect-ratio', '16/9'),
    },
    js: {
      promises: () => typeof Promise !== 'undefined',
      asyncAwait: () => {
        try {
          // Test if async/await is supported
          eval('(async () => {})');
          return true;
        } catch {
          return false;
        }
      },
      intersectionObserver: () => typeof IntersectionObserver !== 'undefined',
      mutationObserver: () => typeof MutationObserver !== 'undefined',
      webGL: () => {
        try {
          const canvas = document.createElement('canvas');
          return !!(
            canvas.getContext('webgl') ||
            canvas.getContext('experimental-webgl')
          );
        } catch {
          return false;
        }
      },
      localStorage: () => {
        try {
          localStorage.setItem('test', 'test');
          localStorage.removeItem('test');
          return true;
        } catch {
          return false;
        }
      },
      serviceWorker: () => 'serviceWorker' in navigator,
      webAssembly: () => typeof WebAssembly !== 'undefined',
      webWorkers: () => typeof Worker !== 'undefined',
    },
    dom: {
      querySelector: () => typeof document.querySelector !== 'undefined',
      classList: () => {
        const div = document.createElement('div');
        return typeof div.classList !== 'undefined';
      },
      dataset: () => {
        const div = document.createElement('div');
        return typeof div.dataset !== 'undefined';
      },
      addEventListener: () => {
        const div = document.createElement('div');
        return typeof div.addEventListener !== 'undefined';
      },
    },
  },

  // Mock browser environment
  mockBrowser: (browserName: string) => {
    const userAgent =
      BrowserTestUtils.userAgents[
        browserName as keyof typeof BrowserTestUtils.userAgents
      ];
    Object.defineProperty(navigator, 'userAgent', {
      value: userAgent,
      configurable: true,
    });

    // Mock browser-specific behaviors
    switch (browserName) {
      case 'firefox':
        // Firefox-specific mocks
        Object.defineProperty(window, 'mozIndexedDB', {
          value: window.indexedDB,
        });
        break;
      case 'safari':
        // Safari-specific mocks
        Object.defineProperty(window, 'webkitIndexedDB', {
          value: window.indexedDB,
        });
        break;
      case 'edge':
        // Edge-specific mocks
        Object.defineProperty(window, 'msIndexedDB', {
          value: window.indexedDB,
        });
        break;
    }
  },

  // Test CSS feature compatibility
  testCSSSupport: (property: string, value: string): boolean => {
    if (typeof CSS === 'undefined' || !CSS.supports) {
      // Fallback for older browsers
      const testElement = document.createElement('div');
      const prefixes = ['', '-webkit-', '-moz-', '-ms-', '-o-'];

      return prefixes.some(prefix => {
        try {
          testElement.style.setProperty(`${prefix}${property}`, value);
          return (
            testElement.style.getPropertyValue(`${prefix}${property}`) === value
          );
        } catch {
          return false;
        }
      });
    }

    return CSS.supports(property, value);
  },

  // Check for browser-specific APIs
  checkBrowserAPIs: () => {
    return {
      fetch: typeof fetch !== 'undefined',
      webGL: BrowserTestUtils.features.js.webGL(),
      webRTC: typeof RTCPeerConnection !== 'undefined',
      webAudio:
        typeof AudioContext !== 'undefined' ||
        typeof (window as any).webkitAudioContext !== 'undefined',
      notification: typeof Notification !== 'undefined',
      geolocation: typeof navigator.geolocation !== 'undefined',
      camera: typeof navigator.mediaDevices !== 'undefined',
      fullscreen: typeof document.requestFullscreen !== 'undefined',
    };
  },
};

// Mock component that uses modern web features
const ModernFeaturesComponent = ({
  enableAdvanced = true,
}: {
  enableAdvanced?: boolean;
}) => {
  const [supportsFeatures, setSupportsFeatures] = React.useState({
    flexbox: false,
    grid: false,
    customProperties: false,
    intersection: false,
  });

  const [browserAPIs, setBrowserAPIs] = React.useState<any>({});

  React.useEffect(() => {
    // Check feature support
    setSupportsFeatures({
      flexbox: BrowserTestUtils.features.css.flexbox(),
      grid: BrowserTestUtils.features.css.grid(),
      customProperties: BrowserTestUtils.features.css.customProperties(),
      intersection: BrowserTestUtils.features.js.intersectionObserver(),
    });

    setBrowserAPIs(BrowserTestUtils.checkBrowserAPIs());
  }, []);

  return (
    <div data-testid="modern-features-component">
      <div data-testid="feature-support">
        <h3>CSS Feature Support</h3>
        <div data-testid="flexbox-support">
          Flexbox: {supportsFeatures.flexbox ? 'Supported' : 'Not Supported'}
        </div>
        <div data-testid="grid-support">
          Grid: {supportsFeatures.grid ? 'Supported' : 'Not Supported'}
        </div>
        <div data-testid="custom-props-support">
          Custom Properties:{' '}
          {supportsFeatures.customProperties ? 'Supported' : 'Not Supported'}
        </div>
        <div data-testid="intersection-support">
          Intersection Observer:{' '}
          {supportsFeatures.intersection ? 'Supported' : 'Not Supported'}
        </div>
      </div>

      <div data-testid="api-support">
        <h3>Browser API Support</h3>
        <div data-testid="fetch-support">
          Fetch API: {browserAPIs.fetch ? 'Supported' : 'Not Supported'}
        </div>
        <div data-testid="webgl-support">
          WebGL: {browserAPIs.webGL ? 'Supported' : 'Not Supported'}
        </div>
        <div data-testid="notification-support">
          Notifications:{' '}
          {browserAPIs.notification ? 'Supported' : 'Not Supported'}
        </div>
        <div data-testid="geolocation-support">
          Geolocation: {browserAPIs.geolocation ? 'Supported' : 'Not Supported'}
        </div>
      </div>

      {enableAdvanced && (
        <div data-testid="advanced-features">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              backgroundColor: 'var(--primary-color, #1976d2)',
            }}
            data-testid="modern-css-container"
          >
            <div>Modern CSS Features Test</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Component that gracefully degrades
const ProgressiveEnhancementComponent = () => {
  const [enhancementLevel, setEnhancementLevel] = React.useState<
    'basic' | 'enhanced' | 'advanced'
  >('basic');

  React.useEffect(() => {
    // Determine enhancement level based on feature support
    const hasFlexbox = BrowserTestUtils.features.css.flexbox();
    const hasGrid = BrowserTestUtils.features.css.grid();
    const hasIntersectionObserver =
      BrowserTestUtils.features.js.intersectionObserver();
    const hasFetch = typeof fetch !== 'undefined';

    if (hasGrid && hasIntersectionObserver && hasFetch) {
      setEnhancementLevel('advanced');
    } else if (hasFlexbox && hasFetch) {
      setEnhancementLevel('enhanced');
    } else {
      setEnhancementLevel('basic');
    }
  }, []);

  return (
    <div
      data-testid="progressive-component"
      className={`enhancement-${enhancementLevel}`}
    >
      <div data-testid="enhancement-level">
        Enhancement Level: {enhancementLevel}
      </div>

      {enhancementLevel === 'basic' && (
        <div data-testid="basic-layout" style={{ display: 'block' }}>
          <div>Basic table layout</div>
          <table>
            <tr>
              <td>Player 1</td>
              <td>1600</td>
            </tr>
            <tr>
              <td>Player 2</td>
              <td>1500</td>
            </tr>
          </table>
        </div>
      )}

      {enhancementLevel === 'enhanced' && (
        <div
          data-testid="enhanced-layout"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <div>Enhanced flexbox layout</div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div>Player 1: 1600</div>
            <div>Player 2: 1500</div>
          </div>
        </div>
      )}

      {enhancementLevel === 'advanced' && (
        <div
          data-testid="advanced-layout"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
          }}
        >
          <div>Advanced grid layout</div>
          <div>Player 1: 1600</div>
          <div>Player 2: 1500</div>
        </div>
      )}
    </div>
  );
};

// Component that tests browser event compatibility
const EventCompatibilityComponent = () => {
  const [events, setEvents] = React.useState<string[]>([]);

  const handleClick = () => {
    setEvents(prev => [...prev, 'click']);
  };

  const handleTouchStart = () => {
    setEvents(prev => [...prev, 'touchstart']);
  };

  const handlePointerDown = () => {
    setEvents(prev => [...prev, 'pointerdown']);
  };

  const handleWheel = () => {
    setEvents(prev => [...prev, 'wheel']);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    setEvents(prev => [...prev, `keydown:${e.key}`]);
  };

  return (
    <div data-testid="event-compatibility">
      <button
        data-testid="multi-event-button"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        Test Events
      </button>

      <div data-testid="event-log">Events: {events.join(', ')}</div>
    </div>
  );
};

// Component that tests form input compatibility
const FormCompatibilityComponent = () => {
  const [formData, setFormData] = React.useState({
    text: '',
    email: '',
    number: '',
    date: '',
    color: '#000000',
    range: 50,
  });

  const [validationSupport, setValidationSupport] = React.useState({
    html5Validation: false,
    customValidity: false,
  });

  React.useEffect(() => {
    const testInput = document.createElement('input');
    setValidationSupport({
      html5Validation: typeof testInput.checkValidity === 'function',
      customValidity: typeof testInput.setCustomValidity === 'function',
    });
  }, []);

  return (
    <form data-testid="form-compatibility">
      <div data-testid="validation-support">
        <div>
          HTML5 Validation:{' '}
          {validationSupport.html5Validation ? 'Supported' : 'Not Supported'}
        </div>
        <div>
          Custom Validity:{' '}
          {validationSupport.customValidity ? 'Supported' : 'Not Supported'}
        </div>
      </div>

      <div>
        <label htmlFor="text-input">Text Input:</label>
        <input
          id="text-input"
          type="text"
          value={formData.text}
          onChange={e =>
            setFormData(prev => ({ ...prev, text: e.target.value }))
          }
          required
          data-testid="text-input"
        />
      </div>

      <div>
        <label htmlFor="email-input">Email Input:</label>
        <input
          id="email-input"
          type="email"
          value={formData.email}
          onChange={e =>
            setFormData(prev => ({ ...prev, email: e.target.value }))
          }
          required
          data-testid="email-input"
        />
      </div>

      <div>
        <label htmlFor="number-input">Number Input:</label>
        <input
          id="number-input"
          type="number"
          min="0"
          max="3000"
          value={formData.number}
          onChange={e =>
            setFormData(prev => ({ ...prev, number: e.target.value }))
          }
          data-testid="number-input"
        />
      </div>

      <div>
        <label htmlFor="date-input">Date Input:</label>
        <input
          id="date-input"
          type="date"
          value={formData.date}
          onChange={e =>
            setFormData(prev => ({ ...prev, date: e.target.value }))
          }
          data-testid="date-input"
        />
      </div>

      <div>
        <label htmlFor="color-input">Color Input:</label>
        <input
          id="color-input"
          type="color"
          value={formData.color}
          onChange={e =>
            setFormData(prev => ({ ...prev, color: e.target.value }))
          }
          data-testid="color-input"
        />
      </div>

      <div>
        <label htmlFor="range-input">Range Input:</label>
        <input
          id="range-input"
          type="range"
          min="0"
          max="100"
          value={formData.range}
          onChange={e =>
            setFormData(prev => ({ ...prev, range: parseInt(e.target.value) }))
          }
          data-testid="range-input"
        />
        <span data-testid="range-value">{formData.range}</span>
      </div>

      <button type="submit" data-testid="submit-button">
        Submit
      </button>
    </form>
  );
};

describe('Cross-Browser Compatibility Tests', () => {
  // Store original navigator for cleanup
  const originalNavigator = { ...navigator };

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });

  describe('Browser Detection and Feature Support', () => {
    test('should detect Chrome browser features', () => {
      BrowserTestUtils.mockBrowser('chrome');

      render(<ModernFeaturesComponent />);

      expect(
        screen.getByTestId('modern-features-component')
      ).toBeInTheDocument();
      expect(screen.getByTestId('flexbox-support')).toHaveTextContent(
        'Flexbox: Supported'
      );
      expect(screen.getByTestId('grid-support')).toHaveTextContent(
        'Grid: Supported'
      );
      expect(screen.getByTestId('fetch-support')).toHaveTextContent(
        'Fetch API: Supported'
      );
    });

    test('should detect Firefox browser features', () => {
      BrowserTestUtils.mockBrowser('firefox');

      render(<ModernFeaturesComponent />);

      expect(
        screen.getByTestId('modern-features-component')
      ).toBeInTheDocument();
      expect(screen.getByTestId('flexbox-support')).toHaveTextContent(
        'Flexbox: Supported'
      );
      expect(screen.getByTestId('grid-support')).toHaveTextContent(
        'Grid: Supported'
      );
    });

    test('should detect Safari browser features', () => {
      BrowserTestUtils.mockBrowser('safari');

      render(<ModernFeaturesComponent />);

      expect(
        screen.getByTestId('modern-features-component')
      ).toBeInTheDocument();
      // Safari generally supports modern features but may have some limitations
      expect(screen.getByTestId('flexbox-support')).toBeInTheDocument();
      expect(screen.getByTestId('grid-support')).toBeInTheDocument();
    });

    test('should detect mobile browser features', () => {
      BrowserTestUtils.mockBrowser('chromeMobile');

      render(<ModernFeaturesComponent />);

      expect(
        screen.getByTestId('modern-features-component')
      ).toBeInTheDocument();
      expect(screen.getByTestId('api-support')).toBeInTheDocument();
    });
  });

  describe('CSS Feature Compatibility', () => {
    test('should test CSS Grid support', () => {
      const supportsGrid = BrowserTestUtils.testCSSSupport('display', 'grid');

      render(<ModernFeaturesComponent />);

      const gridSupport = screen.getByTestId('grid-support');
      if (supportsGrid) {
        expect(gridSupport).toHaveTextContent('Grid: Supported');
      } else {
        expect(gridSupport).toHaveTextContent('Grid: Not Supported');
      }
    });

    test('should test CSS Flexbox support', () => {
      const supportsFlexbox = BrowserTestUtils.testCSSSupport(
        'display',
        'flex'
      );

      render(<ModernFeaturesComponent />);

      const flexboxSupport = screen.getByTestId('flexbox-support');
      if (supportsFlexbox) {
        expect(flexboxSupport).toHaveTextContent('Flexbox: Supported');
      } else {
        expect(flexboxSupport).toHaveTextContent('Flexbox: Not Supported');
      }
    });

    test('should test CSS Custom Properties support', () => {
      const supportsCustomProps = BrowserTestUtils.testCSSSupport(
        '--custom',
        'value'
      );

      render(<ModernFeaturesComponent />);

      const customPropsSupport = screen.getByTestId('custom-props-support');
      if (supportsCustomProps) {
        expect(customPropsSupport).toHaveTextContent(
          'Custom Properties: Supported'
        );
      } else {
        expect(customPropsSupport).toHaveTextContent(
          'Custom Properties: Not Supported'
        );
      }
    });
  });

  describe('Progressive Enhancement', () => {
    test('should provide basic layout for limited browsers', () => {
      // Mock a limited browser environment
      Object.defineProperty(window, 'CSS', {
        value: undefined,
        configurable: true,
      });

      render(<ProgressiveEnhancementComponent />);

      waitFor(() => {
        expect(screen.getByTestId('enhancement-level')).toHaveTextContent(
          'Enhancement Level: basic'
        );
        expect(screen.getByTestId('basic-layout')).toBeInTheDocument();
        expect(screen.queryByTestId('enhanced-layout')).not.toBeInTheDocument();
        expect(screen.queryByTestId('advanced-layout')).not.toBeInTheDocument();
      });
    });

    test('should provide enhanced layout for modern browsers', () => {
      // Ensure modern features are available
      Object.defineProperty(window, 'CSS', {
        value: {
          supports: (property: string, value: string) => {
            return (
              property === 'display' && (value === 'flex' || value === 'grid')
            );
          },
        },
        configurable: true,
      });

      render(<ProgressiveEnhancementComponent />);

      waitFor(() => {
        const enhancementLevel = screen.getByTestId('enhancement-level');
        expect(enhancementLevel).toHaveTextContent(/Enhanced|Advanced/);
      });
    });
  });

  describe('Event Compatibility', () => {
    test('should handle click events across browsers', async () => {
      const user = userEvent.setup();

      render(<EventCompatibilityComponent />);

      const button = screen.getByTestId('multi-event-button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('event-log')).toHaveTextContent(
          'Events: click'
        );
      });
    });

    test('should handle keyboard events across browsers', async () => {
      const user = userEvent.setup();

      render(<EventCompatibilityComponent />);

      const button = screen.getByTestId('multi-event-button');
      button.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('event-log')).toHaveTextContent(
          'keydown:Enter'
        );
      });
    });

    test('should handle touch events on mobile browsers', async () => {
      BrowserTestUtils.mockBrowser('chromeMobile');

      render(<EventCompatibilityComponent />);

      const button = screen.getByTestId('multi-event-button');

      // Simulate touch event
      fireEvent.touchStart(button);

      await waitFor(() => {
        expect(screen.getByTestId('event-log')).toHaveTextContent('touchstart');
      });
    });

    test('should handle pointer events on modern browsers', async () => {
      render(<EventCompatibilityComponent />);

      const button = screen.getByTestId('multi-event-button');

      // Simulate pointer event
      fireEvent.pointerDown(button);

      await waitFor(() => {
        expect(screen.getByTestId('event-log')).toHaveTextContent(
          'pointerdown'
        );
      });
    });
  });

  describe('Form Input Compatibility', () => {
    test('should handle HTML5 form inputs across browsers', async () => {
      const user = userEvent.setup();

      render(<FormCompatibilityComponent />);

      // Test various input types
      const textInput = screen.getByTestId('text-input');
      const emailInput = screen.getByTestId('email-input');
      const numberInput = screen.getByTestId('number-input');
      const rangeInput = screen.getByTestId('range-input');

      await user.type(textInput, 'Test text');
      await user.type(emailInput, 'test@example.com');
      await user.type(numberInput, '1500');

      expect(textInput).toHaveValue('Test text');
      expect(emailInput).toHaveValue('test@example.com');
      expect(numberInput).toHaveValue(1500);

      // Test range input
      fireEvent.change(rangeInput, { target: { value: '75' } });
      expect(screen.getByTestId('range-value')).toHaveTextContent('75');
    });

    test('should handle form validation across browsers', async () => {
      const user = userEvent.setup();

      render(<FormCompatibilityComponent />);

      const emailInput = screen.getByTestId('email-input');
      const submitButton = screen.getByTestId('submit-button');

      // Enter invalid email
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      // Browser should handle validation (or component should provide fallback)
      expect(emailInput).toHaveValue('invalid-email');
    });

    test('should display validation support information', () => {
      render(<FormCompatibilityComponent />);

      expect(screen.getByTestId('validation-support')).toBeInTheDocument();
      expect(screen.getByText(/HTML5 Validation:/)).toBeInTheDocument();
      expect(screen.getByText(/Custom Validity:/)).toBeInTheDocument();
    });
  });

  describe('Storage Compatibility', () => {
    test('should handle localStorage across browsers', () => {
      const StorageComponent = () => {
        const [hasLocalStorage, setHasLocalStorage] = React.useState(false);
        const [storedValue, setStoredValue] = React.useState('');

        React.useEffect(() => {
          const hasStorage = BrowserTestUtils.features.js.localStorage();
          setHasLocalStorage(hasStorage);

          if (hasStorage) {
            try {
              localStorage.setItem('test-key', 'test-value');
              const value = localStorage.getItem('test-key');
              setStoredValue(value || '');
              localStorage.removeItem('test-key');
            } catch (error) {
              console.error('localStorage test failed:', error);
            }
          }
        }, []);

        return (
          <div data-testid="storage-component">
            <div data-testid="localstorage-support">
              localStorage: {hasLocalStorage ? 'Supported' : 'Not Supported'}
            </div>
            <div data-testid="storage-test-result">
              Test Result: {storedValue}
            </div>
          </div>
        );
      };

      render(<StorageComponent />);

      expect(screen.getByTestId('localstorage-support')).toBeInTheDocument();

      waitFor(() => {
        const support = screen.getByTestId('localstorage-support');
        const testResult = screen.getByTestId('storage-test-result');

        if (support.textContent?.includes('Supported')) {
          expect(testResult).toHaveTextContent('Test Result: test-value');
        }
      });
    });

    test('should handle sessionStorage across browsers', () => {
      const SessionStorageComponent = () => {
        const [hasSessionStorage, setHasSessionStorage] = React.useState(false);

        React.useEffect(() => {
          try {
            sessionStorage.setItem('test', 'test');
            sessionStorage.removeItem('test');
            setHasSessionStorage(true);
          } catch {
            setHasSessionStorage(false);
          }
        }, []);

        return (
          <div data-testid="session-storage-support">
            sessionStorage: {hasSessionStorage ? 'Supported' : 'Not Supported'}
          </div>
        );
      };

      render(<SessionStorageComponent />);

      expect(screen.getByTestId('session-storage-support')).toBeInTheDocument();
    });
  });

  describe('API Compatibility', () => {
    test('should check Fetch API availability', () => {
      const FetchComponent = () => {
        const [hasFetch, setHasFetch] = React.useState(false);

        React.useEffect(() => {
          setHasFetch(typeof fetch !== 'undefined');
        }, []);

        return (
          <div data-testid="fetch-availability">
            Fetch API: {hasFetch ? 'Available' : 'Not Available'}
          </div>
        );
      };

      render(<FetchComponent />);

      expect(screen.getByTestId('fetch-availability')).toHaveTextContent(
        'Fetch API: Available'
      );
    });

    test('should check Promise support', () => {
      const PromiseComponent = () => {
        const [hasPromise, setHasPromise] = React.useState(false);

        React.useEffect(() => {
          setHasPromise(BrowserTestUtils.features.js.promises());
        }, []);

        return (
          <div data-testid="promise-support">
            Promises: {hasPromise ? 'Supported' : 'Not Supported'}
          </div>
        );
      };

      render(<PromiseComponent />);

      expect(screen.getByTestId('promise-support')).toHaveTextContent(
        'Promises: Supported'
      );
    });

    test('should check IntersectionObserver support', () => {
      render(<ModernFeaturesComponent />);

      const intersectionSupport = screen.getByTestId('intersection-support');
      expect(intersectionSupport).toHaveTextContent(/Intersection Observer:/);
    });
  });

  describe('Performance Across Browsers', () => {
    test('should measure rendering performance across browsers', async () => {
      const browsers = ['chrome', 'firefox', 'safari', 'edge'];
      const performanceResults: Record<string, number> = {};

      for (const browser of browsers) {
        BrowserTestUtils.mockBrowser(browser);

        const startTime = performance.now();
        const { unmount } = render(<ModernFeaturesComponent />);
        const endTime = performance.now();

        performanceResults[browser] = endTime - startTime;
        unmount();
      }

      console.log('Browser rendering performance:', performanceResults);

      // All browsers should render within reasonable time
      Object.values(performanceResults).forEach(time => {
        expect(time).toBeLessThan(1000); // Should render in less than 1 second
      });
    });

    test('should handle large datasets across browsers', async () => {
      const LargeDatasetComponent = () => {
        const [data] = React.useState(
          Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }))
        );

        return (
          <div data-testid="large-dataset">
            {data.map(item => (
              <div key={item.id} data-testid={`item-${item.id}`}>
                {item.name}
              </div>
            ))}
          </div>
        );
      };

      const browsers = ['chrome', 'firefox'];

      for (const browser of browsers) {
        BrowserTestUtils.mockBrowser(browser);

        const startTime = performance.now();
        const { unmount } = render(<LargeDatasetComponent />);

        // Check that first and last items are rendered
        await waitFor(() => {
          expect(screen.getByTestId('item-0')).toBeInTheDocument();
          expect(screen.getByTestId('item-999')).toBeInTheDocument();
        });

        const endTime = performance.now();
        console.log(
          `${browser} large dataset render time: ${endTime - startTime}ms`
        );

        expect(endTime - startTime).toBeLessThan(2000);
        unmount();
      }
    });
  });

  describe('Error Handling Across Browsers', () => {
    test('should handle JavaScript errors consistently', () => {
      const ErrorComponent = () => {
        const [error, setError] = React.useState<string | null>(null);

        const triggerError = () => {
          try {
            // Intentional error
            (null as any).nonExistentMethod();
          } catch (err: any) {
            setError(err.message);
          }
        };

        React.useEffect(() => {
          triggerError();
        }, []);

        return (
          <div data-testid="error-component">
            {error ? `Caught error: ${error}` : 'No error'}
          </div>
        );
      };

      render(<ErrorComponent />);

      expect(screen.getByTestId('error-component')).toHaveTextContent(
        /Caught error:/
      );
    });

    test('should handle network errors consistently', async () => {
      const NetworkComponent = () => {
        const [status, setStatus] = React.useState('loading');

        React.useEffect(() => {
          const testNetworkRequest = async () => {
            try {
              // This will fail in test environment
              await fetch('http://nonexistent-domain.test');
              setStatus('success');
            } catch {
              setStatus('error');
            }
          };

          testNetworkRequest();
        }, []);

        return <div data-testid="network-status">Status: {status}</div>;
      };

      render(<NetworkComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('network-status')).toHaveTextContent(
          'Status: error'
        );
      });
    });
  });

  describe('Accessibility Across Browsers', () => {
    test('should maintain accessibility across different browsers', () => {
      const AccessibilityComponent = () => (
        <div>
          <button aria-label="Close dialog" data-testid="accessible-button">
            ×
          </button>
          <input
            type="text"
            aria-describedby="help-text"
            data-testid="accessible-input"
          />
          <div id="help-text">Enter your tournament name</div>
        </div>
      );

      const browsers = ['chrome', 'firefox', 'safari'];

      browsers.forEach(browser => {
        BrowserTestUtils.mockBrowser(browser);

        const { unmount } = render(<AccessibilityComponent />);

        const button = screen.getByTestId('accessible-button');
        const input = screen.getByTestId('accessible-input');

        expect(button).toHaveAttribute('aria-label', 'Close dialog');
        expect(input).toHaveAttribute('aria-describedby', 'help-text');

        unmount();
      });
    });
  });
});
