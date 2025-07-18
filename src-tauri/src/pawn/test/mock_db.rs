use std::collections::HashMap;
use async_trait::async_trait;

use crate::pawn::{
    db::Db,
    domain::{
        dto::{
            CreateGame, CreatePlayer, CreateRound, CreateTournament, UpdateGameResult,
            UpdatePlayer, UpdateTournament, UpdateTournamentSettings,
        },
        model::{
            Game, GameResult, Player, PlayerResult, Round, Tournament, TournamentDetails,
        },
        tiebreak::{StandingsCalculationResult, TournamentTiebreakConfig},
    },
    common::error::DatabaseError,
};

pub struct MockDb {
    tournaments: HashMap<i32, Tournament>,
    players: HashMap<i32, Player>,
    games: HashMap<i32, Game>,
    rounds: HashMap<i32, Round>,
}

impl MockDb {
    pub fn new() -> Self {
        Self {
            tournaments: HashMap::new(),
            players: HashMap::new(),
            games: HashMap::new(),
            rounds: HashMap::new(),
        }
    }
}

#[async_trait]
impl Db for MockDb {
    async fn create_tournament(&self, _tournament: CreateTournament) -> Result<Tournament, DatabaseError> {
        Ok(Tournament {
            id: 1,
            name: "Test Tournament".to_string(),
            location: "Test Location".to_string(),
            date: "2024-01-01".to_string(),
            time_type: "classical".to_string(),
            tournament_type: Some("swiss".to_string()),
            player_count: 0,
            rounds_played: 0,
            total_rounds: 5,
            country_code: "US".to_string(),
            status: Some("upcoming".to_string()),
            start_time: None,
            end_time: None,
            description: None,
            website_url: None,
            contact_email: None,
            entry_fee: None,
            currency: None,
            is_team_tournament: Some(false),
            team_size: None,
            max_teams: None,
        })
    }

    async fn get_tournament(&self, _id: i32) -> Result<Tournament, DatabaseError> {
        Ok(Tournament {
            id: 1,
            name: "Test Tournament".to_string(),
            location: "Test Location".to_string(),
            date: "2024-01-01".to_string(),
            time_type: "classical".to_string(),
            tournament_type: Some("swiss".to_string()),
            player_count: 0,
            rounds_played: 0,
            total_rounds: 5,
            country_code: "US".to_string(),
            status: Some("upcoming".to_string()),
            start_time: None,
            end_time: None,
            description: None,
            website_url: None,
            contact_email: None,
            entry_fee: None,
            currency: None,
            is_team_tournament: Some(false),
            team_size: None,
            max_teams: None,
        })
    }

    async fn get_tournaments(&self) -> Result<Vec<Tournament>, DatabaseError> {
        Ok(vec![])
    }

    async fn update_tournament(&self, _tournament: UpdateTournament) -> Result<Tournament, DatabaseError> {
        unimplemented!()
    }

    async fn delete_tournament(&self, _id: i32) -> Result<(), DatabaseError> {
        unimplemented!()
    }

    async fn create_player(&self, _player: CreatePlayer) -> Result<Player, DatabaseError> {
        unimplemented!()
    }

    async fn get_player(&self, _id: i32) -> Result<Player, DatabaseError> {
        unimplemented!()
    }

    async fn update_player(&self, _player: UpdatePlayer) -> Result<Player, DatabaseError> {
        unimplemented!()
    }

    async fn delete_player(&self, _id: i32) -> Result<(), DatabaseError> {
        unimplemented!()
    }

    async fn get_players_by_tournament(&self, _tournament_id: i32) -> Result<Vec<Player>, DatabaseError> {
        Ok(vec![])
    }

    async fn create_game(&self, _game: CreateGame) -> Result<Game, DatabaseError> {
        unimplemented!()
    }

    async fn get_game(&self, _id: i32) -> Result<Game, DatabaseError> {
        unimplemented!()
    }

    async fn update_game_result(&self, _game: UpdateGameResult) -> Result<Game, DatabaseError> {
        unimplemented!()
    }

    async fn get_games_by_tournament(&self, _tournament_id: i32) -> Result<Vec<GameResult>, DatabaseError> {
        Ok(vec![])
    }

    async fn get_games_by_round(&self, _tournament_id: i32, _round_number: i32) -> Result<Vec<GameResult>, DatabaseError> {
        Ok(vec![])
    }

    async fn get_player_results(&self, _tournament_id: i32) -> Result<Vec<PlayerResult>, DatabaseError> {
        Ok(vec![])
    }

    async fn get_tournament_details(&self, _id: i32) -> Result<TournamentDetails, DatabaseError> {
        unimplemented!()
    }

    async fn create_round(&self, _round: CreateRound) -> Result<Round, DatabaseError> {
        Ok(Round {
            id: 1,
            tournament_id: 1,
            round_number: 1,
            status: "planned".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            completed_at: None,
        })
    }

    async fn get_round(&self, _id: i32) -> Result<Round, DatabaseError> {
        Ok(Round {
            id: 1,
            tournament_id: 1,
            round_number: 1,
            status: "planned".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            completed_at: None,
        })
    }

    async fn get_rounds_by_tournament(&self, _tournament_id: i32) -> Result<Vec<Round>, DatabaseError> {
        Ok(vec![Round {
            id: 1,
            tournament_id: 1,
            round_number: 1,
            status: "planned".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            completed_at: None,
        }])
    }

    async fn get_current_round(&self, _tournament_id: i32) -> Result<Option<Round>, DatabaseError> {
        Ok(Some(Round {
            id: 1,
            tournament_id: 1,
            round_number: 1,
            status: "planned".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            completed_at: None,
        }))
    }

    async fn update_round_status(&self, _round_id: i32, _status: &str) -> Result<Round, DatabaseError> {
        unimplemented!()
    }

    async fn get_standings(&self, _tournament_id: i32) -> Result<StandingsCalculationResult, DatabaseError> {
        unimplemented!()
    }

    async fn get_tournament_settings(&self, _tournament_id: i32) -> Result<TournamentTiebreakConfig, DatabaseError> {
        unimplemented!()
    }

    async fn update_tournament_settings(&self, _settings: UpdateTournamentSettings) -> Result<TournamentTiebreakConfig, DatabaseError> {
        unimplemented!()
    }
}