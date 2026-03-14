use std::collections::HashMap;

use tracing::instrument;

use super::SqliteDb;
use crate::db::{ApproveGameResult, CreateGame, GameDb, PlayerDb, UpdateGameResult};
use crate::domain::model::{
    EnhancedGameResult, Game, GameResult, GameResultAudit, GameResultType, Player, PlayerResult,
};

impl GameDb for SqliteDb {
    #[instrument(ret, skip(self))]
    async fn get_game(&self, game_id: i32) -> Result<Game, sqlx::Error> {
        let game = sqlx::query_as("SELECT id, tournament_id, round_number, white_player_id, black_player_id, result, result_type, result_reason, arbiter_notes, last_updated, approved_by, created_at FROM games WHERE id = ?")
            .bind(game_id)
            .fetch_one(&self.pool)
            .await?;

        Ok(game)
    }

    #[instrument(ret, skip(self))]
    async fn get_games_by_tournament(&self, tournament_id: i32) -> Result<Vec<Game>, sqlx::Error> {
        let games =
            sqlx::query_as("SELECT * FROM games WHERE tournament_id = ? ORDER BY round_number, id")
                .bind(tournament_id)
                .fetch_all(&self.pool)
                .await?;

        Ok(games)
    }

    #[instrument(ret, skip(self))]
    async fn get_games_by_round(
        &self,
        tournament_id: i32,
        round_number: i32,
    ) -> Result<Vec<GameResult>, sqlx::Error> {
        let games = sqlx::query_as::<_, Game>(
            "SELECT * FROM games WHERE tournament_id = ? AND round_number = ? ORDER BY id",
        )
        .bind(tournament_id)
        .bind(round_number)
        .fetch_all(&self.pool)
        .await?;

        // Prefetch all players in one query instead of 2N individual queries
        let players: Vec<Player> =
            sqlx::query_as("SELECT * FROM players WHERE tournament_id = ?")
                .bind(tournament_id)
                .fetch_all(&self.pool)
                .await?;
        let player_map: HashMap<i32, Player> =
            players.into_iter().map(|p| (p.id, p)).collect();

        let mut game_results = Vec::new();
        for game in games {
            let white_player = player_map
                .get(&game.white_player_id)
                .cloned()
                .ok_or(sqlx::Error::RowNotFound)?;
            let black_player = player_map
                .get(&game.black_player_id)
                .cloned()
                .ok_or(sqlx::Error::RowNotFound)?;
            game_results.push(GameResult {
                game,
                white_player,
                black_player,
            });
        }

        Ok(game_results)
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
    async fn get_enhanced_game_result(
        &self,
        game_id: i32,
    ) -> Result<EnhancedGameResult, sqlx::Error> {
        let game = self.get_game(game_id).await?;
        let white_player = self.get_player(game.white_player_id).await?;
        let black_player = self.get_player(game.black_player_id).await?;
        let audit_trail = self.get_game_audit_trail(game_id).await?;

        let result_type = game.result.parse().unwrap_or(GameResultType::Ongoing);
        let requires_approval =
            result_type.requires_arbiter_approval() && game.approved_by.is_none();

        Ok(EnhancedGameResult {
            game,
            white_player,
            black_player,
            audit_trail,
            requires_approval,
        })
    }

    #[instrument(ret, skip(self))]
    async fn get_game_audit_trail(
        &self,
        game_id: i32,
    ) -> Result<Vec<GameResultAudit>, sqlx::Error> {
        let audit_records = sqlx::query_as(
            "SELECT * FROM game_result_audit WHERE game_id = ? ORDER BY changed_at DESC",
        )
        .bind(game_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(audit_records)
    }

    #[instrument(ret, skip(self))]
    async fn approve_game_result(&self, data: ApproveGameResult) -> Result<(), sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        // Update the game approval
        sqlx::query("UPDATE games SET approved_by = ? WHERE id = ?")
            .bind(&data.approved_by)
            .bind(data.game_id)
            .execute(&mut *tx)
            .await?;

        // Update the latest audit record
        sqlx::query("UPDATE game_result_audit SET approved = TRUE, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE game_id = ? AND approved = FALSE")
            .bind(&data.approved_by)
            .bind(data.game_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }

    #[instrument(ret, skip(self))]
    async fn get_pending_approvals(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<EnhancedGameResult>, sqlx::Error> {
        let games: Vec<Game> = sqlx::query_as(
            "SELECT id, tournament_id, round_number, white_player_id, black_player_id, result, result_type, result_reason, arbiter_notes, last_updated, approved_by, created_at
             FROM games
             WHERE tournament_id = ? AND result_type IN ('white_forfeit', 'black_forfeit', 'white_default', 'black_default', 'double_forfeit', 'cancelled') AND approved_by IS NULL"
        )
        .bind(tournament_id)
        .fetch_all(&self.pool)
        .await?;

        if games.is_empty() {
            return Ok(Vec::new());
        }

        // Prefetch all players for these games in one query
        let player_ids: Vec<i32> = games
            .iter()
            .flat_map(|g| [g.white_player_id, g.black_player_id])
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();
        let placeholders: String = player_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let player_query = format!("SELECT * FROM players WHERE id IN ({placeholders})");
        let mut query = sqlx::query_as::<_, Player>(&player_query);
        for id in &player_ids {
            query = query.bind(id);
        }
        let players = query.fetch_all(&self.pool).await?;
        let player_map: HashMap<i32, Player> =
            players.into_iter().map(|p| (p.id, p)).collect();

        // Prefetch all audit trails for these games in one query
        let game_ids: Vec<i32> = games.iter().map(|g| g.id).collect();
        let audit_placeholders: String =
            game_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let audit_query = format!(
            "SELECT * FROM game_result_audit WHERE game_id IN ({audit_placeholders}) ORDER BY changed_at DESC"
        );
        let mut audit_q = sqlx::query_as::<_, GameResultAudit>(&audit_query);
        for id in &game_ids {
            audit_q = audit_q.bind(id);
        }
        let all_audits = audit_q.fetch_all(&self.pool).await?;
        let mut audit_map: HashMap<i32, Vec<GameResultAudit>> = HashMap::new();
        for audit in all_audits {
            audit_map.entry(audit.game_id).or_default().push(audit);
        }

        let mut enhanced_results = Vec::new();
        for game in games {
            let Some(white_player) = player_map.get(&game.white_player_id).cloned() else {
                tracing::warn!("Missing white player {} for game {}", game.white_player_id, game.id);
                continue;
            };
            let Some(black_player) = player_map.get(&game.black_player_id).cloned() else {
                tracing::warn!("Missing black player {} for game {}", game.black_player_id, game.id);
                continue;
            };
            let audit_trail = audit_map.remove(&game.id).unwrap_or_default();
            let result_type = game.result.parse().unwrap_or(GameResultType::Ongoing);
            let requires_approval =
                result_type.requires_arbiter_approval() && game.approved_by.is_none();

            enhanced_results.push(EnhancedGameResult {
                game,
                white_player,
                black_player,
                audit_trail,
                requires_approval,
            });
        }

        Ok(enhanced_results)
    }

    #[instrument(ret, skip(self))]
    async fn get_player_results(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<PlayerResult>, sqlx::Error> {
        let players = self.get_players_by_tournament(tournament_id).await?;
        let games = self.get_games_by_tournament(tournament_id).await?;

        // Pre-compute stats for all players in one pass over the games list
        // instead of N individual SQL queries
        #[derive(Default)]
        struct Stats {
            games_played: i32,
            wins: i32,
            draws: i32,
            losses: i32,
        }

        let mut stats_map: HashMap<i32, Stats> = HashMap::new();
        for game in &games {
            let white = stats_map.entry(game.white_player_id).or_default();
            white.games_played += 1;
            match game.result.as_str() {
                "1-0" => white.wins += 1,
                "0-1" => white.losses += 1,
                "1/2-1/2" => white.draws += 1,
                _ => {}
            }

            let black = stats_map.entry(game.black_player_id).or_default();
            black.games_played += 1;
            match game.result.as_str() {
                "0-1" => black.wins += 1,
                "1-0" => black.losses += 1,
                "1/2-1/2" => black.draws += 1,
                _ => {}
            }
        }

        let mut results: Vec<PlayerResult> = players
            .into_iter()
            .map(|player| {
                let stats = stats_map.remove(&player.id).unwrap_or_default();
                let points = stats.wins as f32 + (stats.draws as f32 * 0.5);
                PlayerResult {
                    player,
                    points,
                    games_played: stats.games_played,
                    wins: stats.wins,
                    draws: stats.draws,
                    losses: stats.losses,
                }
            })
            .collect();

        results.sort_by(|a, b| {
            b.points
                .partial_cmp(&a.points)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| a.player.name.cmp(&b.player.name))
        });

        Ok(results)
    }

    #[instrument(ret, skip(self))]
    async fn get_game_results(&self, tournament_id: i32) -> Result<Vec<GameResult>, sqlx::Error> {
        let games = self.get_games_by_tournament(tournament_id).await?;
        // Prefetch all players in one query instead of 2N individual queries
        let players: Vec<Player> =
            sqlx::query_as("SELECT * FROM players WHERE tournament_id = ?")
                .bind(tournament_id)
                .fetch_all(&self.pool)
                .await?;
        let player_map: HashMap<i32, Player> =
            players.into_iter().map(|p| (p.id, p)).collect();

        let mut results = Vec::new();
        for game in games {
            let white_player = player_map
                .get(&game.white_player_id)
                .cloned()
                .ok_or(sqlx::Error::RowNotFound)?;
            let black_player = player_map
                .get(&game.black_player_id)
                .cloned()
                .ok_or(sqlx::Error::RowNotFound)?;
            results.push(GameResult {
                game,
                white_player,
                black_player,
            });
        }

        Ok(results)
    }
}
