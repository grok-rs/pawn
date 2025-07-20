use crate::pawn::{
    common::error::PawnError,
    domain::model::{GameResult, Pairing, Player},
};
use std::collections::{HashMap, HashSet};

/// Manual pairing control system for tournament directors
#[allow(dead_code)]
pub struct ManualPairingController;

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct PairingConstraint {
    pub constraint_type: ConstraintType,
    pub player1_id: i32,
    pub player2_id: Option<i32>, // None for bye constraints
    pub reason: String,
    pub priority: ConstraintPriority,
    pub round_number: Option<i32>, // None = applies to all rounds
}

#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq)]
pub enum ConstraintType {
    ForceMatch,  // Force these two players to play each other
    ForbidMatch, // Prevent these two players from playing each other
    ForceColor,  // Force a player to have a specific color
    ForceBye,    // Force a player to get a bye
    ForbidBye,   // Prevent a player from getting a bye
    FixedBoard,  // Force pairing to a specific board number
}

#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub enum ConstraintPriority {
    Low,      // Can be overridden if necessary
    Medium,   // Should be followed unless major conflicts
    High,     // Must be followed except in extreme cases
    Critical, // Absolute requirement, cannot be violated
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct ColorConstraint {
    pub player_id: i32,
    pub required_color: Color,
    pub round_number: Option<i32>,
    pub priority: ConstraintPriority,
}

#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq)]
pub enum Color {
    White,
    Black,
}

#[allow(dead_code)]
#[derive(Debug)]
pub struct ManualPairingRequest {
    pub tournament_id: i32,
    pub round_number: i32,
    pub forced_pairings: Vec<ForcedPairing>,
    pub constraints: Vec<PairingConstraint>,
    pub color_constraints: Vec<ColorConstraint>,
    pub apply_to_remaining: bool, // Apply automatic pairing to remaining players
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct ForcedPairing {
    pub white_player_id: i32,
    pub black_player_id: Option<i32>, // None for bye
    pub board_number: Option<i32>,    // None for auto-assignment
}

#[allow(dead_code)]
#[derive(Debug)]
pub struct PairingValidationResult {
    pub is_valid: bool,
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<ValidationWarning>,
    pub suggestions: Vec<ValidationSuggestion>,
}

#[allow(dead_code)]
#[derive(Debug)]
pub struct ValidationError {
    pub error_type: ValidationErrorType,
    pub message: String,
    pub affected_players: Vec<i32>,
    pub severity: ErrorSeverity,
}

#[allow(dead_code)]
#[derive(Debug)]
pub enum ValidationErrorType {
    PlayerPairedTwice,
    RematchViolation,
    ColorBalanceViolation,
    ConstraintViolation,
    InvalidBoardAssignment,
    MissingPlayer,
    InvalidColorAssignment,
}

#[allow(dead_code)]
#[derive(Debug)]
pub enum ErrorSeverity {
    Critical, // Pairing cannot proceed
    Major,    // Serious issue but pairing possible
    Minor,    // Cosmetic issue
}

#[allow(dead_code)]
#[derive(Debug)]
pub struct ValidationWarning {
    pub warning_type: WarningType,
    pub message: String,
    pub affected_players: Vec<i32>,
}

#[allow(dead_code)]
#[derive(Debug)]
pub enum WarningType {
    SuboptimalColorBalance,
    RatingMismatch,
    TeamConflict,
    FloatImbalance,
}

#[allow(dead_code)]
#[derive(Debug)]
pub struct ValidationSuggestion {
    pub suggestion_type: SuggestionType,
    pub message: String,
    pub alternative_pairing: Option<Pairing>,
}

#[allow(dead_code)]
#[derive(Debug)]
pub enum SuggestionType {
    ColorSwap,
    PlayerSwap,
    BoardReassignment,
    ByeReassignment,
}

impl Default for ManualPairingController {
    fn default() -> Self {
        Self::new()
    }
}

impl ManualPairingController {
    pub fn new() -> Self {
        Self
    }

