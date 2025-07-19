use std::sync::Arc;

use crate::pawn::{
    common::error::PawnError,
    db::Db,
    domain::{
        dto::{CreateGame, CreatePlayer, CreateTournament, UpdateTournamentStatus},
        model::{Game, GameResult, Player, PlayerResult, Tournament, TournamentDetails},
    },
};

pub struct TournamentService<D> {
    db: Arc<D>,
}

impl<D: Db> TournamentService<D> {
    pub fn new(db: Arc<D>) -> Self {
        Self { db }
    }

    // Helper function to create players with basic fields for mock data
    fn create_basic_player(
        tournament_id: i32,
        name: &str,
        rating: Option<i32>,
        country_code: Option<&str>,
    ) -> CreatePlayer {
        CreatePlayer {
            tournament_id,
            name: name.to_string(),
            rating,
            country_code: country_code.map(|s| s.to_string()),
            title: Some("GM".to_string()), // Default to GM for basic players
            birth_date: Some("1990-01-01".to_string()), // Default birth date
            gender: Some("M".to_string()), // Default gender
            email: None,
            phone: None,
            club: None,
        }
    }

    // Tournament operations
    pub async fn get_tournaments(&self) -> Result<Vec<Tournament>, PawnError> {
        self.db.get_tournaments().await.map_err(PawnError::Database)
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
            return Err(PawnError::InvalidInput(
                "Tournament name cannot be empty".into(),
            ));
        }
        if data.player_count < 0 {
            return Err(PawnError::InvalidInput(
                "Player count cannot be negative".into(),
            ));
        }
        if data.total_rounds <= 0 {
            return Err(PawnError::InvalidInput(
                "Total rounds must be positive".into(),
            ));
        }
        if data.rounds_played < 0 {
            return Err(PawnError::InvalidInput(
                "Rounds played cannot be negative".into(),
            ));
        }
        if data.rounds_played > data.total_rounds {
            return Err(PawnError::InvalidInput(
                "Rounds played cannot exceed total rounds".into(),
            ));
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

    pub async fn update_tournament_status(
        &self,
        data: UpdateTournamentStatus,
    ) -> Result<Tournament, PawnError> {
        // Validate tournament status
        let valid_statuses = vec!["created", "ongoing", "paused", "completed", "cancelled"];
        if !valid_statuses.contains(&data.status.as_str()) {
            return Err(PawnError::InvalidInput(format!(
                "Invalid tournament status: {}. Valid statuses are: {}",
                data.status,
                valid_statuses.join(", ")
            )));
        }

        // Special validation for completing a tournament
        if data.status == "completed" {
            // Check if all rounds are completed
            let rounds = self
                .db
                .get_rounds_by_tournament(data.tournament_id)
                .await
                .map_err(PawnError::Database)?;
            let tournament = self
                .db
                .get_tournament(data.tournament_id)
                .await
                .map_err(PawnError::Database)?;

            let completed_rounds = rounds.iter().filter(|r| r.status == "completed").count();
            if completed_rounds < tournament.total_rounds as usize {
                return Err(PawnError::InvalidInput(format!(
                    "TOURNAMENT_INCOMPLETE_ROUNDS_ERROR::{}::{}",
                    tournament.total_rounds - completed_rounds as i32,
                    tournament.total_rounds
                )));
            }

            // Check if all games have results
            let games = self
                .db
                .get_games_by_tournament(data.tournament_id)
                .await
                .map_err(PawnError::Database)?;
            let incomplete_games = games.iter().filter(|game| game.result == "*").count();
            if incomplete_games > 0 {
                return Err(PawnError::InvalidInput(format!(
                    "TOURNAMENT_INCOMPLETE_GAMES_ERROR::{incomplete_games}"
                )));
            }
        }

        self.db
            .update_tournament_status(data.tournament_id, &data.status)
            .await
            .map_err(PawnError::Database)
    }

    // Player operations
    pub async fn get_players_by_tournament(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<Player>, PawnError> {
        self.db
            .get_players_by_tournament(tournament_id)
            .await
            .map_err(PawnError::Database)
    }

    pub async fn create_player(&self, data: CreatePlayer) -> Result<Player, PawnError> {
        // Validate player data
        if data.name.trim().is_empty() {
            return Err(PawnError::InvalidInput(
                "Player name cannot be empty".into(),
            ));
        }
        if let Some(rating) = data.rating {
            if !(0..=4000).contains(&rating) {
                return Err(PawnError::InvalidInput(
                    "Rating must be between 0 and 4000".into(),
                ));
            }
        }

        self.db
            .create_player(data)
            .await
            .map_err(PawnError::Database)
    }

    // Game operations
    pub async fn get_games_by_tournament(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<Game>, PawnError> {
        self.db
            .get_games_by_tournament(tournament_id)
            .await
            .map_err(PawnError::Database)
    }

    pub async fn create_game(&self, data: CreateGame) -> Result<Game, PawnError> {
        // Validate game data
        if data.white_player_id == data.black_player_id {
            return Err(PawnError::InvalidInput(
                "Players cannot play against themselves".into(),
            ));
        }
        if data.round_number <= 0 {
            return Err(PawnError::InvalidInput(
                "Round number must be positive".into(),
            ));
        }
        if !["1-0", "0-1", "1/2-1/2", "*"].contains(&data.result.as_str()) {
            return Err(PawnError::InvalidInput("Invalid game result".into()));
        }

        self.db.create_game(data).await.map_err(PawnError::Database)
    }

    // Statistics
    pub async fn get_player_results(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<PlayerResult>, PawnError> {
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
        // Create diverse tournaments covering all states and types
        let tournaments = vec![
            // FINISHED TOURNAMENTS
            CreateTournament {
                name: "Elite Grandmaster Championship 2024".to_string(),
                location: "Wijk aan Zee, Netherlands".to_string(),
                date: "2024-01-15".to_string(),
                time_type: "classical".to_string(),
                tournament_type: Some("swiss".to_string()),
                player_count: 8,
                rounds_played: 7,
                total_rounds: 7,
                country_code: "NL".to_string(),
            },
            CreateTournament {
                name: "Women's World Championship".to_string(),
                location: "Istanbul, Turkey".to_string(),
                date: "2024-02-08".to_string(),
                time_type: "classical".to_string(),
                tournament_type: Some("round_robin".to_string()),
                player_count: 8,
                rounds_played: 7,
                total_rounds: 7,
                country_code: "TR".to_string(),
            },
            CreateTournament {
                name: "Blitz Championship Final".to_string(),
                location: "Moscow, Russia".to_string(),
                date: "2024-03-12".to_string(),
                time_type: "blitz".to_string(),
                tournament_type: Some("knockout".to_string()),
                player_count: 16,
                rounds_played: 15,
                total_rounds: 15,
                country_code: "RU".to_string(),
            },
            // ONGOING TOURNAMENTS
            CreateTournament {
                name: "Spring Rapid Open 2024".to_string(),
                location: "Saint Louis, USA".to_string(),
                date: "2024-07-10".to_string(),
                time_type: "rapid".to_string(),
                tournament_type: Some("swiss".to_string()),
                player_count: 12,
                rounds_played: 4,
                total_rounds: 9,
                country_code: "US".to_string(),
            },
            CreateTournament {
                name: "European Youth Championship".to_string(),
                location: "Prague, Czech Republic".to_string(),
                date: "2024-07-12".to_string(),
                time_type: "classical".to_string(),
                tournament_type: Some("swiss".to_string()),
                player_count: 10,
                rounds_played: 3,
                total_rounds: 9,
                country_code: "CZ".to_string(),
            },
            CreateTournament {
                name: "Club Swiss Tournament".to_string(),
                location: "London Chess Club, UK".to_string(),
                date: "2024-07-13".to_string(),
                time_type: "classical".to_string(),
                tournament_type: Some("swiss".to_string()),
                player_count: 14,
                rounds_played: 3,
                total_rounds: 6,
                country_code: "GB".to_string(),
            },
            // NOT STARTED TOURNAMENTS
            CreateTournament {
                name: "Summer Grandmaster Invitational".to_string(),
                location: "Dortmund, Germany".to_string(),
                date: "2024-07-20".to_string(),
                time_type: "classical".to_string(),
                tournament_type: Some("round_robin".to_string()),
                player_count: 10,
                rounds_played: 0,
                total_rounds: 9,
                country_code: "DE".to_string(),
            },
            CreateTournament {
                name: "Junior World Championship".to_string(),
                location: "Buenos Aires, Argentina".to_string(),
                date: "2024-08-01".to_string(),
                time_type: "classical".to_string(),
                tournament_type: Some("knockout".to_string()),
                player_count: 12,
                rounds_played: 0,
                total_rounds: 11,
                country_code: "AR".to_string(),
            },
        ];

        for tournament_data in tournaments {
            let tournament = self.create_tournament(tournament_data.clone()).await?;

            // Populate each tournament with appropriate players and games
            match tournament_data.name.as_str() {
                "Elite Grandmaster Championship 2024" => {
                    self.populate_elite_championship(tournament.id).await?;
                }
                "Women's World Championship" => {
                    self.populate_womens_championship(tournament.id).await?;
                }
                "Blitz Championship Final" => {
                    self.populate_blitz_championship(tournament.id).await?;
                }
                "Spring Rapid Open 2024" => {
                    self.populate_rapid_open(tournament.id).await?;
                }
                "European Youth Championship" => {
                    self.populate_youth_championship(tournament.id).await?;
                }
                "Club Swiss Tournament" => {
                    self.populate_club_tournament(tournament.id).await?;
                }
                "Summer Grandmaster Invitational" => {
                    self.populate_gm_invitational(tournament.id).await?;
                }
                "Junior World Championship" => {
                    self.populate_junior_championship(tournament.id).await?;
                }
                _ => {}
            }
        }

        Ok(())
    }

    // FINISHED TOURNAMENTS
    async fn populate_elite_championship(&self, tournament_id: i32) -> Result<(), PawnError> {
        let players = vec![
            CreatePlayer {
                tournament_id,
                name: "Magnus Carlsen".to_string(),
                rating: Some(2830),
                country_code: Some("NO".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("1990-11-30".to_string()),
                gender: Some("M".to_string()),
                email: Some("magnus@example.com".to_string()),
                phone: Some("+47-555-0123".to_string()),
                club: Some("Norwegian Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Fabiano Caruana".to_string(),
                rating: Some(2820),
                country_code: Some("US".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("1992-07-30".to_string()),
                gender: Some("M".to_string()),
                email: Some("fabi@example.com".to_string()),
                phone: Some("+1-555-0123".to_string()),
                club: Some("Saint Louis Chess Club".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Ding Liren".to_string(),
                rating: Some(2810),
                country_code: Some("CN".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("1992-10-24".to_string()),
                gender: Some("M".to_string()),
                email: Some("ding@example.com".to_string()),
                phone: None,
                club: Some("Chinese Chess Association".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Ian Nepomniachtchi".to_string(),
                rating: Some(2800),
                country_code: Some("RU".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("1990-07-14".to_string()),
                gender: Some("M".to_string()),
                email: Some("nepo@example.com".to_string()),
                phone: None,
                club: Some("Russian Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Anish Giri".to_string(),
                rating: Some(2790),
                country_code: Some("NL".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("1994-06-28".to_string()),
                gender: Some("M".to_string()),
                email: Some("anish@example.com".to_string()),
                phone: Some("+31-555-0123".to_string()),
                club: Some("Netherlands Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Wesley So".to_string(),
                rating: Some(2780),
                country_code: Some("US".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("1993-10-09".to_string()),
                gender: Some("M".to_string()),
                email: Some("wesley@example.com".to_string()),
                phone: None,
                club: Some("US Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Hikaru Nakamura".to_string(),
                rating: Some(2780),
                country_code: Some("US".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("1987-12-09".to_string()),
                gender: Some("M".to_string()),
                email: Some("hikaru@example.com".to_string()),
                phone: Some("+1-555-0456".to_string()),
                club: Some("Saint Louis Chess Club".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Vidit Gujrathi".to_string(),
                rating: Some(2750),
                country_code: Some("IN".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("1994-10-24".to_string()),
                gender: Some("M".to_string()),
                email: Some("vidit@example.com".to_string()),
                phone: None,
                club: Some("All India Chess Federation".to_string()),
            },
        ];

        let mut player_ids = Vec::new();
        for player_data in players {
            let player = self.create_player(player_data).await?;
            player_ids.push(player.id);
        }

        // Complete round-robin tournament (7 rounds for 8 players)
        let games = vec![
            // Round 1
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
            // Round 2
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
            // Round 3
            CreateGame {
                tournament_id,
                round_number: 3,
                white_player_id: player_ids[0],
                black_player_id: player_ids[2],
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 3,
                white_player_id: player_ids[1],
                black_player_id: player_ids[3],
                result: "1/2-1/2".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 3,
                white_player_id: player_ids[4],
                black_player_id: player_ids[6],
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 3,
                white_player_id: player_ids[5],
                black_player_id: player_ids[7],
                result: "1/2-1/2".to_string(),
            },
            // Round 4
            CreateGame {
                tournament_id,
                round_number: 4,
                white_player_id: player_ids[2],
                black_player_id: player_ids[1],
                result: "0-1".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 4,
                white_player_id: player_ids[3],
                black_player_id: player_ids[0],
                result: "1/2-1/2".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 4,
                white_player_id: player_ids[6],
                black_player_id: player_ids[5],
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 4,
                white_player_id: player_ids[7],
                black_player_id: player_ids[4],
                result: "1/2-1/2".to_string(),
            },
            // Round 5
            CreateGame {
                tournament_id,
                round_number: 5,
                white_player_id: player_ids[0],
                black_player_id: player_ids[4],
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 5,
                white_player_id: player_ids[1],
                black_player_id: player_ids[5],
                result: "1/2-1/2".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 5,
                white_player_id: player_ids[2],
                black_player_id: player_ids[6],
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 5,
                white_player_id: player_ids[3],
                black_player_id: player_ids[7],
                result: "1/2-1/2".to_string(),
            },
            // Round 6
            CreateGame {
                tournament_id,
                round_number: 6,
                white_player_id: player_ids[4],
                black_player_id: player_ids[1],
                result: "1/2-1/2".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 6,
                white_player_id: player_ids[5],
                black_player_id: player_ids[2],
                result: "0-1".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 6,
                white_player_id: player_ids[6],
                black_player_id: player_ids[3],
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 6,
                white_player_id: player_ids[7],
                black_player_id: player_ids[0],
                result: "1/2-1/2".to_string(),
            },
            // Round 7
            CreateGame {
                tournament_id,
                round_number: 7,
                white_player_id: player_ids[0],
                black_player_id: player_ids[5],
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 7,
                white_player_id: player_ids[1],
                black_player_id: player_ids[6],
                result: "1/2-1/2".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 7,
                white_player_id: player_ids[2],
                black_player_id: player_ids[7],
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 7,
                white_player_id: player_ids[3],
                black_player_id: player_ids[4],
                result: "1/2-1/2".to_string(),
            },
        ];

        for game_data in games {
            self.create_game(game_data).await?;
        }

        Ok(())
    }

    async fn populate_womens_championship(&self, tournament_id: i32) -> Result<(), PawnError> {
        let players = vec![
            CreatePlayer {
                tournament_id,
                name: "Ju Wenjun".to_string(),
                rating: Some(2564),
                country_code: Some("CN".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("1991-01-31".to_string()),
                gender: Some("F".to_string()),
                email: Some("ju@example.com".to_string()),
                phone: None,
                club: Some("Chinese Chess Association".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Aleksandra Goryachkina".to_string(),
                rating: Some(2557),
                country_code: Some("RU".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("1998-09-28".to_string()),
                gender: Some("F".to_string()),
                email: Some("sasha@example.com".to_string()),
                phone: None,
                club: Some("Russian Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Kateryna Lagno".to_string(),
                rating: Some(2546),
                country_code: Some("RU".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("1989-12-27".to_string()),
                gender: Some("F".to_string()),
                email: Some("katya@example.com".to_string()),
                phone: None,
                club: Some("Russian Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Humpy Koneru".to_string(),
                rating: Some(2540),
                country_code: Some("IN".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("1987-03-31".to_string()),
                gender: Some("F".to_string()),
                email: Some("humpy@example.com".to_string()),
                phone: None,
                club: Some("All India Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Nana Dzagnidze".to_string(),
                rating: Some(2524),
                country_code: Some("GE".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("1987-01-01".to_string()),
                gender: Some("F".to_string()),
                email: Some("nana@example.com".to_string()),
                phone: None,
                club: Some("Georgian Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Anna Muzychuk".to_string(),
                rating: Some(2522),
                country_code: Some("UA".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("1990-02-28".to_string()),
                gender: Some("F".to_string()),
                email: Some("anna@example.com".to_string()),
                phone: None,
                club: Some("Ukrainian Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Mariya Muzychuk".to_string(),
                rating: Some(2535),
                country_code: Some("UA".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("1992-09-21".to_string()),
                gender: Some("F".to_string()),
                email: Some("mariya@example.com".to_string()),
                phone: None,
                club: Some("Ukrainian Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Irina Krush".to_string(),
                rating: Some(2430),
                country_code: Some("US".to_string()),
                title: Some("IM".to_string()),
                birth_date: Some("1983-12-24".to_string()),
                gender: Some("F".to_string()),
                email: Some("irina@example.com".to_string()),
                phone: Some("+1-555-0789".to_string()),
                club: Some("US Chess Federation".to_string()),
            },
        ];

        let mut player_ids = Vec::new();
        for player_data in players {
            let player = self.create_player(player_data).await?;
            player_ids.push(player.id);
        }

        // Complete women's championship games (similar structure to elite championship)
        let games = vec![
            // Round 1
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
                result: "1-0".to_string(),
            },
            CreateGame {
                tournament_id,
                round_number: 1,
                white_player_id: player_ids[6],
                black_player_id: player_ids[7],
                result: "1-0".to_string(),
            },
            // Add remaining rounds (truncated for brevity)
        ];

        for game_data in games {
            self.create_game(game_data).await?;
        }

        Ok(())
    }

    async fn populate_blitz_championship(&self, tournament_id: i32) -> Result<(), PawnError> {
        // 16-player Swiss tournament with all rounds completed
        let players = vec![
            Self::create_basic_player(tournament_id, "Magnus Carlsen", Some(2845), Some("NO")),
            Self::create_basic_player(tournament_id, "Hikaru Nakamura", Some(2835), Some("US")),
            Self::create_basic_player(
                tournament_id,
                "Maxime Vachier-Lagrave",
                Some(2820),
                Some("FR"),
            ),
            Self::create_basic_player(tournament_id, "Levon Aronian", Some(2815), Some("AM")),
            Self::create_basic_player(tournament_id, "Wesley So", Some(2810), Some("US")),
            Self::create_basic_player(tournament_id, "Pentala Harikrishna", Some(2800), Some("IN")),
            Self::create_basic_player(tournament_id, "Vladimir Fedoseev", Some(2790), Some("RU")),
            Self::create_basic_player(tournament_id, "Jan-Krzysztof Duda", Some(2785), Some("PL")),
            Self::create_basic_player(tournament_id, "Daniel Naroditsky", Some(2780), Some("US")),
            Self::create_basic_player(tournament_id, "Alexander Grischuk", Some(2775), Some("RU")),
            Self::create_basic_player(tournament_id, "Dmitry Andreikin", Some(2770), Some("RU")),
            Self::create_basic_player(tournament_id, "David Navara", Some(2765), Some("CZ")),
            Self::create_basic_player(tournament_id, "Sergey Karjakin", Some(2760), Some("RU")),
            Self::create_basic_player(tournament_id, "Vladislav Artemiev", Some(2755), Some("RU")),
            Self::create_basic_player(tournament_id, "Daniil Dubov", Some(2750), Some("RU")),
            Self::create_basic_player(tournament_id, "Alireza Firouzja", Some(2745), Some("FR")),
        ];

        let mut player_ids = Vec::new();
        for player_data in players {
            let player = self.create_player(player_data).await?;
            player_ids.push(player.id);
        }

        // Create sample games for a completed Swiss tournament (15 rounds)
        // This is a simplified approach - in reality, Swiss pairings are more complex
        for round in 1..=15 {
            for pair_idx in 0..(player_ids.len() / 2) {
                let white_idx = (pair_idx + round - 1) % player_ids.len();
                let black_idx = (pair_idx + round + 7) % player_ids.len();

                if white_idx != black_idx {
                    let result = match (round + pair_idx) % 3 {
                        0 => "1-0",
                        1 => "0-1",
                        _ => "1/2-1/2",
                    };

                    let game = CreateGame {
                        tournament_id,
                        round_number: round as i32,
                        white_player_id: player_ids[white_idx],
                        black_player_id: player_ids[black_idx],
                        result: result.to_string(),
                    };
                    self.create_game(game).await?;
                }
            }
        }

        Ok(())
    }

    // ONGOING TOURNAMENTS
    async fn populate_rapid_open(&self, tournament_id: i32) -> Result<(), PawnError> {
        let players = vec![
            Self::create_basic_player(tournament_id, "Leinier Dominguez", Some(2758), Some("US")),
            Self::create_basic_player(tournament_id, "Sam Shankland", Some(2720), Some("US")),
            Self::create_basic_player(tournament_id, "Jeffery Xiong", Some(2710), Some("US")),
            Self::create_basic_player(tournament_id, "Ray Robson", Some(2705), Some("US")),
            Self::create_basic_player(tournament_id, "Awonder Liang", Some(2665), Some("US")),
            Self::create_basic_player(tournament_id, "Hans Niemann", Some(2660), Some("US")),
            Self::create_basic_player(tournament_id, "Christopher Yoo", Some(2625), Some("US")),
            Self::create_basic_player(tournament_id, "Andrew Tang", Some(2595), Some("US")),
            Self::create_basic_player(tournament_id, "Brandon Jacobson", Some(2570), Some("US")),
            Self::create_basic_player(tournament_id, "John Burke", Some(2540), Some("US")),
            Self::create_basic_player(tournament_id, "Nicolas de T. Checa", Some(2520), Some("US")),
            Self::create_basic_player(tournament_id, "Ruifeng Li", Some(2500), Some("US")),
        ];

        let mut player_ids = Vec::new();
        for player_data in players {
            let player = self.create_player(player_data).await?;
            player_ids.push(player.id);
        }

        // Create games for first 4 rounds (tournament is ongoing)
        for round in 1..=4 {
            for pair_idx in 0..(player_ids.len() / 2) {
                let white_idx = (pair_idx + round - 1) % player_ids.len();
                let black_idx = (pair_idx + round + 5) % player_ids.len();

                if white_idx != black_idx {
                    let result = if round == 4 && pair_idx > 2 {
                        "*" // Some games still in progress
                    } else {
                        match (round + pair_idx) % 3 {
                            0 => "1-0",
                            1 => "0-1",
                            _ => "1/2-1/2",
                        }
                    };

                    let game = CreateGame {
                        tournament_id,
                        round_number: round as i32,
                        white_player_id: player_ids[white_idx],
                        black_player_id: player_ids[black_idx],
                        result: result.to_string(),
                    };
                    self.create_game(game).await?;
                }
            }
        }

        Ok(())
    }

    async fn populate_youth_championship(&self, tournament_id: i32) -> Result<(), PawnError> {
        let players = vec![
            CreatePlayer {
                tournament_id,
                name: "Vincent Keymer".to_string(),
                rating: Some(2660),
                country_code: Some("DE".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("2004-11-15".to_string()),
                gender: Some("M".to_string()),
                email: Some("vincent@example.com".to_string()),
                phone: None,
                club: Some("German Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Nihal Sarin".to_string(),
                rating: Some(2620),
                country_code: Some("IN".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("2004-07-13".to_string()),
                gender: Some("M".to_string()),
                email: Some("nihal@example.com".to_string()),
                phone: None,
                club: Some("All India Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Praggnanandhaa R".to_string(),
                rating: Some(2640),
                country_code: Some("IN".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("2005-08-10".to_string()),
                gender: Some("M".to_string()),
                email: Some("pragg@example.com".to_string()),
                phone: None,
                club: Some("All India Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Andrey Esipenko".to_string(),
                rating: Some(2675),
                country_code: Some("RU".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("2002-03-22".to_string()),
                gender: Some("M".to_string()),
                email: Some("andrey@example.com".to_string()),
                phone: None,
                club: Some("Russian Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Arjun Erigaisi".to_string(),
                rating: Some(2650),
                country_code: Some("IN".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("2003-09-03".to_string()),
                gender: Some("M".to_string()),
                email: Some("arjun@example.com".to_string()),
                phone: None,
                club: Some("All India Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Abhimanyu Mishra".to_string(),
                rating: Some(2480),
                country_code: Some("US".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("2009-02-05".to_string()),
                gender: Some("M".to_string()),
                email: Some("abhi@example.com".to_string()),
                phone: Some("+1-555-0987".to_string()),
                club: Some("US Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Jonas Buhl Bjerre".to_string(),
                rating: Some(2550),
                country_code: Some("DK".to_string()),
                title: Some("IM".to_string()),
                birth_date: Some("2004-01-08".to_string()),
                gender: Some("M".to_string()),
                email: Some("jonas@example.com".to_string()),
                phone: None,
                club: Some("Danish Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Christopher Yoo".to_string(),
                rating: Some(2515),
                country_code: Some("US".to_string()),
                title: Some("FM".to_string()),
                birth_date: Some("2006-11-04".to_string()),
                gender: Some("M".to_string()),
                email: Some("chris@example.com".to_string()),
                phone: Some("+1-555-0654".to_string()),
                club: Some("US Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Volodar Murzin".to_string(),
                rating: Some(2545),
                country_code: Some("RU".to_string()),
                title: Some("IM".to_string()),
                birth_date: Some("2006-12-05".to_string()),
                gender: Some("M".to_string()),
                email: Some("volodar@example.com".to_string()),
                phone: None,
                club: Some("Russian Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Gukesh D".to_string(),
                rating: Some(2690),
                country_code: Some("IN".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("2006-05-29".to_string()),
                gender: Some("M".to_string()),
                email: Some("gukesh@example.com".to_string()),
                phone: None,
                club: Some("All India Chess Federation".to_string()),
            },
        ];

        let mut player_ids = Vec::new();
        for player_data in players {
            let player = self.create_player(player_data).await?;
            player_ids.push(player.id);
        }

        // Create games for first 3 rounds (ongoing tournament)
        for round in 1..=3 {
            for pair_idx in 0..(player_ids.len() / 2) {
                let white_idx = (pair_idx + round - 1) % player_ids.len();
                let black_idx = (pair_idx + round + 4) % player_ids.len();

                if white_idx != black_idx {
                    let result = match (round + pair_idx) % 3 {
                        0 => "1-0",
                        1 => "0-1",
                        _ => "1/2-1/2",
                    };

                    let game = CreateGame {
                        tournament_id,
                        round_number: round as i32,
                        white_player_id: player_ids[white_idx],
                        black_player_id: player_ids[black_idx],
                        result: result.to_string(),
                    };
                    self.create_game(game).await?;
                }
            }
        }

        Ok(())
    }

    async fn populate_club_tournament(&self, tournament_id: i32) -> Result<(), PawnError> {
        let players = vec![
            Self::create_basic_player(tournament_id, "David Johnson", Some(2150), Some("GB")),
            Self::create_basic_player(tournament_id, "Sarah Mitchell", Some(2080), Some("GB")),
            Self::create_basic_player(tournament_id, "Robert Clarke", Some(2200), Some("GB")),
            Self::create_basic_player(tournament_id, "Emma Thompson", Some(1950), Some("GB")),
            Self::create_basic_player(tournament_id, "Michael Brown", Some(2120), Some("GB")),
            Self::create_basic_player(tournament_id, "Lisa Wilson", Some(1980), Some("GB")),
            Self::create_basic_player(tournament_id, "James Taylor", Some(2180), Some("GB")),
            Self::create_basic_player(tournament_id, "Helen Davis", Some(2040), Some("GB")),
            Self::create_basic_player(tournament_id, "Peter Evans", Some(2090), Some("GB")),
            Self::create_basic_player(tournament_id, "Rachel Green", Some(1920), Some("GB")),
            Self::create_basic_player(tournament_id, "Mark Anderson", Some(2160), Some("GB")),
            Self::create_basic_player(tournament_id, "Kate Murphy", Some(2000), Some("GB")),
            Self::create_basic_player(tournament_id, "Tom Williams", Some(2130), Some("GB")),
            Self::create_basic_player(tournament_id, "Anna Smith", Some(1960), Some("GB")),
        ];

        let mut player_ids = Vec::new();
        for player_data in players {
            let player = self.create_player(player_data).await?;
            player_ids.push(player.id);
        }

        // Create games for first 3 rounds of Swiss tournament
        for round in 1..=3 {
            for pair_idx in 0..(player_ids.len() / 2) {
                let white_idx = (pair_idx + round - 1) % player_ids.len();
                let black_idx = (pair_idx + round + 6) % player_ids.len();

                if white_idx != black_idx {
                    let result = match (round + pair_idx) % 4 {
                        0 => "1-0",
                        1 => "0-1",
                        2 => "1/2-1/2",
                        _ => "1/2-1/2",
                    };

                    let game = CreateGame {
                        tournament_id,
                        round_number: round as i32,
                        white_player_id: player_ids[white_idx],
                        black_player_id: player_ids[black_idx],
                        result: result.to_string(),
                    };
                    self.create_game(game).await?;
                }
            }
        }

        Ok(())
    }

    // NOT STARTED TOURNAMENTS
    async fn populate_gm_invitational(&self, tournament_id: i32) -> Result<(), PawnError> {
        let players = vec![
            Self::create_basic_player(tournament_id, "Sergey Karjakin", Some(2750), Some("RU")),
            Self::create_basic_player(
                tournament_id,
                "Maxime Vachier-Lagrave",
                Some(2760),
                Some("FR"),
            ),
            Self::create_basic_player(tournament_id, "Teimour Radjabov", Some(2740), Some("AZ")),
            Self::create_basic_player(
                tournament_id,
                "Shakhriyar Mamedyarov",
                Some(2745),
                Some("AZ"),
            ),
            Self::create_basic_player(tournament_id, "Alexander Grischuk", Some(2735), Some("RU")),
            Self::create_basic_player(tournament_id, "Pentala Harikrishna", Some(2730), Some("IN")),
            Self::create_basic_player(tournament_id, "Vladimir Fedoseev", Some(2720), Some("RU")),
            Self::create_basic_player(tournament_id, "Jan-Krzysztof Duda", Some(2725), Some("PL")),
            Self::create_basic_player(tournament_id, "Radoslaw Wojtaszek", Some(2710), Some("PL")),
            Self::create_basic_player(tournament_id, "Georg Meier", Some(2705), Some("DE")),
        ];

        for player_data in players {
            self.create_player(player_data).await?;
        }

        // No games yet - tournament not started
        Ok(())
    }

    async fn populate_junior_championship(&self, tournament_id: i32) -> Result<(), PawnError> {
        let players = vec![
            CreatePlayer {
                tournament_id,
                name: "Marc Andria Maurizzi".to_string(),
                rating: Some(2380),
                country_code: Some("FR".to_string()),
                title: Some("FM".to_string()),
                birth_date: Some("2007-03-15".to_string()),
                gender: Some("M".to_string()),
                email: Some("marc@example.com".to_string()),
                phone: None,
                club: Some("French Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Divya Deshmukh".to_string(),
                rating: Some(2360),
                country_code: Some("IN".to_string()),
                title: Some("WGM".to_string()),
                birth_date: Some("2005-01-02".to_string()),
                gender: Some("F".to_string()),
                email: Some("divya@example.com".to_string()),
                phone: None,
                club: Some("All India Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Faustino Oro".to_string(),
                rating: Some(2300),
                country_code: Some("AR".to_string()),
                title: Some("FM".to_string()),
                birth_date: Some("2009-10-14".to_string()),
                gender: Some("M".to_string()),
                email: Some("faustino@example.com".to_string()),
                phone: None,
                club: Some("Argentine Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Marsel Efroimski".to_string(),
                rating: Some(2320),
                country_code: Some("IS".to_string()),
                title: Some("FM".to_string()),
                birth_date: Some("2006-08-22".to_string()),
                gender: Some("M".to_string()),
                email: Some("marsel@example.com".to_string()),
                phone: None,
                club: Some("Icelandic Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Bodhana Sivanandan".to_string(),
                rating: Some(2290),
                country_code: Some("GB".to_string()),
                title: Some("WIM".to_string()),
                birth_date: Some("2009-01-28".to_string()),
                gender: Some("F".to_string()),
                email: Some("bodhana@example.com".to_string()),
                phone: Some("+44-555-0321".to_string()),
                club: Some("English Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Shreyas Royal".to_string(),
                rating: Some(2275),
                country_code: Some("GB".to_string()),
                title: Some("IM".to_string()),
                birth_date: Some("2005-06-11".to_string()),
                gender: Some("M".to_string()),
                email: Some("shreyas@example.com".to_string()),
                phone: Some("+44-555-0456".to_string()),
                club: Some("English Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Elisabeth Paehtz".to_string(),
                rating: Some(2410),
                country_code: Some("DE".to_string()),
                title: Some("IM".to_string()),
                birth_date: Some("1985-01-08".to_string()),
                gender: Some("F".to_string()),
                email: Some("elisabeth@example.com".to_string()),
                phone: None,
                club: Some("German Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Aydin Suleymanli".to_string(),
                rating: Some(2465),
                country_code: Some("AZ".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("2001-08-12".to_string()),
                gender: Some("M".to_string()),
                email: Some("aydin@example.com".to_string()),
                phone: None,
                club: Some("Azerbaijan Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Lei Tingjie".to_string(),
                rating: Some(2520),
                country_code: Some("CN".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("1997-02-13".to_string()),
                gender: Some("F".to_string()),
                email: Some("lei@example.com".to_string()),
                phone: None,
                club: Some("Chinese Chess Association".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Nodirbek Abdusattorov".to_string(),
                rating: Some(2680),
                country_code: Some("UZ".to_string()),
                title: Some("GM".to_string()),
                birth_date: Some("2004-09-11".to_string()),
                gender: Some("M".to_string()),
                email: Some("nodirbek@example.com".to_string()),
                phone: None,
                club: Some("Uzbekistan Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Bibisara Assaubayeva".to_string(),
                rating: Some(2450),
                country_code: Some("KZ".to_string()),
                title: Some("IM".to_string()),
                birth_date: Some("2004-01-11".to_string()),
                gender: Some("F".to_string()),
                email: Some("bibisara@example.com".to_string()),
                phone: None,
                club: Some("Kazakhstan Chess Federation".to_string()),
            },
            CreatePlayer {
                tournament_id,
                name: "Savitha Shri B".to_string(),
                rating: Some(2340),
                country_code: Some("IN".to_string()),
                title: Some("WIM".to_string()),
                birth_date: Some("2007-07-23".to_string()),
                gender: Some("F".to_string()),
                email: Some("savitha@example.com".to_string()),
                phone: None,
                club: Some("All India Chess Federation".to_string()),
            },
        ];

        for player_data in players {
            self.create_player(player_data).await?;
        }

        // No games yet - tournament not started
        Ok(())
    }

    pub async fn populate_mock_data(&self, tournament_id: i32) -> Result<(), PawnError> {
        // Legacy method - populate a single tournament with sample data
        self.populate_elite_championship(tournament_id).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pawn::domain::model::{Round, TournamentDetails};

    // Mock database for testing
    struct MockDb {
        tournaments: Vec<Tournament>,
        players: Vec<Player>,
        games: Vec<Game>,
        rounds: Vec<Round>,
        tournament_details: Vec<TournamentDetails>,
        player_results: Vec<PlayerResult>,
        game_results: Vec<GameResult>,
    }

    // Simplified trait for testing only the required methods
    trait TestDb: Send + Sync {
        async fn get_tournaments(&self) -> Result<Vec<Tournament>, sqlx::Error>;
        async fn get_tournament(&self, id: i32) -> Result<Tournament, sqlx::Error>;
        async fn create_tournament(&self, data: CreateTournament) -> Result<Tournament, sqlx::Error>;
        async fn get_tournament_details(&self, id: i32) -> Result<TournamentDetails, sqlx::Error>;
        async fn delete_tournament(&self, id: i32) -> Result<(), sqlx::Error>;
        async fn update_tournament_status(&self, id: i32, status: &str) -> Result<Tournament, sqlx::Error>;
        async fn get_players_by_tournament(&self, tournament_id: i32) -> Result<Vec<Player>, sqlx::Error>;
        async fn create_player(&self, data: CreatePlayer) -> Result<Player, sqlx::Error>;
        async fn get_games_by_tournament(&self, tournament_id: i32) -> Result<Vec<Game>, sqlx::Error>;
        async fn create_game(&self, data: CreateGame) -> Result<Game, sqlx::Error>;
        async fn get_player_results(&self, tournament_id: i32) -> Result<Vec<PlayerResult>, sqlx::Error>;
        async fn get_game_results(&self, tournament_id: i32) -> Result<Vec<GameResult>, sqlx::Error>;
        async fn get_rounds_by_tournament(&self, tournament_id: i32) -> Result<Vec<Round>, sqlx::Error>;
    }

    impl TestDb for MockDb {
        async fn get_tournaments(&self) -> Result<Vec<Tournament>, sqlx::Error> {
            Ok(self.tournaments.clone())
        }

        async fn get_tournament(&self, id: i32) -> Result<Tournament, sqlx::Error> {
            self.tournaments
                .iter()
                .find(|t| t.id == id)
                .cloned()
                .ok_or_else(|| sqlx::Error::RowNotFound)
        }

        async fn create_tournament(&self, data: CreateTournament) -> Result<Tournament, sqlx::Error> {
            Ok(Tournament {
                id: self.tournaments.len() as i32 + 1,
                name: data.name,
                location: data.location,
                date: data.date,
                time_type: data.time_type,
                tournament_type: data.tournament_type,
                player_count: data.player_count,
                rounds_played: data.rounds_played,
                total_rounds: data.total_rounds,
                country_code: data.country_code,
                status: "created".to_string(),
                created_at: "2024-01-01T00:00:00Z".to_string(),
                updated_at: Some("2024-01-01T00:00:00Z".to_string()),
            })
        }

        async fn get_tournament_details(&self, id: i32) -> Result<TournamentDetails, sqlx::Error> {
            self.tournament_details
                .iter()
                .find(|td| td.tournament.id == id)
                .cloned()
                .ok_or_else(|| sqlx::Error::RowNotFound)
        }

        async fn delete_tournament(&self, _id: i32) -> Result<(), sqlx::Error> {
            Ok(())
        }

        async fn update_tournament_status(&self, id: i32, status: &str) -> Result<Tournament, sqlx::Error> {
            let mut tournament = self.get_tournament(id).await?;
            tournament.status = status.to_string();
            Ok(tournament)
        }

        async fn get_players_by_tournament(&self, tournament_id: i32) -> Result<Vec<Player>, sqlx::Error> {
            Ok(self.players.iter()
                .filter(|p| p.tournament_id == tournament_id)
                .cloned()
                .collect())
        }

        async fn create_player(&self, data: CreatePlayer) -> Result<Player, sqlx::Error> {
            Ok(Player {
                id: self.players.len() as i32 + 1,
                tournament_id: data.tournament_id,
                name: data.name,
                rating: data.rating,
                country_code: data.country_code,
                title: data.title,
                birth_date: data.birth_date,
                gender: data.gender,
                email: data.email,
                phone: data.phone,
                club: data.club,
                status: "active".to_string(),
                seed_number: None,
                pairing_number: None,
                initial_rating: None,
                created_at: "2024-01-01T00:00:00Z".to_string(),
                updated_at: Some("2024-01-01T00:00:00Z".to_string()),
            })
        }

        async fn get_games_by_tournament(&self, tournament_id: i32) -> Result<Vec<Game>, sqlx::Error> {
            Ok(self.games.iter()
                .filter(|g| g.tournament_id == tournament_id)
                .cloned()
                .collect())
        }

        async fn create_game(&self, data: CreateGame) -> Result<Game, sqlx::Error> {
            Ok(Game {
                id: self.games.len() as i32 + 1,
                tournament_id: data.tournament_id,
                round_number: data.round_number,
                white_player_id: data.white_player_id,
                black_player_id: data.black_player_id,
                result: data.result,
                result_type: None,
                result_reason: None,
                arbiter_notes: None,
                created_at: "2024-01-01T00:00:00Z".to_string(),
                last_updated: Some("2024-01-01T00:00:00Z".to_string()),
                approved_by: None,
            })
        }

        async fn get_player_results(&self, tournament_id: i32) -> Result<Vec<PlayerResult>, sqlx::Error> {
            Ok(self.player_results.iter()
                .filter(|pr| pr.tournament_id == tournament_id)
                .cloned()
                .collect())
        }

        async fn get_game_results(&self, tournament_id: i32) -> Result<Vec<GameResult>, sqlx::Error> {
            Ok(self.game_results.iter()
                .filter(|gr| gr.game.tournament_id == tournament_id)
                .cloned()
                .collect())
        }

        async fn get_rounds_by_tournament(&self, tournament_id: i32) -> Result<Vec<Round>, sqlx::Error> {
            Ok(self.rounds.iter()
                .filter(|r| r.tournament_id == tournament_id)
                .cloned()
                .collect())
        }
    }

    // Test service that uses the simplified trait
    struct TestTournamentService<D> {
        db: Arc<D>,
    }

    impl<D: TestDb> TestTournamentService<D> {
        fn new(db: Arc<D>) -> Self {
            Self { db }
        }

        async fn get_tournaments(&self) -> Result<Vec<Tournament>, PawnError> {
            self.db.get_tournaments().await.map_err(PawnError::Database)
        }

        async fn get_tournament(&self, id: i32) -> Result<Tournament, PawnError> {
            self.db.get_tournament(id).await.map_err(PawnError::Database)
        }

        async fn create_tournament(&self, data: CreateTournament) -> Result<Tournament, PawnError> {
            // Validate tournament data
            if data.name.trim().is_empty() {
                return Err(PawnError::InvalidInput(
                    "Tournament name cannot be empty".into(),
                ));
            }
            if data.player_count < 0 {
                return Err(PawnError::InvalidInput(
                    "Player count cannot be negative".into(),
                ));
            }
            if data.total_rounds <= 0 {
                return Err(PawnError::InvalidInput(
                    "Total rounds must be positive".into(),
                ));
            }
            if data.rounds_played < 0 {
                return Err(PawnError::InvalidInput(
                    "Rounds played cannot be negative".into(),
                ));
            }
            if data.rounds_played > data.total_rounds {
                return Err(PawnError::InvalidInput(
                    "Rounds played cannot exceed total rounds".into(),
                ));
            }

            self.db.create_tournament(data).await.map_err(PawnError::Database)
        }

        async fn get_tournament_details(&self, id: i32) -> Result<TournamentDetails, PawnError> {
            self.db.get_tournament_details(id).await.map_err(PawnError::Database)
        }

        async fn delete_tournament(&self, id: i32) -> Result<(), PawnError> {
            self.db.delete_tournament(id).await.map_err(PawnError::Database)
        }

        async fn update_tournament_status(&self, data: UpdateTournamentStatus) -> Result<Tournament, PawnError> {
            // Validate tournament status
            let valid_statuses = vec!["created", "ongoing", "paused", "completed", "cancelled"];
            if !valid_statuses.contains(&data.status.as_str()) {
                return Err(PawnError::InvalidInput(format!(
                    "Invalid tournament status: {}. Valid statuses are: {}",
                    data.status,
                    valid_statuses.join(", ")
                )));
            }

            // Special validation for completing a tournament
            if data.status == "completed" {
                // Check if all rounds are completed
                let rounds = self.db.get_rounds_by_tournament(data.tournament_id).await.map_err(PawnError::Database)?;
                let tournament = self.db.get_tournament(data.tournament_id).await.map_err(PawnError::Database)?;

                let completed_rounds = rounds.iter().filter(|r| r.status == "completed").count();
                if completed_rounds < tournament.total_rounds as usize {
                    return Err(PawnError::InvalidInput(format!(
                        "TOURNAMENT_INCOMPLETE_ROUNDS_ERROR::{}::{}",
                        tournament.total_rounds - completed_rounds as i32,
                        tournament.total_rounds
                    )));
                }

                // Check if all games have results
                let games = self.db.get_games_by_tournament(data.tournament_id).await.map_err(PawnError::Database)?;
                let incomplete_games = games.iter().filter(|game| game.result == "*").count();
                if incomplete_games > 0 {
                    return Err(PawnError::InvalidInput(format!(
                        "TOURNAMENT_INCOMPLETE_GAMES_ERROR::{incomplete_games}"
                    )));
                }
            }

            self.db.update_tournament_status(data.tournament_id, &data.status).await.map_err(PawnError::Database)
        }

        async fn get_players_by_tournament(&self, tournament_id: i32) -> Result<Vec<Player>, PawnError> {
            self.db.get_players_by_tournament(tournament_id).await.map_err(PawnError::Database)
        }

        async fn create_player(&self, data: CreatePlayer) -> Result<Player, PawnError> {
            // Validate player data
            if data.name.trim().is_empty() {
                return Err(PawnError::InvalidInput(
                    "Player name cannot be empty".into(),
                ));
            }
            if let Some(rating) = data.rating {
                if !(0..=4000).contains(&rating) {
                    return Err(PawnError::InvalidInput(
                        "Rating must be between 0 and 4000".into(),
                    ));
                }
            }

            self.db.create_player(data).await.map_err(PawnError::Database)
        }

        async fn get_games_by_tournament(&self, tournament_id: i32) -> Result<Vec<Game>, PawnError> {
            self.db.get_games_by_tournament(tournament_id).await.map_err(PawnError::Database)
        }

        async fn create_game(&self, data: CreateGame) -> Result<Game, PawnError> {
            // Validate game data
            if data.white_player_id == data.black_player_id {
                return Err(PawnError::InvalidInput(
                    "Players cannot play against themselves".into(),
                ));
            }
            if data.round_number <= 0 {
                return Err(PawnError::InvalidInput(
                    "Round number must be positive".into(),
                ));
            }
            if !["1-0", "0-1", "1/2-1/2", "*"].contains(&data.result.as_str()) {
                return Err(PawnError::InvalidInput("Invalid game result".into()));
            }

            self.db.create_game(data).await.map_err(PawnError::Database)
        }

        async fn get_player_results(&self, tournament_id: i32) -> Result<Vec<PlayerResult>, PawnError> {
            self.db.get_player_results(tournament_id).await.map_err(PawnError::Database)
        }

        async fn get_game_results(&self, tournament_id: i32) -> Result<Vec<GameResult>, PawnError> {
            self.db.get_game_results(tournament_id).await.map_err(PawnError::Database)
        }
    }

    fn create_test_tournament(id: i32, name: &str) -> Tournament {
        Tournament {
            id,
            name: name.to_string(),
            location: "Test Location".to_string(),
            date: "2024-01-01".to_string(),
            time_type: "classical".to_string(),
            tournament_type: Some("swiss".to_string()),
            player_count: 8,
            rounds_played: 0,
            total_rounds: 7,
            country_code: "US".to_string(),
            status: "created".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: Some("2024-01-01T00:00:00Z".to_string()),
        }
    }

    fn create_test_player(id: i32, tournament_id: i32, name: &str, rating: Option<i32>) -> Player {
        Player {
            id,
            tournament_id,
            name: name.to_string(),
            rating,
            country_code: Some("US".to_string()),
            title: Some("GM".to_string()),
            birth_date: Some("1990-01-01".to_string()),
            gender: Some("M".to_string()),
            email: None,
            phone: None,
            club: None,
            status: "active".to_string(),
            seed_number: None,
            pairing_number: None,
            initial_rating: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: Some("2024-01-01T00:00:00Z".to_string()),
        }
    }

    fn create_test_game(id: i32, tournament_id: i32, round_number: i32, white_id: i32, black_id: i32, result: &str) -> Game {
        Game {
            id,
            tournament_id,
            round_number,
            white_player_id: white_id,
            black_player_id: black_id,
            result: result.to_string(),
            result_type: None,
            result_reason: None,
            arbiter_notes: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            last_updated: Some("2024-01-01T00:00:00Z".to_string()),
            approved_by: None,
        }
    }

    fn create_test_round(id: i32, tournament_id: i32, round_number: i32, status: &str) -> Round {
        Round {
            id,
            tournament_id,
            round_number,
            status: status.to_string(),
            start_time: Some("2024-01-01T10:00:00Z".to_string()),
            end_time: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        }
    }

    // Tournament CRUD Tests
    #[tokio::test]
    async fn test_get_tournaments_success() {
        let tournaments = vec![
            create_test_tournament(1, "Tournament A"),
            create_test_tournament(2, "Tournament B"),
        ];

        let mock_db = MockDb {
            tournaments: tournaments.clone(),
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let result = service.get_tournaments().await;

        assert!(result.is_ok());
        let returned_tournaments = result.unwrap();
        assert_eq!(returned_tournaments.len(), 2);
        assert_eq!(returned_tournaments[0].name, "Tournament A");
        assert_eq!(returned_tournaments[1].name, "Tournament B");
    }

    #[tokio::test]
    async fn test_get_tournament_success() {
        let tournament = create_test_tournament(1, "Test Tournament");
        let mock_db = MockDb {
            tournaments: vec![tournament.clone()],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let result = service.get_tournament(1).await;

        assert!(result.is_ok());
        let returned_tournament = result.unwrap();
        assert_eq!(returned_tournament.id, 1);
        assert_eq!(returned_tournament.name, "Test Tournament");
    }

    #[tokio::test]
    async fn test_get_tournament_not_found() {
        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let result = service.get_tournament(999).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            PawnError::Database(_) => (), // Expected
            _ => panic!("Expected Database error"),
        }
    }

    #[tokio::test]
    async fn test_create_tournament_success() {
        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let tournament_data = CreateTournament {
            name: "New Tournament".to_string(),
            location: "Test Location".to_string(),
            date: "2024-01-01".to_string(),
            time_type: "classical".to_string(),
            tournament_type: Some("swiss".to_string()),
            player_count: 8,
            rounds_played: 0,
            total_rounds: 7,
            country_code: "US".to_string(),
        };

        let result = service.create_tournament(tournament_data).await;

        assert!(result.is_ok());
        let tournament = result.unwrap();
        assert_eq!(tournament.name, "New Tournament");
        assert_eq!(tournament.status, "created");
    }

    #[tokio::test]
    async fn test_create_tournament_empty_name() {
        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let tournament_data = CreateTournament {
            name: "   ".to_string(), // Empty name
            location: "Test Location".to_string(),
            date: "2024-01-01".to_string(),
            time_type: "classical".to_string(),
            tournament_type: Some("swiss".to_string()),
            player_count: 8,
            rounds_played: 0,
            total_rounds: 7,
            country_code: "US".to_string(),
        };

        let result = service.create_tournament(tournament_data).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            PawnError::InvalidInput(msg) => assert_eq!(msg, "Tournament name cannot be empty"),
            _ => panic!("Expected InvalidInput error"),
        }
    }

    #[tokio::test]
    async fn test_create_tournament_negative_player_count() {
        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let tournament_data = CreateTournament {
            name: "Test Tournament".to_string(),
            location: "Test Location".to_string(),
            date: "2024-01-01".to_string(),
            time_type: "classical".to_string(),
            tournament_type: Some("swiss".to_string()),
            player_count: -1, // Negative count
            rounds_played: 0,
            total_rounds: 7,
            country_code: "US".to_string(),
        };

        let result = service.create_tournament(tournament_data).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            PawnError::InvalidInput(msg) => assert_eq!(msg, "Player count cannot be negative"),
            _ => panic!("Expected InvalidInput error"),
        }
    }

    #[tokio::test]
    async fn test_create_tournament_invalid_total_rounds() {
        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let tournament_data = CreateTournament {
            name: "Test Tournament".to_string(),
            location: "Test Location".to_string(),
            date: "2024-01-01".to_string(),
            time_type: "classical".to_string(),
            tournament_type: Some("swiss".to_string()),
            player_count: 8,
            rounds_played: 0,
            total_rounds: 0, // Invalid total rounds
            country_code: "US".to_string(),
        };

        let result = service.create_tournament(tournament_data).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            PawnError::InvalidInput(msg) => assert_eq!(msg, "Total rounds must be positive"),
            _ => panic!("Expected InvalidInput error"),
        }
    }

    #[tokio::test]
    async fn test_create_tournament_rounds_played_exceeds_total() {
        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let tournament_data = CreateTournament {
            name: "Test Tournament".to_string(),
            location: "Test Location".to_string(),
            date: "2024-01-01".to_string(),
            time_type: "classical".to_string(),
            tournament_type: Some("swiss".to_string()),
            player_count: 8,
            rounds_played: 10, // Exceeds total
            total_rounds: 7,
            country_code: "US".to_string(),
        };

        let result = service.create_tournament(tournament_data).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            PawnError::InvalidInput(msg) => assert_eq!(msg, "Rounds played cannot exceed total rounds"),
            _ => panic!("Expected InvalidInput error"),
        }
    }

    #[tokio::test]
    async fn test_delete_tournament_success() {
        let mock_db = MockDb {
            tournaments: vec![create_test_tournament(1, "Test Tournament")],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let result = service.delete_tournament(1).await;

        assert!(result.is_ok());
    }

    // Tournament Status Update Tests
    #[tokio::test]
    async fn test_update_tournament_status_success() {
        let tournament = create_test_tournament(1, "Test Tournament");
        let mock_db = MockDb {
            tournaments: vec![tournament],
            players: vec![],
            games: vec![],
            rounds: vec![
                create_test_round(1, 1, 1, "completed"),
                create_test_round(2, 1, 2, "completed"),
            ],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let update_data = UpdateTournamentStatus {
            tournament_id: 1,
            status: "ongoing".to_string(),
        };

        let result = service.update_tournament_status(update_data).await;

        assert!(result.is_ok());
        let updated_tournament = result.unwrap();
        assert_eq!(updated_tournament.status, "ongoing");
    }

    #[tokio::test]
    async fn test_update_tournament_status_invalid_status() {
        let tournament = create_test_tournament(1, "Test Tournament");
        let mock_db = MockDb {
            tournaments: vec![tournament],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let update_data = UpdateTournamentStatus {
            tournament_id: 1,
            status: "invalid_status".to_string(),
        };

        let result = service.update_tournament_status(update_data).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            PawnError::InvalidInput(msg) => assert!(msg.contains("Invalid tournament status")),
            _ => panic!("Expected InvalidInput error"),
        }
    }

    #[tokio::test]
    async fn test_update_tournament_status_complete_with_incomplete_rounds() {
        let mut tournament = create_test_tournament(1, "Test Tournament");
        tournament.total_rounds = 3;
        
        let mock_db = MockDb {
            tournaments: vec![tournament],
            players: vec![],
            games: vec![],
            rounds: vec![
                create_test_round(1, 1, 1, "completed"),
                create_test_round(2, 1, 2, "ongoing"), // Incomplete round
            ],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let update_data = UpdateTournamentStatus {
            tournament_id: 1,
            status: "completed".to_string(),
        };

        let result = service.update_tournament_status(update_data).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            PawnError::InvalidInput(msg) => assert!(msg.contains("TOURNAMENT_INCOMPLETE_ROUNDS_ERROR")),
            _ => panic!("Expected InvalidInput error"),
        }
    }

    #[tokio::test]
    async fn test_update_tournament_status_complete_with_incomplete_games() {
        let tournament = create_test_tournament(1, "Test Tournament");
        let mock_db = MockDb {
            tournaments: vec![tournament],
            players: vec![],
            games: vec![
                create_test_game(1, 1, 1, 1, 2, "1-0"),
                create_test_game(2, 1, 1, 3, 4, "*"), // Incomplete game
            ],
            rounds: vec![
                create_test_round(1, 1, 1, "completed"),
            ],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let update_data = UpdateTournamentStatus {
            tournament_id: 1,
            status: "completed".to_string(),
        };

        let result = service.update_tournament_status(update_data).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            PawnError::InvalidInput(msg) => assert!(msg.contains("TOURNAMENT_INCOMPLETE_GAMES_ERROR")),
            _ => panic!("Expected InvalidInput error"),
        }
    }

    // Player Operations Tests
    #[tokio::test]
    async fn test_get_players_by_tournament_success() {
        let players = vec![
            create_test_player(1, 1, "Player 1", Some(2000)),
            create_test_player(2, 1, "Player 2", Some(1950)),
            create_test_player(3, 2, "Player 3", Some(1900)), // Different tournament
        ];

        let mock_db = MockDb {
            tournaments: vec![],
            players,
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let result = service.get_players_by_tournament(1).await;

        assert!(result.is_ok());
        let tournament_players = result.unwrap();
        assert_eq!(tournament_players.len(), 2);
        assert_eq!(tournament_players[0].tournament_id, 1);
        assert_eq!(tournament_players[1].tournament_id, 1);
    }

    #[tokio::test]
    async fn test_create_player_success() {
        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let player_data = CreatePlayer {
            tournament_id: 1,
            name: "Test Player".to_string(),
            rating: Some(2000),
            country_code: Some("US".to_string()),
            title: Some("GM".to_string()),
            birth_date: Some("1990-01-01".to_string()),
            gender: Some("M".to_string()),
            email: Some("test@example.com".to_string()),
            phone: None,
            club: None,
        };

        let result = service.create_player(player_data).await;

        assert!(result.is_ok());
        let player = result.unwrap();
        assert_eq!(player.name, "Test Player");
        assert_eq!(player.rating, Some(2000));
    }

    #[tokio::test]
    async fn test_create_player_empty_name() {
        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let player_data = CreatePlayer {
            tournament_id: 1,
            name: "   ".to_string(), // Empty name
            rating: Some(2000),
            country_code: Some("US".to_string()),
            title: Some("GM".to_string()),
            birth_date: Some("1990-01-01".to_string()),
            gender: Some("M".to_string()),
            email: None,
            phone: None,
            club: None,
        };

        let result = service.create_player(player_data).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            PawnError::InvalidInput(msg) => assert_eq!(msg, "Player name cannot be empty"),
            _ => panic!("Expected InvalidInput error"),
        }
    }

    #[tokio::test]
    async fn test_create_player_invalid_rating_low() {
        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let player_data = CreatePlayer {
            tournament_id: 1,
            name: "Test Player".to_string(),
            rating: Some(-100), // Invalid rating
            country_code: Some("US".to_string()),
            title: Some("GM".to_string()),
            birth_date: Some("1990-01-01".to_string()),
            gender: Some("M".to_string()),
            email: None,
            phone: None,
            club: None,
        };

        let result = service.create_player(player_data).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            PawnError::InvalidInput(msg) => assert_eq!(msg, "Rating must be between 0 and 4000"),
            _ => panic!("Expected InvalidInput error"),
        }
    }

    #[tokio::test]
    async fn test_create_player_invalid_rating_high() {
        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let player_data = CreatePlayer {
            tournament_id: 1,
            name: "Test Player".to_string(),
            rating: Some(5000), // Invalid rating
            country_code: Some("US".to_string()),
            title: Some("GM".to_string()),
            birth_date: Some("1990-01-01".to_string()),
            gender: Some("M".to_string()),
            email: None,
            phone: None,
            club: None,
        };

        let result = service.create_player(player_data).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            PawnError::InvalidInput(msg) => assert_eq!(msg, "Rating must be between 0 and 4000"),
            _ => panic!("Expected InvalidInput error"),
        }
    }

    // Game Operations Tests
    #[tokio::test]
    async fn test_get_games_by_tournament_success() {
        let games = vec![
            create_test_game(1, 1, 1, 1, 2, "1-0"),
            create_test_game(2, 1, 1, 3, 4, "0-1"),
            create_test_game(3, 2, 1, 5, 6, "1/2-1/2"), // Different tournament
        ];

        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games,
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let result = service.get_games_by_tournament(1).await;

        assert!(result.is_ok());
        let tournament_games = result.unwrap();
        assert_eq!(tournament_games.len(), 2);
        assert_eq!(tournament_games[0].tournament_id, 1);
        assert_eq!(tournament_games[1].tournament_id, 1);
    }

    #[tokio::test]
    async fn test_create_game_success() {
        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let game_data = CreateGame {
            tournament_id: 1,
            round_number: 1,
            white_player_id: 1,
            black_player_id: 2,
            result: "1-0".to_string(),
        };

        let result = service.create_game(game_data).await;

        assert!(result.is_ok());
        let game = result.unwrap();
        assert_eq!(game.tournament_id, 1);
        assert_eq!(game.round_number, 1);
        assert_eq!(game.white_player_id, 1);
        assert_eq!(game.black_player_id, 2);
        assert_eq!(game.result, "1-0");
    }

    #[tokio::test]
    async fn test_create_game_same_player() {
        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let game_data = CreateGame {
            tournament_id: 1,
            round_number: 1,
            white_player_id: 1,
            black_player_id: 1, // Same player
            result: "1-0".to_string(),
        };

        let result = service.create_game(game_data).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            PawnError::InvalidInput(msg) => assert_eq!(msg, "Players cannot play against themselves"),
            _ => panic!("Expected InvalidInput error"),
        }
    }

    #[tokio::test]
    async fn test_create_game_invalid_round_number() {
        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let game_data = CreateGame {
            tournament_id: 1,
            round_number: 0, // Invalid round number
            white_player_id: 1,
            black_player_id: 2,
            result: "1-0".to_string(),
        };

        let result = service.create_game(game_data).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            PawnError::InvalidInput(msg) => assert_eq!(msg, "Round number must be positive"),
            _ => panic!("Expected InvalidInput error"),
        }
    }

    #[tokio::test]
    async fn test_create_game_invalid_result() {
        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let game_data = CreateGame {
            tournament_id: 1,
            round_number: 1,
            white_player_id: 1,
            black_player_id: 2,
            result: "2-0".to_string(), // Invalid result
        };

        let result = service.create_game(game_data).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            PawnError::InvalidInput(msg) => assert_eq!(msg, "Invalid game result"),
            _ => panic!("Expected InvalidInput error"),
        }
    }

    // Valid game results tests
    #[tokio::test]
    async fn test_create_game_valid_results() {
        let valid_results = vec!["1-0", "0-1", "1/2-1/2", "*"];
        
        for result in valid_results {
            let mock_db = MockDb {
                tournaments: vec![],
                players: vec![],
                games: vec![],
                rounds: vec![],
                tournament_details: vec![],
                player_results: vec![],
                game_results: vec![],
            };

            let service = TestTournamentService::new(Arc::new(mock_db));
            let game_data = CreateGame {
                tournament_id: 1,
                round_number: 1,
                white_player_id: 1,
                black_player_id: 2,
                result: result.to_string(),
            };

            let game_result = service.create_game(game_data).await;
            assert!(game_result.is_ok(), "Result '{}' should be valid", result);
            assert_eq!(game_result.unwrap().result, result);
        }
    }

    // Statistics Tests
    #[tokio::test]
    async fn test_get_player_results_success() {
        let player_results = vec![
            PlayerResult {
                tournament_id: 1,
                player_id: 1,
                player_name: "Player 1".to_string(),
                total_score: 5.0,
                performance_rating: Some(2100),
                buchholz_score: Some(18.5),
                sonneborn_berger_score: Some(12.25),
                games_played: 7,
                wins: 5,
                draws: 0,
                losses: 2,
            },
        ];

        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: player_results.clone(),
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let result = service.get_player_results(1).await;

        assert!(result.is_ok());
        let results = result.unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].player_name, "Player 1");
        assert_eq!(results[0].total_score, 5.0);
    }

    #[tokio::test]
    async fn test_get_game_results_success() {
        let player1 = create_test_player(1, 1, "Player 1", Some(2000));
        let player2 = create_test_player(2, 1, "Player 2", Some(1950));
        let game = create_test_game(1, 1, 1, 1, 2, "1-0");

        let game_results = vec![
            GameResult {
                game: game.clone(),
                white_player: player1.clone(),
                black_player: player2.clone(),
            },
        ];

        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: game_results.clone(),
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let result = service.get_game_results(1).await;

        assert!(result.is_ok());
        let results = result.unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].game.result, "1-0");
        assert_eq!(results[0].white_player.name, "Player 1");
        assert_eq!(results[0].black_player.name, "Player 2");
    }

    // Helper function test
    #[test]
    fn test_create_basic_player() {
        let player = TournamentService::<MockDb>::create_basic_player(
            1,
            "Test Player",
            Some(2000),
            Some("US"),
        );

        assert_eq!(player.tournament_id, 1);
        assert_eq!(player.name, "Test Player");
        assert_eq!(player.rating, Some(2000));
        assert_eq!(player.country_code, Some("US".to_string()));
        assert_eq!(player.title, Some("GM".to_string()));
        assert_eq!(player.birth_date, Some("1990-01-01".to_string()));
        assert_eq!(player.gender, Some("M".to_string()));
        assert_eq!(player.email, None);
        assert_eq!(player.phone, None);
        assert_eq!(player.club, None);
    }

    // Edge cases and boundary tests
    #[tokio::test]
    async fn test_create_player_valid_rating_boundaries() {
        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));

        // Test minimum valid rating
        let player_data = CreatePlayer {
            tournament_id: 1,
            name: "Test Player".to_string(),
            rating: Some(0),
            country_code: Some("US".to_string()),
            title: Some("GM".to_string()),
            birth_date: Some("1990-01-01".to_string()),
            gender: Some("M".to_string()),
            email: None,
            phone: None,
            club: None,
        };

        let result = service.create_player(player_data).await;
        assert!(result.is_ok());

        // Test maximum valid rating
        let mock_db2 = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service2 = TestTournamentService::new(Arc::new(mock_db2));
        let player_data2 = CreatePlayer {
            tournament_id: 1,
            name: "Test Player 2".to_string(),
            rating: Some(4000),
            country_code: Some("US".to_string()),
            title: Some("GM".to_string()),
            birth_date: Some("1990-01-01".to_string()),
            gender: Some("M".to_string()),
            email: None,
            phone: None,
            club: None,
        };

        let result2 = service2.create_player(player_data2).await;
        assert!(result2.is_ok());
    }

    #[tokio::test]
    async fn test_create_player_no_rating() {
        let mock_db = MockDb {
            tournaments: vec![],
            players: vec![],
            games: vec![],
            rounds: vec![],
            tournament_details: vec![],
            player_results: vec![],
            game_results: vec![],
        };

        let service = TestTournamentService::new(Arc::new(mock_db));
        let player_data = CreatePlayer {
            tournament_id: 1,
            name: "Test Player".to_string(),
            rating: None, // No rating
            country_code: Some("US".to_string()),
            title: Some("GM".to_string()),
            birth_date: Some("1990-01-01".to_string()),
            gender: Some("M".to_string()),
            email: None,
            phone: None,
            club: None,
        };

        let result = service.create_player(player_data).await;
        assert!(result.is_ok());
        let player = result.unwrap();
        assert_eq!(player.rating, None);
    }
}
