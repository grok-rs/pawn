import { test, expect, type Page } from '@playwright/test';

// Helper functions for complex workflows
class TournamentWorkflow {
  constructor(private page: Page) {}

  async createTournament(config: {
    name: string;
    type?: 'individual' | 'team';
    maxPlayers?: number;
    maxRounds?: number;
    pairingMethod?: 'swiss' | 'round_robin' | 'knockout';
    timeControl?: {
      mainTime: number;
      increment: number;
      type: 'fischer' | 'bronstein' | 'delay';
    };
  }) {
    await this.page.goto('/');
    await this.page.click('[data-testid="new-tournament-button"]');

    await this.page.fill('[data-testid="tournament-name-input"]', config.name);

    if (config.type === 'team') {
      await this.page.click('[data-testid="tournament-type-select"]');
      await this.page.click('[data-testid="tournament-type-team"]');
    }

    if (config.maxPlayers) {
      await this.page.fill(
        '[data-testid="max-players-input"]',
        config.maxPlayers.toString()
      );
    }

    if (config.maxRounds) {
      await this.page.fill(
        '[data-testid="max-rounds-input"]',
        config.maxRounds.toString()
      );
    }

    if (config.pairingMethod) {
      await this.page.click('[data-testid="pairing-method-select"]');
      await this.page.click(
        `[data-testid="pairing-method-${config.pairingMethod}"]`
      );
    }

    if (config.timeControl) {
      await this.page.fill(
        '[data-testid="main-time-input"]',
        config.timeControl.mainTime.toString()
      );
      await this.page.fill(
        '[data-testid="increment-input"]',
        config.timeControl.increment.toString()
      );
      await this.page.click('[data-testid="time-control-type-select"]');
      await this.page.click(
        `[data-testid="time-control-type-${config.timeControl.type}"]`
      );
    }

    await this.page.click('[data-testid="create-tournament-button"]');

    // Wait for tournament to be created and navigate to tournament page
    await expect(this.page).toHaveURL(/\/tournament\/\d+/);
  }

  async addPlayer(player: {
    name: string;
    rating?: number;
    title?: string;
    country?: string;
    email?: string;
    phone?: string;
    birthDate?: string;
    gender?: 'M' | 'F' | 'O';
  }) {
    await this.page.click('[data-testid="add-player-button"]');

    await this.page.fill('[data-testid="player-name-input"]', player.name);

    if (player.rating) {
      await this.page.fill(
        '[data-testid="player-rating-input"]',
        player.rating.toString()
      );
    }

    if (player.title) {
      await this.page.click('[data-testid="player-title-select"]');
      await this.page.click(`[data-testid="player-title-${player.title}"]`);
    }

    if (player.country) {
      await this.page.click('[data-testid="player-country-select"]');
      await this.page.click(`[data-testid="player-country-${player.country}"]`);
    }

    if (player.email) {
      await this.page.fill('[data-testid="player-email-input"]', player.email);
    }

    if (player.phone) {
      await this.page.fill('[data-testid="player-phone-input"]', player.phone);
    }

    if (player.birthDate) {
      await this.page.fill(
        '[data-testid="player-birth-date-input"]',
        player.birthDate
      );
    }

    if (player.gender) {
      await this.page.click('[data-testid="player-gender-select"]');
      await this.page.click(`[data-testid="player-gender-${player.gender}"]`);
    }

    await this.page.click('[data-testid="save-player-button"]');

    // Wait for player to be added
    await expect(this.page.locator(`text="${player.name}"`)).toBeVisible();
  }

  async generatePairings(roundNumber: number) {
    await this.page.click('[data-testid="pairings-tab"]');
    await this.page.click('[data-testid="generate-pairings-button"]');

    // Wait for pairings to be generated
    await expect(
      this.page.locator(`[data-testid="round-${roundNumber}-pairings"]`)
    ).toBeVisible();
  }

