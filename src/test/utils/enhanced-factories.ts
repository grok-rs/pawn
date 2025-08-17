import {
  createMockTournament,
  createMockPlayer,
  createMockGameResult,
} from './test-utils';
import type { Player, PlayerStanding, Team } from '@dto/bindings';

// Enhanced factory interfaces with complex relationships
export interface TournamentConfig {
  id?: number;
  name?: string;
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  pairingMethod?: 'swiss' | 'round_robin' | 'knockout' | 'team_swiss';
  format?: string;
  playerCount: number; // Made required to match test expectations
  currentRound?: number;
  maxRounds?: number;
  withPlayers?: boolean;
  withGames?: boolean;
  withStandings?: boolean;
  completedRounds?: number;
  scenarioType?: 'balanced' | 'decisive' | 'many_draws' | 'upset_heavy';
  players?: Player[];
}

export interface PlayerConfig {
  id?: number;
  tournament_id?: number;
  name?: string;
  rating?: number;
  country_code?: string;
  title?: string;
  birth_date?: string;
  gender?: string;
  email?: string;
  phone?: string;
  club?: string;
  status?: string;
  seed_number?: number;
  pairing_number?: number;
  initial_rating?: number;
  skillLevel?: 'beginner' | 'intermediate' | 'expert' | 'master';
  playingStyle?: 'aggressive' | 'positional' | 'tactical' | 'defensive';
  tournamentHistory?: 'veteran' | 'newcomer' | 'occasional';
}

export interface GameConfig {
  whitePlayer?: Player;
  blackPlayer?: Player;
  result?: 'white_wins' | 'black_wins' | 'draw' | null;
  resultType?: 'normal' | 'forfeit' | 'timeout' | 'bye';
  roundNumber?: number;
  realistic?: boolean; // Apply realistic result probabilities based on ratings
}

export interface TeamConfig {
  id?: number;
  tournament_id?: number;
  name?: string;
  captain?: string;
  description?: string;
  color?: string;
  club_affiliation?: string;
  contact_email?: string;
  contact_phone?: string;
  max_board_count?: number;
  status?: string;
  memberCount?: number;
  averageRating?: number;
  country?: string;
  skillLevel?: 'amateur' | 'club' | 'professional' | 'elite';
}

// Enhanced player factory with realistic chess data
export const createRealisticPlayer = (config: PlayerConfig = {}): Player => {
  const skillLevels = {
    beginner: { ratingRange: [400, 1000], titleChance: 0 },
    intermediate: { ratingRange: [1000, 1600], titleChance: 0.05 },
    expert: { ratingRange: [1600, 2200], titleChance: 0.3 },
    master: { ratingRange: [2200, 2800], titleChance: 0.8 },
  };

  const skillLevel = config.skillLevel || 'intermediate';
  const skill = skillLevels[skillLevel];

  const rating =
    config.rating ||
    skill.ratingRange[0] +
      Math.random() * (skill.ratingRange[1] - skill.ratingRange[0]);

  // Assign title based on rating and skill level
  let title = config.title;
  if (!title && Math.random() < skill.titleChance) {
    if (rating >= 2500) title = Math.random() < 0.3 ? 'GM' : 'IM';
    else if (rating >= 2400) title = 'IM';
    else if (rating >= 2300) title = 'FM';
    else if (rating >= 2200) title = 'CM';
    else if (rating >= 2000)
      title = ['WGM', 'WIM', 'WFM', 'WCM'][Math.floor(Math.random() * 4)];
  }

  // Generate realistic names based on country
  const namesByCountry = {
    US: ['John Smith', 'Sarah Johnson', 'Michael Brown', 'Jessica Williams'],
    RU: [
      'Alexander Petrov',
      'Natalya Volkov',
      'Dmitri Kozlov',
      'Elena Smirnov',
    ],
    IN: ['Raj Patel', 'Priya Sharma', 'Arjun Kumar', 'Ananya Singh'],
    CN: ['Wei Zhang', 'Li Wang', 'Chen Liu', 'Xiao Yang'],
    DE: ['Hans Mueller', 'Anna Schmidt', 'Klaus Weber', 'Maria Fischer'],
    ES: ['Carlos Rodriguez', 'Maria Garcia', 'Jose Martinez', 'Ana Lopez'],
    FR: ['Pierre Dubois', 'Marie Martin', 'Jean Bernard', 'Claire Moreau'],
  };

  const availableCountries: (keyof typeof namesByCountry)[] = [
    'US',
    'RU',
    'IN',
    'CN',
    'DE',
    'ES',
    'FR',
  ];
  const country =
    config.country_code ||
    availableCountries[Math.floor(Math.random() * availableCountries.length)];

  function getNamesByCountry(countryCode: string): string[] {
    const validCountries: Record<string, string[]> = namesByCountry;
    return validCountries[countryCode] || namesByCountry.US;
  }

  const names = getNamesByCountry(country);
  const name = config.name || names[Math.floor(Math.random() * names.length)];

  const mockPlayer = createMockPlayer({
    rating: Math.round(rating),
    name,
    title: title || '',
    countryCode: country,
    id: config.id,
    tournamentId: config.tournament_id || 1,
  });

  // Convert mock player to Player interface
  return {
    id: mockPlayer.id,
    tournament_id: config.tournament_id || 1,
    name: mockPlayer.name,
    rating: mockPlayer.rating,
    country_code: country,
    title: mockPlayer.title || null,
    birth_date: config.birth_date || null,
    gender: config.gender || null,
    email: config.email || null,
    phone: config.phone || null,
    club: config.club || null,
    status: config.status || ('active' as const),
    seed_number: config.seed_number || null,
    pairing_number: config.pairing_number || null,
    initial_rating: config.initial_rating || mockPlayer.rating,
    created_at: new Date().toISOString(),
    updated_at: null,
  };
};

