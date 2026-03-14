use tracing::instrument;

use super::SqliteDb;
use crate::db::{
    AssignPlayerToCategory, CreatePlayer, CreatePlayerCategory, PlayerDb, UpdatePlayer,
};
use crate::participant::model::{Player, PlayerCategory, PlayerCategoryAssignment};

impl PlayerDb for SqliteDb {
    #[instrument(ret, skip(self))]
    async fn get_player(&self, player_id: i32) -> Result<Player, sqlx::Error> {
        let player = sqlx::query_as("SELECT * FROM players WHERE id = ?")
            .bind(player_id)
            .fetch_one(&self.pool)
            .await?;

        Ok(player)
    }

    #[instrument(ret, skip(self))]
    async fn get_players_by_tournament(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<Player>, sqlx::Error> {
        let players = sqlx::query_as(
            "SELECT * FROM players WHERE tournament_id = ? AND name != 'BYE' ORDER BY name",
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
             RETURNING *",
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
            "SELECT COUNT(*) FROM games WHERE white_player_id = ? OR black_player_id = ?",
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
    async fn get_tournament_categories(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<PlayerCategory>, sqlx::Error> {
        let categories = sqlx::query_as::<_, PlayerCategory>(
            "SELECT * FROM player_categories WHERE tournament_id = ? ORDER BY created_at",
        )
        .bind(tournament_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(categories)
    }

    #[instrument(ret, skip(self))]
    async fn create_player_category(
        &self,
        data: CreatePlayerCategory,
    ) -> Result<PlayerCategory, sqlx::Error> {
        let result = sqlx::query(
            r#"
            INSERT INTO player_categories (
                tournament_id, name, description, min_rating, max_rating,
                min_age, max_age, gender_restriction
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
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
        let category =
            sqlx::query_as::<_, PlayerCategory>("SELECT * FROM player_categories WHERE id = ?")
                .bind(result.last_insert_rowid())
                .fetch_one(&self.pool)
                .await?;

        Ok(category)
    }

    #[instrument(ret, skip(self))]
    async fn delete_player_category(&self, category_id: i32) -> Result<(), sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        // First delete all assignments for this category
        sqlx::query("DELETE FROM player_category_assignments WHERE category_id = ?")
            .bind(category_id)
            .execute(&mut *tx)
            .await?;

        // Then delete the category itself
        sqlx::query("DELETE FROM player_categories WHERE id = ?")
            .bind(category_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }

    #[instrument(ret, skip(self))]
    async fn assign_player_to_category(
        &self,
        data: AssignPlayerToCategory,
    ) -> Result<PlayerCategoryAssignment, sqlx::Error> {
        let _result = sqlx::query(
            "INSERT INTO player_category_assignments (player_id, category_id) VALUES (?, ?) ON CONFLICT(player_id, category_id) DO NOTHING"
        )
        .bind(data.player_id)
        .bind(data.category_id)
        .execute(&self.pool)
        .await?;

        // Fetch the assignment
        let assignment = sqlx::query_as::<_, PlayerCategoryAssignment>(
            "SELECT * FROM player_category_assignments WHERE player_id = ? AND category_id = ?",
        )
        .bind(data.player_id)
        .bind(data.category_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(assignment)
    }

    #[instrument(ret, skip(self))]
    async fn get_player_category_assignments(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<PlayerCategoryAssignment>, sqlx::Error> {
        let assignments = sqlx::query_as::<_, PlayerCategoryAssignment>(
            r#"
            SELECT pca.*
            FROM player_category_assignments pca
            JOIN player_categories pc ON pca.category_id = pc.id
            WHERE pc.tournament_id = ?
            ORDER BY pca.assigned_at
            "#,
        )
        .bind(tournament_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(assignments)
    }
}