    /// Apply manual pairing overrides and constraints
    pub fn apply_manual_overrides(
        &self,
        automatic_pairings: Vec<Pairing>,
        players: &[Player],
        request: ManualPairingRequest,
        game_history: &[GameResult],
    ) -> Result<Vec<Pairing>, PawnError> {
        tracing::info!(
            "Applying manual overrides: {} forced pairings, {} constraints",
            request.forced_pairings.len(),
            request.constraints.len()
        );

        let mut final_pairings = Vec::new();
        let mut used_players = HashSet::new();
        let mut board_counter = 1;

        // Step 1: Apply forced pairings
        for forced_pairing in &request.forced_pairings {
            let pairing =
                self.create_forced_pairing(forced_pairing, players, &mut board_counter)?;

            used_players.insert(pairing.white_player.id);
            if let Some(ref black_player) = pairing.black_player {
                used_players.insert(black_player.id);
            }

            final_pairings.push(pairing);
        }

        // Step 2: Apply force match constraints as additional forced pairings
        for constraint in &request.constraints {
            if constraint.constraint_type == ConstraintType::ForceMatch
                && matches!(
                    constraint.priority,
                    ConstraintPriority::High | ConstraintPriority::Critical
                )
            {
                // Check if constraint applies to this round
                if let Some(constraint_round) = constraint.round_number {
                    if constraint_round != request.round_number {
                        continue;
                    }
                }

                if let Some(player2_id) = constraint.player2_id {
                    // Skip if either player is already used
                    if used_players.contains(&constraint.player1_id)
                        || used_players.contains(&player2_id)
                    {
                        continue;
                    }

                    let forced_pairing = ForcedPairing {
                        white_player_id: constraint.player1_id,
                        black_player_id: Some(player2_id),
                        board_number: None,
                    };

                    let pairing =
                        self.create_forced_pairing(&forced_pairing, players, &mut board_counter)?;
                    used_players.insert(pairing.white_player.id);
                    if let Some(ref black_player) = pairing.black_player {
                        used_players.insert(black_player.id);
                    }
                    final_pairings.push(pairing);
                }
            }
        }

        // Step 3: Apply constraints to remaining automatic pairings
        if request.apply_to_remaining {
            let remaining_pairings = self.filter_pairings_by_constraints(
                automatic_pairings,
                &request.constraints,
                &used_players,
                request.round_number,
            )?;

            final_pairings.extend(remaining_pairings);
        } else {
            // If not applying to remaining, include original automatic pairings
            // for players not already used in forced pairings, but still apply forbid constraints
            let mut remaining_pairings: Vec<Pairing> = automatic_pairings
                .into_iter()
                .filter(|pairing| {
                    !used_players.contains(&pairing.white_player.id)
                        && !pairing
                            .black_player
                            .as_ref()
                            .is_some_and(|p| used_players.contains(&p.id))
                })
                .collect();

            // Apply forbid constraints to remaining pairings
            for constraint in &request.constraints {
                if constraint.constraint_type == ConstraintType::ForbidMatch {
                    // Check if constraint applies to this round
                    if let Some(constraint_round) = constraint.round_number {
                        if constraint_round != request.round_number {
                            continue;
                        }
                    }

                    if let Some(player2_id) = constraint.player2_id {
                        remaining_pairings.retain(|pairing| {
                            !self.pairing_matches_players(
                                pairing,
                                constraint.player1_id,
                                player2_id,
                            )
                        });
                    }
                }
            }

            final_pairings.extend(remaining_pairings);

            // If we disrupted automatic pairings with force constraints,
            // we need to pair up any orphaned players (but respecting forbid constraints)
            let has_force_constraints = request
                .constraints
                .iter()
                .any(|c| c.constraint_type == ConstraintType::ForceMatch);
            if has_force_constraints {
                let mut orphaned_players: Vec<&Player> = players
                    .iter()
                    .filter(|p| !used_players.contains(&p.id))
                    .collect();

                // Pair up orphaned players in pairs, respecting forbid constraints
                while orphaned_players.len() >= 2 {
                    let player1 = orphaned_players.remove(0);
                    let mut found_valid_pairing = false;

                    for i in 0..orphaned_players.len() {
                        let player2 = orphaned_players[i];

                        // Check if this pairing is forbidden
                        let is_forbidden = request.constraints.iter().any(|constraint| {
                            constraint.constraint_type == ConstraintType::ForbidMatch &&
                            // Check if constraint applies to this round
                            (constraint.round_number.is_none() || constraint.round_number == Some(request.round_number)) &&
                            (constraint.player1_id == player1.id && constraint.player2_id == Some(player2.id) ||
                             constraint.player1_id == player2.id && constraint.player2_id == Some(player1.id))
                        });

                        if !is_forbidden {
                            let player2 = orphaned_players.remove(i);
                            let orphaned_pairing = Pairing {
                                white_player: player1.clone(),
                                black_player: Some(player2.clone()),
                                board_number: board_counter,
                            };
                            board_counter += 1;
                            final_pairings.push(orphaned_pairing);
                            found_valid_pairing = true;
                            break;
                        }
                    }

                    // If we couldn't find a valid pairing for player1, leave them unpaired
                    if !found_valid_pairing {
                        break;
                    }
                }
            }
        }

        // Step 4: Apply color constraints
        self.apply_color_constraints(&mut final_pairings, &request.color_constraints)?;

        // Step 5: Validate the final result
        let validation =
            self.validate_pairings(&final_pairings, players, game_history, &request)?;

        if !validation.is_valid {
            let critical_errors: Vec<_> = validation
                .errors
                .iter()
                .filter(|e| matches!(e.severity, ErrorSeverity::Critical))
                .collect();

            if !critical_errors.is_empty() {
                return Err(PawnError::InvalidInput(format!(
                    "Critical pairing errors: {}",
                    critical_errors
                        .iter()
                        .map(|e| e.message.as_str())
                        .collect::<Vec<_>>()
                        .join(", ")
                )));
            }
        }

        tracing::info!(
            "Manual pairing completed: {} pairings with {} warnings",
            final_pairings.len(),
            validation.warnings.len()
        );

        Ok(final_pairings)
    }

