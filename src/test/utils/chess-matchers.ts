import { expect } from 'vitest';

// Chess-specific types for testing
export interface ChessPlayer {
  id: number;
  name: string;
  rating: number;
  title?: string;
  countryCode?: string;
  fideId?: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  performance?: number;
  tiebreaks?: number[];
}

export interface ChessGame {
  id: string;
  whitePlayerId: number;
  blackPlayerId: number;
  result: 'white_wins' | 'black_wins' | 'draw' | null;
  resultType: 'normal' | 'forfeit' | 'timeout' | 'bye';
  roundNumber: number;
  boardNumber: number;
  whitePlayer?: ChessPlayer;
  blackPlayer?: ChessPlayer;
}

export interface ChessTournament {
  id: number;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  pairingMethod: 'swiss' | 'round_robin' | 'knockout' | 'team_swiss';
  players: ChessPlayer[];
  rounds: number;
  maxRounds: number;
  currentRound?: number;
  tiebreaks: string[];
}

export interface ChessPairing {
  whitePlayerId: number;
  blackPlayerId: number;
  boardNumber: number;
  result?: 'white_wins' | 'black_wins' | 'draw';
  bye?: boolean;
}

// Custom matcher types for validating chess ratings
export interface ChessCustomMatchers<R> {
  toBeValidChessRating(): R;
  toHaveValidPoints(): R;
  toBeValidGameResult(): R;
  toHaveCorrectTiebreaks(): R;
  toHaveValidPairings(): R;
  toFollowSwissRules(): R;
  toBeValidStandings(): R;
  toHaveConsistentResults(): R;
  toBeValidFIDETitle(): R;
  toHaveCorrectColors(): R;
}

// Rating validation (standard FIDE range)
expect.extend({
  toBeValidChessRating(received: number) {
    const pass =
      typeof received === 'number' && received >= 100 && received <= 3500;

    if (pass) {
      return {
        message: () =>
          `Expected ${received} not to be a valid chess rating (100-3500)`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected ${received} to be a valid chess rating (100-3500)`,
        pass: false,
      };
    }
  },
});

// Points validation (must be multiples of 0.5)
expect.extend({
  toHaveValidPoints(received: ChessPlayer) {
    const points = received.points;
    const totalGames = received.wins + received.losses + received.draws;
    const expectedPoints = received.wins + received.draws * 0.5;

    const isValidPoints = points % 0.5 === 0;
    const isConsistent = Math.abs(points - expectedPoints) < 0.001;
    const isWithinRange = points >= 0 && points <= totalGames;

    const pass = isValidPoints && isConsistent && isWithinRange;

    if (pass) {
      return {
        message: () =>
          `Expected player ${received.name} not to have valid points`,
        pass: true,
      };
    } else {
      const issues = [];
      if (!isValidPoints) issues.push('points must be multiples of 0.5');
      if (!isConsistent)
        issues.push(
          `points (${points}) don't match results (W:${received.wins} L:${received.losses} D:${received.draws})`
        );
      if (!isWithinRange)
        issues.push('points exceed maximum possible for games played');

      return {
        message: () =>
          `Expected player ${received.name} to have valid points. Issues: ${issues.join(', ')}`,
        pass: false,
      };
    }
  },
});

// Game result validation
expect.extend({
  toBeValidGameResult(received: ChessGame) {
    const validResults = ['white_wins', 'black_wins', 'draw', null];
    const validResultTypes = ['normal', 'forfeit', 'timeout', 'bye'];

    const hasValidResult = validResults.includes(received.result);
    const hasValidType = validResultTypes.includes(received.resultType);
    const hasPlayers = received.whitePlayerId && received.blackPlayerId;
    const differentPlayers = received.whitePlayerId !== received.blackPlayerId;

    const pass =
      hasValidResult && hasValidType && hasPlayers && differentPlayers;

    if (pass) {
      return {
        message: () => `Expected game ${received.id} not to be valid`,
        pass: true,
      };
    } else {
      const issues = [];
      if (!hasValidResult) issues.push(`invalid result: ${received.result}`);
      if (!hasValidType)
        issues.push(`invalid result type: ${received.resultType}`);
      if (!hasPlayers) issues.push('missing player IDs');
      if (!differentPlayers) issues.push('players cannot play themselves');

      return {
        message: () =>
          `Expected game ${received.id} to be valid. Issues: ${issues.join(', ')}`,
        pass: false,
      };
    }
  },
});

