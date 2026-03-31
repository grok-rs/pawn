use tracing::instrument;

use super::SqliteDb;
use crate::competition::model::Round;
use crate::db::{CreateRound, RoundDb};

impl RoundDb for SqliteDb {
    #[instrument(ret, skip(self))]
    async fn get_rounds_by_tournament(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<Round>, sqlx::Error> {
        let rounds =
            sqlx::query_as("SELECT * FROM rounds WHERE tournament_id = ? ORDER BY round_number")
                .bind(tournament_id)
                .fetch_all(&self.pool)
                .await?;

        Ok(rounds)
    }

    #[instrument(ret, skip(self))]
    async fn get_current_round(&self, tournament_id: i32) -> Result<Option<Round>, sqlx::Error> {
        let round = sqlx::query_as(
            "SELECT * FROM rounds WHERE tournament_id = ? AND status = 'in_progress'
             ORDER BY round_number DESC LIMIT 1",
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
            "INSERT INTO rounds (tournament_id, round_number, status) VALUES (?, ?, 'upcoming')",
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
    async fn delete_round(&self, round_id: i32) -> Result<(), sqlx::Error> {
        // Delete associated games first
        sqlx::query("DELETE FROM games WHERE round_number = (SELECT round_number FROM rounds WHERE id = ?) AND tournament_id = (SELECT tournament_id FROM rounds WHERE id = ?)")
            .bind(round_id)
            .bind(round_id)
            .execute(&self.pool)
            .await?;

        sqlx::query("DELETE FROM rounds WHERE id = ?")
            .bind(round_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }
}