    /// Create a forced pairing from manual input
    fn create_forced_pairing(
        &self,
        forced: &ForcedPairing,
        players: &[Player],
        board_counter: &mut i32,
    ) -> Result<Pairing, PawnError> {
        let white_player = players
            .iter()
            .find(|p| p.id == forced.white_player_id)
            .ok_or_else(|| {
                PawnError::InvalidInput(format!(
                    "White player {} not found",
                    forced.white_player_id
                ))
            })?;

        let black_player = if let Some(black_id) = forced.black_player_id {
            Some(players.iter().find(|p| p.id == black_id).ok_or_else(|| {
                PawnError::InvalidInput(format!("Black player {black_id} not found"))
            })?)
        } else {
            None
        };

        let board_number = forced.board_number.unwrap_or_else(|| {
            let current = *board_counter;
            *board_counter += 1;
            current
        });

        Ok(Pairing {
            white_player: white_player.clone(),
            black_player: black_player.cloned(),
            board_number,
        })
    }

    /// Filter automatic pairings based on constraints
    fn filter_pairings_by_constraints(
        &self,
        mut pairings: Vec<Pairing>,
        constraints: &[PairingConstraint],
        used_players: &HashSet<i32>,
        round_number: i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        // Remove pairings involving already used players
        pairings.retain(|pairing| {
            !used_players.contains(&pairing.white_player.id)
                && !pairing
                    .black_player
                    .as_ref()
                    .is_some_and(|bp| used_players.contains(&bp.id))
        });

        // Apply forbid constraints
        for constraint in constraints {
            if constraint.constraint_type == ConstraintType::ForbidMatch {
                // Check if constraint applies to this round
                if let Some(constraint_round) = constraint.round_number {
                    if constraint_round != round_number {
                        continue;
                    }
                }

                if let Some(player2_id) = constraint.player2_id {
                    pairings.retain(|pairing| {
                        !self.pairing_matches_players(pairing, constraint.player1_id, player2_id)
                    });
                }
            }
        }

        // TODO: Apply other constraint types (color, bye, etc.)

        Ok(pairings)
    }

