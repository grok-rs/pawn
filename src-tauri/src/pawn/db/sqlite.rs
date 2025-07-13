use sqlx::SqlitePool;
use tracing::instrument;

use super::*;
use crate::pawn::domain::tiebreak::TiebreakType;

pub struct SqliteDb {
    pool: SqlitePool,
}

impl SqliteDb {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl Db for SqliteDb {
    #[instrument(ret, skip(self))]
    async fn get_tournaments(&self) -> Result<Vec<Tournament>, sqlx::Error> {
        let tournaments = sqlx::query_as("SELECT * FROM tournaments ORDER BY date DESC")
            .fetch_all(&self.pool)
            .await?;

        Ok(tournaments)
    }

    #[instrument(ret, skip(self))]
    async fn get_tournament(&self, id: i32) -> Result<Tournament, sqlx::Error> {
        let tournament = sqlx::query_as("SELECT * FROM tournaments WHERE id = ?")
            .bind(id)
            .fetch_one(&self.pool)
            .await?;

        Ok(tournament)
    }

    #[instrument(ret, skip(self))]
    async fn create_tournament(&self, data: CreateTournament) -> Result<Tournament, sqlx::Error> {
        // Validation
        if data.player_count < 0 {
            return Err(sqlx::Error::Protocol(
                "player_count cannot be negative".into(),
            ));
        }
        if data.total_rounds < data.rounds_played {
            return Err(sqlx::Error::Protocol(
                "total_rounds cannot be less than rounds_played".into(),
            ));
        }

        // Insert into database and return the created tournament
        let tournament: Tournament = sqlx::query_as(
            "INSERT INTO tournaments (name, location, date, time_type, player_count, rounds_played, total_rounds, country_code)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING *"
        )
        .bind(&data.name)
        .bind(&data.location)
        .bind(&data.date)
        .bind(&data.time_type)
        .bind(data.player_count)
        .bind(data.rounds_played)
        .bind(data.total_rounds)
        .bind(&data.country_code)
        .fetch_one(&self.pool)
        .await?;

        Ok(tournament)
    }

    #[instrument(ret, skip(self))]
    async fn get_tournament_details(&self, id: i32) -> Result<TournamentDetails, sqlx::Error> {
        let tournament = self.get_tournament(id).await?;
        let players = self.get_player_results(id).await?;
        let games = self.get_game_results(id).await?;
        
        Ok(TournamentDetails {
            tournament,
            players,
            games,
        })
    }

