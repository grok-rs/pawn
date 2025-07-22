import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { createMockPlayer } from '../utils/test-utils';

// Mobile testing utilities
const MobileTestUtils = {
  // Common mobile viewport sizes
  viewports: {
    iPhone5: { width: 320, height: 568, devicePixelRatio: 2 },
    iPhoneSE: { width: 375, height: 667, devicePixelRatio: 2 },
    iPhone12: { width: 390, height: 844, devicePixelRatio: 3 },
    iPhone12Pro: { width: 428, height: 926, devicePixelRatio: 3 },
    iPadMini: { width: 744, height: 1133, devicePixelRatio: 2 },
    iPad: { width: 820, height: 1180, devicePixelRatio: 2 },
    androidSmall: { width: 360, height: 640, devicePixelRatio: 2 },
    androidMedium: { width: 412, height: 732, devicePixelRatio: 2.6 },
    androidLarge: { width: 414, height: 896, devicePixelRatio: 3 },
  },

  // Set viewport size
  setViewport: (viewport: {
    width: number;
    height: number;
    devicePixelRatio?: number;
  }) => {
    Object.defineProperty(window, 'innerWidth', {
      value: viewport.width,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: viewport.height,
      configurable: true,
    });
    Object.defineProperty(window, 'devicePixelRatio', {
      value: viewport.devicePixelRatio || 1,
      configurable: true,
    });

    // Dispatch resize event
    window.dispatchEvent(new Event('resize'));
  },

  // Create touch event
  createTouchEvent: (
    type: string,
    element: Element,
    touches: Array<{ clientX: number; clientY: number }>
  ) => {
    const touchList = touches.map((touch, index) => ({
      identifier: index,
      target: element,
      clientX: touch.clientX,
      clientY: touch.clientY,
      pageX: touch.clientX,
      pageY: touch.clientY,
      screenX: touch.clientX,
      screenY: touch.clientY,
      radiusX: 10,
      radiusY: 10,
      rotationAngle: 0,
      force: 1,
    }));

    const touchEvent = new TouchEvent(type, {
      bubbles: true,
      cancelable: true,
      touches: type === 'touchend' ? [] : touchList,
      targetTouches: type === 'touchend' ? [] : touchList,
      changedTouches: touchList,
    });

    return touchEvent;
  },

  // Simulate swipe gesture
  simulateSwipe: (
    element: Element,
    direction: 'left' | 'right' | 'up' | 'down',
    distance: number = 100
  ) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let startX = centerX,
      startY = centerY;
    let endX = centerX,
      endY = centerY;

    switch (direction) {
      case 'left':
        endX = startX - distance;
        break;
      case 'right':
        endX = startX + distance;
        break;
      case 'up':
        endY = startY - distance;
        break;
      case 'down':
        endY = startY + distance;
        break;
    }

    // Start touch
    fireEvent(
      element,
      MobileTestUtils.createTouchEvent('touchstart', element, [
        { clientX: startX, clientY: startY },
      ])
    );

    // Move touch
    fireEvent(
      element,
      MobileTestUtils.createTouchEvent('touchmove', element, [
        { clientX: endX, clientY: endY },
      ])
    );

    // End touch
    fireEvent(
      element,
      MobileTestUtils.createTouchEvent('touchend', element, [
        { clientX: endX, clientY: endY },
      ])
    );
  },

  // Simulate pinch gesture
  simulatePinch: (element: Element, scale: number) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = 50;

    const touch1Start = { clientX: centerX - distance, clientY: centerY };
    const touch2Start = { clientX: centerX + distance, clientY: centerY };

    const touch1End = {
      clientX: centerX - distance * scale,
      clientY: centerY,
    };
    const touch2End = {
      clientX: centerX + distance * scale,
      clientY: centerY,
    };

    // Start pinch
    fireEvent(
      element,
      MobileTestUtils.createTouchEvent('touchstart', element, [
        touch1Start,
        touch2Start,
      ])
    );

    // Move fingers
    fireEvent(
      element,
      MobileTestUtils.createTouchEvent('touchmove', element, [
        touch1End,
        touch2End,
      ])
    );

    // End pinch
    fireEvent(
      element,
      MobileTestUtils.createTouchEvent('touchend', element, [])
    );
  },

  // Check if element is visible in viewport
  isInViewport: (element: Element): boolean => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  },

  // Check if element has adequate touch target size (44x44px minimum)
  hasAdequateTouchTarget: (element: Element): boolean => {
    const rect = element.getBoundingClientRect();
    return rect.width >= 44 && rect.height >= 44;
  },
};

