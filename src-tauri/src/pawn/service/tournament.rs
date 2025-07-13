use std::sync::Arc;

use crate::pawn::{
    common::error::PawnError,
    db::Db,
    domain::{
        dto::{CreateTournament, CreatePlayer, CreateGame},
        model::{Tournament, Player, Game, TournamentDetails, PlayerResult, GameResult},
    },
};

pub struct TournamentService<D> {
    db: Arc<D>,
}

impl<D: Db> TournamentService<D> {
    pub fn new(db: Arc<D>) -> Self {
        Self { db }
    }

    // Tournament operations
    pub async fn get_tournaments(&self) -> Result<Vec<Tournament>, PawnError> {
        self.db
            .get_tournaments()
            .await
            .map_err(PawnError::Database)
    }

    pub async fn get_tournament(&self, id: i32) -> Result<Tournament, PawnError> {
        self.db
            .get_tournament(id)
            .await
            .map_err(PawnError::Database)
    }

    pub async fn create_tournament(&self, data: CreateTournament) -> Result<Tournament, PawnError> {
        // Validate tournament data
        if data.name.trim().is_empty() {
            return Err(PawnError::InvalidInput("Tournament name cannot be empty".into()));
        }
        if data.player_count <= 0 {
            return Err(PawnError::InvalidInput("Player count must be positive".into()));
        }
        if data.total_rounds <= 0 {
            return Err(PawnError::InvalidInput("Total rounds must be positive".into()));
        }
        if data.rounds_played < 0 {
            return Err(PawnError::InvalidInput("Rounds played cannot be negative".into()));
        }
        if data.rounds_played > data.total_rounds {
            return Err(PawnError::InvalidInput("Rounds played cannot exceed total rounds".into()));
        }

        self.db
            .create_tournament(data)
            .await
            .map_err(PawnError::Database)
    }

    pub async fn get_tournament_details(&self, id: i32) -> Result<TournamentDetails, PawnError> {
        self.db
            .get_tournament_details(id)
            .await
            .map_err(PawnError::Database)
    }

    pub async fn delete_tournament(&self, id: i32) -> Result<(), PawnError> {
        self.db
            .delete_tournament(id)
            .await
            .map_err(PawnError::Database)
    }

    // Player operations
    pub async fn get_players_by_tournament(&self, tournament_id: i32) -> Result<Vec<Player>, PawnError> {
        self.db
            .get_players_by_tournament(tournament_id)
            .await
            .map_err(PawnError::Database)
    }

    pub async fn create_player(&self, data: CreatePlayer) -> Result<Player, PawnError> {
        // Validate player data
        if data.name.trim().is_empty() {
            return Err(PawnError::InvalidInput("Player name cannot be empty".into()));
        }
        if let Some(rating) = data.rating {
            if rating < 0 || rating > 4000 {
                return Err(PawnError::InvalidInput("Rating must be between 0 and 4000".into()));
            }
        }

        self.db
            .create_player(data)
            .await
            .map_err(PawnError::Database)
    }

    // Game operations
    pub async fn get_games_by_tournament(&self, tournament_id: i32) -> Result<Vec<Game>, PawnError> {
        self.db
            .get_games_by_tournament(tournament_id)
            .await
            .map_err(PawnError::Database)
    }

    pub async fn create_game(&self, data: CreateGame) -> Result<Game, PawnError> {
        // Validate game data
        if data.white_player_id == data.black_player_id {
            return Err(PawnError::InvalidInput("Players cannot play against themselves".into()));
        }
        if data.round_number <= 0 {
            return Err(PawnError::InvalidInput("Round number must be positive".into()));
        }
        if !["1-0", "0-1", "1/2-1/2", "*"].contains(&data.result.as_str()) {
            return Err(PawnError::InvalidInput("Invalid game result".into()));
        }

        self.db
            .create_game(data)
            .await
            .map_err(PawnError::Database)
    }

    // Statistics
    pub async fn get_player_results(&self, tournament_id: i32) -> Result<Vec<PlayerResult>, PawnError> {
        self.db
            .get_player_results(tournament_id)
            .await
            .map_err(PawnError::Database)
    }

    pub async fn get_game_results(&self, tournament_id: i32) -> Result<Vec<GameResult>, PawnError> {
        self.db
            .get_game_results(tournament_id)
            .await
            .map_err(PawnError::Database)
    }

    // Utility methods for populating mock data
    pub async fn populate_mock_data(&self, tournament_id: i32) -> Result<(), PawnError> {
        // Create mock players
        let mock_players = vec![
            CreatePlayer {
                tournament_id,
                name: "Magnus Carlsen".to_string(),
                rating: Some(2830),
                country_code: Some("NO".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Fabiano Caruana".to_string(),
                rating: Some(2820),
                country_code: Some("US".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Ding Liren".to_string(),
                rating: Some(2810),
                country_code: Some("CN".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Ian Nepomniachtchi".to_string(),
                rating: Some(2800),
                country_code: Some("RU".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Anish Giri".to_string(),
                rating: Some(2790),
                country_code: Some("NL".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Wesley So".to_string(),
                rating: Some(2780),
                country_code: Some("US".to_string()),
            },
        ];

        let mut player_ids = Vec::new();
        for player_data in mock_players {
            let player = self.create_player(player_data).await?;
            player_ids.push(player.id);
        }

        // Create mock games (round-robin first round)
        let mock_games = vec![
            CreateGame {
                tournament_id,
                round_number: 1,
                white_player_id: player_ids[0],
                black_player_id: player_ids[1],
                result: "1/2-1/2".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 1,
                white_player_id: player_ids[2],
                black_player_id: player_ids[3],
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 1,
                white_player_id: player_ids[4],
                black_player_id: player_ids[5],
                result: "0-1".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 2,
                white_player_id: player_ids[1],
                black_player_id: player_ids[2],
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 2,
                white_player_id: player_ids[3],
                black_player_id: player_ids[4],
                result: "1/2-1/2".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 2,
                white_player_id: player_ids[5],
                black_player_id: player_ids[0],
                result: "0-1".to_string(),
            },
        ];

        for game_data in mock_games {
            self.create_game(game_data).await?;
        }

        Ok(())
    }
}