// Tournament result interface
interface TournamentResult {
  id: number;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  playerCount: number;
  maxPlayers: number;
  rounds: number;
  maxRounds: number;
  pairingMethod: 'swiss' | 'round_robin' | 'knockout' | 'team_swiss';
  timeControl: {
    mainTime: number;
    increment: number;
    type: string;
  };
  tiebreaks: string[];
  currentRound: number;
  players: Player[];
  games: ExtendedGameResult[];
  standings: PlayerStanding[];
  createdAt: string;
  updatedAt: string;
}

// Extended game result with additional properties for simulation
interface ExtendedGameResult {
  id: string | number;
  tournamentId: number;
  roundNumber: number;
  whitePlayerId: number;
  blackPlayerId: number;
  result: 'white_wins' | 'black_wins' | 'draw';
  resultType: 'normal' | 'forfeit' | 'timeout' | 'bye';
  boardNumber: number;
  isApproved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// Enhanced tournament factory with complete tournament simulation
export const createRealisticTournament = (
  config: TournamentConfig = { playerCount: 16 }
): TournamentResult => {
  const tournament = createMockTournament({
    name: config.name || generateTournamentName(),
    status: config.status || ('draft' as const),
    maxPlayers: config.playerCount || 16,
    maxRounds:
      config.maxRounds || Math.ceil(Math.log2(config.playerCount || 16)) + 1,
    pairingMethod: config.pairingMethod || ('swiss' as const),
    ...config,
  });

  let players: Player[] = [];
  let games: ExtendedGameResult[] = [];
  let standings: PlayerStanding[] = [];

  if (config.withPlayers) {
    players = generateTournamentPlayers(
      config.playerCount || 16,
      config.scenarioType
    );
  }

  if (config.withGames && players.length > 0) {
    // Convert players to PlayerWithStats for game generation
    const playersWithStats: PlayerWithStats[] = players.map(p => ({
      ...p,
      points: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    }));

    games = generateTournamentGames(
      playersWithStats,
      config.completedRounds || 0,
      config.pairingMethod || 'swiss',
      config.scenarioType
    );
  }

  if (config.withStandings && players.length > 0) {
    // Convert players to PlayerWithStats for standings calculation
    const playersWithStats: PlayerWithStats[] = players.map(p => ({
      ...p,
      points: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    }));
    standings = calculateTournamentStandings(playersWithStats, games);
  }

  return {
    id: tournament.id,
    name: tournament.name,
    description: tournament.description,
    status: tournament.status as
      | 'draft'
      | 'active'
      | 'paused'
      | 'completed'
      | 'cancelled',
    playerCount: tournament.playerCount,
    maxPlayers: tournament.maxPlayers,
    rounds: tournament.rounds,
    maxRounds: tournament.maxRounds,
    pairingMethod: tournament.pairingMethod as
      | 'swiss'
      | 'round_robin'
      | 'knockout'
      | 'team_swiss',
    timeControl: tournament.timeControl,
    tiebreaks: tournament.tiebreaks,
    createdAt: tournament.createdAt,
    updatedAt: tournament.updatedAt,
    players,
    games,
    standings,
    currentRound: Math.min(
      (config.completedRounds || 0) + 1,
      tournament.maxRounds
    ),
  };
};

// Generate realistic tournament names
const generateTournamentName = (): string => {
  const adjectives = [
    'Spring',
    'Summer',
    'Autumn',
    'Winter',
    'Grand',
    'Open',
    'Championship',
    'Memorial',
  ];
  const types = [
    'Classic',
    'Rapid',
    'Blitz',
    'Masters',
    'Open',
    'Invitational',
    'Cup',
    'Tournament',
  ];
  const years = [2023, 2024, 2025];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const type = types[Math.floor(Math.random() * types.length)];
  const year = years[Math.floor(Math.random() * years.length)];

  return `${adjective} ${type} ${year}`;
};

// Player with extended stats for simulation
interface PlayerWithStats extends Player {
  points: number;
  wins: number;
  losses: number;
  draws: number;
}

// Pairing interface
interface Pairing {
  white: PlayerWithStats;
  black: PlayerWithStats;
}

// Generate realistic tournament players based on scenario
const generateTournamentPlayers = (
  count: number,
  scenarioType?: string
): Player[] => {
  const players: Player[] = [];

  for (let i = 0; i < count; i++) {
    let skillLevel: 'beginner' | 'intermediate' | 'expert' | 'master';

    // Adjust skill distribution based on scenario
    switch (scenarioType) {
      case 'balanced':
        skillLevel = (
          ['beginner', 'intermediate', 'expert', 'master'] as const
        )[Math.floor(Math.random() * 4)];
        break;
      case 'upset_heavy':
        // More variance in ratings for potential upsets
        skillLevel =
          Math.random() < 0.3
            ? 'beginner'
            : Math.random() < 0.6
              ? 'expert'
              : 'intermediate';
        break;
      default: {
        // Normal tournament distribution (more intermediate players)
        const rand = Math.random();
        if (rand < 0.1) skillLevel = 'beginner';
        else if (rand < 0.7) skillLevel = 'intermediate';
        else if (rand < 0.95) skillLevel = 'expert';
        else skillLevel = 'master';
        break;
      }
    }

    players.push(
      createRealisticPlayer({
        id: i + 1,
        skillLevel,
      })
    );
  }

  // Sort players by rating (seeding order)
  return players.sort((a, b) => (b.rating || 0) - (a.rating || 0));
};

// Generate realistic games with result probabilities
const generateTournamentGames = (
  playersWithStats: PlayerWithStats[],
  rounds: number,
  pairingMethod: string,
  scenarioType?: string
): ExtendedGameResult[] => {
  const games: ExtendedGameResult[] = [];
  let currentPlayers: PlayerWithStats[] = [...playersWithStats];

  for (let round = 1; round <= rounds; round++) {
    const roundPairings = generateRoundPairings(
      currentPlayers,
      round,
      pairingMethod
    );

    roundPairings.forEach((pairing, index) => {
      const game = createRealisticGame(
        {
          whitePlayer: pairing.white,
          blackPlayer: pairing.black,
          roundNumber: round,
          realistic: true,
        },
        scenarioType
      );

      const extendedGame: ExtendedGameResult = {
        ...game,
        id: `${round}-${index + 1}`,
        boardNumber: index + 1,
      };
      games.push(extendedGame);

      // Update player stats
      updatePlayerStats(currentPlayers, extendedGame);
    });
  }

  return games;
};

// Generate round pairings based on method
const generateRoundPairings = (
  players: PlayerWithStats[],
  round: number,
  method: string
): Pairing[] => {
  const pairings: Pairing[] = [];

  if (method === 'swiss' || method === 'team_swiss') {
    // Swiss system: pair players with similar scores
    const sortedPlayers = [...players].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return (b.rating || 0) - (a.rating || 0); // Tiebreak by rating
    });