    /// Check if a pairing matches specific players
    fn pairing_matches_players(&self, pairing: &Pairing, player1_id: i32, player2_id: i32) -> bool {
        let white_id = pairing.white_player.id;
        let black_id = pairing.black_player.as_ref().map(|p| p.id);

        (white_id == player1_id && black_id == Some(player2_id))
            || (white_id == player2_id && black_id == Some(player1_id))
    }

    /// Apply color constraints to pairings
    fn apply_color_constraints(
        &self,
        pairings: &mut [Pairing],
        color_constraints: &[ColorConstraint],
    ) -> Result<(), PawnError> {
        for constraint in color_constraints {
            for pairing in pairings.iter_mut() {
                // Check if this pairing involves the constrained player
                if pairing.white_player.id == constraint.player_id
                    || pairing
                        .black_player
                        .as_ref()
                        .is_some_and(|bp| bp.id == constraint.player_id)
                {
                    // Apply color constraint if priority is high enough
                    if matches!(
                        constraint.priority,
                        ConstraintPriority::High | ConstraintPriority::Critical
                    ) {
                        self.enforce_color_constraint(pairing, constraint)?;
                    }
                }
            }
        }
        Ok(())
    }

    /// Enforce a specific color constraint on a pairing
    fn enforce_color_constraint(
        &self,
        pairing: &mut Pairing,
        constraint: &ColorConstraint,
    ) -> Result<(), PawnError> {
        // Only swap if current assignment doesn't match constraint
        let current_white_id = pairing.white_player.id;
        let needs_swap = match constraint.required_color {
            Color::White => current_white_id != constraint.player_id,
            Color::Black => current_white_id == constraint.player_id,
        };

        if needs_swap && pairing.black_player.is_some() {
            // Swap colors
            let black_player = pairing.black_player.take().unwrap();
            let white_player = std::mem::replace(&mut pairing.white_player, black_player);
            pairing.black_player = Some(white_player);

            tracing::debug!(
                "Swapped colors for player {} due to color constraint",
                constraint.player_id
            );
        }

        Ok(())
    }

    /// Comprehensive validation of pairings
    pub fn validate_pairings(
        &self,
        pairings: &[Pairing],
        _players: &[Player],
        game_history: &[GameResult],
        request: &ManualPairingRequest,
    ) -> Result<PairingValidationResult, PawnError> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        let mut suggestions = Vec::new();

        // Validate no player is paired twice
        self.validate_no_duplicate_players(pairings, &mut errors);

        // Validate no rematches (unless specifically allowed)
        self.validate_no_rematches(pairings, game_history, &mut errors, &mut warnings);

        // Validate color balance
        self.validate_color_balance(pairings, game_history, &mut warnings);

        // Validate constraints are satisfied
        self.validate_constraints_satisfied(pairings, &request.constraints, &mut errors);

        // Validate board assignments
        self.validate_board_assignments(pairings, &mut errors);

        // Generate suggestions for improvements
        self.generate_improvement_suggestions(pairings, &mut suggestions);

        let is_valid = errors
            .iter()
            .all(|e| !matches!(e.severity, ErrorSeverity::Critical));

        Ok(PairingValidationResult {
            is_valid,
            errors,
            warnings,
            suggestions,
        })
    }