// Tiebreak validation
expect.extend({
  toHaveCorrectTiebreaks(
    received: ChessPlayer[],
    tiebreakMethods: string[] = ['buchholz', 'sonneborn_berger']
  ) {
    const pass = received.every(player => {
      if (
        !player.tiebreaks ||
        player.tiebreaks.length !== tiebreakMethods.length
      ) {
        return false;
      }

      // Basic validation: tiebreaks should be non-negative numbers
      return player.tiebreaks.every(tb => typeof tb === 'number' && tb >= 0);
    });

    if (pass) {
      return {
        message: () =>
          `Expected players not to have correct tiebreaks for methods: ${tiebreakMethods.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected all players to have correct tiebreaks for methods: ${tiebreakMethods.join(', ')}`,
        pass: false,
      };
    }
  },
});

// Swiss pairing validation
expect.extend({
  toHaveValidPairings(received: ChessPairing[], players: ChessPlayer[]) {
    const playerIds = new Set(players.map(p => p.id));
    const usedPlayers = new Set<number>();

    let pass = true;
    const issues: string[] = [];

    // Check each pairing
    for (const pairing of received) {
      // Check if players exist
      if (!playerIds.has(pairing.whitePlayerId)) {
        issues.push(`White player ${pairing.whitePlayerId} does not exist`);
        pass = false;
      }

      if (!pairing.bye && !playerIds.has(pairing.blackPlayerId)) {
        issues.push(`Black player ${pairing.blackPlayerId} does not exist`);
        pass = false;
      }

      // Check for duplicate pairings
      if (usedPlayers.has(pairing.whitePlayerId)) {
        issues.push(`Player ${pairing.whitePlayerId} paired multiple times`);
        pass = false;
      }

      if (!pairing.bye && usedPlayers.has(pairing.blackPlayerId)) {
        issues.push(`Player ${pairing.blackPlayerId} paired multiple times`);
        pass = false;
      }

      usedPlayers.add(pairing.whitePlayerId);
      if (!pairing.bye) {
        usedPlayers.add(pairing.blackPlayerId);
      }

      // Check board numbers are unique and sequential
      const boardNumbers = received.map(p => p.boardNumber);
      const uniqueBoards = new Set(boardNumbers);
      if (uniqueBoards.size !== received.length) {
        issues.push('Board numbers must be unique');
        pass = false;
      }
    }

    if (pass) {
      return {
        message: () => `Expected pairings not to be valid`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected valid pairings. Issues: ${issues.join(', ')}`,
        pass: false,
      };
    }
  },
});

// Swiss system rules validation
expect.extend({
  toFollowSwissRules(received: ChessTournament) {
    const issues: string[] = [];
    let pass = true;

    // Check that players with similar points are paired together
    const sortedPlayers = [...received.players].sort(
      (a, b) => b.points - a.points
    );

    // In Swiss, players should be paired based on score groups
    // This is a simplified check - real Swiss pairing is more complex
    const scoreGroups = new Map<number, ChessPlayer[]>();

    sortedPlayers.forEach(player => {
      const points = player.points;
      if (!scoreGroups.has(points)) {
        scoreGroups.set(points, []);
      }
      scoreGroups.get(points)!.push(player);
    });

    // Check tiebreak methods are appropriate for Swiss
    const swissTiebreaks = [
      'buchholz',
      'sonneborn_berger',
      'direct_encounter',
      'progress',
    ];
    const hasValidTiebreaks = received.tiebreaks.every(tb =>
      swissTiebreaks.includes(tb)
    );

    if (!hasValidTiebreaks) {
      issues.push('Invalid tiebreak methods for Swiss system');
      pass = false;
    }

    // Check maximum rounds (should not exceed log2(n) + 3 for practical tournaments)
    const maxRecommendedRounds =
      Math.floor(Math.log2(received.players.length)) + 3;
    if (received.maxRounds > maxRecommendedRounds) {
      issues.push(
        `Too many rounds for Swiss system: ${received.maxRounds} (recommended max: ${maxRecommendedRounds})`
      );
      pass = false;
    }

    if (pass) {
      return {
        message: () => `Expected tournament not to follow Swiss rules`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected tournament to follow Swiss rules. Issues: ${issues.join(', ')}`,
        pass: false,
      };
    }
  },
});