  async enterGameResult(
    gameId: string,
    result: 'white_wins' | 'black_wins' | 'draw',
    resultType: 'normal' | 'forfeit' | 'timeout' = 'normal'
  ) {
    await this.page.click('[data-testid="results-tab"]');

    const gameRow = this.page.locator(`[data-testid="game-${gameId}"]`);
    await gameRow.locator('[data-testid="result-select"]').click();
    await this.page.click(`[data-testid="result-option-${result}"]`);

    if (resultType !== 'normal') {
      await gameRow.locator('[data-testid="result-type-select"]').click();
      await this.page.click(`[data-testid="result-type-${resultType}"]`);
    }

    await gameRow.locator('[data-testid="submit-result-button"]').click();
  }

  async verifyStandings(
    expectedStandings: Array<{
      playerName: string;
      rank: number;
      points: number;
      tiebreaks?: number[];
    }>
  ) {
    await this.page.click('[data-testid="standings-tab"]');

    for (const standing of expectedStandings) {
      const playerRow = this.page.locator(
        `[data-testid="standings-row-${standing.rank}"]`
      );
      await expect(
        playerRow.locator('[data-testid="player-name"]')
      ).toContainText(standing.playerName);
      await expect(playerRow.locator('[data-testid="points"]')).toContainText(
        standing.points.toString()
      );

      if (standing.tiebreaks) {
        for (let i = 0; i < standing.tiebreaks.length; i++) {
          await expect(
            playerRow.locator(`[data-testid="tiebreak-${i}"]`)
          ).toContainText(standing.tiebreaks[i].toString());
        }
      }
    }
  }

  async exportTournamentData(format: 'json' | 'csv' | 'pdf' | 'pgn') {
    await this.page.click('[data-testid="export-button"]');
    await this.page.click(`[data-testid="export-format-${format}"]`);
    await this.page.click('[data-testid="export-confirm-button"]');

    // Wait for export to complete
    await expect(
      this.page.locator('[data-testid="export-success-message"]')
    ).toBeVisible();
  }
}

