use super::domain::{
    dto::{CreateTournament, CreatePlayer, CreateGame},
    model::{Tournament, Player, Game, TournamentDetails, PlayerResult, GameResult},
};

pub mod sqlite;

pub trait Db: Send + Sync {
    // Tournament operations
    async fn get_tournaments(&self) -> Result<Vec<Tournament>, sqlx::Error>;
    async fn get_tournament(&self, id: i32) -> Result<Tournament, sqlx::Error>;
    async fn create_tournament(&self, data: CreateTournament) -> Result<Tournament, sqlx::Error>;
    async fn get_tournament_details(&self, id: i32) -> Result<TournamentDetails, sqlx::Error>;
    
    // Player operations
    async fn get_players_by_tournament(&self, tournament_id: i32) -> Result<Vec<Player>, sqlx::Error>;
    async fn create_player(&self, data: CreatePlayer) -> Result<Player, sqlx::Error>;
    
    // Game operations
    async fn get_games_by_tournament(&self, tournament_id: i32) -> Result<Vec<Game>, sqlx::Error>;
    async fn create_game(&self, data: CreateGame) -> Result<Game, sqlx::Error>;
    
    // Statistics
    async fn get_player_results(&self, tournament_id: i32) -> Result<Vec<PlayerResult>, sqlx::Error>;
    async fn get_game_results(&self, tournament_id: i32) -> Result<Vec<GameResult>, sqlx::Error>;
}
