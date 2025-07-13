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
    pub async fn populate_mock_tournaments(&self) -> Result<(), PawnError> {
        // Create multiple diverse tournaments
        let tournaments = vec![
            CreateTournament {
                name: "World Championship Candidates 2024".to_string(),
                location: "Madrid, Spain".to_string(),
                date: "2024-04-15".to_string(),
                time_type: "classical".to_string(),
                player_count: 8,
                rounds_played: 2,
                total_rounds: 14,
                country_code: "ES".to_string(),
            },
            CreateTournament {
                name: "Grand Prix Rapid Open".to_string(),
                location: "Dubai, UAE".to_string(),
                date: "2024-03-20".to_string(),
                time_type: "rapid".to_string(),
                player_count: 6,
                rounds_played: 3,
                total_rounds: 9,
                country_code: "AE".to_string(),
            },
            CreateTournament {
                name: "Speed Chess Championship".to_string(),
                location: "Saint Louis, USA".to_string(),
                date: "2024-02-10".to_string(),
                time_type: "blitz".to_string(),
                player_count: 8,
                rounds_played: 4,
                total_rounds: 7,
                country_code: "US".to_string(),
            },
            CreateTournament {
                name: "Local Club Championship".to_string(),
                location: "London Chess Club".to_string(),
                date: "2024-01-28".to_string(),
                time_type: "classical".to_string(),
                player_count: 6,
                rounds_played: 2,
                total_rounds: 5,
                country_code: "GB".to_string(),
            },
        ];

        for tournament_data in tournaments {
            let tournament = self.create_tournament(tournament_data.clone()).await?;
            
            // Populate each tournament with appropriate players and games
            match tournament_data.name.as_str() {
                "World Championship Candidates 2024" => {
                    self.populate_candidates_tournament(tournament.id).await?;
                }
                "Grand Prix Rapid Open" => {
                    self.populate_rapid_tournament(tournament.id).await?;
                }
                "Speed Chess Championship" => {
                    self.populate_blitz_tournament(tournament.id).await?;
                }
                "Local Club Championship" => {
                    self.populate_club_tournament(tournament.id).await?;
                }
                _ => {}
            }
        }

        Ok(())
    }

    async fn populate_candidates_tournament(&self, tournament_id: i32) -> Result<(), PawnError> {
        let players = vec![
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
            CreatePlayer {
                tournament_id,
                name: "Hikaru Nakamura".to_string(),
                rating: Some(2780),
                country_code: Some("US".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Vidit Gujrathi".to_string(),
                rating: Some(2750),
                country_code: Some("IN".to_string()),
            },
        ];

        let mut player_ids = Vec::new();
        for player_data in players {
            let player = self.create_player(player_data).await?;
            player_ids.push(player.id);
        }

        let games = vec![
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
                round_number: 1,
                white_player_id: player_ids[6],
                black_player_id: player_ids[7],
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 2,
                white_player_id: player_ids[1],
                black_player_id: player_ids[2],
                result: "1/2-1/2".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 2,
                white_player_id: player_ids[3],
                black_player_id: player_ids[4],
                result: "0-1".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 2,
                white_player_id: player_ids[5],
                black_player_id: player_ids[6],
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 2,
                white_player_id: player_ids[7],
                black_player_id: player_ids[0],
                result: "1/2-1/2".to_string(),
            },
        ];

        for game_data in games {
            self.create_game(game_data).await?;
        }

        Ok(())
    }

    async fn populate_rapid_tournament(&self, tournament_id: i32) -> Result<(), PawnError> {
        let players = vec![
            CreatePlayer {
                tournament_id,
                name: "Maxime Vachier-Lagrave".to_string(),
                rating: Some(2780),
                country_code: Some("FR".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Levon Aronian".to_string(),
                rating: Some(2770),
                country_code: Some("US".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Teimour Radjabov".to_string(),
                rating: Some(2760),
                country_code: Some("AZ".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Shakhriyar Mamedyarov".to_string(),
                rating: Some(2740),
                country_code: Some("AZ".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Alexander Grischuk".to_string(),
                rating: Some(2730),
                country_code: Some("RU".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Jan-Krzysztof Duda".to_string(),
                rating: Some(2720),
                country_code: Some("PL".to_string()),
            },
        ];

        let mut player_ids = Vec::new();
        for player_data in players {
            let player = self.create_player(player_data).await?;
            player_ids.push(player.id);
        }

        let games = vec![
            CreateGame {
                tournament_id,
                round_number: 1,
                white_player_id: player_ids[0],
                black_player_id: player_ids[1],
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 1,
                white_player_id: player_ids[2],
                black_player_id: player_ids[3],
                result: "1/2-1/2".to_string(),
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
            CreateGame {
                tournament_id,
                round_number: 3,
                white_player_id: player_ids[0],
                black_player_id: player_ids[3],
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 3,
                white_player_id: player_ids[1],
                black_player_id: player_ids[4],
                result: "1/2-1/2".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 3,
                white_player_id: player_ids[2],
                black_player_id: player_ids[5],
                result: "1-0".to_string(),
            },
        ];

        for game_data in games {
            self.create_game(game_data).await?;
        }

        Ok(())
    }

    async fn populate_blitz_tournament(&self, tournament_id: i32) -> Result<(), PawnError> {
        let players = vec![
            CreatePlayer {
                tournament_id,
                name: "Alireza Firouzja".to_string(),
                rating: Some(2800),
                country_code: Some("FR".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Praggnanandhaa Rameshbabu".to_string(),
                rating: Some(2750),
                country_code: Some("IN".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Nodirbek Abdusattorov".to_string(),
                rating: Some(2740),
                country_code: Some("UZ".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Hans Niemann".to_string(),
                rating: Some(2720),
                country_code: Some("US".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Vincent Keymer".to_string(),
                rating: Some(2710),
                country_code: Some("DE".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Arjun Erigaisi".to_string(),
                rating: Some(2700),
                country_code: Some("IN".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Dommaraju Gukesh".to_string(),
                rating: Some(2690),
                country_code: Some("IN".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Christopher Yoo".to_string(),
                rating: Some(2680),
                country_code: Some("US".to_string()),
            },
        ];

        let mut player_ids = Vec::new();
        for player_data in players {
            let player = self.create_player(player_data).await?;
            player_ids.push(player.id);
        }

        let games = vec![
            CreateGame {
                tournament_id,
                round_number: 1,
                white_player_id: player_ids[0],
                black_player_id: player_ids[1],
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 1,
                white_player_id: player_ids[2],
                black_player_id: player_ids[3],
                result: "0-1".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 1,
                white_player_id: player_ids[4],
                black_player_id: player_ids[5],
                result: "1/2-1/2".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 1,
                white_player_id: player_ids[6],
                black_player_id: player_ids[7],
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 2,
                white_player_id: player_ids[1],
                black_player_id: player_ids[2],
                result: "1/2-1/2".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 2,
                white_player_id: player_ids[3],
                black_player_id: player_ids[4],
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 2,
                white_player_id: player_ids[5],
                black_player_id: player_ids[6],
                result: "0-1".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 2,
                white_player_id: player_ids[7],
                black_player_id: player_ids[0],
                result: "0-1".to_string(),
            },
        ];

        for game_data in games {
            self.create_game(game_data).await?;
        }

        Ok(())
    }

    async fn populate_club_tournament(&self, tournament_id: i32) -> Result<(), PawnError> {
        let players = vec![
            CreatePlayer {
                tournament_id,
                name: "David Johnson".to_string(),
                rating: Some(2200),
                country_code: Some("GB".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Sarah Williams".to_string(),
                rating: Some(2100),
                country_code: Some("GB".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Michael Brown".to_string(),
                rating: Some(2000),
                country_code: Some("GB".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Emma Davis".to_string(),
                rating: Some(1950),
                country_code: Some("GB".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "James Wilson".to_string(),
                rating: Some(1900),
                country_code: Some("GB".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Alice Smith".to_string(),
                rating: Some(1850),
                country_code: Some("GB".to_string()),
            },
        ];

        let mut player_ids = Vec::new();
        for player_data in players {
            let player = self.create_player(player_data).await?;
            player_ids.push(player.id);
        }

        let games = vec![
            CreateGame {
                tournament_id,
                round_number: 1,
                white_player_id: player_ids[0],
                black_player_id: player_ids[1],
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 1,
                white_player_id: player_ids[2],
                black_player_id: player_ids[3],
                result: "1/2-1/2".to_string(),
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

        for game_data in games {
            self.create_game(game_data).await?;
        }

        Ok(())
    }

    pub async fn populate_mock_data(&self, tournament_id: i32) -> Result<(), PawnError> {
        // Legacy method - still populate single tournament for compatibility
        self.populate_candidates_tournament(tournament_id).await
    }
}