test.describe('Complex Tournament Workflows', () => {
  test.describe('Swiss System Tournament', () => {
    test('should handle complete 4-round Swiss tournament with 8 players', async ({
      page,
    }) => {
      const workflow = new TournamentWorkflow(page);

      // Create tournament
      await workflow.createTournament({
        name: 'Swiss Championship 2024',
        maxPlayers: 8,
        maxRounds: 4,
        pairingMethod: 'swiss',
        timeControl: {
          mainTime: 90,
          increment: 30,
          type: 'fischer',
        },
      });

      // Add 8 players with varying ratings
      const players = [
        { name: 'Alice Johnson', rating: 2100, title: 'IM', country: 'US' },
        { name: 'Bob Smith', rating: 1950, country: 'CA' },
        { name: 'Carlos Rodriguez', rating: 1850, title: 'FM', country: 'ES' },
        { name: 'Diana Chen', rating: 1800, country: 'CN' },
        { name: 'Erik Andersson', rating: 1750, country: 'SE' },
        { name: 'Fatima Al-Zahra', rating: 1700, country: 'SA' },
        { name: 'Giovanni Rossi', rating: 1650, country: 'IT' },
        { name: 'Helen Thompson', rating: 1600, country: 'AU' },
      ];

      for (const player of players) {
        await workflow.addPlayer(player);
      }

      // Round 1: Generate pairings and enter results
      await workflow.generatePairings(1);

      // Simulate round 1 results (higher rated players tend to win)
      await workflow.enterGameResult('game-1-1', 'white_wins'); // Alice beats Helen
      await workflow.enterGameResult('game-1-2', 'black_wins'); // Bob loses to Giovanni
      await workflow.enterGameResult('game-1-3', 'white_wins'); // Carlos beats Fatima
      await workflow.enterGameResult('game-1-4', 'draw'); // Diana draws with Erik

      // Check standings after round 1
      await workflow.verifyStandings([
        { playerName: 'Alice Johnson', rank: 1, points: 1.0 },
        { playerName: 'Carlos Rodriguez', rank: 2, points: 1.0 },
        { playerName: 'Giovanni Rossi', rank: 3, points: 1.0 },
        { playerName: 'Diana Chen', rank: 4, points: 0.5 },
        { playerName: 'Erik Andersson', rank: 5, points: 0.5 },
        { playerName: 'Bob Smith', rank: 6, points: 0.0 },
        { playerName: 'Fatima Al-Zahra', rank: 7, points: 0.0 },
        { playerName: 'Helen Thompson', rank: 8, points: 0.0 },
      ]);

      // Round 2: Generate pairings for winners and losers
      await workflow.generatePairings(2);

      // Round 2 results
      await workflow.enterGameResult('game-2-1', 'draw'); // Alice draws with Carlos
      await workflow.enterGameResult('game-2-2', 'white_wins'); // Giovanni beats Diana
      await workflow.enterGameResult('game-2-3', 'black_wins'); // Erik loses to Bob
      await workflow.enterGameResult('game-2-4', 'white_wins'); // Fatima beats Helen

      // Round 3: Continue tournament
      await workflow.generatePairings(3);

      await workflow.enterGameResult('game-3-1', 'white_wins'); // Alice beats Giovanni
      await workflow.enterGameResult('game-3-2', 'draw'); // Carlos draws with Bob
      await workflow.enterGameResult('game-3-3', 'white_wins'); // Diana beats Fatima
      await workflow.enterGameResult('game-3-4', 'black_wins'); // Erik loses to Helen

      // Round 4: Final round
      await workflow.generatePairings(4);

      await workflow.enterGameResult('game-4-1', 'white_wins'); // Alice beats Bob
      await workflow.enterGameResult('game-4-2', 'black_wins'); // Carlos loses to Giovanni
      await workflow.enterGameResult('game-4-3', 'draw'); // Diana draws with Helen
      await workflow.enterGameResult('game-4-4', 'white_wins'); // Erik beats Fatima

      // Verify final standings
      await workflow.verifyStandings([
        { playerName: 'Alice Johnson', rank: 1, points: 4.0 },
        { playerName: 'Giovanni Rossi', rank: 2, points: 3.0 },
        { playerName: 'Carlos Rodriguez', rank: 3, points: 2.5 },
        { playerName: 'Diana Chen', rank: 4, points: 2.0 },
        { playerName: 'Bob Smith', rank: 5, points: 1.5 },
        { playerName: 'Helen Thompson', rank: 6, points: 1.5 },
        { playerName: 'Erik Andersson', rank: 7, points: 1.0 },
        { playerName: 'Fatima Al-Zahra', rank: 8, points: 1.0 },
      ]);

      // Export final results
      await workflow.exportTournamentData('pgn');
    });

    test('should handle Swiss tournament with byes and late entries', async ({
      page,
    }) => {
      const workflow = new TournamentWorkflow(page);

      await workflow.createTournament({
        name: 'Open Swiss with Byes',
        maxPlayers: 16,
        maxRounds: 5,
        pairingMethod: 'swiss',
      });

      // Add 7 players initially (odd number requires bye)
      const initialPlayers = [
        { name: 'Player A', rating: 2000 },
        { name: 'Player B', rating: 1900 },
        { name: 'Player C', rating: 1800 },
        { name: 'Player D', rating: 1700 },
        { name: 'Player E', rating: 1600 },
        { name: 'Player F', rating: 1500 },
        { name: 'Player G', rating: 1400 },
      ];

      for (const player of initialPlayers) {
        await workflow.addPlayer(player);
      }

      // Round 1: Generate pairings (one player gets bye)
      await workflow.generatePairings(1);

      // Verify bye is assigned to lowest rated player
      await expect(page.locator('[data-testid="bye-player"]')).toContainText(
        'Player G'
      );

      // Enter results for round 1
      await workflow.enterGameResult('game-1-1', 'white_wins');
      await workflow.enterGameResult('game-1-2', 'draw');
      await workflow.enterGameResult('game-1-3', 'black_wins');

      // Add late entry after round 1
      await workflow.addPlayer({ name: 'Late Entry', rating: 1750 });

      // Round 2: Now we have 8 players, no bye needed
      await workflow.generatePairings(2);

      // Verify no bye in round 2
      await expect(
        page.locator('[data-testid="bye-player"]')
      ).not.toBeVisible();

      // Continue with remaining rounds...
      await workflow.enterGameResult('game-2-1', 'white_wins');
      await workflow.enterGameResult('game-2-2', 'draw');
      await workflow.enterGameResult('game-2-3', 'black_wins');
      await workflow.enterGameResult('game-2-4', 'white_wins');
    });
  });

  test.describe('Round Robin Tournament', () => {
    test('should handle complete round robin with 6 players', async ({
      page,
    }) => {
      const workflow = new TournamentWorkflow(page);

      await workflow.createTournament({
        name: 'Round Robin Championship',
        maxPlayers: 6,
        maxRounds: 5, // n-1 rounds for n players
        pairingMethod: 'round_robin',
      });

      const players = [
        { name: 'Anna', rating: 1800 },
        { name: 'Boris', rating: 1750 },
        { name: 'Clara', rating: 1700 },
        { name: 'David', rating: 1650 },
        { name: 'Elena', rating: 1600 },
        { name: 'Felix', rating: 1550 },
      ];

      for (const player of players) {
        await workflow.addPlayer(player);
      }

      // In round robin, all pairings are predetermined
      for (let round = 1; round <= 5; round++) {
        await workflow.generatePairings(round);

        // Each round has 3 games (6 players / 2)
        await workflow.enterGameResult(`game-${round}-1`, 'white_wins');
        await workflow.enterGameResult(`game-${round}-2`, 'draw');
        await workflow.enterGameResult(`game-${round}-3`, 'black_wins');

        // Verify round completion
        await expect(
          page.locator(`[data-testid="round-${round}-complete"]`)
        ).toBeVisible();
      }

      // Verify final standings (each player played 5 games)
      await page.click('[data-testid="standings-tab"]');
      await expect(
        page.locator('[data-testid="games-played"]').first()
      ).toContainText('5');
    });
  });

  test.describe('Team Tournament', () => {
    test('should handle team tournament with 4 teams', async ({ page }) => {
      const workflow = new TournamentWorkflow(page);

      await workflow.createTournament({
        name: 'Team Championship 2024',
        type: 'team',
        maxPlayers: 16, // 4 players per team
        maxRounds: 3,
      });

      // Create teams and add players
      const teams = [
        {
          name: 'Team Alpha',
          players: [
            { name: 'Alpha 1', rating: 2000 },
            { name: 'Alpha 2', rating: 1900 },
            { name: 'Alpha 3', rating: 1800 },
            { name: 'Alpha 4', rating: 1700 },
          ],
        },
        {
          name: 'Team Beta',
          players: [
            { name: 'Beta 1', rating: 1950 },
            { name: 'Beta 2', rating: 1850 },
            { name: 'Beta 3', rating: 1750 },
            { name: 'Beta 4', rating: 1650 },
          ],
        },
        {
          name: 'Team Gamma',
          players: [
            { name: 'Gamma 1', rating: 1900 },
            { name: 'Gamma 2', rating: 1800 },
            { name: 'Gamma 3', rating: 1700 },
            { name: 'Gamma 4', rating: 1600 },
          ],
        },
        {
          name: 'Team Delta',
          players: [
            { name: 'Delta 1', rating: 1850 },
            { name: 'Delta 2', rating: 1750 },
            { name: 'Delta 3', rating: 1650 },
            { name: 'Delta 4', rating: 1550 },
          ],
        },
      ];

      // Create teams and add players
      await page.click('[data-testid="teams-tab"]');

      for (const team of teams) {
        await page.click('[data-testid="create-team-button"]');
        await page.fill('[data-testid="team-name-input"]', team.name);
        await page.click('[data-testid="save-team-button"]');

        // Add players to team
        for (const player of team.players) {
          await workflow.addPlayer({ ...player, team: team.name });
        }
      }

      // Generate team pairings
      for (let round = 1; round <= 3; round++) {
        await workflow.generatePairings(round);

        // In team matches, each team plays another team
        // 4 individual games per team match
        for (let board = 1; board <= 4; board++) {
          await workflow.enterGameResult(
            `team-game-${round}-${board}`,
            'white_wins'
          );
        }
      }

      // Verify team standings
      await page.click('[data-testid="team-standings-tab"]');

      // Check team match points and game points
      await expect(
        page.locator('[data-testid="team-standings-table"]')
      ).toBeVisible();
    });
  });

  test.describe('Knockout Tournament', () => {
    test('should handle single elimination knockout with 8 players', async ({
      page,
    }) => {
      const workflow = new TournamentWorkflow(page);

      await workflow.createTournament({
        name: 'Knockout Championship',
        maxPlayers: 8,
        maxRounds: 3, // 3 rounds for 8 players (quarter, semi, final)
        pairingMethod: 'knockout',
      });

      const players = [
        { name: 'Seed 1', rating: 2000 },
        { name: 'Seed 2', rating: 1900 },
        { name: 'Seed 3', rating: 1800 },
        { name: 'Seed 4', rating: 1700 },
        { name: 'Seed 5', rating: 1600 },
        { name: 'Seed 6', rating: 1500 },
        { name: 'Seed 7', rating: 1400 },
        { name: 'Seed 8', rating: 1300 },
      ];

      for (const player of players) {
        await workflow.addPlayer(player);
      }

      // Quarterfinals (Round 1): 4 games, 4 winners advance
      await workflow.generatePairings(1);

      await workflow.enterGameResult('knockout-1-1', 'white_wins'); // Seed 1 beats Seed 8
      await workflow.enterGameResult('knockout-1-2', 'black_wins'); // Seed 4 loses to Seed 5
      await workflow.enterGameResult('knockout-1-3', 'white_wins'); // Seed 3 beats Seed 6
      await workflow.enterGameResult('knockout-1-4', 'white_wins'); // Seed 2 beats Seed 7

      // Verify eliminated players are marked
      await expect(
        page.locator('[data-testid="eliminated-player-8"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="eliminated-player-4"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="eliminated-player-6"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="eliminated-player-7"]')
      ).toBeVisible();

      // Semifinals (Round 2): 2 games, 2 winners advance
      await workflow.generatePairings(2);

      await workflow.enterGameResult('knockout-2-1', 'white_wins'); // Seed 1 beats Seed 5
      await workflow.enterGameResult('knockout-2-2', 'black_wins'); // Seed 3 loses to Seed 2

      // Final (Round 3): 1 game, 1 winner
      await workflow.generatePairings(3);

      await workflow.enterGameResult('knockout-3-1', 'white_wins'); // Seed 1 beats Seed 2

      // Verify final standings
      await workflow.verifyStandings([
        { playerName: 'Seed 1', rank: 1, points: 3.0 },
        { playerName: 'Seed 2', rank: 2, points: 2.0 },
        { playerName: 'Seed 3', rank: 3, points: 1.0 },
        { playerName: 'Seed 5', rank: 4, points: 1.0 },
      ]);
    });
  });

  test.describe('Data Import and Export', () => {
    test('should import players from CSV and export tournament data', async ({
      page,
    }) => {
      const workflow = new TournamentWorkflow(page);

      await workflow.createTournament({
        name: 'Import/Export Test Tournament',
        maxPlayers: 50,
        maxRounds: 7,
      });

      // Test bulk player import
      await page.click('[data-testid="players-tab"]');
      await page.click('[data-testid="import-players-button"]');

      // Create mock CSV content
      const csvContent = `Name,Rating,Country,Email,Phone,Title
John Doe,1800,US,john@example.com,555-1234,FM
Jane Smith,1750,CA,jane@example.com,555-5678,WFM
Mike Johnson,1700,UK,mike@example.com,555-9012,
Sarah Wilson,1650,AU,sarah@example.com,555-3456,`;

      // Upload CSV file
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles({
        name: 'players.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent),
      });

      // Validate import data
      await page.click('[data-testid="validate-import-button"]');

      // Check validation results
      await expect(
        page.locator('[data-testid="validation-success"]')
      ).toContainText('4 players ready for import');

      // Import players
      await page.click('[data-testid="confirm-import-button"]');

      // Verify players were imported
      await expect(page.locator('text="John Doe"')).toBeVisible();
      await expect(page.locator('text="Jane Smith"')).toBeVisible();
      await expect(page.locator('text="Mike Johnson"')).toBeVisible();
      await expect(page.locator('text="Sarah Wilson"')).toBeVisible();

      // Generate some pairings and results
      await workflow.generatePairings(1);
      await workflow.enterGameResult('game-1-1', 'white_wins');
      await workflow.enterGameResult('game-1-2', 'draw');

      // Test various export formats
      const exportFormats: Array<'json' | 'csv' | 'pdf' | 'pgn'> = [
        'json',
        'csv',
        'pdf',
        'pgn',
      ];

      for (const format of exportFormats) {
        await workflow.exportTournamentData(format);

        // Verify export success message
        await expect(
          page.locator('[data-testid="export-success-message"]')
        ).toContainText(
          `Tournament exported successfully as ${format.toUpperCase()}`
        );
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle tournament with no players gracefully', async ({
      page,
    }) => {
      const workflow = new TournamentWorkflow(page);

      await workflow.createTournament({
        name: 'Empty Tournament',
        maxPlayers: 16,
        maxRounds: 5,
      });

      // Try to generate pairings without players
      await page.click('[data-testid="pairings-tab"]');
      await page.click('[data-testid="generate-pairings-button"]');

      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'Cannot generate pairings: No players registered'
      );
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/**', route => route.abort('failed'));

      const workflow = new TournamentWorkflow(page);

      try {
        await workflow.createTournament({
          name: 'Network Error Test',
          maxPlayers: 8,
          maxRounds: 3,
        });
      } catch {
        // Should handle network error gracefully
        await expect(
          page.locator('[data-testid="error-banner"]')
        ).toContainText('Network error occurred. Please try again.');
      }
    });

    test('should handle invalid game results', async ({ page }) => {
      const workflow = new TournamentWorkflow(page);

      await workflow.createTournament({
        name: 'Invalid Results Test',
        maxPlayers: 4,
        maxRounds: 3,
      });

      // Add players and generate pairings
      await workflow.addPlayer({ name: 'Player 1', rating: 1600 });
      await workflow.addPlayer({ name: 'Player 2', rating: 1500 });
      await workflow.addPlayer({ name: 'Player 3', rating: 1400 });
      await workflow.addPlayer({ name: 'Player 4', rating: 1300 });

      await workflow.generatePairings(1);

      // Try to enter result for same game twice
      await workflow.enterGameResult('game-1-1', 'white_wins');

      // Try to change result of already submitted game
      await page.click('[data-testid="results-tab"]');
      const gameRow = page.locator('[data-testid="game-game-1-1"]');
      await gameRow.locator('[data-testid="result-select"]').click();
      await page.click('[data-testid="result-option-draw"]');

      // Should show confirmation dialog for result change
      await expect(
        page.locator('[data-testid="confirm-result-change-dialog"]')
      ).toBeVisible();

      await page.click('[data-testid="confirm-result-change-button"]');

      // Result should be updated
      await expect(
        gameRow.locator('[data-testid="current-result"]')
      ).toContainText('Draw');
    });
  });
});
