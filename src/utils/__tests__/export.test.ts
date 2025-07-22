import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PlayerStanding, Player, TiebreakScore } from '@dto/bindings';
import { exportStandingsToCsv, exportStandingsToPdf } from '../export';

// Mock DOM methods
const mockCreateElement = vi.fn();
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockClick = vi.fn();

// Mock Window.print
const mockPrint = vi.fn();

// Mock data factories
const createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 1,
  name: 'John Doe',
  country_code: 'US',
  rating: 1500,
  title: '',
  birth_date: '1990-01-01',
  gender: 'M',
  fideId: null,
  email: 'john@example.com',
  phone: '+1234567890',
  address: '123 Main St',
  city: 'Anytown',
  state: 'CA',
  zip_code: '12345',
  emergency_contact: 'Jane Doe',
  emergency_phone: '+0987654321',
  medical_info: '',
  notes: '',
  is_active: true,
  pairing_number: 1,
  ...overrides,
});

const createMockTiebreakScore = (
  overrides: Partial<TiebreakScore> = {}
): TiebreakScore => ({
  tiebreak_type: 'buchholz_full',
  value: 10.5,
  display_value: '10.5',
  ...overrides,
});

const createMockPlayerStanding = (
  overrides: Partial<PlayerStanding> = {}
): PlayerStanding => ({
  rank: 1,
  player: createMockPlayer(),
  points: 2.5,
  games_played: 4,
  wins: 2,
  draws: 1,
  losses: 1,
  performance_rating: 1550,
  rating_change: null,
  tiebreak_scores: [
    createMockTiebreakScore({
      tiebreak_type: 'buchholz_full',
      value: 10.5,
      display_value: '10.5',
    }),
    createMockTiebreakScore({
      tiebreak_type: 'sonneborn_berger',
      value: 5.25,
      display_value: '5.25',
    }),
  ],
  ...overrides,
});

