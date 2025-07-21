import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Tournament rules engine utilities
const TournamentRulesEngine = {
  // Swiss system rules validation
  validateSwissRules: (
    _tournament: any,
    pairings: any[],
    standings: any[]
  ): {
    valid: boolean;
    violations: string[];
    warnings: string[];
  } => {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Check color balance
    const colorBalance = TournamentRulesEngine.checkColorBalance(
      pairings,
      standings
    );
    if (!colorBalance.valid) {
      violations.push(...colorBalance.violations);
      warnings.push(...colorBalance.warnings);
    }

    // Check pairing restrictions
    const pairingCheck = TournamentRulesEngine.checkPairingRestrictions(
      pairings,
      tournament
    );
    if (!pairingCheck.valid) {
      violations.push(...pairingCheck.violations);
    }

    // Check Swiss system specific rules
    const swissCheck = TournamentRulesEngine.validateSwissSpecificRules(
      tournament,
      pairings,
      standings
    );
    violations.push(...swissCheck.violations);
    warnings.push(...swissCheck.warnings);

    return { valid: violations.length === 0, violations, warnings };
  },

  // Color balance validation
  checkColorBalance: (
    pairings: any[],
    standings: any[]
  ): {
    valid: boolean;
    violations: string[];
    warnings: string[];
  } => {
    const violations: string[] = [];
    const warnings: string[] = [];

    for (const pairing of pairings) {
      if (pairing.bye) continue;

      const whitePlayer = standings.find(p => p.id === pairing.whitePlayerId);
      const blackPlayer = standings.find(p => p.id === pairing.blackPlayerId);

      if (!whitePlayer || !blackPlayer) continue;

      // Check if a player has too many consecutive same colors
      if (whitePlayer.consecutiveWhite >= 3) {
        warnings.push(
          `Player ${whitePlayer.name} has played white ${whitePlayer.consecutiveWhite} times in a row`
        );
      }

      if (blackPlayer.consecutiveBlack >= 3) {
        warnings.push(
          `Player ${blackPlayer.name} has played black ${blackPlayer.consecutiveBlack} times in a row`
        );
      }

      // Check color balance preference
      const whiteDifference =
        (whitePlayer.whiteGames || 0) - (whitePlayer.blackGames || 0);
      const blackDifference =
        (blackPlayer.whiteGames || 0) - (blackPlayer.blackGames || 0);

      if (whiteDifference >= 2 && pairing.whitePlayerId === whitePlayer.id) {
        warnings.push(
          `Player ${whitePlayer.name} already has significantly more white games`
        );
      }

      if (blackDifference >= 2 && pairing.blackPlayerId === blackPlayer.id) {
        warnings.push(
          `Player ${blackPlayer.name} already has significantly more white games but is playing black`
        );
      }
    }

    return { valid: true, violations, warnings };
  },

  // Pairing restrictions validation
  checkPairingRestrictions: (
    pairings: any[],
    _tournament: any
  ): {
    valid: boolean;
    violations: string[];
  } => {
    const violations: string[] = [];

    // Check for rematches
    const previousPairings = tournament.previousPairings || [];
    for (const pairing of pairings) {
      if (pairing.bye) continue;

      const hasPlayedBefore = previousPairings.some(
        (prev: any) =>
          (prev.whitePlayerId === pairing.whitePlayerId &&
            prev.blackPlayerId === pairing.blackPlayerId) ||
          (prev.whitePlayerId === pairing.blackPlayerId &&
            prev.blackPlayerId === pairing.whitePlayerId)
      );

      if (hasPlayedBefore) {
        violations.push(
          `Rematch detected: players ${pairing.whitePlayerId} and ${pairing.blackPlayerId} have played before`
        );
      }
    }

    // Check for duplicate pairings
    const pairingSet = new Set();
    for (const pairing of pairings) {
      if (pairing.bye) continue;

      const pairingKey = [pairing.whitePlayerId, pairing.blackPlayerId]
        .sort()
        .join('-');
      if (pairingSet.has(pairingKey)) {
        violations.push(`Duplicate pairing detected: ${pairingKey}`);
      }
      pairingSet.add(pairingKey);
    }

    return { valid: violations.length === 0, violations };
  },

  // Swiss system specific rules
  validateSwissSpecificRules: (
    _tournament: any,
    pairings: any[],
    standings: any[]
  ): {
    violations: string[];
    warnings: string[];
  } => {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Check bye distribution
    const byeCheck = TournamentRulesEngine.validateByeDistribution(
      pairings,
      standings
    );
    violations.push(...byeCheck.violations);
    warnings.push(...byeCheck.warnings);

    // Check score groups pairing
    const scoreGroupCheck = TournamentRulesEngine.validateScoreGroups(
      pairings,
      standings
    );
    warnings.push(...scoreGroupCheck.warnings);

    // Check floating rules
    const floatingCheck = TournamentRulesEngine.validateFloatingRules(
      pairings,
      standings
    );
    warnings.push(...floatingCheck.warnings);

    return { violations, warnings };
  },

  // Bye distribution validation
  validateByeDistribution: (
    pairings: any[],
    standings: any[]
  ): {
    violations: string[];
    warnings: string[];
  } => {
    const violations: string[] = [];
    const warnings: string[] = [];

    const byePlayers = pairings
      .filter(p => p.bye)
      .map(p => p.whitePlayerId || p.blackPlayerId);

    for (const playerId of byePlayers) {
      const player = standings.find(p => p.id === playerId);
      if (!player) continue;

      // Check if player has already received a bye
      if (player.byesReceived && player.byesReceived > 0) {
        violations.push(
          `Player ${player.name} is receiving a second bye, which is not allowed`
        );
      }

      // Check if player has lowest score (bye should go to lowest-rated among lowest scorers)
      const lowestScore = Math.min(...standings.map(p => p.score || 0));
      if ((player.score || 0) > lowestScore + 0.5) {
        warnings.push(
          `Player ${player.name} receiving bye but doesn't have one of the lowest scores`
        );
      }
    }

    return { violations, warnings };
  },

  // Score groups validation
  validateScoreGroups: (
    pairings: any[],
    standings: any[]
  ): {
    warnings: string[];
  } => {
    const warnings: string[] = [];

    // Group players by score
    const scoreGroups: { [score: string]: any[] } = {};
    standings.forEach(player => {
      const score = (player.score || 0).toString();
      if (!scoreGroups[score]) scoreGroups[score] = [];
      scoreGroups[score].push(player);
    });

    // Check if pairings are within score groups or adjacent groups
    for (const pairing of pairings) {
      if (pairing.bye) continue;

      const whitePlayer = standings.find(p => p.id === pairing.whitePlayerId);
      const blackPlayer = standings.find(p => p.id === pairing.blackPlayerId);

      if (!whitePlayer || !blackPlayer) continue;

      const scoreDifference = Math.abs(
        (whitePlayer.score || 0) - (blackPlayer.score || 0)
      );
      if (scoreDifference > 1) {
        warnings.push(
          `Large score difference in pairing: ${whitePlayer.name} (${whitePlayer.score}) vs ${blackPlayer.name} (${blackPlayer.score})`
        );
      }
    }

    return { warnings };
  },

  // Floating rules validation
  validateFloatingRules: (
    pairings: any[],
    standings: any[]
  ): {
    warnings: string[];
  } => {
    const warnings: string[] = [];

    // Check for excessive upward or downward floating
    for (const pairing of pairings) {
      if (pairing.bye) continue;

      const whitePlayer = standings.find(p => p.id === pairing.whitePlayerId);
      const blackPlayer = standings.find(p => p.id === pairing.blackPlayerId);

      if (!whitePlayer || !blackPlayer) continue;

      const whiteRank = standings.indexOf(whitePlayer) + 1;
      const blackRank = standings.indexOf(blackPlayer) + 1;
      const rankDifference = Math.abs(whiteRank - blackRank);

      if (rankDifference > standings.length / 4) {
        warnings.push(
          `Large rank difference in pairing: ranks ${whiteRank} vs ${blackRank}`
        );
      }
    }

    return { warnings };
  },

  // Round Robin rules validation
  validateRoundRobinRules: (
    _tournament: any,
    schedule: any[][]
  ): {
    valid: boolean;
    violations: string[];
  } => {
    const violations: string[] = [];
    const playerCount = tournament.playerCount;

    // Check that each player plays every other player exactly once
    const pairingsMatrix: boolean[][] = Array(playerCount)
      .fill(null)
      .map(() => Array(playerCount).fill(false));

    for (const round of schedule) {
      for (const pairing of round) {
        if (pairing.bye) continue;

        const whiteIdx = pairing.whitePlayerId - 1;
        const blackIdx = pairing.blackPlayerId - 1;

        if (
          pairingsMatrix[whiteIdx][blackIdx] ||
          pairingsMatrix[blackIdx][whiteIdx]
        ) {
          violations.push(
            `Players ${pairing.whitePlayerId} and ${pairing.blackPlayerId} paired more than once`
          );
        }

        pairingsMatrix[whiteIdx][blackIdx] = true;
        pairingsMatrix[blackIdx][whiteIdx] = true;
      }
    }

    // Check that all required pairings exist
    for (let i = 0; i < playerCount; i++) {
      for (let j = i + 1; j < playerCount; j++) {
        if (!pairingsMatrix[i][j]) {
          violations.push(`Players ${i + 1} and ${j + 1} never paired`);
        }
      }
    }

    return { valid: violations.length === 0, violations };
  },

  // Knockout rules validation
  validateKnockoutRules: (
    _tournament: any,
    bracket: any
  ): {
    valid: boolean;
    violations: string[];
  } => {
    const violations: string[] = [];

    // Validate bracket structure
    const expectedRounds = Math.ceil(Math.log2(tournament.playerCount));
    if (bracket.rounds.length !== expectedRounds) {
      violations.push(
        `Expected ${expectedRounds} rounds for ${tournament.playerCount} players, got ${bracket.rounds.length}`
      );
    }

    // Check that winners advance correctly
    for (let roundIdx = 0; roundIdx < bracket.rounds.length - 1; roundIdx++) {
      const currentRound = bracket.rounds[roundIdx];
      const nextRound = bracket.rounds[roundIdx + 1];

      const expectedNextRoundPairings = Math.ceil(currentRound.length / 2);
      if (nextRound.length !== expectedNextRoundPairings) {
        violations.push(
          `Round ${roundIdx + 2} should have ${expectedNextRoundPairings} pairings, got ${nextRound.length}`
        );
      }
    }

    // Validate seeding
    const seedingCheck = TournamentRulesEngine.validateKnockoutSeeding(
      tournament,
      bracket
    );
    violations.push(...seedingCheck.violations);

    return { valid: violations.length === 0, violations };
  },

  // Knockout seeding validation
  validateKnockoutSeeding: (
    _tournament: any,
    bracket: any
  ): {
    violations: string[];
  } => {
    const violations: string[] = [];

    if (!bracket.rounds[0] || bracket.rounds[0].length === 0) {
      violations.push('First round cannot be empty');
      return { violations };
    }

    // Check that highest seeds are separated in first round
    const firstRound = bracket.rounds[0];
    const players = tournament.players || [];

    // Sort players by rating (assuming higher rating = higher seed)
    const sortedPlayers = [...players].sort(
      (a, b) => (b.rating || 0) - (a.rating || 0)
    );

    // Check if top seeds meet too early
    const topSeedsInSameHalf = firstRound.some((pairing: any) => {
      const whitePlayer = players.find(
        (p: any) => p.id === pairing.whitePlayerId
      );
      const blackPlayer = players.find(
        (p: any) => p.id === pairing.blackPlayerId
      );

      if (!whitePlayer || !blackPlayer) return false;

      const whiteRank = sortedPlayers.indexOf(whitePlayer) + 1;
      const blackRank = sortedPlayers.indexOf(blackPlayer) + 1;

      // Top 2 seeds shouldn't meet before final, top 4 before semifinals, etc.
      return (
        (whiteRank <= 2 && blackRank <= 2) ||
        (whiteRank <= 4 &&
          blackRank <= 4 &&
          Math.abs(whiteRank - blackRank) <= 1)
      );
    });

    if (topSeedsInSameHalf) {
      violations.push('Top seeds are meeting too early in the tournament');
    }

    return { violations };
  },

  // FIDE rating calculation rules
  calculateFIDERatingChange: (
    playerRating: number,
    opponentRating: number,
    score: number,
    kFactor: number = 20
  ): number => {
    // Expected score calculation
    const expectedScore =
      1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));

    // Rating change
    const ratingChange = kFactor * (score - expectedScore);

    return Math.round(ratingChange);
  },

  // K-factor determination
  getKFactor: (player: any): number => {
    // FIDE K-factor rules
    if (player.rating >= 2400) return 10; // Strong players
    if (player.gameCount < 30) return 40; // New players
    if (player.age && player.age < 18) return 40; // Juniors
    return 20; // Standard
  },

  // Tiebreak calculations
  calculateTiebreaks: (
    player: any,
    opponents: any[],
    _tournament: any
  ): {
    buchholz: number;
    medianBuchholz: number;
    sonneborn: number;
    cumulativeScore: number;
  } => {
    // Buchholz: sum of opponents' final scores
    const buchholz = opponents.reduce((sum, opp) => sum + (opp.score || 0), 0);

    // Median Buchholz: Buchholz minus highest and lowest opponent scores
    const opponentScores = opponents
      .map(opp => opp.score || 0)
      .sort((a, b) => b - a);
    const medianBuchholz =
      opponentScores.length > 2
        ? opponentScores.slice(1, -1).reduce((sum, score) => sum + score, 0)
        : buchholz;

    // Sonneborn-Berger: sum of defeated opponents' scores + half the score of drawn opponents
    let sonneborn = 0;
    player.games?.forEach((game: any, index: number) => {
      const opponent = opponents[index];
      if (!opponent) return;

      if (game.result === 'win') {
        sonneborn += opponent.score || 0;
      } else if (game.result === 'draw') {
        sonneborn += (opponent.score || 0) / 2;
      }
    });

    // Cumulative score: sum of scores after each round
    let cumulativeScore = 0;
    player.games?.forEach((game: any) => {
      if (game.result === 'win') cumulativeScore += 1;
      else if (game.result === 'draw') cumulativeScore += 0.5;
    });

    return { buchholz, medianBuchholz, sonneborn, cumulativeScore };
  },

  // Time control validation
  validateTimeControl: (
    timeControl: any,
    moves: any[]
  ): {
    valid: boolean;
    violations: string[];
  } => {
    const violations: string[] = [];

    if (!timeControl || !moves || moves.length === 0) {
      return { valid: true, violations };
    }

    const { mainTime, increment, type } = timeControl;
    let whiteTime = mainTime * 60; // Convert to seconds
    let blackTime = mainTime * 60;

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const isWhiteMove = i % 2 === 0;

      if (isWhiteMove) {
        whiteTime -= move.timeUsed || 0;
        if (type === 'fischer') whiteTime += increment;
        else if (type === 'bronstein')
          whiteTime += Math.min(increment, move.timeUsed || 0);

        if (whiteTime < 0) {
          violations.push(
            `White exceeded time limit on move ${Math.floor(i / 2) + 1}`
          );
        }
      } else {
        blackTime -= move.timeUsed || 0;
        if (type === 'fischer') blackTime += increment;
        else if (type === 'bronstein')
          blackTime += Math.min(increment, move.timeUsed || 0);

        if (blackTime < 0) {
          violations.push(
            `Black exceeded time limit on move ${Math.floor(i / 2) + 1}`
          );
        }
      }
    }

    return { valid: violations.length === 0, violations };
  },

  // Anti-cheating rules validation
  validateAntiCheatRules: (
    player: any,
    games: any[]
  ): {
    suspiciousActivities: string[];
    riskLevel: 'low' | 'medium' | 'high';
  } => {
    const suspiciousActivities: string[] = [];

    // Check for unusual rating performance
    const expectedPerformance = player.rating;
    const actualPerformance =
      TournamentRulesEngine.calculatePerformanceRating(games);

    if (actualPerformance > expectedPerformance + 200) {
      suspiciousActivities.push(
        `Performance rating (${actualPerformance}) significantly higher than current rating (${expectedPerformance})`
      );
    }

    // Check for consistent high-level moves
    let strongMoveCount = 0;
    games.forEach(game => {
      game.moves?.forEach((move: any) => {
        if (move.evaluation && Math.abs(move.evaluation) < 0.1) {
          strongMoveCount++;
        }
      });
    });

    const strongMovePercentage = strongMoveCount / (games.length * 40); // Assuming average 40 moves per game
    if (strongMovePercentage > 0.95) {
      suspiciousActivities.push(
        `Unusually high percentage of strong moves: ${(strongMovePercentage * 100).toFixed(1)}%`
      );
    }

    // Check for unusual time usage patterns
    const timeUsageCheck = TournamentRulesEngine.analyzeTimeUsage(games);
    suspiciousActivities.push(...timeUsageCheck.suspiciousPatterns);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (suspiciousActivities.length >= 3) riskLevel = 'high';
    else if (suspiciousActivities.length >= 2) riskLevel = 'medium';

    return { suspiciousActivities, riskLevel };
  },

  // Performance rating calculation
  calculatePerformanceRating: (games: any[]): number => {
    if (games.length === 0) return 0;

    let totalScore = 0;
    let totalOpponentRating = 0;
    let validGames = 0;

    games.forEach(game => {
      if (game.opponent && game.opponent.rating && game.result !== 'bye') {
        totalOpponentRating += game.opponent.rating;

        if (game.result === 'win') totalScore += 1;
        else if (game.result === 'draw') totalScore += 0.5;

        validGames++;
      }
    });

    if (validGames === 0) return 0;

    const averageOpponentRating = totalOpponentRating / validGames;
    const scorePercentage = totalScore / validGames;

    // Convert score percentage to performance rating
    if (scorePercentage >= 1) return averageOpponentRating + 400;
    if (scorePercentage <= 0) return averageOpponentRating - 400;

    const logOdds = Math.log(scorePercentage / (1 - scorePercentage));
    return Math.round(averageOpponentRating + (400 * logOdds) / Math.LN10);
  },

  // Time usage analysis
  analyzeTimeUsage: (
    games: any[]
  ): {
    suspiciousPatterns: string[];
  } => {
    const suspiciousPatterns: string[] = [];

    // Analyze time consistency across games
    const timingData: number[] = [];

    games.forEach(game => {
      game.moves?.forEach((move: any, index: number) => {
        if (move.timeUsed && index < 30) {
          // Focus on opening/middlegame
          timingData.push(move.timeUsed);
        }
      });
    });

    if (timingData.length > 20) {
      // Check for unusually consistent timing
      const variance = TournamentRulesEngine.calculateVariance(timingData);
      const mean =
        timingData.reduce((sum, time) => sum + time, 0) / timingData.length;

      if (variance < mean * 0.1) {
        suspiciousPatterns.push('Unusually consistent move timing patterns');
      }

      // Check for computer-like timing patterns
      const shortMoves = timingData.filter(time => time < 5).length;
      const shortMovePercentage = shortMoves / timingData.length;

      if (shortMovePercentage > 0.8) {
        suspiciousPatterns.push(
          'Unusually high percentage of very quick moves'
        );
      }
    }

    return { suspiciousPatterns };
  },

  // Statistical variance calculation
  calculateVariance: (data: number[]): number => {
    const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
    const squaredDifferences = data.map(value => Math.pow(value - mean, 2));
    return (
      squaredDifferences.reduce((sum, sqDiff) => sum + sqDiff, 0) / data.length
    );
  },
};

