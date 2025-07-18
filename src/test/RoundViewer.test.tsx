import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RoundViewer from '../components/RoundViewer/RoundViewer';

// Mock the translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('RoundViewer', () => {
  it('renders the component correctly', () => {
    render(<RoundViewer tournamentId={1} />);

    expect(screen.getByText('roundViewer.title')).toBeInTheDocument();
    expect(screen.getByText('roundViewer.navigation')).toBeInTheDocument();
  });

  it('displays round navigation controls', () => {
    render(<RoundViewer tournamentId={1} />);

    // Check for navigation buttons
    expect(
      screen.getByRole('button', { name: /First Page/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Navigate Before/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Navigate Next/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Last Page/i })
    ).toBeInTheDocument();
  });

  it('displays view mode selection buttons', () => {
    render(<RoundViewer tournamentId={1} />);

    expect(screen.getByText('roundViewer.history')).toBeInTheDocument();
    expect(screen.getByText('roundViewer.standings')).toBeInTheDocument();
    expect(screen.getByText('roundViewer.games')).toBeInTheDocument();
    expect(screen.getByText('roundViewer.statistics')).toBeInTheDocument();
    expect(screen.getByText('roundViewer.progression')).toBeInTheDocument();
  });

  it('allows switching between view modes', () => {
    render(<RoundViewer tournamentId={1} />);

    const standingsButton = screen.getByText('roundViewer.standings');
    fireEvent.click(standingsButton);

    // Should display standings content
    expect(
      screen.getByText('roundViewer.historicalStandings')
    ).toBeInTheDocument();
  });

  it('displays export dialog when export button is clicked', async () => {
    render(<RoundViewer tournamentId={1} />);

    const exportButton = screen.getByText('export');
    fireEvent.click(exportButton);

    expect(screen.getByText('roundViewer.exportRound')).toBeInTheDocument();
    expect(screen.getByText('roundViewer.exportFormat')).toBeInTheDocument();
  });
});
