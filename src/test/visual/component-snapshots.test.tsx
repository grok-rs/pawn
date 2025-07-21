import React from 'react';
import { render } from '@testing-library/react';
import { createMockTournament, createMockPlayer } from '../utils/test-utils';

// Mock components for visual testing - import actual components as needed
// These would normally import the real components from your app
const MockButton = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  ...props
}: any) => (
  <button
    className={`btn btn-${variant} btn-${size} ${disabled ? 'btn-disabled' : ''}`}
    disabled={disabled}
    {...props}
  >
    {children}
  </button>
);

const MockStatCard = ({
  title,
  value,
  subtitle,
  trend,
  color = 'primary',
  ...props
}: any) => (
  <div className={`stat-card stat-card-${color}`} {...props}>
    <div className="stat-card-header">
      <h3 className="stat-card-title">{title}</h3>
      {trend && (
        <span
          className={`stat-card-trend ${trend > 0 ? 'positive' : 'negative'}`}
        >
          {trend}%
        </span>
      )}
    </div>
    <div className="stat-card-value">{value}</div>
    {subtitle && <div className="stat-card-subtitle">{subtitle}</div>}
  </div>
);

const MockEmptyState = ({
  title,
  description,
  action,
  icon,
  ...props
}: any) => (
  <div className="empty-state" {...props}>
    {icon && <div className="empty-state-icon">{icon}</div>}
    <h3 className="empty-state-title">{title}</h3>
    <p className="empty-state-description">{description}</p>
    {action && <div className="empty-state-action">{action}</div>}
  </div>
);

const MockLoadingButton = ({ loading = false, children, ...props }: any) => (
  <button
    className={`loading-btn ${loading ? 'loading' : ''}`}
    disabled={loading}
    {...props}
  >
    {loading && <span className="spinner" />}
    <span>{children}</span>
  </button>
);

// Visual testing utilities

