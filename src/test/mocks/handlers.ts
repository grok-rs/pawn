import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock Tauri commands
  http.post('/__tauri__/command', async ({ request }) => {
    const body = await request.json();
    const { cmd, payload } = body as { cmd: string; payload?: any };

    // Mock tournament commands
    if (cmd === 'get_tournaments') {
      return HttpResponse.json([
        { id: 1, name: 'Test Tournament', playerCount: 16 },
        { id: 2, name: 'Mock Championship', playerCount: 32 },
      ]);
    }

    if (cmd === 'create_tournament') {
      return HttpResponse.json({
        id: Date.now(),
        name: payload.name,
        playerCount: 0,
      });
    }

    // Mock player commands
    if (cmd === 'get_players_by_tournament_enhanced') {
      return HttpResponse.json([
        {
          id: 1,
          name: 'Test Player 1',
          rating: 1500,
          countryCode: 'US',
          title: '',
        },
        {
          id: 2,
          name: 'Test Player 2',
          rating: 1600,
          countryCode: 'UK',
          title: 'FM',
        },
      ]);
    }

    // Default response for unknown commands
    return HttpResponse.json(
      { error: `Unknown command: ${cmd}` },
      { status: 400 }
    );
  }),

  // Mock any external API calls
  http.get('*/api/*', () => {
    return HttpResponse.json({ message: 'Mock API response' });
  }),
];
