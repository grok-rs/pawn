use tracing::instrument;

use super::SqliteDb;
use crate::competition::model::{BracketPosition, KnockoutBracket};
use crate::db::KnockoutDb;

impl KnockoutDb for SqliteDb {
    #[instrument(ret, skip(self))]
    async fn create_knockout_bracket(
        &self,
        bracket: KnockoutBracket,
    ) -> Result<KnockoutBracket, sqlx::Error> {
        let result = sqlx::query_as(
            "INSERT INTO knockout_brackets (tournament_id, bracket_type, total_rounds)
             VALUES (?, ?, ?)
             RETURNING *",
        )
        .bind(bracket.tournament_id)
        .bind(&bracket.bracket_type)
        .bind(bracket.total_rounds)
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn get_knockout_bracket(
        &self,
        tournament_id: i32,
    ) -> Result<Option<KnockoutBracket>, sqlx::Error> {
        let result = sqlx::query_as("SELECT * FROM knockout_brackets WHERE tournament_id = ?")
            .bind(tournament_id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn get_knockout_bracket_by_id(
        &self,
        bracket_id: i32,
    ) -> Result<Option<KnockoutBracket>, sqlx::Error> {
        let result = sqlx::query_as("SELECT * FROM knockout_brackets WHERE id = ?")
            .bind(bracket_id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn create_bracket_position(
        &self,
        position: BracketPosition,
    ) -> Result<BracketPosition, sqlx::Error> {
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
    async fn get_bracket_positions(
        &self,
        bracket_id: i32,
    ) -> Result<Vec<BracketPosition>, sqlx::Error> {
        let positions = sqlx::query_as(
            "SELECT * FROM bracket_positions
             WHERE bracket_id = ?
             ORDER BY round_number, position_number",
        )
        .bind(bracket_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(positions)
    }

    #[instrument(ret, skip(self))]
    async fn get_bracket_positions_by_round(
        &self,
        bracket_id: i32,
        round_number: i32,
    ) -> Result<Vec<BracketPosition>, sqlx::Error> {
        let positions = sqlx::query_as(
            "SELECT * FROM bracket_positions
             WHERE bracket_id = ? AND round_number = ?
             ORDER BY position_number",
        )
        .bind(bracket_id)
        .bind(round_number)
        .fetch_all(&self.pool)
        .await?;

        Ok(positions)
    }
}