const createResponsiveVisualTest = (
  name: string,
  component: React.ReactElement
) => {
  const breakpoints = [
    { name: 'mobile', width: 375 },
    { name: 'tablet', width: 768 },
    { name: 'desktop', width: 1024 },
    { name: 'large-desktop', width: 1440 },
  ];

  breakpoints.forEach(({ name: breakpointName, width }) => {
    test(`${name} - ${breakpointName} (${width}px) visual snapshot`, () => {
      // Mock window dimensions
      Object.defineProperty(window, 'innerWidth', {
        value: width,
        configurable: true,
      });
      Object.defineProperty(window, 'innerHeight', {
        value: 800,
        configurable: true,
      });

      // Trigger resize event
      window.dispatchEvent(new Event('resize'));

      const { container } = render(component);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
};

const createStateVisualTest = (
  name: string,
  componentStates: Array<{ stateName: string; component: React.ReactElement }>
) => {
  componentStates.forEach(({ stateName, component }) => {
    test(`${name} - ${stateName} state visual snapshot`, () => {
      const { container } = render(component);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
};

describe('Visual Regression Tests - Component Snapshots', () => {
  describe('Button Component', () => {
    createStateVisualTest('Button', [
      {
        stateName: 'primary',
        component: <MockButton variant="primary">Primary Button</MockButton>,
      },
      {
        stateName: 'secondary',
        component: (
          <MockButton variant="secondary">Secondary Button</MockButton>
        ),
      },
      {
        stateName: 'success',
        component: <MockButton variant="success">Success Button</MockButton>,
      },
      {
        stateName: 'danger',
        component: <MockButton variant="danger">Danger Button</MockButton>,
      },
      {
        stateName: 'disabled',
        component: <MockButton disabled>Disabled Button</MockButton>,
      },
      {
        stateName: 'small',
        component: <MockButton size="small">Small Button</MockButton>,
      },
      {
        stateName: 'large',
        component: <MockButton size="large">Large Button</MockButton>,
      },
    ]);

    createResponsiveVisualTest(
      'Button Responsive',
      <MockButton variant="primary">Responsive Button</MockButton>
    );
  });

  describe('StatCard Component', () => {
    createStateVisualTest('StatCard', [
      {
        stateName: 'basic',
        component: (
          <MockStatCard
            title="Total Players"
            value="156"
            subtitle="Registered this month"
          />
        ),
      },
      {
        stateName: 'with-trend-positive',
        component: (
          <MockStatCard
            title="Active Tournaments"
            value="12"
            subtitle="Currently running"
            trend={15}
            color="success"
          />
        ),
      },
      {
        stateName: 'with-trend-negative',
        component: (
          <MockStatCard
            title="Completion Rate"
            value="87%"
            subtitle="This week"
            trend={-3}
            color="warning"
          />
        ),
      },
      {
        stateName: 'large-numbers',
        component: (
          <MockStatCard
            title="Total Games Played"
            value="23,456"
            subtitle="Since launch"
            color="primary"
          />
        ),
      },
    ]);
  });

  describe('EmptyState Component', () => {
    createStateVisualTest('EmptyState', [
      {
        stateName: 'basic',
        component: (
          <MockEmptyState
            title="No tournaments yet"
            description="Create your first tournament to get started."
          />
        ),
      },
      {
        stateName: 'with-action',
        component: (
          <MockEmptyState
            title="No players found"
            description="Add players to this tournament to begin pairing rounds."
            action={<MockButton variant="primary">Add Players</MockButton>}
          />
        ),
      },
      {
        stateName: 'with-icon',
        component: (
          <MockEmptyState
            title="No results available"
            description="Complete some games to see tournament standings."
            icon="🏆"
          />
        ),
      },
    ]);
  });

  describe('LoadingButton Component', () => {
    createStateVisualTest('LoadingButton', [
      {
        stateName: 'idle',
        component: <MockLoadingButton>Save Tournament</MockLoadingButton>,
      },
      {
        stateName: 'loading',
        component: <MockLoadingButton loading>Saving...</MockLoadingButton>,
      },
    ]);
  });

  describe('Data Display Components', () => {
    test('Player profile card - visual snapshot', () => {
      const mockPlayer = createMockPlayer({
        name: 'Alice Johnson',
        rating: 1650,
        title: 'WFM',
        countryCode: 'US',
      });

      const PlayerCard = ({ player }: { player: any }) => (
        <div className="player-card">
          <div className="player-card-header">
            <div className="player-name">
              {player.title && (
                <span className="player-title">{player.title}</span>
              )}
              {player.name}
            </div>
            <div className="player-country">{player.countryCode}</div>
          </div>
          <div className="player-rating">{player.rating}</div>
          <div className="player-details">
            <span>Email: {player.email}</span>
            <span>Phone: {player.phone}</span>
          </div>
        </div>
      );

      const { container } = render(<PlayerCard player={mockPlayer} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    test('Tournament card - visual snapshot', () => {
      const mockTournament = createMockTournament({
        name: 'Spring Championship 2024',
        playerCount: 32,
        status: 'active',
        maxRounds: 7,
      });

      const TournamentCard = ({ tournament }: { tournament: any }) => (
        <div className="tournament-card">
          <div className="tournament-card-header">
            <h3 className="tournament-name">{tournament.name}</h3>
            <span className={`tournament-status status-${tournament.status}`}>
              {tournament.status}
            </span>
          </div>
          <div className="tournament-stats">
            <div className="stat">
              <span className="stat-label">Players</span>
              <span className="stat-value">{tournament.playerCount}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Rounds</span>
              <span className="stat-value">
                {tournament.rounds}/{tournament.maxRounds}
              </span>
            </div>
          </div>
          <div className="tournament-actions">
            <MockButton variant="primary" size="small">
              View Details
            </MockButton>
            <MockButton variant="secondary" size="small">
              Export
            </MockButton>
          </div>
        </div>
      );

      const { container } = render(
        <TournamentCard tournament={mockTournament} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Form Components', () => {
    test('Tournament form - visual snapshot', () => {
      const TournamentForm = () => (
        <form className="tournament-form">
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-field">
              <label>Tournament Name</label>
              <input
                type="text"
                className="form-input"
                defaultValue="Spring Championship 2024"
              />
            </div>
            <div className="form-field">
              <label>Description</label>
              <textarea
                className="form-textarea"
                rows={3}
                defaultValue="Annual spring tournament"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Tournament Settings</h3>
            <div className="form-row">
              <div className="form-field">
                <label>Max Players</label>
                <input type="number" className="form-input" defaultValue="16" />
              </div>
              <div className="form-field">
                <label>Max Rounds</label>
                <input type="number" className="form-input" defaultValue="5" />
              </div>
            </div>
            <div className="form-field">
              <label>Pairing Method</label>
              <select className="form-select" defaultValue="swiss">
                <option value="swiss">Swiss System</option>
                <option value="round_robin">Round Robin</option>
                <option value="knockout">Knockout</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <MockButton variant="secondary">Cancel</MockButton>
            <MockButton variant="primary">Create Tournament</MockButton>
          </div>
        </form>
      );

      const { container } = render(<TournamentForm />);
      expect(container.firstChild).toMatchSnapshot();
    });

    test('Player form - visual snapshot', () => {
      const PlayerForm = () => (
        <form className="player-form">
          <div className="form-section">
            <h3>Personal Information</h3>
            <div className="form-row">
              <div className="form-field">
                <label>Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  defaultValue="Alice Johnson"
                />
              </div>
              <div className="form-field">
                <label>Title</label>
                <select className="form-select" defaultValue="WFM">
                  <option value="">No Title</option>
                  <option value="CM">CM</option>
                  <option value="FM">FM</option>
                  <option value="WFM">WFM</option>
                  <option value="IM">IM</option>
                  <option value="GM">GM</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Rating</label>
                <input
                  type="number"
                  className="form-input"
                  defaultValue="1650"
                />
              </div>
              <div className="form-field">
                <label>Country</label>
                <select className="form-select" defaultValue="US">
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="UK">United Kingdom</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Contact Information</h3>
            <div className="form-field">
              <label>Email</label>
              <input
                type="email"
                className="form-input"
                defaultValue="alice@example.com"
              />
            </div>
            <div className="form-field">
              <label>Phone</label>
              <input
                type="tel"
                className="form-input"
                defaultValue="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="form-actions">
            <MockButton variant="secondary">Cancel</MockButton>
            <MockButton variant="primary">Save Player</MockButton>
          </div>
        </form>
      );

      const { container } = render(<PlayerForm />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Layout Components', () => {
    test('Navigation header - visual snapshot', () => {
      const Navigation = () => (
        <header className="app-header">
          <div className="nav-brand">
            <h1>♜ Pawn</h1>
          </div>
          <nav className="nav-menu">
            <a href="/tournaments" className="nav-link active">
              Tournaments
            </a>
            <a href="/players" className="nav-link">
              Players
            </a>
            <a href="/settings" className="nav-link">
              Settings
            </a>
          </nav>
          <div className="nav-actions">
            <MockButton variant="primary" size="small">
              New Tournament
            </MockButton>
          </div>
        </header>
      );

      const { container } = render(<Navigation />);
      expect(container.firstChild).toMatchSnapshot();
    });

    createResponsiveVisualTest(
      'Navigation Responsive',
      <header className="app-header">
        <div className="nav-brand">
          <h1>♜ Pawn</h1>
        </div>
        <nav className="nav-menu">
          <a href="/tournaments" className="nav-link active">
            Tournaments
          </a>
          <a href="/players" className="nav-link">
            Players
          </a>
          <a href="/settings" className="nav-link">
            Settings
          </a>
        </nav>
      </header>
    );

    test('Sidebar layout - visual snapshot', () => {
      const SidebarLayout = () => (
        <div className="app-layout">
          <aside className="sidebar">
            <div className="sidebar-header">
              <h2>Tournament Menu</h2>
            </div>
            <nav className="sidebar-nav">
              <a href="#overview" className="sidebar-link active">
                Overview
              </a>
              <a href="#players" className="sidebar-link">
                Players
              </a>
              <a href="#pairings" className="sidebar-link">
                Pairings
              </a>
              <a href="#results" className="sidebar-link">
                Results
              </a>
              <a href="#standings" className="sidebar-link">
                Standings
              </a>
            </nav>
          </aside>
          <main className="main-content">
            <div className="content-header">
              <h1>Tournament Overview</h1>
              <MockButton variant="primary">Edit Tournament</MockButton>
            </div>
            <div className="content-body">
              <p>Main content area</p>
            </div>
          </main>
        </div>
      );

      const { container } = render(<SidebarLayout />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Theme Variations', () => {
    test('Dark theme components - visual snapshot', () => {
      const DarkThemeDemo = () => (
        <div className="theme-dark">
          <div className="card">
            <h3>Dark Theme Card</h3>
            <p>This demonstrates dark theme styling</p>
            <div className="button-group">
              <MockButton variant="primary">Primary</MockButton>
              <MockButton variant="secondary">Secondary</MockButton>
            </div>
          </div>
          <MockStatCard
            title="Dark Theme Stats"
            value="42"
            subtitle="Looking good in dark mode"
            color="primary"
          />
        </div>
      );

      const { container } = render(<DarkThemeDemo />);
      expect(container.firstChild).toMatchSnapshot();
    });

    test('High contrast theme - visual snapshot', () => {
      const HighContrastDemo = () => (
        <div className="theme-high-contrast">
          <div className="card">
            <h3>High Contrast Theme</h3>
            <p>Accessibility-focused high contrast theme</p>
            <div className="button-group">
              <MockButton variant="primary">Primary Action</MockButton>
              <MockButton variant="secondary">Secondary Action</MockButton>
            </div>
          </div>
          <MockEmptyState
            title="High Contrast Empty State"
            description="Clear visibility for all users"
            action={<MockButton variant="primary">Take Action</MockButton>}
          />
        </div>
      );

      const { container } = render(<HighContrastDemo />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Error States', () => {
    test('Error message components - visual snapshot', () => {
      const ErrorStates = () => (
        <div className="error-states">
          <div className="error-banner error-banner-danger">
            <strong>Error:</strong> Failed to save tournament data.
          </div>
          <div className="error-banner error-banner-warning">
            <strong>Warning:</strong> Some player ratings are missing.
          </div>
          <div className="error-banner error-banner-info">
            <strong>Info:</strong> Tournament will start in 30 minutes.
          </div>
          <div className="error-inline">
            <span className="error-text">Invalid email format</span>
          </div>
        </div>
      );

      const { container } = render(<ErrorStates />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