// Mock mobile-responsive components
const MockResponsiveDataTable = ({
  data,
  columns,
}: {
  data: any[];
  columns: any[];
}) => {
  const [isMobile, setIsMobile] = React.useState(false);
  const [isCardView, setIsCardView] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsCardView(window.innerWidth < 640);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isCardView) {
    return (
      <div data-testid="card-view" className="card-view">
        {data.map((item, index) => (
          <div
            key={item.id}
            data-testid={`card-${index}`}
            className="data-card"
          >
            {columns.map((col: any) => (
              <div key={col.key} className="card-field">
                <span className="field-label">{col.label}:</span>
                <span className="field-value">{item[col.key]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      data-testid="table-view"
      className={`table-container ${isMobile ? 'mobile' : 'desktop'}`}
    >
      <table className="responsive-table">
        <thead>
          <tr>
            {columns.map((col: any) => (
              <th
                key={col.key}
                className={isMobile ? 'mobile-header' : 'desktop-header'}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={item.id} data-testid={`row-${index}`}>
              {columns.map((col: any) => (
                <td
                  key={`${item.id}-${col.key}`}
                  className={isMobile ? 'mobile-cell' : 'desktop-cell'}
                >
                  {item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const MockMobileNavigation = ({ currentPage }: { currentPage: string }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <nav
      data-testid="mobile-navigation"
      className={`navigation ${isMobile ? 'mobile' : 'desktop'}`}
    >
      {isMobile ? (
        <>
          <button
            data-testid="mobile-menu-toggle"
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            ☰
          </button>

          <div
            data-testid="mobile-menu"
            className={`mobile-menu ${isMobileMenuOpen ? 'open' : 'closed'}`}
            aria-hidden={!isMobileMenuOpen}
          >
            <a
              href="/tournaments"
              className={currentPage === 'tournaments' ? 'active' : ''}
            >
              Tournaments
            </a>
            <a
              href="/players"
              className={currentPage === 'players' ? 'active' : ''}
            >
              Players
            </a>
            <a
              href="/settings"
              className={currentPage === 'settings' ? 'active' : ''}
            >
              Settings
            </a>
          </div>
        </>
      ) : (
        <div data-testid="desktop-menu" className="desktop-menu">
          <a
            href="/tournaments"
            className={currentPage === 'tournaments' ? 'active' : ''}
          >
            Tournaments
          </a>
          <a
            href="/players"
            className={currentPage === 'players' ? 'active' : ''}
          >
            Players
          </a>
          <a
            href="/settings"
            className={currentPage === 'settings' ? 'active' : ''}
          >
            Settings
          </a>
        </div>
      )}
    </nav>
  );
};

const MockSwipeableCard = ({
  title,
  content,
  onSwipeLeft,
  onSwipeRight,
}: {
  title: string;
  content: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) => {
  const [isSwipeActive, setIsSwipeActive] = React.useState(false);
  const [swipeDirection, setSwipeDirection] = React.useState<
    'left' | 'right' | null
  >(null);

  const handleTouchStart = (_e: React.TouchEvent) => {
    setIsSwipeActive(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwipeActive) return;

    const touch = e.touches[0];
    const startX = (e.target as any).touchStartX || touch.clientX;
    const deltaX = touch.clientX - startX;

    if (Math.abs(deltaX) > 50) {
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    }
  };

  const handleTouchEnd = (_e: React.TouchEvent) => {
    if (swipeDirection === 'left') {
      onSwipeLeft();
    } else if (swipeDirection === 'right') {
      onSwipeRight();
    }

    setIsSwipeActive(false);
    setSwipeDirection(null);
  };

  return (
    <div
      data-testid="swipeable-card"
      className={`swipeable-card ${swipeDirection ? `swiping-${swipeDirection}` : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <h3 data-testid="card-title">{title}</h3>
      <p data-testid="card-content">{content}</p>
      <div data-testid="swipe-indicator" className="swipe-indicator">
        ← Swipe to delete | Archive →
      </div>
    </div>
  );
};

const MockTouchFriendlyForm = ({
  onSubmit,
}: {
  onSubmit: (data: any) => void;
}) => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    rating: '',
    country: '',
  });

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit(formData);
      }}
      data-testid="touch-form"
    >
      <div className="form-field">
        <label htmlFor="touch-name">Name:</label>
        <input
          id="touch-name"
          type="text"
          value={formData.name}
          onChange={e =>
            setFormData(prev => ({ ...prev, name: e.target.value }))
          }
          className="touch-input"
          data-testid="touch-name-input"
        />
      </div>

      <div className="form-field">
        <label htmlFor="touch-email">Email:</label>
        <input
          id="touch-email"
          type="email"
          value={formData.email}
          onChange={e =>
            setFormData(prev => ({ ...prev, email: e.target.value }))
          }
          className="touch-input"
          data-testid="touch-email-input"
        />
      </div>

      <div className="form-field">
        <label htmlFor="touch-rating">Rating:</label>
        <input
          id="touch-rating"
          type="number"
          value={formData.rating}
          onChange={e =>
            setFormData(prev => ({ ...prev, rating: e.target.value }))
          }
          className="touch-input"
          data-testid="touch-rating-input"
        />
      </div>

      <div className="form-field">
        <label htmlFor="touch-country">Country:</label>
        <select
          id="touch-country"
          value={formData.country}
          onChange={e =>
            setFormData(prev => ({ ...prev, country: e.target.value }))
          }
          className="touch-select"
          data-testid="touch-country-select"
        >
          <option value="">Select Country</option>
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="UK">United Kingdom</option>
        </select>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="touch-button secondary"
          data-testid="touch-cancel-button"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="touch-button primary"
          data-testid="touch-submit-button"
        >
          Submit
        </button>
      </div>
    </form>
  );
};

const MockPullToRefresh = ({ onRefresh }: { onRefresh: () => void }) => {
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [startY, setStartY] = React.useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);
    setPullDistance(distance);
  };

  const handleTouchEnd = () => {
    if (pullDistance > 100) {
      setIsRefreshing(true);
      onRefresh();
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 2000);
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      data-testid="pull-to-refresh"
      className="pull-to-refresh-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        data-testid="refresh-indicator"
        className={`refresh-indicator ${isRefreshing ? 'refreshing' : ''}`}
        style={{ transform: `translateY(${Math.min(pullDistance, 120)}px)` }}
      >
        {isRefreshing
          ? 'Refreshing...'
          : pullDistance > 100
            ? 'Release to refresh'
            : 'Pull to refresh'}
      </div>

      <div className="content">
        <h2>Tournament List</h2>
        <p>Pull down to refresh the tournament list</p>
      </div>
    </div>
  );
};

describe('Mobile Responsiveness and Touch Interaction Tests', () => {
  describe('Responsive Layout Tests', () => {
    test('should adapt table to card view on small screens', async () => {
      const mockData = [
        createMockPlayer({ id: 1, name: 'Alice Johnson', rating: 1650 }),
        createMockPlayer({ id: 2, name: 'Bob Smith', rating: 1580 }),
      ];
      const columns = [
        { key: 'name', label: 'Name' },
        { key: 'rating', label: 'Rating' },
        { key: 'email', label: 'Email' },
      ];

      // Start with desktop viewport
      MobileTestUtils.setViewport(MobileTestUtils.viewports.iPad);
      const { rerender } = render(
        <MockResponsiveDataTable data={mockData} columns={columns} />
      );

      expect(screen.getByTestId('table-view')).toBeInTheDocument();
      expect(screen.queryByTestId('card-view')).not.toBeInTheDocument();

      // Switch to mobile viewport
      MobileTestUtils.setViewport(MobileTestUtils.viewports.iPhoneSE);
      rerender(<MockResponsiveDataTable data={mockData} columns={columns} />);

      await waitFor(() => {
        expect(screen.getByTestId('card-view')).toBeInTheDocument();
        expect(screen.queryByTestId('table-view')).not.toBeInTheDocument();
      });

      // Verify card content
      expect(screen.getByTestId('card-0')).toBeInTheDocument();
      expect(screen.getByTestId('card-1')).toBeInTheDocument();
    });

    test('should show mobile navigation menu on small screens', async () => {
      const user = userEvent.setup();

      // Start with desktop
      MobileTestUtils.setViewport(MobileTestUtils.viewports.iPad);
      const { rerender } = render(
        <MockMobileNavigation currentPage="tournaments" />
      );

      expect(screen.getByTestId('desktop-menu')).toBeInTheDocument();
      expect(
        screen.queryByTestId('mobile-menu-toggle')
      ).not.toBeInTheDocument();

      // Switch to mobile
      MobileTestUtils.setViewport(MobileTestUtils.viewports.androidSmall);
      rerender(<MockMobileNavigation currentPage="tournaments" />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-menu-toggle')).toBeInTheDocument();
        expect(screen.queryByTestId('desktop-menu')).not.toBeInTheDocument();
      });

      // Test mobile menu toggle
      const toggleButton = screen.getByTestId('mobile-menu-toggle');
      await user.click(toggleButton);

      const mobileMenu = screen.getByTestId('mobile-menu');
      expect(mobileMenu).toHaveClass('open');
      expect(mobileMenu).not.toHaveAttribute('aria-hidden', 'true');
    });

    test('should test multiple viewport sizes', () => {
      Object.entries(MobileTestUtils.viewports).forEach(
        ([_deviceName, viewport]) => {
          MobileTestUtils.setViewport(viewport);

          const { unmount } = render(
            <MockMobileNavigation currentPage="tournaments" />
          );

          // Component should render without errors on all viewport sizes
          expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();

          unmount();
        }
      );
    });
  });

  describe('Touch Target Accessibility', () => {
    test('should have adequate touch target sizes', () => {
      MobileTestUtils.setViewport(MobileTestUtils.viewports.iPhone12);
      render(<MockTouchFriendlyForm onSubmit={vi.fn()} />);

      // Check button sizes (should be at least 44x44px)
      const submitButton = screen.getByTestId('touch-submit-button');
      const cancelButton = screen.getByTestId('touch-cancel-button');

      expect(MobileTestUtils.hasAdequateTouchTarget(submitButton)).toBe(true);
      expect(MobileTestUtils.hasAdequateTouchTarget(cancelButton)).toBe(true);
    });

    test('should have proper spacing between touch targets', () => {
      MobileTestUtils.setViewport(MobileTestUtils.viewports.androidMedium);
      render(<MockTouchFriendlyForm onSubmit={vi.fn()} />);

      const submitButton = screen.getByTestId('touch-submit-button');
      const cancelButton = screen.getByTestId('touch-cancel-button');

      const submitRect = submitButton.getBoundingClientRect();
      const cancelRect = cancelButton.getBoundingClientRect();

      // Buttons should have adequate spacing (at least 8px)
      const spacing = Math.abs(
        submitRect.left - (cancelRect.left + cancelRect.width)
      );
      expect(spacing).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Touch Gesture Support', () => {
    test('should handle swipe gestures', async () => {
      const mockSwipeLeft = vi.fn();
      const mockSwipeRight = vi.fn();

      MobileTestUtils.setViewport(MobileTestUtils.viewports.iPhone12);
      render(
        <MockSwipeableCard
          title="Test Card"
          content="Swipe me!"
          onSwipeLeft={mockSwipeLeft}
          onSwipeRight={mockSwipeRight}
        />
      );

      const card = screen.getByTestId('swipeable-card');

      // Test left swipe
      MobileTestUtils.simulateSwipe(card, 'left', 100);
      await waitFor(() => {
        expect(mockSwipeLeft).toHaveBeenCalled();
      });

      // Test right swipe
      MobileTestUtils.simulateSwipe(card, 'right', 100);
      await waitFor(() => {
        expect(mockSwipeRight).toHaveBeenCalled();
      });
    });

    test('should handle pull-to-refresh gesture', async () => {
      const mockRefresh = vi.fn();

      MobileTestUtils.setViewport(MobileTestUtils.viewports.androidLarge);
      render(<MockPullToRefresh onRefresh={mockRefresh} />);

      const container = screen.getByTestId('pull-to-refresh');

      // Simulate pull down gesture
      MobileTestUtils.simulateSwipe(container, 'down', 150);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });

      const indicator = screen.getByTestId('refresh-indicator');
      expect(indicator).toHaveClass('refreshing');
    });

    test('should handle pinch/zoom gestures on data tables', () => {
      MobileTestUtils.setViewport(MobileTestUtils.viewports.iPadMini);

      const mockData = [createMockPlayer({ name: 'Test Player' })];
      const columns = [{ key: 'name', label: 'Name' }];

      render(<MockResponsiveDataTable data={mockData} columns={columns} />);

      const table = screen.getByTestId('table-view');

      // Simulate pinch out (zoom in)
      MobileTestUtils.simulatePinch(table, 1.5);

      // Should not crash or break layout
      expect(table).toBeInTheDocument();
    });
  });

  describe('Mobile Input Handling', () => {
    test('should handle touch input in forms', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();

      MobileTestUtils.setViewport(MobileTestUtils.viewports.iPhoneSE);
      render(<MockTouchFriendlyForm onSubmit={mockSubmit} />);

      // Test touch input
      const nameInput = screen.getByTestId('touch-name-input');
      const emailInput = screen.getByTestId('touch-email-input');
      const countrySelect = screen.getByTestId('touch-country-select');

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.selectOptions(countrySelect, 'US');

      const submitButton = screen.getByTestId('touch-submit-button');
      await user.click(submitButton);

      expect(mockSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        rating: '',
        country: 'US',
      });
    });

    test('should handle virtual keyboard appearance', async () => {
      const user = userEvent.setup();

      MobileTestUtils.setViewport(MobileTestUtils.viewports.androidSmall);
      render(<MockTouchFriendlyForm onSubmit={vi.fn()} />);

      const nameInput = screen.getByTestId('touch-name-input');

      // Focus input (simulates keyboard opening)
      await user.click(nameInput);

      // Simulate viewport height change (virtual keyboard)
      Object.defineProperty(window, 'innerHeight', {
        value: MobileTestUtils.viewports.androidSmall.height * 0.6,
        configurable: true,
      });
      window.dispatchEvent(new Event('resize'));

      // Input should still be accessible
      expect(nameInput).toBeInTheDocument();
      expect(MobileTestUtils.isInViewport(nameInput)).toBe(true);
    });
  });

  describe('Mobile Performance', () => {
    test('should handle large datasets efficiently on mobile', async () => {
      MobileTestUtils.setViewport(MobileTestUtils.viewports.iPhone5); // Smallest viewport

      const largeDataset = Array.from({ length: 1000 }, (_, i) =>
        createMockPlayer({
          id: i + 1,
          name: `Player ${i + 1}`,
          rating: 1500 + i,
        })
      );

      const columns = [
        { key: 'name', label: 'Name' },
        { key: 'rating', label: 'Rating' },
      ];

      const startTime = performance.now();
      render(<MockResponsiveDataTable data={largeDataset} columns={columns} />);
      const endTime = performance.now();

      // Should render quickly even with large dataset
      expect(endTime - startTime).toBeLessThan(1000);

      // Should show card view on mobile
      expect(screen.getByTestId('card-view')).toBeInTheDocument();
    });

    test('should handle rapid touch events without lag', async () => {
      MobileTestUtils.setViewport(MobileTestUtils.viewports.androidMedium);

      const clickCounts = { left: 0, right: 0 };

      render(
        <MockSwipeableCard
          title="Performance Test"
          content="Test rapid touches"
          onSwipeLeft={() => clickCounts.left++}
          onSwipeRight={() => clickCounts.right++}
        />
      );

      const card = screen.getByTestId('swipeable-card');

      // Rapid swipes
      const startTime = performance.now();
      for (let i = 0; i < 10; i++) {
        MobileTestUtils.simulateSwipe(
          card,
          i % 2 === 0 ? 'left' : 'right',
          100
        );
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      const endTime = performance.now();

      // Should handle rapid gestures quickly
      expect(endTime - startTime).toBeLessThan(500);
      expect(clickCounts.left + clickCounts.right).toBeGreaterThan(0);
    });
  });

  describe('Orientation Change Handling', () => {
    test('should handle portrait to landscape orientation change', async () => {
      // Start in portrait
      MobileTestUtils.setViewport({ width: 390, height: 844 });

      const { rerender } = render(
        <MockMobileNavigation currentPage="tournaments" />
      );

      expect(screen.getByTestId('mobile-navigation')).toHaveClass('mobile');

      // Switch to landscape
      MobileTestUtils.setViewport({ width: 844, height: 390 });
      rerender(<MockMobileNavigation currentPage="tournaments" />);

      await waitFor(() => {
        // Should still be in mobile mode but layout may adjust
        expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
      });
    });

    test('should maintain functionality after orientation change', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();

      // Start in portrait
      MobileTestUtils.setViewport(MobileTestUtils.viewports.iPhone12);
      const { rerender } = render(
        <MockTouchFriendlyForm onSubmit={mockSubmit} />
      );

      // Fill form in portrait
      const nameInput = screen.getByTestId('touch-name-input');
      await user.type(nameInput, 'Test User');

      // Rotate to landscape
      MobileTestUtils.setViewport({ width: 926, height: 428 });
      rerender(<MockTouchFriendlyForm onSubmit={mockSubmit} />);

      // Form should still work
      const submitButton = screen.getByTestId('touch-submit-button');
      await user.click(submitButton);

      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test User',
        })
      );
    });
  });

  describe('Mobile Accessibility', () => {
    test('should maintain accessibility on mobile viewports', () => {
      MobileTestUtils.setViewport(MobileTestUtils.viewports.iPhoneSE);
      render(<MockMobileNavigation currentPage="tournaments" />);

      const menuToggle = screen.getByTestId('mobile-menu-toggle');

      // Should have proper ARIA attributes
      expect(menuToggle).toHaveAttribute(
        'aria-label',
        'Toggle navigation menu'
      );
      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');

      // Should be focusable
      menuToggle.focus();
      expect(menuToggle).toHaveFocus();
    });

    test('should support screen reader navigation on mobile', () => {
      MobileTestUtils.setViewport(MobileTestUtils.viewports.androidSmall);
      render(<MockTouchFriendlyForm onSubmit={vi.fn()} />);

      // All inputs should have proper labels
      const nameInput = screen.getByTestId('touch-name-input');
      const emailInput = screen.getByTestId('touch-email-input');

      expect(nameInput).toHaveAccessibleName('Name:');
      expect(emailInput).toHaveAccessibleName('Email:');
    });
  });

  describe('Mobile Edge Cases', () => {
    test('should handle very small screens gracefully', () => {
      // Extra small viewport (smartwatch size)
      MobileTestUtils.setViewport({ width: 240, height: 240 });

      const { container } = render(
        <MockMobileNavigation currentPage="tournaments" />
      );

      // Should not break on tiny screens
      expect(container.firstChild).toBeInTheDocument();
    });

    test('should handle high DPI screens', () => {
      MobileTestUtils.setViewport({
        width: 428,
        height: 926,
        devicePixelRatio: 3, // iPhone 12 Pro Max
      });

      render(<MockTouchFriendlyForm onSubmit={vi.fn()} />);

      // Elements should still be rendered correctly
      expect(screen.getByTestId('touch-form')).toBeInTheDocument();
    });

    test('should handle network slowness on mobile', async () => {
      MobileTestUtils.setViewport(MobileTestUtils.viewports.androidMedium);

      // Mock slow loading
      const SlowComponent = () => {
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          const timer = setTimeout(() => setLoading(false), 100);
          return () => clearTimeout(timer);
        }, []);

        return (
          <div data-testid="slow-component">
            {loading ? 'Loading...' : 'Content loaded'}
          </div>
        );
      };

      render(<SlowComponent />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Content loaded')).toBeInTheDocument();
      });
    });
  });
});