    /// Validate that no player appears in multiple pairings
    fn validate_no_duplicate_players(
        &self,
        pairings: &[Pairing],
        errors: &mut Vec<ValidationError>,
    ) {
        let mut seen_players = HashSet::new();

        for pairing in pairings {
            if !seen_players.insert(pairing.white_player.id) {
                errors.push(ValidationError {
                    error_type: ValidationErrorType::PlayerPairedTwice,
                    message: format!(
                        "Player {} appears in multiple pairings",
                        pairing.white_player.name
                    ),
                    affected_players: vec![pairing.white_player.id],
                    severity: ErrorSeverity::Critical,
                });
            }

            if let Some(ref black_player) = pairing.black_player {
                if !seen_players.insert(black_player.id) {
                    errors.push(ValidationError {
                        error_type: ValidationErrorType::PlayerPairedTwice,
                        message: format!(
                            "Player {} appears in multiple pairings",
                            black_player.name
                        ),
                        affected_players: vec![black_player.id],
                        severity: ErrorSeverity::Critical,
                    });
                }
            }
        }
    }

    /// Validate no rematches from previous rounds
    fn validate_no_rematches(
        &self,
        pairings: &[Pairing],
        game_history: &[GameResult],
        _errors: &mut [ValidationError],
        warnings: &mut Vec<ValidationWarning>,
    ) {
        // Build opponent history
        let mut opponent_map: HashMap<i32, HashSet<i32>> = HashMap::new();

        for game in game_history {
            let white_id = game.white_player.id;
            let black_id = game.black_player.id;

            if white_id > 0 && black_id > 0 {
                opponent_map.entry(white_id).or_default().insert(black_id);
                opponent_map.entry(black_id).or_default().insert(white_id);
            }
        }

        for pairing in pairings {
            if let Some(ref black_player) = pairing.black_player {
                let white_id = pairing.white_player.id;
                let black_id = black_player.id;

                if let Some(opponents) = opponent_map.get(&white_id) {
                    if opponents.contains(&black_id) {
                        warnings.push(ValidationWarning {
                            warning_type: WarningType::TeamConflict,
                            message: format!(
                                "Rematch: {} vs {} have played before",
                                pairing.white_player.name, black_player.name
                            ),
                            affected_players: vec![white_id, black_id],
                        });
                    }
                }
            }
        }
    }

    /// Validate color balance across pairings
    fn validate_color_balance(
        &self,
        _pairings: &[Pairing],
        _game_history: &[GameResult],
        _warnings: &mut [ValidationWarning],
    ) {
        // TODO: Implement color balance validation
        // Check if players have reasonable color distribution
    }

    /// Validate that all constraints are satisfied
    fn validate_constraints_satisfied(
        &self,
        _pairings: &[Pairing],
        _constraints: &[PairingConstraint],
        _errors: &mut [ValidationError],
    ) {
        // TODO: Implement constraint validation
        // Check that all high/critical priority constraints are met
    }

    /// Validate board number assignments
    fn validate_board_assignments(&self, pairings: &[Pairing], errors: &mut Vec<ValidationError>) {
        let mut used_boards = HashSet::new();

        for pairing in pairings {
            if !used_boards.insert(pairing.board_number) {
                errors.push(ValidationError {
                    error_type: ValidationErrorType::InvalidBoardAssignment,
                    message: format!(
                        "Board number {board_number} used multiple times",
                        board_number = pairing.board_number
                    ),
                    affected_players: vec![pairing.white_player.id],
                    severity: ErrorSeverity::Critical,
                });
            }
        }
    }

