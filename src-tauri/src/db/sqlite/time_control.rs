use tracing::instrument;

use super::SqliteDb;
use crate::db::{TimeControlDb, UpdateTimeControl};
use crate::tournament::model::{TimeControl, Tournament};

impl TimeControlDb for SqliteDb {
    #[instrument(ret, skip(self))]
    async fn get_time_controls(&self) -> Result<Vec<TimeControl>, sqlx::Error> {
        let time_controls = sqlx::query_as(
            "SELECT * FROM time_controls ORDER BY is_default DESC, time_control_type, name",
        )
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
    async fn create_time_control(
        &self,
        time_control: TimeControl,
    ) -> Result<TimeControl, sqlx::Error> {
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
    async fn update_time_control(
        &self,
        data: UpdateTimeControl,
    ) -> Result<TimeControl, sqlx::Error> {
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
             RETURNING *",
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
    async fn get_tournaments_using_time_control(
        &self,
        time_control_id: i32,
    ) -> Result<Vec<Tournament>, sqlx::Error> {
        let tournaments = sqlx::query_as("SELECT * FROM tournaments WHERE time_control_id = ?")
            .bind(time_control_id)
            .fetch_all(&self.pool)
            .await?;

        Ok(tournaments)
    }
}