    #[instrument(ret, skip(self))]
    async fn delete_tournament(&self, id: i32) -> Result<(), sqlx::Error> {
        // Start a transaction to ensure all deletions are atomic
        let mut tx = self.pool.begin().await?;

        // Delete tournament settings first (if any)
        sqlx::query("DELETE FROM tournament_settings WHERE tournament_id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        // Delete all games for this tournament
        sqlx::query("DELETE FROM games WHERE tournament_id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        // Delete all players for this tournament
        sqlx::query("DELETE FROM players WHERE tournament_id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        // Finally delete the tournament itself
        sqlx::query("DELETE FROM tournaments WHERE id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        // Commit the transaction
        tx.commit().await?;

        Ok(())
    }

    #[instrument(ret, skip(self))]
    async fn get_players_by_tournament(&self, tournament_id: i32) -> Result<Vec<Player>, sqlx::Error> {
        let players = sqlx::query_as(
            "SELECT * FROM players WHERE tournament_id = ? ORDER BY name"
        )
        .bind(tournament_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(players)
    }

    #[instrument(ret, skip(self))]
    async fn create_player(&self, data: CreatePlayer) -> Result<Player, sqlx::Error> {
        let player: Player = sqlx::query_as(
            "INSERT INTO players (tournament_id, name, rating, country_code)
             VALUES (?, ?, ?, ?)
             RETURNING *"
        )
        .bind(data.tournament_id)
        .bind(&data.name)
        .bind(data.rating)
        .bind(data.country_code)
        .fetch_one(&self.pool)
        .await?;

        Ok(player)
    }

    #[instrument(ret, skip(self))]
    async fn get_games_by_tournament(&self, tournament_id: i32) -> Result<Vec<Game>, sqlx::Error> {
        let games = sqlx::query_as(
            "SELECT * FROM games WHERE tournament_id = ? ORDER BY round_number, id"
        )
        .bind(tournament_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(games)
    }

    #[instrument(ret, skip(self))]
    async fn create_game(&self, data: CreateGame) -> Result<Game, sqlx::Error> {
        let game: Game = sqlx::query_as(
            "INSERT INTO games (tournament_id, round_number, white_player_id, black_player_id, result)
             VALUES (?, ?, ?, ?, ?)
             RETURNING *"
        )
        .bind(data.tournament_id)
        .bind(data.round_number)
        .bind(data.white_player_id)
        .bind(data.black_player_id)
        .bind(&data.result)
        .fetch_one(&self.pool)
        .await?;

        Ok(game)
    }

    #[instrument(ret, skip(self))]
    async fn get_player_results(&self, tournament_id: i32) -> Result<Vec<PlayerResult>, sqlx::Error> {
        let players = self.get_players_by_tournament(tournament_id).await?;
        let mut results = Vec::new();

        for player in players {
            let stats = sqlx::query_as::<_, (i32, i32, i32, i32)>(
                "SELECT 
                    COUNT(*) as games_played,
                    SUM(CASE 
                        WHEN (white_player_id = ? AND result = '1-0') OR (black_player_id = ? AND result = '0-1') THEN 1
                        ELSE 0
                    END) as wins,
                    SUM(CASE 
                        WHEN result = '1/2-1/2' THEN 1
                        ELSE 0
                    END) as draws,
                    SUM(CASE 
                        WHEN (white_player_id = ? AND result = '0-1') OR (black_player_id = ? AND result = '1-0') THEN 1
                        ELSE 0
                    END) as losses
                FROM games 
                WHERE tournament_id = ? AND (white_player_id = ? OR black_player_id = ?)"
            )
            .bind(player.id)
            .bind(player.id)
            .bind(player.id)
            .bind(player.id)
            .bind(tournament_id)
            .bind(player.id)
            .bind(player.id)
            .fetch_one(&self.pool)
            .await?;

            let points = stats.1 as f32 + (stats.2 as f32 * 0.5);
            
            results.push(PlayerResult {
                player,
                points,
                games_played: stats.0,
                wins: stats.1,
                draws: stats.2,
                losses: stats.3,
            });
        }

        // Sort by points (descending), then by name
        results.sort_by(|a, b| {
            b.points.partial_cmp(&a.points).unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| a.player.name.cmp(&b.player.name))
        });

        Ok(results)
    }

    #[instrument(ret, skip(self))]
    async fn get_game_results(&self, tournament_id: i32) -> Result<Vec<GameResult>, sqlx::Error> {
        let games = self.get_games_by_tournament(tournament_id).await?;
        let mut results = Vec::new();

        for game in games {
            let white_player = sqlx::query_as::<_, Player>(
                "SELECT * FROM players WHERE id = ?"
            )
            .bind(game.white_player_id)
            .fetch_one(&self.pool)
            .await?;

            let black_player = sqlx::query_as::<_, Player>(
                "SELECT * FROM players WHERE id = ?"
            )
            .bind(game.black_player_id)
            .fetch_one(&self.pool)
            .await?;

            results.push(GameResult {
                game,
                white_player,
                black_player,
            });
        }

        Ok(results)
    }

    #[instrument(ret, skip(self))]
    async fn get_tournament_settings(&self, tournament_id: i32) -> Result<Option<TournamentTiebreakConfig>, sqlx::Error> {
        #[derive(sqlx::FromRow)]
        struct TournamentSettingsRow {
            tiebreak_order: String,
            use_fide_defaults: bool,
        }

        let result: Option<TournamentSettingsRow> = sqlx::query_as(
            r#"
            SELECT tiebreak_order, use_fide_defaults
            FROM tournament_settings
            WHERE tournament_id = ?
            "#
        )
        .bind(tournament_id)
        .fetch_optional(&self.pool)
        .await?;

        match result {
            Some(row) => {
                // Parse the JSON tiebreak_order string
                let tiebreaks: Vec<TiebreakType> = serde_json::from_str(&row.tiebreak_order)
                    .map_err(|e| sqlx::Error::Protocol(format!("Failed to parse tiebreak_order: {}", e)))?;
                
                Ok(Some(TournamentTiebreakConfig {
                    tournament_id,
                    tiebreaks,
                    use_fide_defaults: row.use_fide_defaults,
                }))
            }
            None => {
                // Return default config if no settings exist
                let mut config = TournamentTiebreakConfig::default();
                config.tournament_id = tournament_id;
                Ok(Some(config))
            }
        }
    }

    #[instrument(ret, skip(self))]
    async fn upsert_tournament_settings(&self, settings: &UpdateTournamentSettings) -> Result<(), sqlx::Error> {
        // Serialize tiebreaks to JSON string
        let tiebreak_order_json = serde_json::to_string(&settings.tiebreak_order)
            .map_err(|e| sqlx::Error::Protocol(format!("Failed to serialize tiebreak_order: {}", e)))?;

        sqlx::query(
            r#"
            INSERT INTO tournament_settings (tournament_id, tiebreak_order, use_fide_defaults)
            VALUES (?, ?, ?)
            ON CONFLICT(tournament_id) DO UPDATE SET
                tiebreak_order = excluded.tiebreak_order,
                use_fide_defaults = excluded.use_fide_defaults,
                updated_at = CURRENT_TIMESTAMP
            "#
        )
        .bind(settings.tournament_id)
        .bind(tiebreak_order_json)
        .bind(settings.use_fide_defaults)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
