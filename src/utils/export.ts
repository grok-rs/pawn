import type { PlayerStanding } from '../dto/bindings';

export const exportStandingsToCsv = (
  standings: PlayerStanding[],
  tournamentName: string
) => {
  // CSV headers
  const headers = [
    'Rank',
    'Name',
    'Country',
    'Rating',
    'Points',
    'Games',
    'Wins',
    'Draws',
    'Losses',
    'TPR',
    ...(standings[0]?.tiebreak_scores.map((_, index) => `TB${index + 1}`) ||
      []),
  ];

  // Convert standings to CSV rows
  const rows = standings.map(standing => [
    standing.rank,
    standing.player.name,
    standing.player.country_code || '',
    standing.player.rating || 'Unrated',
    standing.points,
    standing.games_played,
    standing.wins,
    standing.draws,
    standing.losses,
    standing.performance_rating || '',
    ...standing.tiebreak_scores.map(tb => tb.display_value),
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `${tournamentName.replace(/\s+/g, '_')}_standings.csv`
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportStandingsToPdf = async (
  _standings: PlayerStanding[],
  _tournamentName: string
) => {
  // TODO: Implement PDF export using a library like jsPDF
  console.log('PDF export not yet implemented');

  // For now, we'll just open the print dialog
  window.print();
};