    /// Generate suggestions for improving pairings
    fn generate_improvement_suggestions(
        &self,
        _pairings: &[Pairing],
        _suggestions: &mut [ValidationSuggestion],
    ) {
        // TODO: Implement suggestion generation
        // Suggest color swaps, player swaps, etc. for better balance
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_player(id: i32, name: &str) -> Player {
        Player {
            id,
            tournament_id: 1,
            name: name.to_string(),
            rating: Some(1500),
            country_code: None,
            title: None,
            birth_date: None,
            gender: None,
            email: None,
            phone: None,
            club: None,
            status: "active".to_string(),
            seed_number: None,
            pairing_number: None,
            initial_rating: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: None,
        }
    }

    fn create_test_pairing(white_id: i32, black_id: i32, board: i32) -> Pairing {
        Pairing {
            white_player: create_test_player(white_id, &format!("Player {white_id}")),
            black_player: Some(create_test_player(black_id, &format!("Player {black_id}"))),
            board_number: board,
        }
    }

    fn create_manual_request(
        constraints: Vec<PairingConstraint>,
        colors: Vec<ColorConstraint>,
    ) -> ManualPairingRequest {
        ManualPairingRequest {
            tournament_id: 1,
            round_number: 1,
            forced_pairings: vec![],
            constraints,
            color_constraints: colors,
            apply_to_remaining: false,
        }
    }

    #[test]
    fn test_empty_manual_override() {
        let controller = ManualPairingController::new();
        let automatic_pairings = vec![create_test_pairing(1, 2, 1), create_test_pairing(3, 4, 2)];
        let players = vec![
            create_test_player(1, "Player 1"),
            create_test_player(2, "Player 2"),
            create_test_player(3, "Player 3"),
            create_test_player(4, "Player 4"),
        ];
        let request = create_manual_request(vec![], vec![]);

        let result = controller
            .apply_manual_overrides(automatic_pairings.clone(), &players, request, &[])
            .unwrap();

        // With no overrides, should return original pairings
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].white_player.id, 1);
        assert_eq!(result[0].black_player.as_ref().unwrap().id, 2);
    }

    #[test]
    fn test_force_match_constraint() {
        let controller = ManualPairingController::new();
        let automatic_pairings = vec![create_test_pairing(1, 2, 1), create_test_pairing(3, 4, 2)];
        let players = vec![
            create_test_player(1, "Player 1"),
            create_test_player(2, "Player 2"),
            create_test_player(3, "Player 3"),
            create_test_player(4, "Player 4"),
        ];

        // Force players 1 and 3 to play each other
        let constraints = vec![PairingConstraint {
            constraint_type: ConstraintType::ForceMatch,
            player1_id: 1,
            player2_id: Some(3),
            reason: "Special request".to_string(),
            priority: ConstraintPriority::High,
            round_number: Some(1),
        }];
        let request = create_manual_request(constraints, vec![]);

        let result = controller
            .apply_manual_overrides(automatic_pairings, &players, request, &[])
            .unwrap();

        // Should have forced pairing 1 vs 3
        assert_eq!(result.len(), 2);
        let forced_pairing = result.iter().find(|p| {
            (p.white_player.id == 1 && p.black_player.as_ref().unwrap().id == 3)
                || (p.white_player.id == 3 && p.black_player.as_ref().unwrap().id == 1)
        });
        assert!(forced_pairing.is_some());
    }

    #[test]
    fn test_forbid_match_constraint() {
        let controller = ManualPairingController::new();
        let automatic_pairings = vec![create_test_pairing(1, 2, 1), create_test_pairing(3, 4, 2)];
        let players = vec![
            create_test_player(1, "Player 1"),
            create_test_player(2, "Player 2"),
            create_test_player(3, "Player 3"),
            create_test_player(4, "Player 4"),
        ];

        // Forbid players 1 and 2 from playing
        let constraints = vec![PairingConstraint {
            constraint_type: ConstraintType::ForbidMatch,
            player1_id: 1,
            player2_id: Some(2),
            reason: "Cannot play each other".to_string(),
            priority: ConstraintPriority::High,
            round_number: Some(1),
        }];
        let request = create_manual_request(constraints, vec![]);

        let result = controller
            .apply_manual_overrides(automatic_pairings, &players, request, &[])
            .unwrap();

        // Should not have pairing 1 vs 2
        let forbidden_pairing = result.iter().find(|p| {
            (p.white_player.id == 1 && p.black_player.as_ref().unwrap().id == 2)
                || (p.white_player.id == 2 && p.black_player.as_ref().unwrap().id == 1)
        });
        assert!(forbidden_pairing.is_none());
    }

    #[test]
    fn test_color_constraint() {
        let controller = ManualPairingController::new();
        let automatic_pairings = vec![create_test_pairing(1, 2, 1)];
        let players = vec![
            create_test_player(1, "Player 1"),
            create_test_player(2, "Player 2"),
        ];

        // Force player 2 to have white
        let color_constraints = vec![ColorConstraint {
            player_id: 2,
            required_color: Color::White,
            round_number: Some(1),
            priority: ConstraintPriority::High,
        }];
        let request = create_manual_request(vec![], color_constraints);

        let result = controller
            .apply_manual_overrides(automatic_pairings, &players, request, &[])
            .unwrap();

        // Player 2 should be white
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].white_player.id, 2);
        assert_eq!(result[0].black_player.as_ref().unwrap().id, 1);
    }

    #[test]
    fn test_force_bye_constraint() {
        let controller = ManualPairingController::new();
        let automatic_pairings = vec![create_test_pairing(1, 2, 1), create_test_pairing(3, 4, 2)];
        let players = vec![
            create_test_player(1, "Player 1"),
            create_test_player(2, "Player 2"),
            create_test_player(3, "Player 3"),
            create_test_player(4, "Player 4"),
            create_test_player(5, "Player 5"),
        ];

        // Force player 5 to get a bye
        let constraints = vec![PairingConstraint {
            constraint_type: ConstraintType::ForceBye,
            player1_id: 5,
            player2_id: None,
            reason: "Requested bye".to_string(),
            priority: ConstraintPriority::High,
            round_number: Some(1),
        }];
        let request = create_manual_request(constraints, vec![]);

        let result = controller
            .apply_manual_overrides(automatic_pairings, &players, request, &[])
            .unwrap();

        // Player 5 should not appear in any pairing
        let player5_in_pairing = result.iter().any(|p| {
            p.white_player.id == 5 || p.black_player.as_ref().is_some_and(|bp| bp.id == 5)
        });
        assert!(!player5_in_pairing);
    }

    #[test]
    fn test_constraint_priority_conflict() {
        let controller = ManualPairingController::new();
        let automatic_pairings = vec![create_test_pairing(1, 2, 1)];
        let players = vec![
            create_test_player(1, "Player 1"),
            create_test_player(2, "Player 2"),
        ];

        // Create conflicting constraints
        let constraints = vec![
            PairingConstraint {
                constraint_type: ConstraintType::ForceMatch,
                player1_id: 1,
                player2_id: Some(2),
                reason: "Force match".to_string(),
                priority: ConstraintPriority::High,
                round_number: Some(1),
            },
            PairingConstraint {
                constraint_type: ConstraintType::ForbidMatch,
                player1_id: 1,
                player2_id: Some(2),
                reason: "Forbid match".to_string(),
                priority: ConstraintPriority::Medium, // Lower priority
                round_number: Some(1),
            },
        ];
        let request = create_manual_request(constraints, vec![]);

        let result = controller
            .apply_manual_overrides(automatic_pairings, &players, request, &[])
            .unwrap();

        // High priority constraint should win (force match)
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].white_player.id, 1);
        assert_eq!(result[0].black_player.as_ref().unwrap().id, 2);
    }

    #[test]
    fn test_validation_duplicate_players() {
        let controller = ManualPairingController::new();

        // Create pairings with duplicate player
        let pairings = vec![
            create_test_pairing(1, 2, 1),
            create_test_pairing(1, 3, 2), // Player 1 appears twice
        ];

        let request = create_manual_request(vec![], vec![]);
        let validation = controller
            .validate_pairings(&pairings, &[], &[], &request)
            .unwrap();

        assert!(!validation.is_valid);
        assert!(!validation.errors.is_empty());
        assert!(
            validation
                .errors
                .iter()
                .any(|e| matches!(e.error_type, ValidationErrorType::PlayerPairedTwice))
        );
    }

    #[test]
    fn test_validation_board_conflicts() {
        let controller = ManualPairingController::new();

        // Create pairings with same board number
        let pairings = vec![
            create_test_pairing(1, 2, 1),
            create_test_pairing(3, 4, 1), // Same board number
        ];

        let request = create_manual_request(vec![], vec![]);
        let validation = controller
            .validate_pairings(&pairings, &[], &[], &request)
            .unwrap();

        assert!(!validation.is_valid);
        assert!(
            validation
                .errors
                .iter()
                .any(|e| matches!(e.error_type, ValidationErrorType::InvalidBoardAssignment))
        );
    }

    #[test]
    fn test_validation_self_pairing() {
        let controller = ManualPairingController::new();

        // Create invalid self-pairing
        let mut pairing = create_test_pairing(1, 2, 1);
        pairing.black_player = Some(create_test_player(1, "Player 1")); // Same as white

        let pairings = vec![pairing];

        let request = create_manual_request(vec![], vec![]);
        let validation = controller
            .validate_pairings(&pairings, &[], &[], &request)
            .unwrap();

        assert!(!validation.is_valid);
        assert!(
            validation
                .errors
                .iter()
                .any(|e| matches!(e.error_type, ValidationErrorType::PlayerPairedTwice))
        );
    }

    #[test]
    fn test_constraint_application_order() {
        let controller = ManualPairingController::new();
        let automatic_pairings = vec![create_test_pairing(1, 2, 1), create_test_pairing(3, 4, 2)];
        let players = vec![
            create_test_player(1, "Player 1"),
            create_test_player(2, "Player 2"),
            create_test_player(3, "Player 3"),
            create_test_player(4, "Player 4"),
        ];

        // Multiple constraints with different priorities
        let constraints = vec![
            PairingConstraint {
                constraint_type: ConstraintType::ForceMatch,
                player1_id: 1,
                player2_id: Some(3),
                reason: "High priority force".to_string(),
                priority: ConstraintPriority::High,
                round_number: Some(1),
            },
            PairingConstraint {
                constraint_type: ConstraintType::ForceMatch,
                player1_id: 2,
                player2_id: Some(4),
                reason: "Critical priority force".to_string(),
                priority: ConstraintPriority::Critical,
                round_number: Some(1),
            },
        ];
        let request = create_manual_request(constraints, vec![]);

        let result = controller
            .apply_manual_overrides(automatic_pairings, &players, request, &[])
            .unwrap();

        // Both constraints should be applied
        assert_eq!(result.len(), 2);

        // Check that forced pairings exist
        let has_1_vs_3 = result.iter().any(|p| {
            (p.white_player.id == 1 && p.black_player.as_ref().unwrap().id == 3)
                || (p.white_player.id == 3 && p.black_player.as_ref().unwrap().id == 1)
        });
        let has_2_vs_4 = result.iter().any(|p| {
            (p.white_player.id == 2 && p.black_player.as_ref().unwrap().id == 4)
                || (p.white_player.id == 4 && p.black_player.as_ref().unwrap().id == 2)
        });

        assert!(has_1_vs_3);
        assert!(has_2_vs_4);
    }

    #[test]
    fn test_round_specific_constraints() {
        let controller = ManualPairingController::new();
        let automatic_pairings = vec![create_test_pairing(1, 2, 1)];
        let players = vec![
            create_test_player(1, "Player 1"),
            create_test_player(2, "Player 2"),
        ];

        // Constraint only applies to round 2, not round 1
        let constraints = vec![PairingConstraint {
            constraint_type: ConstraintType::ForbidMatch,
            player1_id: 1,
            player2_id: Some(2),
            reason: "Round 2 only".to_string(),
            priority: ConstraintPriority::High,
            round_number: Some(2),
        }];
        let request = create_manual_request(constraints, vec![]);

        let result = controller
            .apply_manual_overrides(automatic_pairings.clone(), &players, request, &[])
            .unwrap();

        // Constraint shouldn't apply to round 1, so pairing should remain
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].white_player.id, 1);
        assert_eq!(result[0].black_player.as_ref().unwrap().id, 2);
    }
}