describe('export utils', () => {
  beforeEach(() => {
    // Setup DOM mocks
    const mockElement = {
      setAttribute: vi.fn(),
      click: mockClick,
      style: { visibility: '' },
    };

    mockCreateElement.mockReturnValue(mockElement);
    mockCreateObjectURL.mockReturnValue('blob:mock-url');

    Object.defineProperty(globalThis, 'document', {
      writable: true,
      value: {
        createElement: mockCreateElement,
        body: {
          appendChild: mockAppendChild,
          removeChild: mockRemoveChild,
        },
      },
    });

    Object.defineProperty(globalThis, 'URL', {
      writable: true,
      value: {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      },
    });

    Object.defineProperty(globalThis, 'Blob', {
      writable: true,
      value: vi.fn().mockImplementation((content, options) => ({
        content,
        options,
      })),
    });

    Object.defineProperty(globalThis, 'window', {
      writable: true,
      value: {
        print: mockPrint,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('exportStandingsToCsv', () => {
    it('should generate CSV with correct headers', () => {
      const standings = [createMockPlayerStanding()];
      const tournamentName = 'Test Tournament';

      exportStandingsToCsv(standings, tournamentName);

      expect(global.Blob).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining(
            'Rank,Name,Country,Rating,Points,Games,Wins,Draws,Losses,TPR,TB1,TB2'
          ),
        ]),
        { type: 'text/csv;charset=utf-8;' }
      );
    });

    it('should generate CSV with correct data rows', () => {
      const standings = [
        createMockPlayerStanding({
          rank: 1,
          player: createMockPlayer({
            name: 'Alice Johnson',
            country_code: 'CA',
            rating: 1650,
          }),
          points: 3.0,
          games_played: 4,
          wins: 3,
          draws: 0,
          losses: 1,
          performance_rating: 1700,
          tiebreak_scores: [
            createMockTiebreakScore({ display_value: '12.0' }),
            createMockTiebreakScore({ display_value: '8.5' }),
          ],
        }),
        createMockPlayerStanding({
          rank: 2,
          player: createMockPlayer({
            name: 'Bob Smith',
            country_code: 'US',
            rating: 1580,
          }),
          points: 2.5,
          games_played: 4,
          wins: 2,
          draws: 1,
          losses: 1,
          performance_rating: 1620,
          tiebreak_scores: [
            createMockTiebreakScore({ display_value: '10.5' }),
            createMockTiebreakScore({ display_value: '6.75' }),
          ],
        }),
      ];
      const tournamentName = 'Championship';

      exportStandingsToCsv(standings, tournamentName);

      const csvContent = (global.Blob as any).mock.calls[0][0][0];
      expect(csvContent).toContain(
        '1,Alice Johnson,CA,1650,3,4,3,0,1,1700,12.0,8.5'
      );
      expect(csvContent).toContain(
        '2,Bob Smith,US,1580,2.5,4,2,1,1,1620,10.5,6.75'
      );
    });

    it('should handle players without ratings', () => {
      const standings = [
        createMockPlayerStanding({
          player: createMockPlayer({ rating: null }),
        }),
      ];
      const tournamentName = 'Test';

      exportStandingsToCsv(standings, tournamentName);

      const csvContent = (global.Blob as any).mock.calls[0][0][0];
      expect(csvContent).toContain('Unrated');
    });

    it('should handle players without country codes', () => {
      const standings = [
        createMockPlayerStanding({
          player: createMockPlayer({ country_code: null }),
        }),
      ];
      const tournamentName = 'Test';

      exportStandingsToCsv(standings, tournamentName);

      const csvContent = (global.Blob as any).mock.calls[0][0][0];
      expect(csvContent).toContain('John Doe,,1500'); // Empty country between name and rating
    });

    it('should handle players without performance ratings', () => {
      const standings = [
        createMockPlayerStanding({
          performance_rating: null,
        }),
      ];
      const tournamentName = 'Test';

      exportStandingsToCsv(standings, tournamentName);

      const csvContent = (global.Blob as any).mock.calls[0][0][0];
      expect(csvContent).toContain(',1,,10.5'); // Empty TPR between losses and first tiebreak
    });

    it('should create correct filename from tournament name', () => {
      const standings = [createMockPlayerStanding()];
      const tournamentName = 'Spring Championship 2024';

      exportStandingsToCsv(standings, tournamentName);

      const mockElement = mockCreateElement.mock.results[0].value;
      expect(mockElement.setAttribute).toHaveBeenCalledWith(
        'download',
        'Spring_Championship_2024_standings.csv'
      );
    });

    it('should handle tournament names with special characters', () => {
      const standings = [createMockPlayerStanding()];
      const tournamentName = 'Test  Tournament   With    Spaces';

      exportStandingsToCsv(standings, tournamentName);

      const mockElement = mockCreateElement.mock.results[0].value;
      expect(mockElement.setAttribute).toHaveBeenCalledWith(
        'download',
        'Test_Tournament_With_Spaces_standings.csv'
      );
    });

    it('should create blob with correct MIME type', () => {
      const standings = [createMockPlayerStanding()];
      const tournamentName = 'Test';

      exportStandingsToCsv(standings, tournamentName);

      expect(global.Blob).toHaveBeenCalledWith(expect.any(Array), {
        type: 'text/csv;charset=utf-8;',
      });
    });

    it('should properly setup download link', () => {
      const standings = [createMockPlayerStanding()];
      const tournamentName = 'Test';

      exportStandingsToCsv(standings, tournamentName);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();

      const mockElement = mockCreateElement.mock.results[0].value;
      expect(mockElement.setAttribute).toHaveBeenCalledWith(
        'href',
        'blob:mock-url'
      );
      expect(mockElement.style.visibility).toBe('hidden');
    });

    it('should trigger download and cleanup', () => {
      const standings = [createMockPlayerStanding()];
      const tournamentName = 'Test';

      exportStandingsToCsv(standings, tournamentName);

      const mockElement = mockCreateElement.mock.results[0].value;

      expect(mockAppendChild).toHaveBeenCalledWith(mockElement);
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalledWith(mockElement);
    });

    it('should handle empty standings array', () => {
      const standings: PlayerStanding[] = [];
      const tournamentName = 'Empty Tournament';

      exportStandingsToCsv(standings, tournamentName);

      const csvContent = (global.Blob as any).mock.calls[0][0][0];
      expect(csvContent).toBe(
        'Rank,Name,Country,Rating,Points,Games,Wins,Draws,Losses,TPR'
      );
    });

    it('should handle standings with no tiebreak scores', () => {
      const standings = [
        createMockPlayerStanding({
          tiebreak_scores: [],
        }),
      ];
      const tournamentName = 'Test';

      exportStandingsToCsv(standings, tournamentName);

      const csvContent = (global.Blob as any).mock.calls[0][0][0];
      expect(csvContent).toContain(
        'Rank,Name,Country,Rating,Points,Games,Wins,Draws,Losses,TPR'
      );
      expect(csvContent).not.toContain('TB1');
    });

    it('should handle varying numbers of tiebreak scores', () => {
      const standings = [
        createMockPlayerStanding({
          tiebreak_scores: [createMockTiebreakScore({ display_value: '12.0' })],
        }),
        createMockPlayerStanding({
          rank: 2,
          tiebreak_scores: [
            createMockTiebreakScore({ display_value: '11.0' }),
            createMockTiebreakScore({ display_value: '7.5' }),
            createMockTiebreakScore({ display_value: '3.0' }),
          ],
        }),
      ];
      const tournamentName = 'Test';

      exportStandingsToCsv(standings, tournamentName);

      // Should use tiebreak count from first standing for headers
      const csvContent = (global.Blob as any).mock.calls[0][0][0];
      expect(csvContent).toContain('TB1');
      expect(csvContent).not.toContain('TB2');
    });
  });

  describe('exportStandingsToPdf', () => {
    it('should trigger print dialog', async () => {
      const standings = [createMockPlayerStanding()];
      const tournamentName = 'Test Tournament';

      await exportStandingsToPdf(standings, tournamentName);

      expect(mockPrint).toHaveBeenCalledTimes(1);
    });

    it('should handle empty standings array', async () => {
      const standings: PlayerStanding[] = [];
      const tournamentName = 'Empty Tournament';

      await exportStandingsToPdf(standings, tournamentName);

      expect(mockPrint).toHaveBeenCalledTimes(1);
    });

    it('should handle undefined parameters', async () => {
      await exportStandingsToPdf(undefined as any, undefined as any);

      expect(mockPrint).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle malformed player data gracefully', () => {
      const standings = [
        {
          rank: 1,
          player: {
            name: null,
            country_code: undefined,
            rating: 'invalid',
          } as any,
          points: 'invalid',
          games_played: null,
          wins: undefined,
          draws: 'test',
          losses: {},
          performance_rating: [],
          tiebreak_scores: [
            { display_value: null },
            { display_value: undefined },
          ],
        } as any,
      ];
      const tournamentName = 'Test';

      expect(() =>
        exportStandingsToCsv(standings, tournamentName)
      ).not.toThrow();
    });

    it('should handle very long tournament names', () => {
      const standings = [createMockPlayerStanding()];
      const tournamentName = 'A'.repeat(200);

      exportStandingsToCsv(standings, tournamentName);

      const mockElement = mockCreateElement.mock.results[0].value;
      expect(mockElement.setAttribute).toHaveBeenCalledWith(
        'download',
        `${'A'.repeat(200)}_standings.csv`
      );
    });

    it('should handle special characters in data fields', () => {
      const standings = [
        createMockPlayerStanding({
          player: createMockPlayer({
            name: 'Player, "Special" Name',
            country_code: 'US"CA',
          }),
        }),
      ];
      const tournamentName = 'Test';

      exportStandingsToCsv(standings, tournamentName);

      const csvContent = (global.Blob as any).mock.calls[0][0][0];
      expect(csvContent).toContain('Player, "Special" Name');
    });
  });
});
