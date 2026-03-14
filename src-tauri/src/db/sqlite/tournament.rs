use tracing::instrument;

use super::SqliteDb;
use crate::db::{GameDb, TournamentDb, UpdateTournamentSettings};
use crate::standings::model::{TiebreakType, TournamentTiebreakConfig};
use crate::tournament::model::{Tournament, TournamentDetails};

impl TournamentDb for SqliteDb {
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
    async fn create_tournament(
        &self,
        data: crate::db::CreateTournament,
    ) -> Result<Tournament, sqlx::Error> {
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
    async fn update_tournament_status(
        &self,
        tournament_id: i32,
        status: &str,
    ) -> Result<Tournament, sqlx::Error> {
        // Update tournament status
        sqlx::query("UPDATE tournaments SET status = ? WHERE id = ?")
            .bind(status)
            .bind(tournament_id)
            .execute(&self.pool)
            .await?;

        // Return the updated tournament
        self.get_tournament(tournament_id).await
    }

    #[instrument(ret, skip(self))]
    async fn get_tournament_settings(
        &self,
        tournament_id: i32,
    ) -> Result<Option<TournamentTiebreakConfig>, sqlx::Error> {
        #[derive(sqlx::FromRow)]
        struct TournamentSettingsRow {
            tiebreak_order: String,
            use_fide_defaults: bool,
            forfeit_time_minutes: Option<i32>,
            draw_offers_allowed: Option<bool>,
            mobile_phone_policy: Option<String>,
            default_color_allocation: Option<String>,
            late_entry_allowed: Option<bool>,
            bye_assignment_rule: Option<String>,
            arbiter_notes: Option<String>,
            tournament_category: Option<String>,
            organizer_name: Option<String>,
            organizer_email: Option<String>,
            prize_structure: Option<String>,
        }

        let result: Option<TournamentSettingsRow> = sqlx::query_as(
            r#"
            SELECT tiebreak_order, use_fide_defaults, forfeit_time_minutes,
                   draw_offers_allowed, mobile_phone_policy, default_color_allocation,
                   late_entry_allowed, bye_assignment_rule, arbiter_notes,
                   tournament_category, organizer_name, organizer_email, prize_structure
            FROM tournament_settings
            WHERE tournament_id = ?
            "#,
        )
        .bind(tournament_id)
        .fetch_optional(&self.pool)
        .await?;

        match result {
            Some(row) => {
                // Parse the JSON tiebreak_order string
                let tiebreaks: Vec<TiebreakType> = serde_json::from_str(&row.tiebreak_order)
                    .map_err(|e| {
                        sqlx::Error::Protocol(format!("Failed to parse tiebreak_order: {e}"))
                    })?;

                Ok(Some(TournamentTiebreakConfig {
                    tournament_id,
                    tiebreaks,
                    use_fide_defaults: row.use_fide_defaults,
                    forfeit_time_minutes: row.forfeit_time_minutes,
                    draw_offers_allowed: row.draw_offers_allowed,
                    mobile_phone_policy: row.mobile_phone_policy,
                    default_color_allocation: row.default_color_allocation,
                    late_entry_allowed: row.late_entry_allowed,
                    bye_assignment_rule: row.bye_assignment_rule,
                    arbiter_notes: row.arbiter_notes,
                    tournament_category: row.tournament_category,
                    organizer_name: row.organizer_name,
                    organizer_email: row.organizer_email,
                    prize_structure: row.prize_structure,
                }))
            }
            None => {
                // Return default config if no settings exist
                Ok(Some(TournamentTiebreakConfig {
                    tournament_id,
                    ..Default::default()
                }))
            }
        }
    }

    #[instrument(ret, skip(self))]
    async fn upsert_tournament_settings(
        &self,
        settings: &UpdateTournamentSettings,
    ) -> Result<(), sqlx::Error> {
        // Serialize tiebreaks to JSON string
        let tiebreak_order_json = serde_json::to_string(&settings.tiebreak_order).map_err(|e| {
            sqlx::Error::Protocol(format!("Failed to serialize tiebreak_order: {e}"))
        })?;

        sqlx::query(
            r#"
            INSERT INTO tournament_settings (
                tournament_id, tiebreak_order, use_fide_defaults,
                forfeit_time_minutes, draw_offers_allowed, mobile_phone_policy,
                default_color_allocation, late_entry_allowed, bye_assignment_rule,
                arbiter_notes, tournament_category, organizer_name,
                organizer_email, prize_structure
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(tournament_id) DO UPDATE SET
                tiebreak_order = excluded.tiebreak_order,
                use_fide_defaults = excluded.use_fide_defaults,
                forfeit_time_minutes = excluded.forfeit_time_minutes,
                draw_offers_allowed = excluded.draw_offers_allowed,
                mobile_phone_policy = excluded.mobile_phone_policy,
                default_color_allocation = excluded.default_color_allocation,
                late_entry_allowed = excluded.late_entry_allowed,
                bye_assignment_rule = excluded.bye_assignment_rule,
                arbiter_notes = excluded.arbiter_notes,
                tournament_category = excluded.tournament_category,
                organizer_name = excluded.organizer_name,
                organizer_email = excluded.organizer_email,
                prize_structure = excluded.prize_structure,
                updated_at = CURRENT_TIMESTAMP
            "#,
        )
        .bind(settings.tournament_id)
        .bind(tiebreak_order_json)
        .bind(settings.use_fide_defaults)
        .bind(settings.forfeit_time_minutes)
        .bind(settings.draw_offers_allowed)
        .bind(settings.mobile_phone_policy.as_deref())
        .bind(settings.default_color_allocation.as_deref())
        .bind(settings.late_entry_allowed)
        .bind(settings.bye_assignment_rule.as_deref())
        .bind(settings.arbiter_notes.as_deref())
        .bind(settings.tournament_category.as_deref())
        .bind(settings.organizer_name.as_deref())
        .bind(settings.organizer_email.as_deref())
        .bind(settings.prize_structure.as_deref())
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
