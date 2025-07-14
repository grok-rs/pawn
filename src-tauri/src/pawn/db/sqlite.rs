use sqlx::SqlitePool;
use tracing::instrument;

use super::*;
use crate::pawn::domain::{tiebreak::TiebreakType, model::GameResultType};

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
            "INSERT INTO tournaments (name, location, date, time_type, tournament_type, player_count, rounds_played, total_rounds, country_code)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING *"
        )
        .bind(&data.name)
        .bind(&data.location)
        .bind(&data.date)
        .bind(&data.time_type)
        .bind(&data.tournament_type)
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
            "SELECT * FROM players WHERE tournament_id = ? AND name != 'BYE' ORDER BY name"
        )
        .bind(tournament_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(players)
    }

    #[instrument(ret, skip(self))]
    async fn create_player(&self, data: CreatePlayer) -> Result<Player, sqlx::Error> {
        let player: Player = sqlx::query_as(
            "INSERT INTO players (tournament_id, name, rating, country_code, title, birth_date, gender, email, phone, club, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 'active'))
             RETURNING *"
        )
        .bind(data.tournament_id)
        .bind(&data.name)
        .bind(data.rating)
        .bind(&data.country_code)
        .bind(&data.title)
        .bind(&data.birth_date)
        .bind(&data.gender)
        .bind(&data.email)
        .bind(&data.phone)
        .bind(&data.club)
        .bind(Option::<String>::None) // status will default to 'active'
        .fetch_one(&self.pool)
        .await?;

        Ok(player)
    }

    #[instrument(ret, skip(self))]
    async fn update_player(&self, data: UpdatePlayer) -> Result<Player, sqlx::Error> {
        // For simplicity, update all fields - NULL values will remain NULL
        let player: Player = sqlx::query_as(
            "UPDATE players SET 
                name = COALESCE(?, name),
                rating = COALESCE(?, rating),
                country_code = COALESCE(?, country_code),
                title = COALESCE(?, title),
                birth_date = COALESCE(?, birth_date),
                gender = COALESCE(?, gender),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                club = COALESCE(?, club),
                status = COALESCE(?, status),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?
             RETURNING *"
        )
        .bind(&data.name)
        .bind(data.rating)
        .bind(&data.country_code)
        .bind(&data.title)
        .bind(&data.birth_date)
        .bind(&data.gender)
        .bind(&data.email)
        .bind(&data.phone)
        .bind(&data.club)
        .bind(&data.status)
        .bind(data.player_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(player)
    }

    #[instrument(ret, skip(self))]
    async fn delete_player(&self, player_id: i32) -> Result<(), sqlx::Error> {
        // Check if player has any games first
        let game_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM games WHERE white_player_id = ? OR black_player_id = ?"
        )
        .bind(player_id)
        .bind(player_id)
        .fetch_one(&self.pool)
        .await?;

        if game_count > 0 {
            return Err(sqlx::Error::RowNotFound);
        }

        sqlx::query("DELETE FROM players WHERE id = ?")
            .bind(player_id)
            .execute(&self.pool)
            .await?;

        Ok(())
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
    async fn get_game(&self, game_id: i32) -> Result<Game, sqlx::Error> {
        let game = sqlx::query_as("SELECT id, tournament_id, round_number, white_player_id, black_player_id, result, result_type, result_reason, arbiter_notes, last_updated, approved_by, created_at FROM games WHERE id = ?")
            .bind(game_id)
            .fetch_one(&self.pool)
            .await?;

        Ok(game)
    }

    #[instrument(ret, skip(self))]
    async fn get_player(&self, player_id: i32) -> Result<Player, sqlx::Error> {
        let player = sqlx::query_as("SELECT * FROM players WHERE id = ?")
            .bind(player_id)
            .fetch_one(&self.pool)
            .await?;

        Ok(player)
    }

    #[instrument(ret, skip(self))]
    async fn update_game_result(&self, data: UpdateGameResult) -> Result<Game, sqlx::Error> {
        let game: Game = sqlx::query_as(
            "UPDATE games 
             SET result = ?, result_type = ?, result_reason = ?, arbiter_notes = ?, approved_by = ?, last_updated = CURRENT_TIMESTAMP
             WHERE id = ?
             RETURNING id, tournament_id, round_number, white_player_id, black_player_id, result, result_type, result_reason, arbiter_notes, last_updated, approved_by, created_at"
        )
        .bind(&data.result)
        .bind(&data.result_type)
        .bind(&data.result_reason)
        .bind(&data.arbiter_notes)
        .bind(&data.changed_by)
        .bind(data.game_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(game)
    }

    #[instrument(ret, skip(self))]
    async fn get_enhanced_game_result(&self, game_id: i32) -> Result<EnhancedGameResult, sqlx::Error> {
        let game = self.get_game(game_id).await?;
        let white_player = self.get_player(game.white_player_id).await?;
        let black_player = self.get_player(game.black_player_id).await?;
        let audit_trail = self.get_game_audit_trail(game_id).await?;
        
        let result_type = GameResultType::from_str(&game.result);
        let requires_approval = result_type.requires_arbiter_approval() && game.approved_by.is_none();

        Ok(EnhancedGameResult {
            game,
            white_player,
            black_player,
            audit_trail,
            requires_approval,
        })
    }

    #[instrument(ret, skip(self))]
    async fn get_game_audit_trail(&self, game_id: i32) -> Result<Vec<GameResultAudit>, sqlx::Error> {
        let audit_records = sqlx::query_as("SELECT * FROM game_result_audit WHERE game_id = ? ORDER BY changed_at DESC")
            .bind(game_id)
            .fetch_all(&self.pool)
            .await?;

        Ok(audit_records)
    }

    #[instrument(ret, skip(self))]
    async fn approve_game_result(&self, data: ApproveGameResult) -> Result<(), sqlx::Error> {
        // Update the game approval
        sqlx::query("UPDATE games SET approved_by = ? WHERE id = ?")
            .bind(&data.approved_by)
            .bind(data.game_id)
            .execute(&self.pool)
            .await?;

        // Update the latest audit record
        sqlx::query("UPDATE game_result_audit SET approved = TRUE, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE game_id = ? AND approved = FALSE")
            .bind(&data.approved_by)
            .bind(data.game_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    #[instrument(ret, skip(self))]
    async fn get_pending_approvals(&self, tournament_id: i32) -> Result<Vec<EnhancedGameResult>, sqlx::Error> {
        let games = sqlx::query_as::<_, Game>(
            "SELECT id, tournament_id, round_number, white_player_id, black_player_id, result, result_type, result_reason, arbiter_notes, last_updated, approved_by, created_at 
             FROM games 
             WHERE tournament_id = ? AND result_type IN ('white_forfeit', 'black_forfeit', 'white_default', 'black_default', 'double_forfeit', 'cancelled') AND approved_by IS NULL"
        )
        .bind(tournament_id)
        .fetch_all(&self.pool)
        .await?;

        let mut enhanced_results = Vec::new();
        for game in games {
            match self.get_enhanced_game_result(game.id).await {
                Ok(enhanced) => enhanced_results.push(enhanced),
                Err(e) => tracing::warn!("Failed to get enhanced result for game {}: {}", game.id, e),
            }
        }

        Ok(enhanced_results)
    }

    #[instrument(ret, skip(self))]
    async fn get_round_by_number(&self, tournament_id: i32, round_number: i32) -> Result<Round, sqlx::Error> {
        let round = sqlx::query_as("SELECT * FROM rounds WHERE tournament_id = ? AND round_number = ?")
            .bind(tournament_id)
            .bind(round_number)
            .fetch_one(&self.pool)
            .await?;

        Ok(round)
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

    // Round operations
    #[instrument(ret, skip(self))]
    async fn get_rounds_by_tournament(&self, tournament_id: i32) -> Result<Vec<Round>, sqlx::Error> {
        let rounds = sqlx::query_as("SELECT * FROM rounds WHERE tournament_id = ? ORDER BY round_number")
            .bind(tournament_id)
            .fetch_all(&self.pool)
            .await?;

        Ok(rounds)
    }

    #[instrument(ret, skip(self))]
    async fn get_current_round(&self, tournament_id: i32) -> Result<Option<Round>, sqlx::Error> {
        let round = sqlx::query_as(
            "SELECT * FROM rounds WHERE tournament_id = ? AND status = 'in_progress' 
             ORDER BY round_number DESC LIMIT 1"
        )
        .bind(tournament_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(round)
    }

    #[instrument(ret, skip(self))]
    async fn get_round(&self, round_id: i32) -> Result<Round, sqlx::Error> {
        let round = sqlx::query_as("SELECT * FROM rounds WHERE id = ?")
            .bind(round_id)
            .fetch_one(&self.pool)
            .await?;

        Ok(round)
    }

    #[instrument(ret, skip(self))]
    async fn create_round(&self, data: CreateRound) -> Result<Round, sqlx::Error> {
        let result = sqlx::query(
            "INSERT INTO rounds (tournament_id, round_number, status) VALUES (?, ?, 'upcoming')"
        )
        .bind(data.tournament_id)
        .bind(data.round_number)
        .execute(&self.pool)
        .await?;

        let round_id = result.last_insert_rowid() as i32;
        
        let round = sqlx::query_as("SELECT * FROM rounds WHERE id = ?")
            .bind(round_id)
            .fetch_one(&self.pool)
            .await?;

        Ok(round)
    }

    #[instrument(ret, skip(self))]
    async fn update_round_status(&self, round_id: i32, status: &str) -> Result<Round, sqlx::Error> {
        sqlx::query("UPDATE rounds SET status = ?, completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END WHERE id = ?")
            .bind(status)
            .bind(status)
            .bind(round_id)
            .execute(&self.pool)
            .await?;

        let round = sqlx::query_as("SELECT * FROM rounds WHERE id = ?")
            .bind(round_id)
            .fetch_one(&self.pool)
            .await?;

        Ok(round)
    }

    #[instrument(ret, skip(self))]
    async fn get_games_by_round(&self, tournament_id: i32, round_number: i32) -> Result<Vec<GameResult>, sqlx::Error> {
        // Get games first
        let games = sqlx::query_as::<_, Game>(
            "SELECT * FROM games WHERE tournament_id = ? AND round_number = ? ORDER BY id"
        )
        .bind(tournament_id)
        .bind(round_number)
        .fetch_all(&self.pool)
        .await?;

        let mut game_results = Vec::new();
        
        for game in games {
            // Get white player
            let white_player = sqlx::query_as::<_, Player>(
                "SELECT * FROM players WHERE id = ?"
            )
            .bind(game.white_player_id)
            .fetch_one(&self.pool)
            .await?;

            // Get black player
            let black_player = sqlx::query_as::<_, Player>(
                "SELECT * FROM players WHERE id = ?"
            )
            .bind(game.black_player_id)
            .fetch_one(&self.pool)
            .await?;

            game_results.push(GameResult {
                game,
                white_player,
                black_player,
            });
        }

        Ok(game_results)
    }

    // Player category operations
    
    #[instrument(ret, skip(self))]
    async fn get_tournament_categories(&self, tournament_id: i32) -> Result<Vec<PlayerCategory>, sqlx::Error> {
        let categories = sqlx::query_as::<_, PlayerCategory>(
            "SELECT * FROM player_categories WHERE tournament_id = ? ORDER BY created_at"
        )
        .bind(tournament_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(categories)
    }

    #[instrument(ret, skip(self))]
    async fn create_player_category(&self, data: CreatePlayerCategory) -> Result<PlayerCategory, sqlx::Error> {
        let result = sqlx::query(
            r#"
            INSERT INTO player_categories (
                tournament_id, name, description, min_rating, max_rating, 
                min_age, max_age, gender_restriction
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(data.tournament_id)
        .bind(&data.name)
        .bind(data.description.as_ref())
        .bind(data.min_rating)
        .bind(data.max_rating)
        .bind(data.min_age)
        .bind(data.max_age)
        .bind(data.gender_restriction.as_ref())
        .execute(&self.pool)
        .await?;

        // Fetch the created category
        let category = sqlx::query_as::<_, PlayerCategory>(
            "SELECT * FROM player_categories WHERE id = ?"
        )
        .bind(result.last_insert_rowid())
        .fetch_one(&self.pool)
        .await?;

        Ok(category)
    }

    #[instrument(ret, skip(self))]
    async fn delete_player_category(&self, category_id: i32) -> Result<(), sqlx::Error> {
        // First delete all assignments for this category
        sqlx::query("DELETE FROM player_category_assignments WHERE category_id = ?")
            .bind(category_id)
            .execute(&self.pool)
            .await?;

        // Then delete the category itself
        sqlx::query("DELETE FROM player_categories WHERE id = ?")
            .bind(category_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    #[instrument(ret, skip(self))]
    async fn assign_player_to_category(&self, data: AssignPlayerToCategory) -> Result<PlayerCategoryAssignment, sqlx::Error> {
        let result = sqlx::query(
            "INSERT INTO player_category_assignments (player_id, category_id) VALUES (?, ?) ON CONFLICT(player_id, category_id) DO NOTHING"
        )
        .bind(data.player_id)
        .bind(data.category_id)
        .execute(&self.pool)
        .await?;

        // Fetch the assignment
        let assignment = sqlx::query_as::<_, PlayerCategoryAssignment>(
            "SELECT * FROM player_category_assignments WHERE player_id = ? AND category_id = ?"
        )
        .bind(data.player_id)
        .bind(data.category_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(assignment)
    }

    #[instrument(ret, skip(self))]
    async fn get_player_category_assignments(&self, tournament_id: i32) -> Result<Vec<PlayerCategoryAssignment>, sqlx::Error> {
        let assignments = sqlx::query_as::<_, PlayerCategoryAssignment>(
            r#"
            SELECT pca.* 
            FROM player_category_assignments pca
            JOIN player_categories pc ON pca.category_id = pc.id
            WHERE pc.tournament_id = ?
            ORDER BY pca.assigned_at
            "#
        )
        .bind(tournament_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(assignments)
    }

    // Knockout tournament operations
    #[instrument(ret, skip(self))]
    async fn create_knockout_bracket(&self, bracket: KnockoutBracket) -> Result<KnockoutBracket, sqlx::Error> {
        let result = sqlx::query_as(
            "INSERT INTO knockout_brackets (tournament_id, bracket_type, total_rounds)
             VALUES (?, ?, ?)
             RETURNING *"
        )
        .bind(bracket.tournament_id)
        .bind(&bracket.bracket_type)
        .bind(bracket.total_rounds)
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn get_knockout_bracket(&self, tournament_id: i32) -> Result<Option<KnockoutBracket>, sqlx::Error> {
        let result = sqlx::query_as("SELECT * FROM knockout_brackets WHERE tournament_id = ?")
            .bind(tournament_id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn get_knockout_bracket_by_id(&self, bracket_id: i32) -> Result<Option<KnockoutBracket>, sqlx::Error> {
        let result = sqlx::query_as("SELECT * FROM knockout_brackets WHERE id = ?")
            .bind(bracket_id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn create_bracket_position(&self, position: BracketPosition) -> Result<BracketPosition, sqlx::Error> {
        let result = sqlx::query_as(
            "INSERT INTO bracket_positions (bracket_id, round_number, position_number, player_id, advanced_from_position, status)
             VALUES (?, ?, ?, ?, ?, ?)
             RETURNING *"
        )
        .bind(position.bracket_id)
        .bind(position.round_number)
        .bind(position.position_number)
        .bind(position.player_id)
        .bind(position.advanced_from_position)
        .bind(&position.status)
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn get_bracket_positions(&self, bracket_id: i32) -> Result<Vec<BracketPosition>, sqlx::Error> {
        let positions = sqlx::query_as(
            "SELECT * FROM bracket_positions 
             WHERE bracket_id = ? 
             ORDER BY round_number, position_number"
        )
        .bind(bracket_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(positions)
    }

    #[instrument(ret, skip(self))]
    async fn get_bracket_positions_by_round(&self, bracket_id: i32, round_number: i32) -> Result<Vec<BracketPosition>, sqlx::Error> {
        let positions = sqlx::query_as(
            "SELECT * FROM bracket_positions 
             WHERE bracket_id = ? AND round_number = ?
             ORDER BY position_number"
        )
        .bind(bracket_id)
        .bind(round_number)
        .fetch_all(&self.pool)
        .await?;

        Ok(positions)
    }

    #[instrument(ret, skip(self))]
    async fn update_bracket_position(&self, position_id: i32, player_id: Option<i32>, status: String) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE bracket_positions 
             SET player_id = ?, status = ?
             WHERE id = ?"
        )
        .bind(player_id)
        .bind(&status)
        .bind(position_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // Time control operations
    #[instrument(ret, skip(self))]
    async fn get_time_controls(&self) -> Result<Vec<TimeControl>, sqlx::Error> {
        let time_controls = sqlx::query_as("SELECT * FROM time_controls ORDER BY is_default DESC, time_control_type, name")
            .fetch_all(&self.pool)
            .await?;

        Ok(time_controls)
    }

    #[instrument(ret, skip(self))]
    async fn get_time_control(&self, id: i32) -> Result<TimeControl, sqlx::Error> {
        let time_control = sqlx::query_as("SELECT * FROM time_controls WHERE id = ?")
            .bind(id)
            .fetch_one(&self.pool)
            .await?;

        Ok(time_control)
    }

    #[instrument(ret, skip(self))]
    async fn create_time_control(&self, time_control: TimeControl) -> Result<TimeControl, sqlx::Error> {
        let result = sqlx::query_as(
            "INSERT INTO time_controls (name, time_control_type, base_time_minutes, increment_seconds, moves_per_session, session_time_minutes, total_sessions, is_default, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING *"
        )
        .bind(&time_control.name)
        .bind(&time_control.time_control_type)
        .bind(time_control.base_time_minutes)
        .bind(time_control.increment_seconds)
        .bind(time_control.moves_per_session)
        .bind(time_control.session_time_minutes)
        .bind(time_control.total_sessions)
        .bind(time_control.is_default)
        .bind(&time_control.description)
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn update_time_control(&self, data: UpdateTimeControl) -> Result<TimeControl, sqlx::Error> {
        // Get current time control for field merging
        let _current = self.get_time_control(data.id).await?;

        let result = sqlx::query_as(
            "UPDATE time_controls 
             SET name = COALESCE(?, name),
                 time_control_type = COALESCE(?, time_control_type),
                 base_time_minutes = COALESCE(?, base_time_minutes),
                 increment_seconds = COALESCE(?, increment_seconds),
                 moves_per_session = COALESCE(?, moves_per_session),
                 session_time_minutes = COALESCE(?, session_time_minutes),
                 total_sessions = COALESCE(?, total_sessions),
                 is_default = COALESCE(?, is_default),
                 description = COALESCE(?, description),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?
             RETURNING *"
        )
        .bind(data.name)
        .bind(data.time_control_type)
        .bind(data.base_time_minutes)
        .bind(data.increment_seconds)
        .bind(data.moves_per_session)
        .bind(data.session_time_minutes)
        .bind(data.total_sessions)
        .bind(data.is_default)
        .bind(data.description)
        .bind(data.id)
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn delete_time_control(&self, id: i32) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM time_controls WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    #[instrument(ret, skip(self))]
    async fn get_tournaments_using_time_control(&self, time_control_id: i32) -> Result<Vec<Tournament>, sqlx::Error> {
        let tournaments = sqlx::query_as("SELECT * FROM tournaments WHERE time_control_id = ?")
            .bind(time_control_id)
            .fetch_all(&self.pool)
            .await?;

        Ok(tournaments)
    }

    #[instrument(ret, skip(self))]
    async fn unset_default_time_controls(&self, time_control_type: &str) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE time_controls SET is_default = 0 WHERE time_control_type = ?")
            .bind(time_control_type)
            .execute(&self.pool)
            .await?;

        Ok(())
    }
}
