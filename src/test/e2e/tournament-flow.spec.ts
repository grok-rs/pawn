import { test, expect } from '@playwright/test';

test.describe('Tournament Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display tournament list', async ({ page }) => {
    await expect(page.getByText('Tournament Management')).toBeVisible();
    // Add more assertions based on actual UI
  });

  test('should create new tournament', async ({ page }) => {
    // Navigate to new tournament page
    await page.click('[data-testid="new-tournament-button"]');

    // Fill tournament form
    await page.fill('[data-testid="tournament-name"]', 'E2E Test Tournament');
    await page.selectOption('[data-testid="tournament-type"]', 'swiss');

    // Submit form
    await page.click('[data-testid="create-tournament"]');

    // Verify tournament was created
    await expect(page.getByText('E2E Test Tournament')).toBeVisible();
  });

  test('should manage players in tournament', async ({ page }) => {
    // Assuming we have a tournament to work with
    await page.click('[data-testid="tournament-1"]');

    // Add player
    await page.click('[data-testid="add-player-button"]');
    await page.fill('[data-testid="player-name"]', 'Test Player');
    await page.fill('[data-testid="player-rating"]', '1500');
    await page.click('[data-testid="save-player"]');

    // Verify player was added
    await expect(page.getByText('Test Player')).toBeVisible();
  });

  test('should generate pairings', async ({ page }) => {
    // Navigate to tournament with players
    await page.click('[data-testid="tournament-1"]');

    // Generate round 1 pairings
    await page.click('[data-testid="generate-pairings"]');

    // Verify pairings were generated
    await expect(page.getByText('Round 1 Pairings')).toBeVisible();
    await expect(page.locator('[data-testid="pairing-row"]')).toHaveCount(8); // Assuming 16 players
  });
});
