use tracing::instrument;

use super::SqliteDb;
use crate::db::{
    CreateTournamentSeedingSettings, SeedingDb, UpdatePlayerSeeding,
    UpdateTournamentSeedingSettings,
};
use crate::participant::model::Player;
use crate::tournament::model::TournamentSeedingSettings;

impl SeedingDb for SqliteDb {
    #[instrument(ret, skip(self))]
    async fn create_seeding_settings(
        &self,
        settings: CreateTournamentSeedingSettings,
    ) -> Result<TournamentSeedingSettings, sqlx::Error> {
        let result = sqlx::query_as::<_, TournamentSeedingSettings>(
            r#"
            INSERT INTO tournament_seeding_settings
                (tournament_id, seeding_method, use_initial_rating, randomize_unrated, protect_top_seeds)
            VALUES (?, ?, ?, ?, ?)
            RETURNING *
            "#,
        )
        .bind(settings.tournament_id)
        .bind(&settings.seeding_method)
        .bind(settings.use_initial_rating)
        .bind(settings.randomize_unrated)
        .bind(settings.protect_top_seeds)
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn get_seeding_settings(
        &self,
        tournament_id: i32,
    ) -> Result<Option<TournamentSeedingSettings>, sqlx::Error> {
        let settings = sqlx::query_as::<_, TournamentSeedingSettings>(
            "SELECT * FROM tournament_seeding_settings WHERE tournament_id = ?",
        )
        .bind(tournament_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(settings)
    }

    #[instrument(ret, skip(self))]
    async fn update_seeding_settings(
        &self,
        settings: UpdateTournamentSeedingSettings,
    ) -> Result<TournamentSeedingSettings, sqlx::Error> {
        let mut sql = "UPDATE tournament_seeding_settings SET ".to_string();
        let mut updates = Vec::new();

        if settings.seeding_method.is_some() {
            updates.push("seeding_method = ?");
        }
        if settings.use_initial_rating.is_some() {
            updates.push("use_initial_rating = ?");
        }
        if settings.randomize_unrated.is_some() {
            updates.push("randomize_unrated = ?");
        }
        if settings.protect_top_seeds.is_some() {
            updates.push("protect_top_seeds = ?");
        }

        if updates.is_empty() {
            return Err(sqlx::Error::Protocol("No fields to update".into()));
        }

        sql.push_str(&updates.join(", "));
        sql.push_str(" WHERE id = ? RETURNING *");

        let mut query = sqlx::query_as::<_, TournamentSeedingSettings>(&sql);

        if let Some(method) = &settings.seeding_method {
            query = query.bind(method);
        }
        if let Some(use_initial) = &settings.use_initial_rating {
            query = query.bind(use_initial);
        }
        if let Some(randomize) = &settings.randomize_unrated {
            query = query.bind(randomize);
        }
        if let Some(protect) = &settings.protect_top_seeds {
            query = query.bind(protect);
        }
        query = query.bind(settings.id);

        let result = query.fetch_one(&self.pool).await?;
        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn get_active_tournament_players(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<Player>, sqlx::Error> {
        let players = sqlx::query_as::<_, Player>(
            "SELECT * FROM players WHERE tournament_id = ? AND status = 'active' ORDER BY rating DESC NULLS LAST",
        )
        .bind(tournament_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(players)
    }

    #[instrument(ret, skip(self))]
    async fn batch_update_player_seeding(
        &self,
        updates: Vec<UpdatePlayerSeeding>,
    ) -> Result<Vec<Player>, sqlx::Error> {
        let mut tx = self.pool.begin().await?;
        let mut updated_players = Vec::new();

        for update in updates {
            let player = sqlx::query_as::<_, Player>(
                r#"
                UPDATE players SET
                    seed_number = COALESCE(?, seed_number),
                    pairing_number = COALESCE(?, pairing_number),
                    initial_rating = COALESCE(?, initial_rating),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                RETURNING *
                "#,
            )
            .bind(update.seed_number)
            .bind(update.pairing_number)
            .bind(update.initial_rating)
            .bind(update.player_id)
            .fetch_one(&mut *tx)
            .await?;

            updated_players.push(player);
        }

        tx.commit().await?;
        Ok(updated_players)
    }
}