// Standings validation
expect.extend({
  toBeValidStandings(received: ChessPlayer[]) {
    const issues: string[] = [];
    let pass = true;

    // Check if sorted by points (descending)
    for (let i = 1; i < received.length; i++) {
      if (received[i - 1].points < received[i].points) {
        issues.push('Players not sorted by points');
        pass = false;
        break;
      }
    }

    // Check if players with same points are sorted by tiebreaks
    for (let i = 1; i < received.length; i++) {
      const prev = received[i - 1];
      const curr = received[i];

      if (prev.points === curr.points && prev.tiebreaks && curr.tiebreaks) {
        for (
          let j = 0;
          j < Math.min(prev.tiebreaks.length, curr.tiebreaks.length);
          j++
        ) {
          if (prev.tiebreaks[j] < curr.tiebreaks[j]) {
            issues.push(
              `Tiebreak sorting incorrect between ${prev.name} and ${curr.name}`
            );
            pass = false;
            break;
          } else if (prev.tiebreaks[j] > curr.tiebreaks[j]) {
            break; // Correctly sorted
          }
        }
      }
    }

    // Validate each player's data
    for (const player of received) {
      if (player.wins < 0 || player.losses < 0 || player.draws < 0) {
        issues.push(`${player.name} has negative game counts`);
        pass = false;
      }

      const calculatedPoints = player.wins + player.draws * 0.5;
      if (Math.abs(player.points - calculatedPoints) > 0.001) {
        issues.push(`${player.name} has incorrect points calculation`);
        pass = false;
      }
    }

    if (pass) {
      return {
        message: () => `Expected standings not to be valid`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected valid standings. Issues: ${issues.join(', ')}`,
        pass: false,
      };
    }
  },
});

// Result consistency validation
expect.extend({
  toHaveConsistentResults(received: {
    players: ChessPlayer[];
    games: ChessGame[];
  }) {
    const { players, games } = received;
    const playerStats = new Map<
      number,
      { wins: number; losses: number; draws: number; points: number }
    >();

    // Initialize player stats
    players.forEach(player => {
      playerStats.set(player.id, { wins: 0, losses: 0, draws: 0, points: 0 });
    });

    // Calculate stats from games
    games.forEach(game => {
      if (game.result) {
        const whiteStats = playerStats.get(game.whitePlayerId);
        const blackStats = playerStats.get(game.blackPlayerId);

        if (whiteStats && blackStats) {
          switch (game.result) {
            case 'white_wins':
              whiteStats.wins++;
              whiteStats.points++;
              blackStats.losses++;
              break;
            case 'black_wins':
              blackStats.wins++;
              blackStats.points++;
              whiteStats.losses++;
              break;
            case 'draw':
              whiteStats.draws++;
              whiteStats.points += 0.5;
              blackStats.draws++;
              blackStats.points += 0.5;
              break;
          }
        }
      }
    });

    // Compare calculated stats with player stats
    let pass = true;
    const issues: string[] = [];

    players.forEach(player => {
      const calculated = playerStats.get(player.id);
      if (calculated) {
        if (player.wins !== calculated.wins) {
          issues.push(
            `${player.name}: wins mismatch (expected: ${calculated.wins}, actual: ${player.wins})`
          );
          pass = false;
        }
        if (player.losses !== calculated.losses) {
          issues.push(
            `${player.name}: losses mismatch (expected: ${calculated.losses}, actual: ${player.losses})`
          );
          pass = false;
        }
        if (player.draws !== calculated.draws) {
          issues.push(
            `${player.name}: draws mismatch (expected: ${calculated.draws}, actual: ${player.draws})`
          );
          pass = false;
        }
        if (Math.abs(player.points - calculated.points) > 0.001) {
          issues.push(
            `${player.name}: points mismatch (expected: ${calculated.points}, actual: ${player.points})`
          );
          pass = false;
        }
      }
    });

    if (pass) {
      return {
        message: () =>
          `Expected players and games not to have consistent results`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected consistent results between players and games. Issues: ${issues.join(', ')}`,
        pass: false,
      };
    }
  },
});