    const paired = new Set<number>();

    for (let i = 0; i < sortedPlayers.length; i++) {
      if (paired.has(sortedPlayers[i].id)) continue;

      // Find best opponent in same score group
      let opponent: PlayerWithStats | null = null;
      for (let j = i + 1; j < sortedPlayers.length; j++) {
        if (!paired.has(sortedPlayers[j].id)) {
          opponent = sortedPlayers[j];
          break;
        }
      }

      if (opponent) {
        // Color assignment (alternate or based on color balance)
        const whitePlayer = round % 2 === 1 ? sortedPlayers[i] : opponent;
        const blackPlayer = round % 2 === 1 ? opponent : sortedPlayers[i];

        pairings.push({ white: whitePlayer, black: blackPlayer });
        paired.add(sortedPlayers[i].id);
        paired.add(opponent.id);
      }
    }
  } else if (method === 'round_robin') {
    // Round robin: predetermined pairings
    const roundPairings = generateRoundRobinPairings(players, round);
    pairings.push(...roundPairings);
  }

  return pairings;
};

// Round robin pairing generation
const generateRoundRobinPairings = (
  players: PlayerWithStats[],
  round: number
): Pairing[] => {
  const n = players.length;
  const pairings: Pairing[] = [];

  if (n % 2 === 0) {
    // Even number of players
    for (let i = 0; i < n / 2; i++) {
      const p1Index = (round - 1 + i) % (n - 1);
      const p2Index = (n - 1 - i + round - 1) % (n - 1);

      const white =
        i === 0 && round % 2 === 0 ? players[n - 1] : players[p1Index];
      const black =
        i === 0 && round % 2 === 0 ? players[p1Index] : players[p2Index];

      pairings.push({ white, black });
    }
  }

  return pairings;
};

