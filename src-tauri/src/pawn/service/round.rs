use crate::pawn::{
    common::error::PawnError,
    db::Db,
    domain::{
        dto::{CreateGame, CreateRound, GeneratePairingsRequest, UpdateRoundStatus},
        model::{GameResult, Pairing, PairingMethod, Round, RoundDetails, RoundStatus},
    },
    service::pairing::PairingService,
};
use std::sync::Arc;

pub struct RoundService<D> {
    db: Arc<D>,
    pairing_service: PairingService,
}

impl<D: Db> RoundService<D> {
    pub fn new(db: Arc<D>) -> Self {
        Self {
            db,
            pairing_service: PairingService::new(),
        }
    }

    pub async fn get_rounds_by_tournament(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<Round>, PawnError> {
        self.db
            .get_rounds_by_tournament(tournament_id)
            .await
            .map_err(PawnError::Database)
    }

    pub async fn get_current_round(&self, tournament_id: i32) -> Result<Option<Round>, PawnError> {
        self.db
            .get_current_round(tournament_id)
            .await
            .map_err(PawnError::Database)
    }

    pub async fn create_round(&self, data: CreateRound) -> Result<Round, PawnError> {
        // Validate that tournament exists
        let _tournament = self
            .db
            .get_tournament(data.tournament_id)
            .await
            .map_err(PawnError::Database)?;

        // Validate round number
        if data.round_number <= 0 {
            return Err(PawnError::InvalidInput(
                "Round number must be positive".into(),
            ));
        }

        // Check if round already exists
        if let Ok(existing_rounds) = self.db.get_rounds_by_tournament(data.tournament_id).await {
            if existing_rounds
                .iter()
                .any(|r| r.round_number == data.round_number)
            {
                return Err(PawnError::InvalidInput(format!(
                    "Round {} already exists for tournament {}",
                    data.round_number, data.tournament_id
                )));
            }
        }

        self.db
            .create_round(data)
            .await
            .map_err(PawnError::Database)
    }

    pub async fn update_round_status(&self, data: UpdateRoundStatus) -> Result<Round, PawnError> {
        // Get current round to validate state transition
        let current_round = self
            .db
            .get_round(data.round_id)
            .await
            .map_err(PawnError::Database)?;

        let current_status = RoundStatus::from_str(&current_round.status);
        let new_status = RoundStatus::from_str(&data.status);

        // Validate state transition
        if !current_status.can_transition_to(&new_status) {
            return Err(PawnError::InvalidInput(format!(
                "ROUND_INVALID_TRANSITION::{}::{}",
                current_status.to_str(),
                new_status.to_str()
            )));
        }

        // Additional validations based on new status
        match new_status {
            RoundStatus::InProgress => {
                // Ensure pairings exist before starting round
                let games = self
                    .db
                    .get_games_by_round(current_round.tournament_id, current_round.round_number)
                    .await
                    .map_err(PawnError::Database)?;
                
                if games.is_empty() {
                    // Check if round is published but has no games (data inconsistency)
                    if current_status == RoundStatus::Published {
                        return Err(PawnError::InvalidInput(
                            "ROUND_PUBLISHED_NO_GAMES_ERROR".into()
                        ));
                    } else {
                        return Err(PawnError::InvalidInput(
                            "ROUND_NO_PAIRINGS_ERROR".into()
                        ));
                    }
                }
            }
            RoundStatus::Completed => {
                // Ensure all games are finished before completing round
                let games = self
                    .db
                    .get_games_by_round(current_round.tournament_id, current_round.round_number)
                    .await
                    .map_err(PawnError::Database)?;

                let incomplete_games = games.iter().filter(|game| game.game.result == "*").count();
                if incomplete_games > 0 {
                    return Err(PawnError::InvalidInput(format!(
                        "INCOMPLETE_GAMES_ERROR::{incomplete_games}"
                    )));
                }
            }
            _ => {} // No additional validation needed
        }

        let round = self
            .db
            .update_round_status(data.round_id, new_status.to_str())
            .await
            .map_err(PawnError::Database)?;

        // If completing the round, update tournament current_round
        if new_status == RoundStatus::Completed {
            // This is handled by the database trigger, but we could add additional logic here
        }

        Ok(round)
    }

    pub async fn get_round_details(&self, round_id: i32) -> Result<RoundDetails, PawnError> {
        let round = self
            .db
            .get_round(round_id)
            .await
            .map_err(PawnError::Database)?;
        let games = self
            .db
            .get_games_by_round(round.tournament_id, round.round_number)
            .await
            .map_err(PawnError::Database)?;

        let status = RoundStatus::from_str(&round.status);

        Ok(RoundDetails {
            round,
            games,
            status,
        })
    }

    pub async fn generate_pairings(
        &self,
        request: GeneratePairingsRequest,
    ) -> Result<Vec<Pairing>, PawnError> {
        tracing::info!(
            "Generating pairings for tournament {}, round {}, method: {}",
            request.tournament_id,
            request.round_number,
            request.pairing_method
        );

        // Get tournament and validate pairing method
        let tournament = self
            .db
            .get_tournament(request.tournament_id)
            .await
            .map_err(PawnError::Database)?;

        tracing::debug!(
            "Found tournament: {} with {} total rounds",
            tournament.name,
            tournament.total_rounds
        );

        let pairing_method = PairingMethod::from_str(&request.pairing_method);

        // Get players for the tournament
        let players = self
            .db
            .get_players_by_tournament(request.tournament_id)
            .await
            .map_err(PawnError::Database)?;

        tracing::debug!("Found {} players for tournament", players.len());

        if players.is_empty() {
            tracing::warn!("No players found for tournament {}", request.tournament_id);
            return Err(PawnError::InvalidInput(
                "No players found for tournament".into(),
            ));
        }

        // Get current player results for Swiss pairing
        let player_results = self
            .db
            .get_player_results(request.tournament_id)
            .await
            .map_err(PawnError::Database)?;

        tracing::debug!("Found {} player results", player_results.len());

        // For Swiss system, get game history to avoid rematches and balance colors
        let pairings = if pairing_method == PairingMethod::Swiss && request.round_number > 1 {
            // Get all previous games for this tournament
            let all_games = self
                .db
                .get_games_by_tournament(request.tournament_id)
                .await
                .map_err(PawnError::Database)?;

            // Create a lookup map for players
            let player_map: std::collections::HashMap<i32, &crate::pawn::domain::model::Player> =
                players.iter().map(|p| (p.id, p)).collect();

            // Convert games to GameResult format for history analysis
            let mut game_history = Vec::new();
            for game in all_games {
                // Skip games from the current round (shouldn't exist yet, but be safe)
                if game.round_number >= request.round_number {
                    continue;
                }

                // Get player details from our lookup map
                if let (Some(white_player), Some(black_player)) = (
                    player_map.get(&game.white_player_id),
                    player_map.get(&game.black_player_id),
                ) {
                    game_history.push(crate::pawn::domain::model::GameResult {
                        game,
                        white_player: (*white_player).clone(),
                        black_player: (*black_player).clone(),
                    });
                }
            }

            tracing::debug!(
                "Found {} games in history for pairing analysis",
                game_history.len()
            );

            // Generate pairings with history awareness
            self.pairing_service.generate_pairings_with_history(
                players,
                player_results,
                game_history,
                request.round_number,
                &pairing_method,
            )?
        } else {
            // First round or non-Swiss system - use basic pairing
            self.pairing_service.generate_pairings(
                players,
                player_results,
                request.round_number,
                &pairing_method,
            )?
        };

        tracing::info!("Generated {} pairings successfully", pairings.len());

        Ok(pairings)
    }

    pub async fn create_pairings_as_games(
        &self,
        tournament_id: i32,
        round_number: i32,
        pairings: Vec<Pairing>,
    ) -> Result<Vec<GameResult>, PawnError> {
        // Check if games already exist for this round
        let existing_games = self
            .db
            .get_games_by_round(tournament_id, round_number)
            .await
            .map_err(PawnError::Database)?;

        if !existing_games.is_empty() {
            // Return existing games instead of failing
            return Ok(existing_games);
        }

        let mut created_games = Vec::new();
        let mut used_white_players = std::collections::HashSet::new();
        let mut used_black_players = std::collections::HashSet::new();

        // Validate that no player appears multiple times
        for pairing in &pairings {
            if used_white_players.contains(&pairing.white_player.id) {
                return Err(PawnError::InvalidInput(format!(
                    "Player {} ({}) is assigned as white in multiple games",
                    pairing.white_player.name, pairing.white_player.id
                )));
            }
            used_white_players.insert(pairing.white_player.id);

            if let Some(ref black_player) = pairing.black_player {
                if used_black_players.contains(&black_player.id) {
                    return Err(PawnError::InvalidInput(format!(
                        "Player {} ({}) is assigned as black in multiple games",
                        black_player.name, black_player.id
                    )));
                }
                if used_white_players.contains(&black_player.id) {
                    return Err(PawnError::InvalidInput(format!(
                        "Player {} ({}) is assigned as both white and black",
                        black_player.name, black_player.id
                    )));
                }
                used_black_players.insert(black_player.id);
            }
        }

        for pairing in pairings {
            if let Some(black_player) = pairing.black_player {
                // Regular game
                let game_data = CreateGame {
                    tournament_id,
                    round_number,
                    white_player_id: pairing.white_player.id,
                    black_player_id: black_player.id,
                    result: "*".to_string(), // Ongoing game
                };

                let game = self
                    .db
                    .create_game(game_data)
                    .await
                    .map_err(PawnError::Database)?;
                let game_result = GameResult {
                    game,
                    white_player: pairing.white_player,
                    black_player,
                };
                created_games.push(game_result);
            } else {
                // Bye - create a special game using virtual bye player
                // Use a unique negative ID that combines tournament and round to ensure uniqueness
                let bye_player_id = -(tournament_id * 1000 + round_number); // Unique virtual bye player ID per round
                let game_data = CreateGame {
                    tournament_id,
                    round_number,
                    white_player_id: pairing.white_player.id,
                    black_player_id: bye_player_id,
                    result: "1-0".to_string(), // Bye is treated as a win
                };

                // Create a virtual bye player for the result display
                let bye_player = crate::pawn::domain::model::Player {
                    id: bye_player_id,
                    tournament_id,
                    name: "BYE".to_string(),
                    rating: None,
                    country_code: None,
                    title: None,
                    birth_date: None,
                    gender: None,
                    email: None,
                    phone: None,
                    club: None,
                    status: "bye".to_string(),
                    seed_number: None,
                    pairing_number: None,
                    initial_rating: None,
                    created_at: chrono::Utc::now().to_rfc3339(),
                    updated_at: None,
                };

                let game = self
                    .db
                    .create_game(game_data)
                    .await
                    .map_err(PawnError::Database)?;
                let game_result = GameResult {
                    game,
                    white_player: pairing.white_player,
                    black_player: bye_player,
                };
                created_games.push(game_result);
            }
        }

        Ok(created_games)
    }

    pub async fn complete_round(&self, round_id: i32) -> Result<Round, PawnError> {
        // Use the enhanced state machine validation in update_round_status
        self.update_round_status(UpdateRoundStatus {
            round_id,
            status: RoundStatus::Completed.to_str().to_string(),
        })
        .await
    }

    pub async fn create_next_round(&self, tournament_id: i32) -> Result<Round, PawnError> {
        // Get current round number
        let rounds = self
            .db
            .get_rounds_by_tournament(tournament_id)
            .await
            .map_err(PawnError::Database)?;

        let next_round_number = if rounds.is_empty() {
            1
        } else {
            rounds.iter().map(|r| r.round_number).max().unwrap_or(0) + 1
        };

        // Get tournament to check total rounds
        let tournament = self
            .db
            .get_tournament(tournament_id)
            .await
            .map_err(PawnError::Database)?;

        if next_round_number > tournament.total_rounds {
            return Err(PawnError::InvalidInput(format!(
                "Cannot create round {}: tournament only has {} rounds",
                next_round_number, tournament.total_rounds
            )));
        }

        // Create the new round
        self.create_round(CreateRound {
            tournament_id,
            round_number: next_round_number,
        })
        .await
    }
}