// Tournament rules testing component
const TournamentRulesValidator = ({
  tournament,
  pairings = [],
  standings = [],
  ruleSet = 'swiss',
}: {
  tournament: any;
  pairings?: any[];
  standings?: any[];
  ruleSet?: 'swiss' | 'round_robin' | 'knockout';
}) => {
  const [validation, setValidation] = React.useState<any>(null);
  const [showDetails, setShowDetails] = React.useState(false);

  React.useEffect(() => {
    validateRules();
  }, [tournament, pairings, standings, ruleSet]);

  const validateRules = () => {
    let result;

    switch (ruleSet) {
      case 'swiss':
        result = TournamentRulesEngine.validateSwissRules(
          tournament,
          pairings,
          standings
        );
        break;
      case 'round_robin': {
        const schedule = [pairings]; // Simplified for testing
        result = TournamentRulesEngine.validateRoundRobinRules(
          tournament,
          schedule
        );
        break;
      }
      case 'knockout': {
        const bracket = { rounds: [pairings] }; // Simplified for testing
        result = TournamentRulesEngine.validateKnockoutRules(
          tournament,
          bracket
        );
        break;
      }
      default:
        result = { valid: false, violations: ['Unknown rule set'] };
    }

    setValidation(result);
  };

  if (!validation) {
    return <div data-testid="rules-validator-loading">Validating rules...</div>;
  }

  return (
    <div data-testid="tournament-rules-validator">
      <div data-testid="validation-summary">
        <div data-testid="rule-set">Rule Set: {ruleSet}</div>
        <div
          data-testid="validation-status"
          className={validation.valid ? 'valid' : 'invalid'}
        >
          Status: {validation.valid ? 'Valid' : 'Invalid'}
        </div>

        {validation.violations && validation.violations.length > 0 && (
          <div data-testid="violations-count" className="violations">
            Violations: {validation.violations.length}
          </div>
        )}

        {validation.warnings && validation.warnings.length > 0 && (
          <div data-testid="warnings-count" className="warnings">
            Warnings: {validation.warnings.length}
          </div>
        )}
      </div>

      <button
        data-testid="toggle-details"
        onClick={() => setShowDetails(!showDetails)}
      >
        {showDetails ? 'Hide Details' : 'Show Details'}
      </button>

      {showDetails && (
        <div data-testid="validation-details">
          {validation.violations && validation.violations.length > 0 && (
            <div data-testid="violations-list">
              <h4>Violations:</h4>
              <ul>
                {validation.violations.map(
                  (violation: string, index: number) => (
                    <li key={index} data-testid={`violation-${index}`}>
                      {violation}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          {validation.warnings && validation.warnings.length > 0 && (
            <div data-testid="warnings-list">
              <h4>Warnings:</h4>
              <ul>
                {validation.warnings.map((warning: string, index: number) => (
                  <li key={index} data-testid={`warning-${index}`}>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Rating calculator component
const RatingCalculator = () => {
  const [player1Rating, setPlayer1Rating] = React.useState(1600);
  const [player2Rating, setPlayer2Rating] = React.useState(1600);
  const [result, setResult] = React.useState<'win' | 'draw' | 'loss'>('win');
  const [kFactor, setKFactor] = React.useState(20);
  const [calculation, setCalculation] = React.useState<any>(null);

  const calculateRating = () => {
    const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
    const ratingChange = TournamentRulesEngine.calculateFIDERatingChange(
      player1Rating,
      player2Rating,
      score,
      kFactor
    );

    const expectedScore =
      1 / (1 + Math.pow(10, (player2Rating - player1Rating) / 400));

    setCalculation({
      expectedScore: expectedScore.toFixed(3),
      actualScore: score,
      ratingChange,
      newRating: player1Rating + ratingChange,
    });
  };

  return (
    <div data-testid="rating-calculator">
      <h3>FIDE Rating Calculator</h3>

      <div data-testid="calculator-inputs">
        <div>
          <label>Player 1 Rating:</label>
          <input
            data-testid="player1-rating"
            type="number"
            value={player1Rating}
            onChange={e => setPlayer1Rating(parseInt(e.target.value))}
          />
        </div>

        <div>
          <label>Player 2 Rating:</label>
          <input
            data-testid="player2-rating"
            type="number"
            value={player2Rating}
            onChange={e => setPlayer2Rating(parseInt(e.target.value))}
          />
        </div>

        <div>
          <label>Result (Player 1):</label>
          <select
            data-testid="result-select"
            value={result}
            onChange={e => setResult(e.target.value as any)}
          >
            <option value="win">Win</option>
            <option value="draw">Draw</option>
            <option value="loss">Loss</option>
          </select>
        </div>

        <div>
          <label>K-Factor:</label>
          <input
            data-testid="k-factor"
            type="number"
            value={kFactor}
            onChange={e => setKFactor(parseInt(e.target.value))}
          />
        </div>

        <button data-testid="calculate-button" onClick={calculateRating}>
          Calculate
        </button>
      </div>

      {calculation && (
        <div data-testid="calculation-result">
          <h4>Result:</h4>
          <div data-testid="expected-score">
            Expected Score: {calculation.expectedScore}
          </div>
          <div data-testid="actual-score">
            Actual Score: {calculation.actualScore}
          </div>
          <div data-testid="rating-change">
            Rating Change: {calculation.ratingChange > 0 ? '+' : ''}
            {calculation.ratingChange}
          </div>
          <div data-testid="new-rating">
            New Rating: {calculation.newRating}
          </div>
        </div>
      )}
    </div>
  );
};

// Tiebreak calculator component
const TiebreakCalculator = ({
  player,
  opponents,
  tournament,
}: {
  player: any;
  opponents: any[];
  tournament: any;
}) => {
  const [tiebreaks, setTiebreaks] = React.useState<any>(null);

  React.useEffect(() => {
    if (player && opponents.length > 0) {
      const calculatedTiebreaks = TournamentRulesEngine.calculateTiebreaks(
        player,
        opponents,
        tournament
      );
      setTiebreaks(calculatedTiebreaks);
    }
  }, [player, opponents, tournament]);

  if (!tiebreaks) {
    return (
      <div data-testid="tiebreak-calculator-loading">
        Calculating tiebreaks...
      </div>
    );
  }

  return (
    <div data-testid="tiebreak-calculator">
      <h4>Tiebreak Calculations for {player.name}</h4>

      <div data-testid="tiebreak-results">
        <div data-testid="buchholz">
          Buchholz: {tiebreaks.buchholz.toFixed(1)}
        </div>
        <div data-testid="median-buchholz">
          Median Buchholz: {tiebreaks.medianBuchholz.toFixed(1)}
        </div>
        <div data-testid="sonneborn">
          Sonneborn-Berger: {tiebreaks.sonneborn.toFixed(1)}
        </div>
        <div data-testid="cumulative-score">
          Cumulative Score: {tiebreaks.cumulativeScore.toFixed(1)}
        </div>
      </div>

      <div data-testid="opponent-scores">
        <h5>Opponent Scores:</h5>
        <ul>
          {opponents.map((opponent, index) => (
            <li key={index} data-testid={`opponent-${index}`}>
              {opponent.name}: {opponent.score || 0}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

describe('Tournament Rule Variations and Chess-Specific Logic Tests', () => {
  describe('Swiss System Rules Validation', () => {
    test('should validate basic Swiss tournament rules', () => {
      const tournament = {
        format: 'swiss',
        playerCount: 8,
        rounds: 3,
        previousPairings: [],
      };

      const standings = [
        {
          id: 1,
          name: 'Player 1',
          score: 2.5,
          whiteGames: 1,
          blackGames: 1,
          consecutiveWhite: 0,
          consecutiveBlack: 1,
        },
        {
          id: 2,
          name: 'Player 2',
          score: 2.0,
          whiteGames: 1,
          blackGames: 1,
          consecutiveWhite: 1,
          consecutiveBlack: 0,
        },
        {
          id: 3,
          name: 'Player 3',
          score: 1.5,
          whiteGames: 2,
          blackGames: 0,
          consecutiveWhite: 0,
          consecutiveBlack: 0,
        },
        {
          id: 4,
          name: 'Player 4',
          score: 1.0,
          whiteGames: 0,
          blackGames: 2,
          consecutiveWhite: 0,
          consecutiveBlack: 0,
        },
      ];

      const pairings = [
        { whitePlayerId: 1, blackPlayerId: 2, boardNumber: 1, bye: false },
        { whitePlayerId: 3, blackPlayerId: 4, boardNumber: 2, bye: false },
      ];

      const result = TournamentRulesEngine.validateSwissRules(
        tournament,
        pairings,
        standings
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should detect rematch violations', () => {
      const tournament = {
        format: 'swiss',
        playerCount: 4,
        rounds: 3,
        previousPairings: [{ whitePlayerId: 1, blackPlayerId: 2 }],
      };

      const pairings = [
        { whitePlayerId: 1, blackPlayerId: 2, boardNumber: 1, bye: false },
      ];

      const result = TournamentRulesEngine.validateSwissRules(
        tournament,
        pairings,
        []
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toContain(
        'Rematch detected: players 1 and 2 have played before'
      );
    });

    test('should detect duplicate bye violations', () => {
      const standings = [
        { id: 1, name: 'Player 1', score: 1.0, byesReceived: 1 },
      ];

      const pairings = [
        { whitePlayerId: 1, blackPlayerId: null, boardNumber: 1, bye: true },
      ];

      const result = TournamentRulesEngine.validateSwissRules(
        {},
        pairings,
        standings
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toContain(
        'Player Player 1 is receiving a second bye, which is not allowed'
      );
    });

    test('should warn about color balance issues', () => {
      const standings = [
        {
          id: 1,
          name: 'Player 1',
          score: 2.0,
          consecutiveWhite: 3,
          whiteGames: 3,
          blackGames: 0,
        },
        {
          id: 2,
          name: 'Player 2',
          score: 2.0,
          consecutiveBlack: 0,
          whiteGames: 0,
          blackGames: 3,
        },
      ];

      const pairings = [
        { whitePlayerId: 1, blackPlayerId: 2, boardNumber: 1, bye: false },
      ];

      const result = TournamentRulesEngine.validateSwissRules(
        {},
        pairings,
        standings
      );

      expect(result.warnings).toContain(
        'Player Player 1 has played white 3 times in a row'
      );
      expect(result.warnings).toContain(
        'Player Player 1 already has significantly more white games'
      );
    });

    test('should warn about large score differences', () => {
      const standings = [
        { id: 1, name: 'Player 1', score: 3.0 },
        { id: 2, name: 'Player 2', score: 1.0 },
      ];

      const pairings = [
        { whitePlayerId: 1, blackPlayerId: 2, boardNumber: 1, bye: false },
      ];

      const result = TournamentRulesEngine.validateSwissRules(
        {},
        pairings,
        standings
      );

      expect(result.warnings).toContain(
        'Large score difference in pairing: Player 1 (3) vs Player 2 (1)'
      );
    });
  });

  describe('Round Robin Rules Validation', () => {
    test('should validate complete round robin schedule', () => {
      const tournament = { playerCount: 4 };
      const schedule = [
        [
          { whitePlayerId: 1, blackPlayerId: 2, bye: false },
          { whitePlayerId: 3, blackPlayerId: 4, bye: false },
        ],
        [
          { whitePlayerId: 1, blackPlayerId: 3, bye: false },
          { whitePlayerId: 2, blackPlayerId: 4, bye: false },
        ],
        [
          { whitePlayerId: 1, blackPlayerId: 4, bye: false },
          { whitePlayerId: 2, blackPlayerId: 3, bye: false },
        ],
      ];

      const result = TournamentRulesEngine.validateRoundRobinRules(
        tournament,
        schedule
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should detect missing pairings in round robin', () => {
      const tournament = { playerCount: 4 };
      const schedule = [[{ whitePlayerId: 1, blackPlayerId: 2, bye: false }]];

      const result = TournamentRulesEngine.validateRoundRobinRules(
        tournament,
        schedule
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toContain('Players 1 and 3 never paired');
      expect(result.violations).toContain('Players 1 and 4 never paired');
      expect(result.violations).toContain('Players 2 and 3 never paired');
      expect(result.violations).toContain('Players 2 and 4 never paired');
      expect(result.violations).toContain('Players 3 and 4 never paired');
    });

    test('should detect repeated pairings in round robin', () => {
      const tournament = { playerCount: 4 };
      const schedule = [
        [
          { whitePlayerId: 1, blackPlayerId: 2, bye: false },
          { whitePlayerId: 3, blackPlayerId: 4, bye: false },
        ],
        [
          { whitePlayerId: 2, blackPlayerId: 1, bye: false }, // Repeated pairing
          { whitePlayerId: 3, blackPlayerId: 4, bye: false },
        ],
      ];

      const result = TournamentRulesEngine.validateRoundRobinRules(
        tournament,
        schedule
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toContain(
        'Players 1 and 2 paired more than once'
      );
    });
  });

  describe('Knockout Rules Validation', () => {
    test('should validate knockout bracket structure', () => {
      const tournament = { playerCount: 8 };
      const bracket = {
        rounds: [
          [
            { whitePlayerId: 1, blackPlayerId: 8 },
            { whitePlayerId: 2, blackPlayerId: 7 },
            { whitePlayerId: 3, blackPlayerId: 6 },
            { whitePlayerId: 4, blackPlayerId: 5 },
          ],
          [
            { whitePlayerId: 1, blackPlayerId: 2 },
            { whitePlayerId: 3, blackPlayerId: 4 },
          ],
          [{ whitePlayerId: 1, blackPlayerId: 3 }],
        ],
      };

      const result = TournamentRulesEngine.validateKnockoutRules(
        tournament,
        bracket
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should detect incorrect number of rounds', () => {
      const tournament = { playerCount: 8 };
      const bracket = {
        rounds: [[{ whitePlayerId: 1, blackPlayerId: 2 }]],
      };

      const result = TournamentRulesEngine.validateKnockoutRules(
        tournament,
        bracket
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toContain(
        'Expected 3 rounds for 8 players, got 1'
      );
    });

    test('should validate knockout seeding', () => {
      const tournament = {
        playerCount: 4,
        players: [
          { id: 1, rating: 2200 },
          { id: 2, rating: 1800 },
          { id: 3, rating: 1600 },
          { id: 4, rating: 1400 },
        ],
      };

      const bracket = {
        rounds: [
          [
            { whitePlayerId: 1, blackPlayerId: 2 }, // Top seeds meeting too early
          ],
        ],
      };

      const result = TournamentRulesEngine.validateKnockoutRules(
        tournament,
        bracket
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toContain(
        'Top seeds are meeting too early in the tournament'
      );
    });
  });

  describe('FIDE Rating Calculations', () => {
    test('should calculate rating changes correctly', () => {
      const change1 = TournamentRulesEngine.calculateFIDERatingChange(
        1600,
        1600,
        1,
        20
      ); // Win
      const change2 = TournamentRulesEngine.calculateFIDERatingChange(
        1600,
        1600,
        0.5,
        20
      ); // Draw
      const change3 = TournamentRulesEngine.calculateFIDERatingChange(
        1600,
        1600,
        0,
        20
      ); // Loss

      expect(change1).toBe(10); // +10 for win against equal opponent
      expect(change2).toBe(0); // 0 for draw against equal opponent
      expect(change3).toBe(-10); // -10 for loss against equal opponent
    });

    test('should calculate rating changes against stronger opponent', () => {
      const change = TournamentRulesEngine.calculateFIDERatingChange(
        1400,
        1600,
        1,
        20
      ); // Lower rated wins
      expect(change).toBeGreaterThan(10); // Should gain more than 10 points
    });

    test('should calculate rating changes against weaker opponent', () => {
      const change = TournamentRulesEngine.calculateFIDERatingChange(
        1600,
        1400,
        0,
        20
      ); // Higher rated loses
      expect(change).toBeLessThan(-10); // Should lose more than 10 points
    });

    test('should determine K-factors correctly', () => {
      const strongPlayer = { rating: 2500, gameCount: 100, age: 30 };
      const newPlayer = { rating: 1200, gameCount: 10, age: 25 };
      const juniorPlayer = { rating: 1500, gameCount: 50, age: 16 };

      expect(TournamentRulesEngine.getKFactor(strongPlayer)).toBe(10);
      expect(TournamentRulesEngine.getKFactor(newPlayer)).toBe(40);
      expect(TournamentRulesEngine.getKFactor(juniorPlayer)).toBe(40);
    });
  });

  describe('Tiebreak Calculations', () => {
    test('should calculate Buchholz tiebreak', () => {
      const player = { score: 3.0 };
      const opponents = [{ score: 2.5 }, { score: 2.0 }, { score: 1.5 }];

      const tiebreaks = TournamentRulesEngine.calculateTiebreaks(
        player,
        opponents,
        {}
      );

      expect(tiebreaks.buchholz).toBe(6.0); // 2.5 + 2.0 + 1.5
    });

    test('should calculate Median Buchholz tiebreak', () => {
      const player = { score: 3.0 };
      const opponents = [{ score: 3.0 }, { score: 2.0 }, { score: 1.0 }];

      const tiebreaks = TournamentRulesEngine.calculateTiebreaks(
        player,
        opponents,
        {}
      );

      expect(tiebreaks.medianBuchholz).toBe(2.0); // Remove highest (3.0) and lowest (1.0)
    });

    test('should calculate Sonneborn-Berger tiebreak', () => {
      const player = {
        score: 2.5,
        games: [{ result: 'win' }, { result: 'draw' }, { result: 'loss' }],
      };
      const opponents = [
        { score: 2.0 }, // Won against this player
        { score: 1.5 }, // Drew against this player
        { score: 1.0 }, // Lost against this player
      ];

      const tiebreaks = TournamentRulesEngine.calculateTiebreaks(
        player,
        opponents,
        {}
      );

      expect(tiebreaks.sonneborn).toBe(2.75); // 2.0 + (1.5/2) + 0
    });
  });

  describe('Time Control Validation', () => {
    test('should validate Fischer increment time control', () => {
      const timeControl = { mainTime: 5, increment: 3, type: 'fischer' }; // 5+3
      const moves = [
        { timeUsed: 10 }, // White move 1: 10 seconds
        { timeUsed: 15 }, // Black move 1: 15 seconds
        { timeUsed: 20 }, // White move 2: 20 seconds
      ];

      const result = TournamentRulesEngine.validateTimeControl(
        timeControl,
        moves
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should detect time violations', () => {
      const timeControl = { mainTime: 1, increment: 0, type: 'simple' }; // 1 minute
      const moves = [
        { timeUsed: 70 }, // Exceeds 60 seconds
      ];

      const result = TournamentRulesEngine.validateTimeControl(
        timeControl,
        moves
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toContain(
        'White exceeded time limit on move 1'
      );
    });

    test('should handle Bronstein delay correctly', () => {
      const timeControl = { mainTime: 2, increment: 5, type: 'bronstein' };
      const moves = [
        { timeUsed: 3 }, // Used 3 seconds, gets 3 seconds back (not full increment)
        { timeUsed: 8 }, // Used 8 seconds, gets 5 seconds back (capped at increment)
      ];

      const result = TournamentRulesEngine.validateTimeControl(
        timeControl,
        moves
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Anti-Cheating Rules', () => {
    test('should detect suspicious performance rating', () => {
      const player = { rating: 1500 };
      const games = [
        { result: 'win', opponent: { rating: 2000 } },
        { result: 'win', opponent: { rating: 1900 } },
        { result: 'draw', opponent: { rating: 2100 } },
      ];

      const analysis = TournamentRulesEngine.validateAntiCheatRules(
        player,
        games
      );

      expect(analysis.suspiciousActivities.length).toBeGreaterThan(0);
      expect(analysis.riskLevel).not.toBe('low');
    });

    test('should calculate performance rating', () => {
      const games = [
        { result: 'win', opponent: { rating: 1600 } },
        { result: 'draw', opponent: { rating: 1700 } },
        { result: 'loss', opponent: { rating: 1800 } },
      ];

      const performance =
        TournamentRulesEngine.calculatePerformanceRating(games);

      expect(performance).toBeGreaterThan(1500);
      expect(performance).toBeLessThan(1800);
    });

    test('should detect suspicious timing patterns', () => {
      const games = [
        {
          moves: [
            { timeUsed: 2 },
            { timeUsed: 2 },
            { timeUsed: 2 },
            { timeUsed: 2 },
            { timeUsed: 2 },
            { timeUsed: 2 },
          ],
        },
      ];

      const analysis = TournamentRulesEngine.analyzeTimeUsage(games);

      expect(analysis.suspiciousPatterns).toContain(
        'Unusually high percentage of very quick moves'
      );
    });
  });

  describe('Tournament Rules Validator Component', () => {
    test('should display Swiss rules validation results', () => {
      const tournament = { format: 'swiss', playerCount: 8 };
      const pairings = [
        { whitePlayerId: 1, blackPlayerId: 2, boardNumber: 1, bye: false },
      ];
      const standings = [
        { id: 1, name: 'Player 1', score: 1.0 },
        { id: 2, name: 'Player 2', score: 1.0 },
      ];

      render(
        <TournamentRulesValidator
          tournament={tournament}
          pairings={pairings}
          standings={standings}
          ruleSet="swiss"
        />
      );

      expect(screen.getByTestId('rule-set')).toHaveTextContent(
        'Rule Set: swiss'
      );
      expect(screen.getByTestId('validation-status')).toHaveTextContent(
        'Status: Valid'
      );
    });

    test('should display rule violations', () => {
      const tournament = {
        format: 'swiss',
        playerCount: 4,
        previousPairings: [{ whitePlayerId: 1, blackPlayerId: 2 }],
      };
      const pairings = [
        { whitePlayerId: 1, blackPlayerId: 2, boardNumber: 1, bye: false }, // Rematch
      ];

      render(
        <TournamentRulesValidator
          tournament={tournament}
          pairings={pairings}
          standings={[]}
          ruleSet="swiss"
        />
      );

      expect(screen.getByTestId('validation-status')).toHaveTextContent(
        'Status: Invalid'
      );
      expect(screen.getByTestId('violations-count')).toHaveTextContent(
        'Violations: 1'
      );
    });

    test('should show and hide violation details', async () => {
      const user = userEvent.setup();

      const tournament = {
        format: 'swiss',
        previousPairings: [{ whitePlayerId: 1, blackPlayerId: 2 }],
      };
      const pairings = [
        { whitePlayerId: 1, blackPlayerId: 2, boardNumber: 1, bye: false },
      ];

      render(
        <TournamentRulesValidator
          tournament={tournament}
          pairings={pairings}
          standings={[]}
          ruleSet="swiss"
        />
      );

      // Details should be hidden initially
      expect(
        screen.queryByTestId('validation-details')
      ).not.toBeInTheDocument();

      // Show details
      await user.click(screen.getByTestId('toggle-details'));

      expect(screen.getByTestId('validation-details')).toBeInTheDocument();
      expect(screen.getByTestId('violations-list')).toBeInTheDocument();
      expect(screen.getByTestId('violation-0')).toHaveTextContent(
        'Rematch detected'
      );

      // Hide details
      await user.click(screen.getByTestId('toggle-details'));

      expect(
        screen.queryByTestId('validation-details')
      ).not.toBeInTheDocument();
    });
  });

  describe('Rating Calculator Component', () => {
    test('should calculate FIDE rating changes', async () => {
      const user = userEvent.setup();

      render(<RatingCalculator />);

      // Set up calculation
      await user.clear(screen.getByTestId('player1-rating'));
      await user.type(screen.getByTestId('player1-rating'), '1600');

      await user.clear(screen.getByTestId('player2-rating'));
      await user.type(screen.getByTestId('player2-rating'), '1400');

      await user.selectOptions(screen.getByTestId('result-select'), 'win');

      // Calculate
      await user.click(screen.getByTestId('calculate-button'));

      // Check results
      expect(screen.getByTestId('calculation-result')).toBeInTheDocument();
      expect(screen.getByTestId('expected-score')).toHaveTextContent(
        'Expected Score: 0.760'
      );
      expect(screen.getByTestId('actual-score')).toHaveTextContent(
        'Actual Score: 1'
      );
      expect(screen.getByTestId('rating-change')).toHaveTextContent(
        'Rating Change: +5'
      );
      expect(screen.getByTestId('new-rating')).toHaveTextContent(
        'New Rating: 1605'
      );
    });

    test('should handle different K-factors', async () => {
      const user = userEvent.setup();

      render(<RatingCalculator />);

      // Set high K-factor for new players
      await user.clear(screen.getByTestId('k-factor'));
      await user.type(screen.getByTestId('k-factor'), '40');

      await user.selectOptions(screen.getByTestId('result-select'), 'win');

      await user.click(screen.getByTestId('calculate-button'));

      const ratingChange = screen.getByTestId('rating-change');
      expect(ratingChange.textContent).toContain('+20'); // Should be double with K=40
    });
  });

  describe('Tiebreak Calculator Component', () => {
    test('should calculate and display tiebreak values', () => {
      const player = {
        name: 'Test Player',
        score: 2.5,
        games: [{ result: 'win' }, { result: 'draw' }, { result: 'loss' }],
      };

      const opponents = [
        { name: 'Opponent 1', score: 2.0 },
        { name: 'Opponent 2', score: 1.5 },
        { name: 'Opponent 3', score: 1.0 },
      ];

      render(
        <TiebreakCalculator
          player={player}
          opponents={opponents}
          tournament={{}}
        />
      );

      expect(
        screen.getByText('Tiebreak Calculations for Test Player')
      ).toBeInTheDocument();
      expect(screen.getByTestId('buchholz')).toHaveTextContent('Buchholz: 4.5');
      expect(screen.getByTestId('sonneborn')).toHaveTextContent(
        'Sonneborn-Berger: 2.8'
      );

      // Check opponent scores are displayed
      expect(screen.getByTestId('opponent-0')).toHaveTextContent(
        'Opponent 1: 2'
      );
      expect(screen.getByTestId('opponent-1')).toHaveTextContent(
        'Opponent 2: 1.5'
      );
      expect(screen.getByTestId('opponent-2')).toHaveTextContent(
        'Opponent 3: 1'
      );
    });

    test('should show loading state when data is incomplete', () => {
      render(
        <TiebreakCalculator player={null} opponents={[]} tournament={{}} />
      );

      expect(
        screen.getByTestId('tiebreak-calculator-loading')
      ).toHaveTextContent('Calculating tiebreaks...');
    });
  });

  describe('Integration Testing of Rule Combinations', () => {
    test('should handle complex tournament scenarios', () => {
      const tournament = {
        format: 'swiss',
        playerCount: 16,
        rounds: 5,
        previousPairings: [],
      };

      // Create a realistic tournament state
      const standings = Array.from({ length: 16 }, (_, i) => ({
        id: i + 1,
        name: `Player ${i + 1}`,
        score: Math.max(0, 3 - Math.abs(i - 8) * 0.5),
        whiteGames: Math.floor(Math.random() * 3),
        blackGames: 2,
        consecutiveWhite: 0,
        consecutiveBlack: 0,
      }));

      // Generate reasonable pairings
      const pairings = [];
      for (let i = 0; i < 8; i++) {
        pairings.push({
          whitePlayerId: standings[i * 2].id,
          blackPlayerId: standings[i * 2 + 1].id,
          boardNumber: i + 1,
          bye: false,
        });
      }

      const result = TournamentRulesEngine.validateSwissRules(
        tournament,
        pairings,
        standings
      );

      // Should be valid or have only minor warnings
      expect(result.violations.length).toBeLessThan(3);
    });

    test('should validate tournament progression rules', () => {
      // Test that round 1 results affect round 2 pairings appropriately
      const tournament = { format: 'swiss', playerCount: 8 };

      const round1Results = [
        { whitePlayerId: 1, blackPlayerId: 5, result: 'white_wins' },
        { whitePlayerId: 2, blackPlayerId: 6, result: 'white_wins' },
        { whitePlayerId: 3, blackPlayerId: 7, result: 'black_wins' },
        { whitePlayerId: 4, blackPlayerId: 8, result: 'draw' },
      ];

      // After round 1, standings should be sorted by score
      const round2Standings = [
        { id: 1, name: 'Player 1', score: 1.0 },
        { id: 2, name: 'Player 2', score: 1.0 },
        { id: 7, name: 'Player 7', score: 1.0 },
        { id: 4, name: 'Player 4', score: 0.5 },
        { id: 8, name: 'Player 8', score: 0.5 },
        { id: 3, name: 'Player 3', score: 0.0 },
        { id: 5, name: 'Player 5', score: 0.0 },
        { id: 6, name: 'Player 6', score: 0.0 },
      ];

      // Round 2 pairings should pair players with similar scores
      const round2Pairings = [
        { whitePlayerId: 1, blackPlayerId: 2, boardNumber: 1, bye: false },
        { whitePlayerId: 7, blackPlayerId: 4, boardNumber: 2, bye: false },
        { whitePlayerId: 8, blackPlayerId: 3, boardNumber: 3, bye: false },
        { whitePlayerId: 5, blackPlayerId: 6, boardNumber: 4, bye: false },
      ];

      const result = TournamentRulesEngine.validateSwissRules(
        { ...tournament, previousPairings: round1Results },
        round2Pairings,
        round2Standings
      );

      expect(result.valid).toBe(true);
    });
  });
});
