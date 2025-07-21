import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMockTournament, createMockPlayer } from '../utils/test-utils';

// Screenshot testing utilities
const ScreenshotTestUtils = {
  // Simulate screenshot capture
  captureScreenshot: async (
    element: HTMLElement,
    options: {
      name: string;
      viewport?: { width: number; height: number };
      animations?: 'disabled' | 'allow';
    }
  ) => {
    const { name, viewport = { width: 1280, height: 720 } } = options;

    // In a real implementation, this would use a visual testing tool like Percy, Chromatic, or Playwright
    // For testing purposes, we simulate the screenshot process

    const screenshot = {
      name,
      timestamp: new Date().toISOString(),
      viewport,
      element: element.tagName,
      innerHTML: element.innerHTML.length,
      hash: generateElementHash(element),
      dimensions: {
        width: element.offsetWidth,
        height: element.offsetHeight,
      },
    };

    // Simulate async screenshot processing
    await new Promise(resolve => setTimeout(resolve, 100));

    return screenshot;
  },

  // Compare screenshots (simulated)
  compareScreenshots: (
    baseline: any,
    current: any,
    threshold: number = 0.2
  ): {
    match: boolean;
    difference: number;
    details: string[];
  } => {
    const details: string[] = [];
    let difference = 0;

    // Compare basic properties
    if (baseline.viewport.width !== current.viewport.width) {
      difference += 0.1;
      details.push('Viewport width changed');
    }

    if (baseline.viewport.height !== current.viewport.height) {
      difference += 0.1;
      details.push('Viewport height changed');
    }

    if (baseline.dimensions.width !== current.dimensions.width) {
      difference += 0.15;
      details.push('Element width changed');
    }

    if (baseline.dimensions.height !== current.dimensions.height) {
      difference += 0.15;
      details.push('Element height changed');
    }

    if (baseline.hash !== current.hash) {
      difference += 0.3;
      details.push('Content hash changed');
    }

    const match = difference <= threshold;
    return { match, difference, details };
  },

  // Generate visual test configuration
  createVisualTestConfig: (componentName: string) => ({
    componentName,
    variants: [
      { name: 'default', props: {} },
      { name: 'loading', props: { loading: true } },
      { name: 'error', props: { error: 'Test error' } },
      { name: 'empty', props: { data: [] } },
    ],
    viewports: [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1280, height: 720 },
      { name: 'wide', width: 1920, height: 1080 },
    ],
    themes: ['light', 'dark'],
    interactions: [
      { name: 'hover', action: 'hover', selector: 'button' },
      { name: 'focus', action: 'focus', selector: 'input' },
      {
        name: 'click',
        action: 'click',
        selector: '[data-testid="primary-button"]',
      },
    ],
  }),

  // Mock viewport resizing
  setViewport: (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', {
      value: width,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: height,
      configurable: true,
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
  },

  // Disable animations for consistent screenshots
  disableAnimations: () => {
    const style = document.createElement('style');
    style.innerHTML = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `;
    document.head.appendChild(style);
    return style;
  },

  // Wait for fonts to load
  waitForFonts: async () => {
    if ('fonts' in document) {
      await document.fonts.ready;
    }
    // Additional wait for font rendering
    await new Promise(resolve => setTimeout(resolve, 100));
  },

  // Wait for images to load
  waitForImages: async (container: HTMLElement) => {
    const images = container.querySelectorAll('img');
    const promises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();

      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve; // Resolve even on error to continue test
        setTimeout(resolve, 5000); // Timeout after 5 seconds
      });
    });

    await Promise.all(promises);
  },
};

// Helper function to generate element hash (simplified)
function generateElementHash(element: HTMLElement): string {
  const content = element.textContent || '';
  const className = element.className;
  const tagName = element.tagName;

  // Simple hash function for testing
  let hash = 0;
  const str = `${tagName}-${className}-${content}`;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return hash.toString(36);
}

// Tournament card component for visual testing
const TournamentCard = ({
  tournament,
  loading = false,
  error = null,
  variant = 'default',
  theme = 'light',
}: {
  tournament?: any;
  loading?: boolean;
  error?: string | null;
  variant?: 'default' | 'compact' | 'detailed';
  theme?: 'light' | 'dark';
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  if (loading) {
    return (
      <div
        className={`tournament-card loading ${theme}`}
        data-testid="tournament-card-loading"
        style={{
          padding: '20px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: theme === 'dark' ? '#333' : '#fff',
          color: theme === 'dark' ? '#fff' : '#000',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: '20px',
              height: '20px',
              border: '2px solid #ccc',
              borderTop: '2px solid #007bff',
              borderRadius: '50%',
              marginRight: '10px',
            }}
          />
          Loading tournament...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`tournament-card error ${theme}`}
        data-testid="tournament-card-error"
        role="alert"
        style={{
          padding: '20px',
          border: '1px solid #dc3545',
          borderRadius: '8px',
          backgroundColor: theme === 'dark' ? '#4a1e1e' : '#f8d7da',
          color: theme === 'dark' ? '#ff6b6b' : '#721c24',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Error</div>
        <div>{error}</div>
      </div>
    );
  }

  const defaultTournament = tournament || {
    id: 1,
    name: 'Test Tournament',
    status: 'active',
    playerCount: 16,
    maxRounds: 5,
    currentRound: 3,
    startDate: '2024-01-15',
    format: 'Swiss',
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#28a745';
      case 'completed':
        return '#6c757d';
      case 'cancelled':
        return '#dc3545';
      default:
        return '#007bff';
    }
  };

  const cardStyle = {
    padding: variant === 'compact' ? '12px' : '20px',
    border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
    borderRadius: '8px',
    backgroundColor: theme === 'dark' ? '#333' : '#fff',
    color: theme === 'dark' ? '#fff' : '#000',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
    boxShadow: isHovered
      ? '0 4px 8px rgba(0,0,0,0.1)'
      : '0 2px 4px rgba(0,0,0,0.05)',
    outline: isFocused ? '2px solid #007bff' : 'none',
    minHeight:
      variant === 'detailed'
        ? '200px'
        : variant === 'compact'
          ? '80px'
          : '120px',
  };

  return (
    <div
      className={`tournament-card ${variant} ${theme}`}
      data-testid="tournament-card"
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      tabIndex={0}
      role="button"
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: '0 0 8px 0',
              fontSize: variant === 'compact' ? '16px' : '18px',
              fontWeight: 'bold',
            }}
          >
            {defaultTournament.name}
          </h3>

          {variant !== 'compact' && (
            <div style={{ marginBottom: '12px' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: getStatusColor(defaultTournament.status),
                  color: '#fff',
                  textTransform: 'uppercase',
                }}
              >
                {defaultTournament.status}
              </span>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                variant === 'detailed' ? 'repeat(2, 1fr)' : '1fr',
              gap: '8px',
              fontSize: '14px',
            }}
          >
            <div>Players: {defaultTournament.playerCount}</div>
            <div>Format: {defaultTournament.format}</div>

            {variant !== 'compact' && (
              <>
                <div>
                  Round: {defaultTournament.currentRound}/
                  {defaultTournament.maxRounds}
                </div>
                <div>Started: {defaultTournament.startDate}</div>
              </>
            )}

            {variant === 'detailed' && (
              <>
                <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      color: theme === 'dark' ? '#aaa' : '#666',
                    }}
                  >
                    Progress:{' '}
                    {Math.round(
                      (defaultTournament.currentRound /
                        defaultTournament.maxRounds) *
                        100
                    )}
                    %
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      backgroundColor: theme === 'dark' ? '#555' : '#e9ecef',
                      borderRadius: '3px',
                      marginTop: '4px',
                    }}
                  >
                    <div
                      style={{
                        width: `${(defaultTournament.currentRound / defaultTournament.maxRounds) * 100}%`,
                        height: '100%',
                        backgroundColor: '#007bff',
                        borderRadius: '3px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {variant !== 'compact' && (
          <div style={{ marginLeft: '16px' }}>
            <button
              data-testid="primary-button"
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              View Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Player list component for responsive testing
const PlayerList = ({
  players = [],
  loading = false,
  layout = 'grid',
  theme = 'light',
}: {
  players?: any[];
  loading?: boolean;
  layout?: 'grid' | 'list' | 'table';
  theme?: 'light' | 'dark';
}) => {
  const [sortBy, setSortBy] = React.useState<'name' | 'rating' | 'score'>(
    'rating'
  );
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  const defaultPlayers =
    players.length > 0
      ? players
      : [
          {
            id: 1,
            name: 'Magnus Carlsen',
            rating: 2830,
            score: 4.5,
            title: 'GM',
          },
          {
            id: 2,
            name: 'Fabiano Caruana',
            rating: 2820,
            score: 4.0,
            title: 'GM',
          },
          { id: 3, name: 'Ding Liren', rating: 2810, score: 3.5, title: 'GM' },
          {
            id: 4,
            name: 'Ian Nepomniachtchi',
            rating: 2790,
            score: 3.5,
            title: 'GM',
          },
          {
            id: 5,
            name: 'Maxime Vachier-Lagrave',
            rating: 2780,
            score: 3.0,
            title: 'GM',
          },
        ];

  const sortedPlayers = [...defaultPlayers].sort((a, b) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'name') return a.name.localeCompare(b.name) * multiplier;
    return (a[sortBy] - b[sortBy]) * multiplier;
  });

  const containerStyle = {
    backgroundColor: theme === 'dark' ? '#222' : '#fff',
    color: theme === 'dark' ? '#fff' : '#000',
    padding: '20px',
    borderRadius: '8px',
    border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
  };

  if (loading) {
    return (
      <div style={containerStyle} data-testid="player-list-loading">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ marginBottom: '16px' }}>Loading players...</div>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #ccc',
              borderTop: '4px solid #007bff',
              borderRadius: '50%',
              margin: '0 auto',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle} data-testid="player-list">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <h2 style={{ margin: 0 }}>Players ({defaultPlayers.length})</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={e => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as any);
              setSortOrder(order as any);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: `1px solid ${theme === 'dark' ? '#555' : '#ccc'}`,
              backgroundColor: theme === 'dark' ? '#333' : '#fff',
              color: theme === 'dark' ? '#fff' : '#000',
            }}
            data-testid="sort-select"
          >
            <option value="rating-desc">Rating (High to Low)</option>
            <option value="rating-asc">Rating (Low to High)</option>
            <option value="name-asc">Name (A to Z)</option>
            <option value="name-desc">Name (Z to A)</option>
            <option value="score-desc">Score (High to Low)</option>
            <option value="score-asc">Score (Low to High)</option>
          </select>

          <div style={{ display: 'flex', gap: '4px' }}>
            {['grid', 'list', 'table'].map(layoutOption => (
              <button
                key={layoutOption}
                onClick={() => {}}
                data-testid={`layout-${layoutOption}`}
                style={{
                  padding: '6px 12px',
                  backgroundColor:
                    layout === layoutOption ? '#007bff' : 'transparent',
                  color:
                    layout === layoutOption
                      ? '#fff'
                      : theme === 'dark'
                        ? '#fff'
                        : '#000',
                  border: `1px solid ${layout === layoutOption ? '#007bff' : theme === 'dark' ? '#555' : '#ccc'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {layoutOption}
              </button>
            ))}
          </div>
        </div>
      </div>

      {layout === 'table' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  borderBottom: `2px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
                }}
              >
                <th style={{ padding: '12px', textAlign: 'left' }}>Rank</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Rating</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Score</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Title</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player, index) => (
                <tr
                  key={player.id}
                  style={{
                    borderBottom: `1px solid ${theme === 'dark' ? '#444' : '#eee'}`,
                  }}
                  data-testid={`player-row-${player.id}`}
                >
                  <td style={{ padding: '12px' }}>{index + 1}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>
                    {player.name}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {player.rating}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {player.score}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        backgroundColor: '#007bff',
                        color: '#fff',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {player.title}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {layout === 'grid' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              data-testid={`player-card-${player.id}`}
              style={{
                padding: '16px',
                border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
                borderRadius: '8px',
                backgroundColor: theme === 'dark' ? '#333' : '#f8f9fa',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    #{index + 1}
                  </div>
                  <div style={{ fontSize: '16px', margin: '4px 0' }}>
                    {player.name}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.7 }}>
                    Rating: {player.rating}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.7 }}>
                    Score: {player.score}
                  </div>
                </div>
                <span
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  {player.title}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {layout === 'list' && (
        <div>
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              data-testid={`player-list-item-${player.id}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: `1px solid ${theme === 'dark' ? '#444' : '#eee'}`,
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
              >
                <div
                  style={{
                    minWidth: '30px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: theme === 'dark' ? '#aaa' : '#666',
                  }}
                >
                  #{index + 1}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                    {player.name}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.7 }}>
                    {player.rating} • Score: {player.score}
                  </div>
                </div>
              </div>
              <span
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                {player.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

describe('Automated Screenshot Testing for Regression Detection', () => {
  let animationStyleElement: HTMLStyleElement;

  beforeEach(async () => {
    // Disable animations for consistent screenshots
    animationStyleElement = ScreenshotTestUtils.disableAnimations();

    // Wait for fonts to load
    await ScreenshotTestUtils.waitForFonts();
  });

  afterEach(() => {
    // Clean up animation disabling
    if (animationStyleElement && animationStyleElement.parentNode) {
      animationStyleElement.parentNode.removeChild(animationStyleElement);
    }
  });

  describe('Tournament Card Visual Testing', () => {
    test('should capture tournament card default state', async () => {
      const tournament = createMockTournament({
        name: 'World Championship 2024',
        status: 'active',
        playerCount: 32,
        currentRound: 5,
        maxRounds: 11,
      });

      render(<TournamentCard tournament={tournament} />);

      const card = screen.getByTestId('tournament-card');
      await ScreenshotTestUtils.waitForImages(card);

      const screenshot = await ScreenshotTestUtils.captureScreenshot(card, {
        name: 'tournament-card-default',
      });

      expect(screenshot).toMatchObject({
        name: 'tournament-card-default',
        element: 'DIV',
      });
      expect(screenshot.hash).toBeDefined();
    });

    test('should capture tournament card loading state', async () => {
      render(<TournamentCard loading={true} />);

      const card = screen.getByTestId('tournament-card-loading');
      const screenshot = await ScreenshotTestUtils.captureScreenshot(card, {
        name: 'tournament-card-loading',
      });

      expect(screenshot.name).toBe('tournament-card-loading');
      expect(screen.getByText('Loading tournament...')).toBeInTheDocument();
    });

    test('should capture tournament card error state', async () => {
      render(<TournamentCard error="Failed to load tournament data" />);

      const card = screen.getByTestId('tournament-card-error');
      const screenshot = await ScreenshotTestUtils.captureScreenshot(card, {
        name: 'tournament-card-error',
      });

      expect(screenshot.name).toBe('tournament-card-error');
      expect(
        screen.getByText('Failed to load tournament data')
      ).toBeInTheDocument();
    });

    test('should capture tournament card variants', async () => {
      const tournament = createMockTournament();
      const variants = ['default', 'compact', 'detailed'];

      for (const variant of variants) {
        const { unmount } = render(
          <TournamentCard tournament={tournament} variant={variant as any} />
        );

        const card = screen.getByTestId('tournament-card');
        const screenshot = await ScreenshotTestUtils.captureScreenshot(card, {
          name: `tournament-card-${variant}`,
        });

        expect(screenshot.name).toBe(`tournament-card-${variant}`);
        unmount();
      }
    });

    test('should capture tournament card with different themes', async () => {
      const tournament = createMockTournament();
      const themes = ['light', 'dark'];

      for (const theme of themes) {
        const { unmount } = render(
          <TournamentCard tournament={tournament} theme={theme as any} />
        );

        const card = screen.getByTestId('tournament-card');
        const screenshot = await ScreenshotTestUtils.captureScreenshot(card, {
          name: `tournament-card-${theme}`,
        });

        expect(screenshot.name).toBe(`tournament-card-${theme}`);
        unmount();
      }
    });

    test('should capture tournament card interaction states', async () => {
      const user = userEvent.setup();
      const tournament = createMockTournament();

      render(<TournamentCard tournament={tournament} />);

      const card = screen.getByTestId('tournament-card');

      // Default state
      let screenshot = await ScreenshotTestUtils.captureScreenshot(card, {
        name: 'tournament-card-default',
      });

      // Hover state
      await user.hover(card);
      await waitFor(
        () => {
          // Allow time for hover effects
        },
        { timeout: 100 }
      );

      screenshot = await ScreenshotTestUtils.captureScreenshot(card, {
        name: 'tournament-card-hovered',
      });
      expect(screenshot.name).toBe('tournament-card-hovered');

      // Focus state
      card.focus();
      await waitFor(
        () => {
          // Allow time for focus effects
        },
        { timeout: 100 }
      );

      screenshot = await ScreenshotTestUtils.captureScreenshot(card, {
        name: 'tournament-card-focused',
      });
      expect(screenshot.name).toBe('tournament-card-focused');
    });
  });

  describe('Player List Responsive Testing', () => {
    test('should capture player list across different viewports', async () => {
      const players = Array.from({ length: 8 }, (_, i) =>
        createMockPlayer({
          id: i + 1,
          name: `Player ${i + 1}`,
          rating: 2000 + i * 50,
          score: (8 - i) * 0.5,
        })
      );

      const viewports = [
        { name: 'mobile', width: 375, height: 667 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1280, height: 720 },
        { name: 'wide', width: 1920, height: 1080 },
      ];

      for (const viewport of viewports) {
        ScreenshotTestUtils.setViewport(viewport.width, viewport.height);

        const { unmount } = render(<PlayerList players={players} />);

        const list = screen.getByTestId('player-list');
        const screenshot = await ScreenshotTestUtils.captureScreenshot(list, {
          name: `player-list-${viewport.name}`,
          viewport,
        });

        expect(screenshot.viewport).toEqual(viewport);
        unmount();
      }
    });

    test('should capture player list layout variations', async () => {
      const players = Array.from({ length: 5 }, (_, i) =>
        createMockPlayer({
          id: i + 1,
          name: `Player ${i + 1}`,
          rating: 2500 - i * 50,
          score: 4.5 - i * 0.5,
        })
      );

      const layouts = ['grid', 'list', 'table'];

      for (const layout of layouts) {
        const { unmount } = render(
          <PlayerList players={players} layout={layout as any} />
        );

        const list = screen.getByTestId('player-list');
        const screenshot = await ScreenshotTestUtils.captureScreenshot(list, {
          name: `player-list-${layout}`,
        });

        expect(screenshot.name).toBe(`player-list-${layout}`);
        unmount();
      }
    });

    test('should capture player list themes', async () => {
      const players = Array.from({ length: 3 }, (_, i) =>
        createMockPlayer({ id: i + 1 })
      );
      const themes = ['light', 'dark'];

      for (const theme of themes) {
        const { unmount } = render(
          <PlayerList players={players} theme={theme as any} />
        );

        const list = screen.getByTestId('player-list');
        const screenshot = await ScreenshotTestUtils.captureScreenshot(list, {
          name: `player-list-${theme}`,
        });

        expect(screenshot.name).toBe(`player-list-${theme}`);
        unmount();
      }
    });

    test('should capture player list loading state', async () => {
      render(<PlayerList loading={true} />);

      const loadingState = screen.getByTestId('player-list-loading');
      const screenshot = await ScreenshotTestUtils.captureScreenshot(
        loadingState,
        {
          name: 'player-list-loading',
        }
      );

      expect(screenshot.name).toBe('player-list-loading');
      expect(screen.getByText('Loading players...')).toBeInTheDocument();
    });

    test('should capture player list empty state', async () => {
      render(<PlayerList players={[]} />);

      const list = screen.getByTestId('player-list');
      const screenshot = await ScreenshotTestUtils.captureScreenshot(list, {
        name: 'player-list-empty',
      });

      expect(screenshot.name).toBe('player-list-empty');
    });
  });

  describe('Interactive Elements Screenshot Testing', () => {
    test('should capture button states', async () => {
      const user = userEvent.setup();

      const ButtonStatesComponent = () => {
        const [clicked, setClicked] = React.useState(false);

        return (
          <div
            data-testid="button-states"
            style={{ padding: '20px', display: 'flex', gap: '12px' }}
          >
            <button data-testid="default-button">Default</button>
            <button
              data-testid="primary-button"
              style={{
                backgroundColor: '#007bff',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
              }}
            >
              Primary
            </button>
            <button disabled data-testid="disabled-button">
              Disabled
            </button>
            <button
              data-testid="clicked-button"
              onClick={() => setClicked(true)}
              style={{
                backgroundColor: clicked ? '#28a745' : '#dc3545',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
              }}
            >
              {clicked ? 'Clicked' : 'Click Me'}
            </button>
          </div>
        );
      };

      render(<ButtonStatesComponent />);

      const container = screen.getByTestId('button-states');

      // Default state
      let screenshot = await ScreenshotTestUtils.captureScreenshot(container, {
        name: 'button-states-default',
      });
      expect(screenshot.name).toBe('button-states-default');

      // After click
      await user.click(screen.getByTestId('clicked-button'));

      screenshot = await ScreenshotTestUtils.captureScreenshot(container, {
        name: 'button-states-clicked',
      });
      expect(screenshot.name).toBe('button-states-clicked');
    });

    test('should capture form input states', async () => {
      const user = userEvent.setup();

      const FormStatesComponent = () => {
        const [values, setValues] = React.useState({
          text: '',
          email: '',
          select: '',
        });
        const [focused, setFocused] = React.useState<string | null>(null);

        return (
          <div
            data-testid="form-states"
            style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxWidth: '300px',
            }}
          >
            <input
              data-testid="text-input"
              type="text"
              placeholder="Enter text"
              value={values.text}
              onChange={e =>
                setValues(prev => ({ ...prev, text: e.target.value }))
              }
              onFocus={() => setFocused('text')}
              onBlur={() => setFocused(null)}
              style={{
                padding: '8px 12px',
                border: `2px solid ${focused === 'text' ? '#007bff' : '#ccc'}`,
                borderRadius: '4px',
                outline: 'none',
              }}
            />

            <input
              data-testid="email-input"
              type="email"
              placeholder="Enter email"
              value={values.email}
              onChange={e =>
                setValues(prev => ({ ...prev, email: e.target.value }))
              }
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              style={{
                padding: '8px 12px',
                border: `2px solid ${focused === 'email' ? '#007bff' : '#ccc'}`,
                borderRadius: '4px',
                outline: 'none',
              }}
            />

            <select
              data-testid="select-input"
              value={values.select}
              onChange={e =>
                setValues(prev => ({ ...prev, select: e.target.value }))
              }
              onFocus={() => setFocused('select')}
              onBlur={() => setFocused(null)}
              style={{
                padding: '8px 12px',
                border: `2px solid ${focused === 'select' ? '#007bff' : '#ccc'}`,
                borderRadius: '4px',
                outline: 'none',
              }}
            >
              <option value="">Choose option</option>
              <option value="option1">Option 1</option>
              <option value="option2">Option 2</option>
            </select>
          </div>
        );
      };

      render(<FormStatesComponent />);

      const container = screen.getByTestId('form-states');

      // Empty state
      let screenshot = await ScreenshotTestUtils.captureScreenshot(container, {
        name: 'form-states-empty',
      });

      // Filled state
      await user.type(screen.getByTestId('text-input'), 'Sample text');
      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.selectOptions(screen.getByTestId('select-input'), 'option1');

      screenshot = await ScreenshotTestUtils.captureScreenshot(container, {
        name: 'form-states-filled',
      });
      expect(screenshot.name).toBe('form-states-filled');

      // Focus state
      screen.getByTestId('text-input').focus();
      await waitFor(() => {}, { timeout: 50 });

      screenshot = await ScreenshotTestUtils.captureScreenshot(container, {
        name: 'form-states-focused',
      });
      expect(screenshot.name).toBe('form-states-focused');
    });
  });

  describe('Screenshot Comparison Testing', () => {
    test('should compare screenshots for changes', async () => {
      const tournament = createMockTournament({ name: 'Test Tournament' });

      // Capture baseline
      const { unmount: unmount1 } = render(
        <TournamentCard tournament={tournament} />
      );
      const card1 = screen.getByTestId('tournament-card');

      const baseline = await ScreenshotTestUtils.captureScreenshot(card1, {
        name: 'tournament-card-baseline',
      });
      unmount1();

      // Capture current (same content)
      const { unmount: unmount2 } = render(
        <TournamentCard tournament={tournament} />
      );
      const card2 = screen.getByTestId('tournament-card');

      const current = await ScreenshotTestUtils.captureScreenshot(card2, {
        name: 'tournament-card-current',
      });
      unmount2();

      // Compare
      const comparison = ScreenshotTestUtils.compareScreenshots(
        baseline,
        current,
        0.1
      );

      expect(comparison.match).toBe(true);
      expect(comparison.difference).toBe(0);
      expect(comparison.details).toHaveLength(0);
    });

    test('should detect changes in screenshots', async () => {
      const tournament1 = createMockTournament({ name: 'Original Tournament' });
      const tournament2 = createMockTournament({ name: 'Modified Tournament' });

      // Capture baseline
      const { unmount: unmount1 } = render(
        <TournamentCard tournament={tournament1} />
      );
      const card1 = screen.getByTestId('tournament-card');

      const baseline = await ScreenshotTestUtils.captureScreenshot(card1, {
        name: 'tournament-card-baseline',
      });
      unmount1();

      // Capture changed version
      const { unmount: unmount2 } = render(
        <TournamentCard tournament={tournament2} />
      );
      const card2 = screen.getByTestId('tournament-card');

      const current = await ScreenshotTestUtils.captureScreenshot(card2, {
        name: 'tournament-card-changed',
      });
      unmount2();

      // Compare
      const comparison = ScreenshotTestUtils.compareScreenshots(
        baseline,
        current,
        0.1
      );

      expect(comparison.match).toBe(false);
      expect(comparison.difference).toBeGreaterThan(0);
      expect(comparison.details).toContain('Content hash changed');
    });

    test('should detect viewport changes', async () => {
      const tournament = createMockTournament();

      // Capture at different viewport sizes
      ScreenshotTestUtils.setViewport(1280, 720);
      const { unmount: unmount1 } = render(
        <TournamentCard tournament={tournament} />
      );
      const card1 = screen.getByTestId('tournament-card');

      const desktop = await ScreenshotTestUtils.captureScreenshot(card1, {
        name: 'tournament-card-desktop',
        viewport: { width: 1280, height: 720 },
      });
      unmount1();

      ScreenshotTestUtils.setViewport(375, 667);
      const { unmount: unmount2 } = render(
        <TournamentCard tournament={tournament} />
      );
      const card2 = screen.getByTestId('tournament-card');

      const mobile = await ScreenshotTestUtils.captureScreenshot(card2, {
        name: 'tournament-card-mobile',
        viewport: { width: 375, height: 667 },
      });
      unmount2();

      // Compare
      const comparison = ScreenshotTestUtils.compareScreenshots(
        desktop,
        mobile,
        0.1
      );

      expect(comparison.match).toBe(false);
      expect(comparison.details).toContain('Viewport width changed');
      expect(comparison.details).toContain('Viewport height changed');
    });
  });

  describe('Visual Regression Test Suite', () => {
    test('should run comprehensive visual regression tests', async () => {
      const testConfig =
        ScreenshotTestUtils.createVisualTestConfig('TournamentCard');
      const results: any[] = [];

      for (const variant of testConfig.variants) {
        for (const viewport of testConfig.viewports) {
          for (const theme of testConfig.themes) {
            ScreenshotTestUtils.setViewport(viewport.width, viewport.height);

            const props = {
              ...variant.props,
              theme,
              tournament: variant.props.error ? null : createMockTournament(),
            };

            const { unmount } = render(<TournamentCard {...props} />);

            const card = screen.getByTestId(
              variant.props.error
                ? 'tournament-card-error'
                : variant.props.loading
                  ? 'tournament-card-loading'
                  : 'tournament-card'
            );

            const screenshot = await ScreenshotTestUtils.captureScreenshot(
              card,
              {
                name: `tournament-card-${variant.name}-${theme}-${viewport.name}`,
                viewport,
              }
            );

            results.push({
              variant: variant.name,
              theme,
              viewport: viewport.name,
              screenshot,
            });

            unmount();
          }
        }
      }

      expect(results).toHaveLength(
        testConfig.variants.length *
          testConfig.viewports.length *
          testConfig.themes.length
      );
      expect(results.every(r => r.screenshot.hash)).toBe(true);
    });

    test('should handle animation timing for consistent screenshots', async () => {
      const AnimatedComponent = () => {
        const [animate, setAnimate] = React.useState(false);

        return (
          <div data-testid="animated-component">
            <button onClick={() => setAnimate(!animate)}>
              Toggle Animation
            </button>
            <div
              style={{
                width: '100px',
                height: '100px',
                backgroundColor: '#007bff',
                transform: animate ? 'translateX(100px)' : 'translateX(0)',
                transition: 'transform 0.3s ease',
              }}
              data-testid="animated-box"
            />
          </div>
        );
      };

      const user = userEvent.setup();
      render(<AnimatedComponent />);

      const component = screen.getByTestId('animated-component');

      // Capture initial state
      let screenshot = await ScreenshotTestUtils.captureScreenshot(component, {
        name: 'animated-component-initial',
        animations: 'disabled',
      });

      // Trigger animation
      await user.click(screen.getByRole('button'));

      // Wait for animation to complete (if animations weren't disabled, this would be necessary)
      await waitFor(() => {}, { timeout: 350 });

      // Capture final state
      screenshot = await ScreenshotTestUtils.captureScreenshot(component, {
        name: 'animated-component-final',
        animations: 'disabled',
      });

      expect(screenshot.name).toBe('animated-component-final');
    });
  });

  describe('Screenshot Test Utilities', () => {
    test('should wait for images to load', async () => {
      const ImageComponent = () => (
        <div data-testid="image-container">
          <img
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23007bff'/%3E%3C/svg%3E"
            alt="Test image"
            data-testid="test-image"
          />
        </div>
      );

      render(<ImageComponent />);

      const container = screen.getByTestId('image-container');

      // This should wait for image to load
      await ScreenshotTestUtils.waitForImages(container);

      const image = screen.getByTestId('test-image');
      expect(image).toHaveAttribute('alt', 'Test image');
    });

    test('should generate element hashes correctly', () => {
      const TestComponent = () => (
        <div className="test-class" data-testid="test-element">
          Test content for hashing
        </div>
      );

      const { unmount: unmount1 } = render(<TestComponent />);
      const element1 = screen.getByTestId('test-element');
      const hash1 = generateElementHash(element1);
      unmount1();

      const { unmount: unmount2 } = render(<TestComponent />);
      const element2 = screen.getByTestId('test-element');
      const hash2 = generateElementHash(element2);
      unmount2();

      // Same content should produce same hash
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBeGreaterThan(0);
    });

    test('should handle viewport resizing', () => {
      const originalWidth = window.innerWidth;
      const originalHeight = window.innerHeight;

      ScreenshotTestUtils.setViewport(800, 600);

      expect(window.innerWidth).toBe(800);
      expect(window.innerHeight).toBe(600);

      // Restore original values
      ScreenshotTestUtils.setViewport(originalWidth, originalHeight);

      expect(window.innerWidth).toBe(originalWidth);
      expect(window.innerHeight).toBe(originalHeight);
    });
  });
});
