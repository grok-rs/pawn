use tracing::instrument;

use super::SqliteDb;
use crate::db::{
    AddPlayerToTeam, CreateTeam, CreateTeamLineup, CreateTeamMatch,
    CreateTeamTournamentSettings, RemovePlayerFromTeam, TeamDb, TeamSearchFilters, UpdateTeam,
    UpdateTeamMatch, UpdateTeamTournamentSettings,
};
use crate::domain::model::{
    Team, TeamLineup, TeamMatch, TeamMembership, TeamTournamentSettings,
};

impl TeamDb for SqliteDb {
    #[instrument(ret, skip(self))]
    async fn create_team(&self, data: CreateTeam) -> Result<Team, sqlx::Error> {
        let result = sqlx::query_as(
            "INSERT INTO teams (tournament_id, name, captain, description, color, club_affiliation, contact_email, contact_phone, max_board_count, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
             RETURNING *",
        )
        .bind(data.tournament_id)
        .bind(data.name)
        .bind(data.captain)
        .bind(data.description)
        .bind(data.color)
        .bind(data.club_affiliation)
        .bind(data.contact_email)
        .bind(data.contact_phone)
        .bind(data.max_board_count)
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn update_team(&self, data: UpdateTeam) -> Result<Team, sqlx::Error> {
        let result = sqlx::query_as(
            "UPDATE teams SET
                name = COALESCE(?, name),
                captain = COALESCE(?, captain),
                description = COALESCE(?, description),
                color = COALESCE(?, color),
                club_affiliation = COALESCE(?, club_affiliation),
                contact_email = COALESCE(?, contact_email),
                contact_phone = COALESCE(?, contact_phone),
                max_board_count = COALESCE(?, max_board_count),
                status = COALESCE(?, status),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?
             RETURNING *",
        )
        .bind(data.name)
        .bind(data.captain)
        .bind(data.description)
        .bind(data.color)
        .bind(data.club_affiliation)
        .bind(data.contact_email)
        .bind(data.contact_phone)
        .bind(data.max_board_count)
        .bind(data.status)
        .bind(data.id)
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn delete_team(&self, team_id: i32) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM teams WHERE id = ?")
            .bind(team_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    #[instrument(ret, skip(self))]
    async fn get_team_by_id(&self, team_id: i32) -> Result<Team, sqlx::Error> {
        let result = sqlx::query_as("SELECT * FROM teams WHERE id = ?")
            .bind(team_id)
            .fetch_one(&self.pool)
            .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn get_teams_by_tournament(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<Team>, sqlx::Error> {
        let result = sqlx::query_as("SELECT * FROM teams WHERE tournament_id = ? ORDER BY name")
            .bind(tournament_id)
            .fetch_all(&self.pool)
            .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn search_teams(
        &self,
        filters: TeamSearchFilters,
    ) -> Result<Vec<Team>, sqlx::Error> {
        // For now, use a simple query that handles the most basic filtering
        let result = if let Some(name) = &filters.name {
            sqlx::query_as(
                "SELECT * FROM teams WHERE tournament_id = ? AND name LIKE ? ORDER BY name",
            )
            .bind(filters.tournament_id)
            .bind(format!("%{name}%"))
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as("SELECT * FROM teams WHERE tournament_id = ? ORDER BY name")
                .bind(filters.tournament_id)
                .fetch_all(&self.pool)
                .await?
        };

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn add_player_to_team(
        &self,
        data: AddPlayerToTeam,
    ) -> Result<TeamMembership, sqlx::Error> {
        let result = sqlx::query_as(
            "INSERT INTO team_memberships (team_id, player_id, board_number, is_captain, is_reserve, status, assigned_at, created_at)
             VALUES (?, ?, ?, ?, 0, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING *",
        )
        .bind(data.team_id)
        .bind(data.player_id)
        .bind(data.board_number)
        .bind(data.is_captain)
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn remove_player_from_team(
        &self,
        data: RemovePlayerFromTeam,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM team_memberships WHERE team_id = ? AND player_id = ?")
            .bind(data.team_id)
            .bind(data.player_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    #[instrument(ret, skip(self))]
    async fn get_team_memberships(
        &self,
        team_id: i32,
    ) -> Result<Vec<TeamMembership>, sqlx::Error> {
        let result = sqlx::query_as(
            "SELECT * FROM team_memberships WHERE team_id = ? ORDER BY board_number",
        )
        .bind(team_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn get_all_team_memberships(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<TeamMembership>, sqlx::Error> {
        let result = sqlx::query_as(
            "SELECT tm.* FROM team_memberships tm
             JOIN teams t ON tm.team_id = t.id
             WHERE t.tournament_id = ?
             ORDER BY t.name, tm.board_number",
        )
        .bind(tournament_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn create_team_match(
        &self,
        data: CreateTeamMatch,
    ) -> Result<TeamMatch, sqlx::Error> {
        let result = sqlx::query_as(
            "INSERT INTO team_matches (tournament_id, round_number, team_a_id, team_b_id, venue, scheduled_time, status, team_a_match_points, team_b_match_points, team_a_board_points, team_b_board_points, arbiter_name, result_approved, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'scheduled', 0, 0, 0, 0, ?, 0, CURRENT_TIMESTAMP)
             RETURNING *",
        )
        .bind(data.tournament_id)
        .bind(data.round_number)
        .bind(data.team_a_id)
        .bind(data.team_b_id)
        .bind(data.venue)
        .bind(data.scheduled_time)
        .bind(data.arbiter_name)
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn update_team_match(
        &self,
        data: UpdateTeamMatch,
    ) -> Result<TeamMatch, sqlx::Error> {
        let result = sqlx::query_as(
            "UPDATE team_matches SET
                status = COALESCE(?, status),
                venue = COALESCE(?, venue),
                scheduled_time = COALESCE(?, scheduled_time),
                team_a_match_points = COALESCE(?, team_a_match_points),
                team_b_match_points = COALESCE(?, team_b_match_points),
                team_a_board_points = COALESCE(?, team_a_board_points),
                team_b_board_points = COALESCE(?, team_b_board_points),
                arbiter_name = COALESCE(?, arbiter_name),
                arbiter_notes = COALESCE(?, arbiter_notes),
                result_approved = COALESCE(?, result_approved),
                approved_by = COALESCE(?, approved_by),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?
             RETURNING *",
        )
        .bind(data.status)
        .bind(data.venue)
        .bind(data.scheduled_time)
        .bind(data.team_a_match_points)
        .bind(data.team_b_match_points)
        .bind(data.team_a_board_points)
        .bind(data.team_b_board_points)
        .bind(data.arbiter_name)
        .bind(data.arbiter_notes)
        .bind(data.result_approved)
        .bind(data.approved_by)
        .bind(data.id)
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn get_team_match_by_id(
        &self,
        match_id: i32,
    ) -> Result<TeamMatch, sqlx::Error> {
        let result = sqlx::query_as("SELECT * FROM team_matches WHERE id = ?")
            .bind(match_id)
            .fetch_one(&self.pool)
            .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn get_team_matches(
        &self,
        tournament_id: i32,
        round_number: Option<i32>,
    ) -> Result<Vec<TeamMatch>, sqlx::Error> {
        let result = if let Some(round) = round_number {
            sqlx::query_as("SELECT * FROM team_matches WHERE tournament_id = ? AND round_number = ? ORDER BY id")
                .bind(tournament_id)
                .bind(round)
                .fetch_all(&self.pool)
                .await?
        } else {
            sqlx::query_as(
                "SELECT * FROM team_matches WHERE tournament_id = ? ORDER BY round_number, id",
            )
            .bind(tournament_id)
            .fetch_all(&self.pool)
            .await?
        };

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn create_team_lineup(
        &self,
        data: CreateTeamLineup,
    ) -> Result<TeamLineup, sqlx::Error> {
        let result = sqlx::query_as(
            "INSERT INTO team_lineups (team_id, round_number, board_number, player_id, is_substitute, substituted_player_id, submission_deadline, submitted_at, submitted_by, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, CURRENT_TIMESTAMP)
             RETURNING *",
        )
        .bind(data.team_id)
        .bind(data.round_number)
        .bind(data.board_number)
        .bind(data.player_id)
        .bind(data.is_substitute)
        .bind(data.substituted_player_id)
        .bind(data.submission_deadline)
        .bind(data.submitted_by)
        .bind(data.notes)
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn get_team_lineups(
        &self,
        team_id: i32,
        round_number: i32,
    ) -> Result<Vec<TeamLineup>, sqlx::Error> {
        let result = sqlx::query_as("SELECT * FROM team_lineups WHERE team_id = ? AND round_number = ? ORDER BY board_number")
            .bind(team_id)
            .bind(round_number)
            .fetch_all(&self.pool)
            .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn create_team_tournament_settings(
        &self,
        data: CreateTeamTournamentSettings,
    ) -> Result<TeamTournamentSettings, sqlx::Error> {
        let result = sqlx::query_as(
            "INSERT INTO team_tournament_settings (tournament_id, team_size, max_teams, match_scoring_system, match_points_win, match_points_draw, match_points_loss, board_weight_system, require_board_order, allow_late_entries, team_pairing_method, color_allocation, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             RETURNING *",
        )
        .bind(data.tournament_id)
        .bind(data.team_size)
        .bind(data.max_teams)
        .bind(data.match_scoring_system)
        .bind(data.match_points_win)
        .bind(data.match_points_draw)
        .bind(data.match_points_loss)
        .bind(data.board_weight_system)
        .bind(data.require_board_order)
        .bind(data.allow_late_entries)
        .bind(data.team_pairing_method)
        .bind(data.color_allocation)
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn update_team_tournament_settings(
        &self,
        data: UpdateTeamTournamentSettings,
    ) -> Result<TeamTournamentSettings, sqlx::Error> {
        let result = sqlx::query_as(
            "UPDATE team_tournament_settings SET
                team_size = COALESCE(?, team_size),
                max_teams = COALESCE(?, max_teams),
                match_scoring_system = COALESCE(?, match_scoring_system),
                match_points_win = COALESCE(?, match_points_win),
                match_points_draw = COALESCE(?, match_points_draw),
                match_points_loss = COALESCE(?, match_points_loss),
                board_weight_system = COALESCE(?, board_weight_system),
                require_board_order = COALESCE(?, require_board_order),
                allow_late_entries = COALESCE(?, allow_late_entries),
                team_pairing_method = COALESCE(?, team_pairing_method),
                color_allocation = COALESCE(?, color_allocation),
                updated_at = CURRENT_TIMESTAMP
             WHERE tournament_id = ?
             RETURNING *",
        )
        .bind(data.team_size)
        .bind(data.max_teams)
        .bind(data.match_scoring_system)
        .bind(data.match_points_win)
        .bind(data.match_points_draw)
        .bind(data.match_points_loss)
        .bind(data.board_weight_system)
        .bind(data.require_board_order)
        .bind(data.allow_late_entries)
        .bind(data.team_pairing_method)
        .bind(data.color_allocation)
        .bind(data.tournament_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    #[instrument(ret, skip(self))]
    async fn get_team_tournament_settings(
        &self,
        tournament_id: i32,
    ) -> Result<TeamTournamentSettings, sqlx::Error> {
        let result =
            sqlx::query_as("SELECT * FROM team_tournament_settings WHERE tournament_id = ?")
                .bind(tournament_id)
                .fetch_one(&self.pool)
                .await?;

        Ok(result)
    }
}