// FIDE title validation
expect.extend({
  toBeValidFIDETitle(received: string) {
    const validTitles = ['GM', 'IM', 'FM', 'CM', 'WGM', 'WIM', 'WFM', 'WCM'];
    const pass = received === '' || validTitles.includes(received);

    if (pass) {
      return {
        message: () => `Expected "${received}" not to be a valid FIDE title`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected "${received}" to be a valid FIDE title. Valid titles: ${validTitles.join(', ')}, or empty string`,
        pass: false,
      };
    }
  },
});

// Color balance validation
expect.extend({
  toHaveCorrectColors(
    received: {
      playerId: number;
      whiteGames: number;
      blackGames: number;
      totalGames: number;
    }[]
  ) {
    let pass = true;
    const issues: string[] = [];

    received.forEach(player => {
      const colorDifference = Math.abs(player.whiteGames - player.blackGames);

      // Check if total games is consistent
      if (player.whiteGames + player.blackGames !== player.totalGames) {
        issues.push(
          `Player ${player.playerId}: game count inconsistency (${player.whiteGames}+${player.blackGames} != ${player.totalGames})`
        );
        pass = false;
      }

      // Check color balance (difference should not exceed 1 in most cases)
      if (colorDifference > 1 && player.totalGames > 2) {
        issues.push(
          `Player ${player.playerId}: poor color balance (W:${player.whiteGames} B:${player.blackGames})`
        );
        pass = false;
      }
    });

    if (pass) {
      return {
        message: () => `Expected players not to have correct color balance`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected correct color balance. Issues: ${issues.join(', ')}`,
        pass: false,
      };
    }
  },
});

// Utility functions for chess testing
export const chessTestUtils = {
  // Generate valid test rating
  randomRating: (min = 1200, max = 2400): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Calculate expected points from game results
  calculatePoints: (wins: number, _losses: number, draws: number): number => {
    return wins + draws * 0.5;
  },

  // Validate Swiss pairing constraints
  isValidSwissPairing: (
    player1: ChessPlayer,
    player2: ChessPlayer,
    previousOpponents: number[][]
  ): boolean => {
    // Check if players have already played each other
    const player1Opponents = previousOpponents[player1.id] || [];
    return !player1Opponents.includes(player2.id);
  },

  // Calculate Buchholz tiebreak (sum of opponents' scores)
  calculateBuchholz: (
    playerId: number,
    games: ChessGame[],
    players: ChessPlayer[]
  ): number => {
    const playerGames = games.filter(
      g => g.whitePlayerId === playerId || g.blackPlayerId === playerId
    );
    const opponentIds = playerGames.map(g =>
      g.whitePlayerId === playerId ? g.blackPlayerId : g.whitePlayerId
    );

    return opponentIds.reduce((sum, opponentId) => {
      const opponent = players.find(p => p.id === opponentId);
      return sum + (opponent?.points || 0);
    }, 0);
  },

  // Calculate Sonneborn-Berger tiebreak
  calculateSonnebornBerger: (
    playerId: number,
    games: ChessGame[],
    players: ChessPlayer[]
  ): number => {
    const playerGames = games.filter(
      g =>
        (g.whitePlayerId === playerId || g.blackPlayerId === playerId) &&
        g.result
    );

    return playerGames.reduce((sum, game) => {
      const isWhite = game.whitePlayerId === playerId;
      const opponentId = isWhite ? game.blackPlayerId : game.whitePlayerId;
      const opponent = players.find(p => p.id === opponentId);

      if (!opponent) return sum;

      // Only count points earned against this opponent
      let pointsEarned = 0;
      if (game.result === 'white_wins') {
        pointsEarned = isWhite ? 1 : 0;
      } else if (game.result === 'black_wins') {
        pointsEarned = isWhite ? 0 : 1;
      } else if (game.result === 'draw') {
        pointsEarned = 0.5;
      }

      return sum + pointsEarned * opponent.points;
    }, 0);
  },

  // Validate tournament progression
  validateTournamentProgression: (
    rounds: ChessGame[][]
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check that all games in each round are completed before next round starts
    for (let i = 0; i < rounds.length - 1; i++) {
      const currentRound = rounds[i];
      const hasIncompleteGames = currentRound.some(game => !game.result);

      if (hasIncompleteGames) {
        errors.push(
          `Round ${i + 1} has incomplete games but round ${i + 2} exists`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Generate mock tournament data that follows chess rules
  generateMockTournament: (playerCount = 8, rounds = 3): ChessTournament => {
    const players: ChessPlayer[] = [];

    for (let i = 1; i <= playerCount; i++) {
      players.push({
        id: i,
        name: `Player ${i}`,
        rating: chessTestUtils.randomRating(),
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        tiebreaks: [0, 0],
      });
    }

    return {
      id: 1,
      name: 'Test Tournament',
      status: 'draft',
      pairingMethod: 'swiss',
      players,
      rounds: 0,
      maxRounds: rounds,
      tiebreaks: ['buchholz', 'sonneborn_berger'],
    };
  },
};

export default chessTestUtils;
