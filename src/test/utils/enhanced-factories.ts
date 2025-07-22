import {
  createMockTournament,
  createMockPlayer,
  createMockGameResult,
} from './test-utils';

// Enhanced factory interfaces with complex relationships
export interface TournamentConfig {
  id?: number;
  name?: string;
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  pairingMethod?: 'swiss' | 'round_robin' | 'knockout' | 'team_swiss';
  playerCount?: number;
  currentRound?: number;
  maxRounds?: number;
  withPlayers?: boolean;
  withGames?: boolean;
  withStandings?: boolean;
  completedRounds?: number;
  scenarioType?: 'balanced' | 'decisive' | 'many_draws' | 'upset_heavy';
  players?: ReturnType<typeof createRealisticPlayer>[];
}

export interface PlayerConfig {
  id?: number;
  name?: string;
  rating?: number;
  title?: string;
  country?: string;
  skillLevel?: 'beginner' | 'intermediate' | 'expert' | 'master';
  playingStyle?: 'aggressive' | 'positional' | 'tactical' | 'defensive';
  tournamentHistory?: 'veteran' | 'newcomer' | 'occasional';
}

export interface GameConfig {
  whitePlayer?: any;
  blackPlayer?: any;
  result?: 'white_wins' | 'black_wins' | 'draw' | null;
  resultType?: 'normal' | 'forfeit' | 'timeout' | 'bye';
  roundNumber?: number;
  realistic?: boolean; // Apply realistic result probabilities based on ratings
}

export interface TeamConfig {
  name?: string;
  memberCount?: number;
  averageRating?: number;
  country?: string;
  skillLevel?: 'amateur' | 'club' | 'professional' | 'elite';
}

// Enhanced player factory with realistic chess data
export const createRealisticPlayer = (config: PlayerConfig = {}) => {
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

  const country =
    config.country ||
    ['US', 'RU', 'IN', 'CN', 'DE', 'ES', 'FR'][Math.floor(Math.random() * 7)];
  const names =
    namesByCountry[country as keyof typeof namesByCountry] || namesByCountry.US;
  const name = config.name || names[Math.floor(Math.random() * names.length)];

  return createMockPlayer({
    rating: Math.round(rating),
    name,
    title: title || '',
    countryCode: country,
    ...config,
  });
};