// Create realistic game with rating-based probabilities
const createRealisticGame = (
  config: GameConfig,
  scenarioType?: string
): ExtendedGameResult => {
  const whitePlayer = config.whitePlayer;
  const blackPlayer = config.blackPlayer;

  let result = config.result;

  if (!result && config.realistic && whitePlayer && blackPlayer) {
    result = calculateRealisticResult(
      whitePlayer.rating || 1500,
      blackPlayer.rating || 1500,
      scenarioType
    );
  }

  const mockGame = createMockGameResult({
    whitePlayerId: whitePlayer?.id,
    blackPlayerId: blackPlayer?.id,
    result: result || 'draw',
    resultType: config.resultType || 'normal',
    roundNumber: config.roundNumber || 1,
  });

  return {
    id: mockGame.id,
    tournamentId: mockGame.tournamentId || 1,
    roundNumber: mockGame.roundNumber,
    whitePlayerId: mockGame.whitePlayerId,
    blackPlayerId: mockGame.blackPlayerId,
    result: result || 'draw',
    resultType: config.resultType || 'normal',
    boardNumber: 1,
    isApproved: false,
    approvedBy: null,
    approvedAt: null,
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

// Calculate realistic game result based on rating difference
const calculateRealisticResult = (
  whiteRating: number,
  blackRating: number,
  scenarioType?: string
): 'draw' | 'white_wins' | 'black_wins' => {
  const ratingDiff = whiteRating - blackRating;

  // Elo probability calculation
  const expectedScoreWhite = 1 / (1 + Math.pow(10, -ratingDiff / 400));

  // Adjust probabilities based on scenario
  let drawRate = 0.3; // Base draw rate
  let upsetBonus = 0;

  switch (scenarioType) {
    case 'decisive':
      drawRate = 0.15; // Fewer draws
      break;
    case 'many_draws':
      drawRate = 0.5; // More draws
      break;
    case 'upset_heavy':
      upsetBonus = 0.1; // Increase chance of upsets
      break;
  }

  const adjustedWhiteProb = Math.max(
    0.05,
    Math.min(
      0.95,
      expectedScoreWhite + upsetBonus * (expectedScoreWhite < 0.5 ? 1 : -1)
    )
  );

  const rand = Math.random();

  if (rand < adjustedWhiteProb * (1 - drawRate)) {
    return 'white_wins';
  } else if (rand < adjustedWhiteProb * (1 - drawRate) + drawRate) {
    return 'draw';
  } else {
    return 'black_wins';
  }
};

// Update player statistics after game
const updatePlayerStats = (
  players: PlayerWithStats[],
  game: ExtendedGameResult
): void => {
  const whitePlayer = players.find(p => p.id === game.whitePlayerId);
  const blackPlayer = players.find(p => p.id === game.blackPlayerId);

  if (whitePlayer && blackPlayer && game.result) {
    switch (game.result) {
      case 'white_wins':
        whitePlayer.wins++;
        whitePlayer.points += 1;
        blackPlayer.losses++;
        break;
      case 'black_wins':
        blackPlayer.wins++;
        blackPlayer.points += 1;
        whitePlayer.losses++;
        break;
      case 'draw':
        whitePlayer.draws++;
        whitePlayer.points += 0.5;
        blackPlayer.draws++;
        blackPlayer.points += 0.5;
        break;
    }
  }
};

// Calculate tournament standings with tiebreaks
const calculateTournamentStandings = (
  players: PlayerWithStats[],
  games: ExtendedGameResult[]
): PlayerStanding[] => {
  return players
    .map(player => {
      const tiebreaks = calculateTiebreaks(player, games, players);
      const performanceRating = calculatePerformanceRating(
        player,
        games,
        players
      );

      return {
        player,
        rank: 0, // Will be calculated after sorting
        points: player.points || 0,
        games_played:
          (player.wins || 0) + (player.losses || 0) + (player.draws || 0),
        wins: player.wins || 0,
        draws: player.draws || 0,
        losses: player.losses || 0,
        tiebreak_scores: [
          {
            tiebreak_type: 'buchholz_full' as const,
            value: tiebreaks[0],
            display_value: tiebreaks[0].toString(),
          },
          {
            tiebreak_type: 'sonneborn_berger' as const,
            value: tiebreaks[1],
            display_value: tiebreaks[1].toString(),
          },
        ],
        performance_rating: performanceRating,
        rating_change: null,
      };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.tiebreak_scores[0].value !== a.tiebreak_scores[0].value)
        return b.tiebreak_scores[0].value - a.tiebreak_scores[0].value;
      return b.tiebreak_scores[1].value - a.tiebreak_scores[1].value;
    })
    .map((standing, index) => ({
      ...standing,
      rank: index + 1,
    }));
};

// Calculate tiebreak scores
const calculateTiebreaks = (
  player: PlayerWithStats,
  games: ExtendedGameResult[],
  players: PlayerWithStats[]
): number[] => {
  const playerGames = games.filter(
    g => g.whitePlayerId === player.id || g.blackPlayerId === player.id
  );

  // Buchholz: sum of opponents' scores
  const buchholz = playerGames.reduce((sum, game) => {
    const opponentId =
      game.whitePlayerId === player.id
        ? game.blackPlayerId
        : game.whitePlayerId;
    const opponent = players.find(p => p.id === opponentId);
    return sum + (opponent?.points || 0);
  }, 0);

  // Sonneborn-Berger: sum of (opponent's score * points earned against them)
  const sonnebornBerger = playerGames.reduce((sum, game) => {
    const opponentId =
      game.whitePlayerId === player.id
        ? game.blackPlayerId
        : game.whitePlayerId;
    const opponent = players.find(p => p.id === opponentId);

    if (!opponent || !game.result) return sum;

    let pointsEarned = 0;
    if (game.result === 'white_wins') {
      pointsEarned = game.whitePlayerId === player.id ? 1 : 0;
    } else if (game.result === 'black_wins') {
      pointsEarned = game.blackPlayerId === player.id ? 1 : 0;
    } else if (game.result === 'draw') {
      pointsEarned = 0.5;
    }

    return sum + opponent.points * pointsEarned;
  }, 0);

  return [buchholz, sonnebornBerger];
};

// Calculate performance rating
const calculatePerformanceRating = (
  player: PlayerWithStats,
  games: ExtendedGameResult[],
  players: PlayerWithStats[]
): number => {
  const playerGames = games.filter(
    g =>
      (g.whitePlayerId === player.id || g.blackPlayerId === player.id) &&
      g.result
  );

  if (playerGames.length === 0) return player.rating || 1500;

  const averageOpponentRating =
    playerGames.reduce((sum, game) => {
      const opponentId =
        game.whitePlayerId === player.id
          ? game.blackPlayerId
          : game.whitePlayerId;
      const opponent = players.find(p => p.id === opponentId);
      return sum + (opponent?.rating || 1500);
    }, 0) / playerGames.length;

  const scorePercentage = player.points / playerGames.length;

  // Performance rating calculation (simplified)
  if (scorePercentage === 1) return averageOpponentRating + 800;
  if (scorePercentage === 0) return averageOpponentRating - 800;

  const ratingDifference = -400 * Math.log10(1 / scorePercentage - 1);
  return Math.round(averageOpponentRating + ratingDifference);
};

// Team tournament factories
export const createRealisticTeam = (
  config: TeamConfig = {}
): Team & { members: Player[]; averageRating: number } => {
  const teamNames = [
    'Chess Masters',
    'Board Warriors',
    'Knight Riders',
    'Pawn Stars',
    "Queen's Gambit",
    'Rook Rebels',
    'Bishop Battalion',
    "King's Guard",
  ];

  const name =
    config.name || teamNames[Math.floor(Math.random() * teamNames.length)];
  const memberCount = config.memberCount || 4;
  const averageRating = config.averageRating || 1600;

  const members: Player[] = [];
  for (let i = 0; i < memberCount; i++) {
    const rating = averageRating + (Math.random() - 0.5) * 400; // ±200 rating variance
    members.push(
      createRealisticPlayer({
        rating: Math.max(400, Math.min(2800, rating)),
        country_code: config.country,
        tournament_id: config.tournament_id || 1,
      })
    );
  }

  const calculatedAverageRating = Math.round(
    members.reduce((sum, m) => sum + (m.rating || 0), 0) / members.length
  );

  return {
    id: config.id || Math.floor(Math.random() * 1000),
    tournament_id: config.tournament_id || 1,
    name,
    captain: config.captain || null,
    description: config.description || null,
    color: config.color || null,
    club_affiliation: config.club_affiliation || null,
    contact_email: config.contact_email || null,
    contact_phone: config.contact_phone || null,
    max_board_count: config.max_board_count || memberCount,
    status: config.status || ('active' as const),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    members,
    averageRating: calculatedAverageRating,
  };
};

// Complex scenario generators
export const scenarioGenerators = {
  // Generate a close championship race
  closeChampionship: (playerCount = 8, rounds = 7) => {
    return createRealisticTournament({
      playerCount,
      maxRounds: rounds,
      completedRounds: rounds - 1, // One round to go
      scenarioType: 'balanced',
      withPlayers: true,
      withGames: true,
      withStandings: true,
      status: 'active',
    });
  },

  // Generate underdog story tournament
  underdogStory: (playerCount = 16) => {
    const tournament = createRealisticTournament({
      playerCount,
      completedRounds: 3,
      scenarioType: 'upset_heavy',
      withPlayers: true,
      withGames: true,
      withStandings: true,
    });

    // Note: The underdog boost would need to be applied at the game generation level
    // rather than directly modifying player points since Player interface doesn't have points
    return tournament;
  },

  // Generate high-level master tournament
  mastersTournament: (playerCount = 10) => {
    const players = Array.from({ length: playerCount }, (_, i) =>
      createRealisticPlayer({
        id: i + 1,
        skillLevel: 'master',
        rating: 2200 + Math.random() * 400,
        tournament_id: 1,
      })
    );

    return createRealisticTournament({
      name: 'Masters Invitational 2024',
      players,
      playerCount,
      completedRounds: 2,
      scenarioType: 'many_draws',
      withGames: true,
      withStandings: true,
    });
  },

  // Generate rapid tournament with decisive games
  rapidTournament: (playerCount = 12) => {
    return createRealisticTournament({
      name: 'Rapid Championship',
      playerCount,
      completedRounds: 5,
      maxRounds: 9,
      scenarioType: 'decisive',
      withPlayers: true,
      withGames: true,
      withStandings: true,
    });
  },
};

export default {
  createRealisticPlayer,
  createRealisticTournament,
  createRealisticTeam,
  scenarioGenerators,
};