// Enhanced tournament factory with complete tournament simulation
export const createRealisticTournament = (config: TournamentConfig = {}) => {
  const tournament = createMockTournament({
    name: config.name || generateTournamentName(),
    status: config.status || 'draft',
    maxPlayers: config.playerCount || 16,
    maxRounds:
      config.maxRounds || Math.ceil(Math.log2(config.playerCount || 16)) + 1,
    pairingMethod: config.pairingMethod || 'swiss',
    ...config,
  });

  let players: any[] = [];
  let games: any[] = [];
  let standings: any[] = [];

  if (config.withPlayers) {
    players = generateTournamentPlayers(
      config.playerCount || 16,
      config.scenarioType
    );
  }

  if (config.withGames && players.length > 0) {
    games = generateTournamentGames(
      players,
      config.completedRounds || 0,
      config.pairingMethod || 'swiss',
      config.scenarioType
    );
  }

  if (config.withStandings && players.length > 0) {
    standings = calculateTournamentStandings(players, games);
  }

  return {
    ...tournament,
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

// Generate realistic tournament players based on scenario
const generateTournamentPlayers = (
  count: number,
  scenarioType?: string
): any[] => {
  const players: any[] = [];

  for (let i = 0; i < count; i++) {
    let skillLevel: 'beginner' | 'intermediate' | 'expert' | 'master';

    // Adjust skill distribution based on scenario
    switch (scenarioType) {
      case 'balanced':
        skillLevel = ['beginner', 'intermediate', 'expert', 'master'][
          Math.floor(Math.random() * 4)
        ] as any;
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
  return players.sort((a, b) => b.rating - a.rating);
};

// Generate realistic games with result probabilities
const generateTournamentGames = (
  players: any[],
  rounds: number,
  pairingMethod: string,
  scenarioType?: string
): any[] => {
  const games: any[] = [];
  let currentPlayers = [...players].map(p => ({
    ...p,
    points: 0,
    wins: 0,
    losses: 0,
    draws: 0,
  }));

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

      game.id = `${round}-${index + 1}`;
      game.boardNumber = index + 1;
      games.push(game);

      // Update player stats
      updatePlayerStats(currentPlayers, game);
    });
  }

  return games;
};

// Generate round pairings based on method
const generateRoundPairings = (
  players: any[],
  round: number,
  method: string
): any[] => {
  const pairings: any[] = [];

  if (method === 'swiss' || method === 'team_swiss') {
    // Swiss system: pair players with similar scores
    const sortedPlayers = [...players].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.rating - a.rating; // Tiebreak by rating
    });

    const paired = new Set<number>();

    for (let i = 0; i < sortedPlayers.length; i++) {
      if (paired.has(sortedPlayers[i].id)) continue;

      // Find best opponent in same score group
      let opponent: (typeof sortedPlayers)[0] | null = null;
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
const generateRoundRobinPairings = (players: any[], round: number): any[] => {
  const n = players.length;
  const pairings: any[] = [];

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
): any => {
  const whitePlayer = config.whitePlayer;
  const blackPlayer = config.blackPlayer;

  let result = config.result;

  if (!result && config.realistic && whitePlayer && blackPlayer) {
    result = calculateRealisticResult(
      whitePlayer.rating,
      blackPlayer.rating,
      scenarioType
    );
  }

  return createMockGameResult({
    whitePlayerId: whitePlayer?.id,
    blackPlayerId: blackPlayer?.id,
    result: result || 'draw',
    resultType: config.resultType || 'normal',
    roundNumber: config.roundNumber || 1,
  });
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
const updatePlayerStats = (players: any[], game: any) => {
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
const calculateTournamentStandings = (players: any[], games: any[]): any[] => {
  return players
    .map(player => ({
      playerId: player.id,
      playerName: player.name,
      rank: 0, // Will be calculated after sorting
      points: player.points || 0,
      wins: player.wins || 0,
      losses: player.losses || 0,
      draws: player.draws || 0,
      gamesPlayed:
        (player.wins || 0) + (player.losses || 0) + (player.draws || 0),
      tiebreaks: calculateTiebreaks(player, games, players),
      performance: calculatePerformanceRating(player, games, players),
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.tiebreaks[0] !== a.tiebreaks[0])
        return b.tiebreaks[0] - a.tiebreaks[0];
      return b.tiebreaks[1] - a.tiebreaks[1];
    })
    .map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
};

// Calculate tiebreak scores
const calculateTiebreaks = (
  player: any,
  games: any[],
  players: any[]
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
  player: any,
  games: any[],
  players: any[]
): number => {
  const playerGames = games.filter(
    g =>
      (g.whitePlayerId === player.id || g.blackPlayerId === player.id) &&
      g.result
  );

  if (playerGames.length === 0) return player.rating;

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
export const createRealisticTeam = (config: TeamConfig = {}): any => {
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

  const members: ReturnType<typeof createRealisticPlayer>[] = [];
  for (let i = 0; i < memberCount; i++) {
    const rating = averageRating + (Math.random() - 0.5) * 400; // ±200 rating variance
    members.push(
      createRealisticPlayer({
        rating: Math.max(400, Math.min(2800, rating)),
        country: config.country,
      })
    );
  }

  return {
    id: Math.floor(Math.random() * 1000),
    name,
    members,
    averageRating: Math.round(
      members.reduce((sum, m) => sum + m.rating, 0) / members.length
    ),
    country: config.country || 'INT',
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

    // Boost a lower-rated player's performance
    const players = tournament.players;
    const underdog = players[players.length - 3]; // Third from bottom
    underdog.points = Math.max(underdog.points, tournament.maxRounds * 0.7);

    return tournament;
  },

  // Generate high-level master tournament
  mastersTournament: (playerCount = 10) => {
    const players = Array.from({ length: playerCount }, (_, i) =>
      createRealisticPlayer({
        id: i + 1,
        skillLevel: 'master',
        rating: 2200 + Math.random() * 400,
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
