use crate::pawn::common::error::PawnError;
use crate::pawn::db::Db;
use crate::pawn::domain::dto::{
    AddPlayerToTeam, CreateTeam, CreateTeamLineup, CreateTeamMatch, CreateTeamTournamentSettings,
    RemovePlayerFromTeam, TeamSearchFilters, UpdateTeam, UpdateTeamMatch,
    UpdateTeamTournamentSettings,
};
use crate::pawn::domain::model::{
    Team, TeamLineup, TeamMatch, TeamMembership, TeamStanding, TeamTournamentSettings, Tournament,
};
use std::sync::Arc;
use tracing::{info, instrument, warn};

/// Statistics for team tournaments
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct TeamStatistics {
    pub total_teams: i32,
    pub active_teams: i32,
    pub withdrawn_teams: i32,
    pub disqualified_teams: i32,
    pub total_players: i32,
    pub matches_played: i32,
    pub matches_completed: i32,
    pub matches_scheduled: i32,
    pub average_team_rating: f64,
}

/// Team membership statistics
#[derive(Debug, Clone)]
pub struct TeamMembershipStatistics {
    pub total_members: i32,
    pub active_members: i32,
    pub reserve_members: i32,
    pub captain_count: i32,
    pub complete_teams: i32,
    pub incomplete_teams: i32,
}

/// Team match statistics
#[derive(Debug, Clone)]
pub struct TeamMatchStatistics {
    pub total_matches: i32,
    pub completed_matches: i32,
    pub scheduled_matches: i32,
    pub in_progress_matches: i32,
    pub postponed_matches: i32,
    pub cancelled_matches: i32,
    pub average_match_duration_minutes: f64,
}

pub struct TeamService<D> {
    db: Arc<D>,
}

impl<D: Db> TeamService<D> {
    pub fn new(db: Arc<D>) -> Self {
        Self { db }
    }

    /// Static method for validating team data (for testing)
    pub fn validate_team_data_static(data: &CreateTeam) -> Result<(), PawnError> {
        if data.name.trim().is_empty() {
            return Err(PawnError::ValidationError(
                "Team name cannot be empty".to_string(),
            ));
        }

        if data.name.len() > 100 {
            return Err(PawnError::ValidationError(
                "Team name cannot exceed 100 characters".to_string(),
            ));
        }

        if let Some(ref captain) = data.captain {
            if captain.trim().is_empty() {
                return Err(PawnError::ValidationError(
                    "Captain name cannot be empty".to_string(),
                ));
            }
        }

        if let Some(ref email) = data.contact_email {
            if !email.contains('@') {
                return Err(PawnError::ValidationError(
                    "Invalid email format".to_string(),
                ));
            }
        }

        Ok(())
    }

    /// Static method for validating status transitions (for testing)
    pub fn is_valid_status_transition_static(current_status: &str, new_status: &str) -> bool {
        match (current_status, new_status) {
            ("scheduled", "in_progress") => true,
            ("scheduled", "postponed") => true,
            ("scheduled", "cancelled") => true,
            ("in_progress", "completed") => true,
            ("in_progress", "postponed") => true,
            ("postponed", "scheduled") => true,
            ("postponed", "cancelled") => true,
            (current, new) if current == new => true,
            _ => false,
        }
    }

    /// Get a reference to the database for use in other services
    pub fn get_db(&self) -> &Arc<D> {
        &self.db
    }

    // =====================================================
    // Team CRUD Operations
    // =====================================================

    /// Create a new team with validation
    #[instrument(skip(self))]
    pub async fn create_team(&self, data: CreateTeam) -> Result<Team, PawnError> {
        info!("Creating team: {}", data.name);

        // Validate team data
        self.validate_team_data(&data)?;

        // Check if team name is unique within tournament
        if self
            .is_team_name_taken(data.tournament_id, &data.name)
            .await?
        {
            return Err(PawnError::ValidationError(format!(
                "Team name '{}' is already taken in this tournament",
                data.name
            )));
        }

        // Verify tournament exists and is a team tournament
        self.validate_tournament_for_teams(data.tournament_id)
            .await?;

        let team = self.db.create_team(data).await.map_err(PawnError::from)?;

        info!("Team created successfully: {} (ID: {})", team.name, team.id);
        Ok(team)
    }

    /// Update an existing team
    #[instrument(skip(self))]
    pub async fn update_team(&self, data: UpdateTeam) -> Result<Team, PawnError> {
        info!("Updating team ID: {}", data.id);

        // Validate that at least one field is being updated
        if data.name.is_none()
            && data.captain.is_none()
            && data.description.is_none()
            && data.color.is_none()
            && data.club_affiliation.is_none()
            && data.contact_email.is_none()
            && data.contact_phone.is_none()
            && data.max_board_count.is_none()
            && data.status.is_none()
        {
            return Err(PawnError::ValidationError(
                "No fields to update".to_string(),
            ));
        }

        // Validate the data if provided
        if let Some(ref name) = data.name {
            if name.trim().is_empty() {
                return Err(PawnError::ValidationError(
                    "Team name cannot be empty".to_string(),
                ));
            }

            // Check if new name is unique (if different from current)
            if let Ok(existing_team) = self.db.get_team_by_id(data.id).await {
                if existing_team.name != *name {
                    if self
                        .is_team_name_taken(existing_team.tournament_id, name)
                        .await?
                    {
                        return Err(PawnError::ValidationError(format!(
                            "Team name '{}' is already taken in this tournament",
                            name
                        )));
                    }
                }
            }
        }

        if let Some(max_board_count) = data.max_board_count {
            if max_board_count < 1 || max_board_count > 12 {
                return Err(PawnError::ValidationError(
                    "Max board count must be between 1 and 12".to_string(),
                ));
            }
        }

        if let Some(ref status) = data.status {
            if !["active", "withdrawn", "disqualified"].contains(&status.as_str()) {
                return Err(PawnError::ValidationError(
                    "Status must be active, withdrawn, or disqualified".to_string(),
                ));
            }
        }

        let team = self.db.update_team(data).await.map_err(PawnError::from)?;

        info!("Team updated successfully: {} (ID: {})", team.name, team.id);
        Ok(team)
    }

    /// Delete a team and all its memberships
    #[instrument(skip(self))]
    pub async fn delete_team(&self, team_id: i32) -> Result<(), PawnError> {
        info!("Deleting team ID: {}", team_id);

        // Check if team exists
        let team = self
            .db
            .get_team_by_id(team_id)
            .await
            .map_err(PawnError::from)?;

        // Check if team has active matches
        if self.has_active_matches(team_id).await? {
            return Err(PawnError::ValidationError(
                "Cannot delete team with active matches".to_string(),
            ));
        }

        // Delete team (cascade will handle memberships)
        self.db
            .delete_team(team_id)
            .await
            .map_err(PawnError::from)?;

        info!("Team deleted successfully: {} (ID: {})", team.name, team_id);
        Ok(())
    }

    /// Get team by ID
    #[instrument(skip(self))]
    pub async fn get_team_by_id(&self, team_id: i32) -> Result<Team, PawnError> {
        self.db
            .get_team_by_id(team_id)
            .await
            .map_err(PawnError::from)
    }

    /// Get all teams for a tournament
    #[instrument(skip(self))]
    pub async fn get_teams_by_tournament(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<Team>, PawnError> {
        self.db
            .get_teams_by_tournament(tournament_id)
            .await
            .map_err(PawnError::from)
    }

    /// Search teams with filters
    #[instrument(skip(self))]
    pub async fn search_teams(&self, filters: TeamSearchFilters) -> Result<Vec<Team>, PawnError> {
        self.db.search_teams(filters).await.map_err(PawnError::from)
    }

    // =====================================================
    // Team Membership Operations
    // =====================================================

    /// Add a player to a team
    #[instrument(skip(self))]
    pub async fn add_player_to_team(
        &self,
        data: AddPlayerToTeam,
    ) -> Result<TeamMembership, PawnError> {
        info!(
            "Adding player {} to team {} on board {}",
            data.player_id, data.team_id, data.board_number
        );

        // Validate team and player exist
        let team = self
            .db
            .get_team_by_id(data.team_id)
            .await
            .map_err(PawnError::from)?;
        let player = self
            .db
            .get_player_by_id(data.player_id)
            .await
            .map_err(PawnError::from)?;

        // Validate player belongs to the same tournament
        if player.tournament_id != team.tournament_id {
            return Err(PawnError::ValidationError(
                "Player must belong to the same tournament as the team".to_string(),
            ));
        }

        // Validate board number
        if data.board_number < 1 || data.board_number > team.max_board_count {
            return Err(PawnError::ValidationError(format!(
                "Board number must be between 1 and {}",
                team.max_board_count
            )));
        }

        // Check if player is already on another team
        if self
            .is_player_on_team(data.player_id, team.tournament_id)
            .await?
        {
            return Err(PawnError::ValidationError(
                "Player is already on another team in this tournament".to_string(),
            ));
        }

        // Check if board is already occupied
        if self
            .is_board_occupied(data.team_id, data.board_number)
            .await?
        {
            return Err(PawnError::ValidationError(format!(
                "Board {} is already occupied on this team",
                data.board_number
            )));
        }

        // Validate captain assignment
        if data.is_captain {
            if self.team_has_captain(data.team_id).await? {
                return Err(PawnError::ValidationError(
                    "Team already has a captain".to_string(),
                ));
            }
        }

        let membership = self
            .db
            .add_player_to_team(data)
            .await
            .map_err(PawnError::from)?;

        info!("Player added to team successfully");
        Ok(membership)
    }

    /// Remove a player from a team
    #[instrument(skip(self))]
    pub async fn remove_player_from_team(
        &self,
        data: RemovePlayerFromTeam,
    ) -> Result<(), PawnError> {
        info!(
            "Removing player {} from team {}",
            data.player_id, data.team_id
        );

        // Check if player is on the team
        if !self
            .is_player_on_specific_team(data.player_id, data.team_id)
            .await?
        {
            return Err(PawnError::ValidationError(
                "Player is not on this team".to_string(),
            ));
        }

        // Check if removal would violate tournament rules
        if self
            .has_active_lineups(data.team_id, data.player_id)
            .await?
        {
            return Err(PawnError::ValidationError(
                "Cannot remove player with active lineups".to_string(),
            ));
        }

        self.db
            .remove_player_from_team(data)
            .await
            .map_err(PawnError::from)?;

        info!("Player removed from team successfully");
        Ok(())
    }

    /// Get team memberships for a team
    #[instrument(skip(self))]
    pub async fn get_team_memberships(
        &self,
        team_id: i32,
    ) -> Result<Vec<TeamMembership>, PawnError> {
        self.db
            .get_team_memberships(team_id)
            .await
            .map_err(PawnError::from)
    }

    /// Get team membership statistics
    #[instrument(skip(self))]
    pub async fn get_team_membership_statistics(
        &self,
        tournament_id: i32,
    ) -> Result<TeamMembershipStatistics, PawnError> {
        let memberships = self
            .db
            .get_all_team_memberships(tournament_id)
            .await
            .map_err(PawnError::from)?;

        let total_members = memberships.len() as i32;
        let active_members = memberships.iter().filter(|m| m.status == "active").count() as i32;
        let reserve_members = memberships.iter().filter(|m| m.is_reserve).count() as i32;
        let captain_count = memberships.iter().filter(|m| m.is_captain).count() as i32;

        // Calculate complete/incomplete teams
        let teams = self.get_teams_by_tournament(tournament_id).await?;
        let mut complete_teams = 0;
        let mut incomplete_teams = 0;

        for team in teams {
            let team_memberships = self.get_team_memberships(team.id).await?;
            let active_count = team_memberships
                .iter()
                .filter(|m| m.status == "active")
                .count();

            if active_count >= team.max_board_count as usize {
                complete_teams += 1;
            } else {
                incomplete_teams += 1;
            }
        }

        Ok(TeamMembershipStatistics {
            total_members,
            active_members,
            reserve_members,
            captain_count,
            complete_teams,
            incomplete_teams,
        })
    }

    // =====================================================
    // Team Match Operations
    // =====================================================

    /// Create a team match
    #[instrument(skip(self))]
    pub async fn create_team_match(&self, data: CreateTeamMatch) -> Result<TeamMatch, PawnError> {
        info!(
            "Creating team match between teams {} and {}",
            data.team_a_id, data.team_b_id
        );

        // Validate teams exist and are in the same tournament
        let team_a = self
            .db
            .get_team_by_id(data.team_a_id)
            .await
            .map_err(PawnError::from)?;
        let team_b = self
            .db
            .get_team_by_id(data.team_b_id)
            .await
            .map_err(PawnError::from)?;

        if team_a.tournament_id != team_b.tournament_id {
            return Err(PawnError::ValidationError(
                "Teams must be in the same tournament".to_string(),
            ));
        }

        // Validate teams are different
        if data.team_a_id == data.team_b_id {
            return Err(PawnError::ValidationError(
                "Teams cannot play against themselves".to_string(),
            ));
        }

        // Check if match already exists for this round
        if self
            .match_exists(data.team_a_id, data.team_b_id, data.round_number)
            .await?
        {
            return Err(PawnError::ValidationError(
                "Match already exists between these teams in this round".to_string(),
            ));
        }

        let team_match = self
            .db
            .create_team_match(data)
            .await
            .map_err(PawnError::from)?;

        info!("Team match created successfully (ID: {})", team_match.id);
        Ok(team_match)
    }

    /// Update team match result
    #[instrument(skip(self))]
    pub async fn update_team_match(&self, data: UpdateTeamMatch) -> Result<TeamMatch, PawnError> {
        info!("Updating team match ID: {}", data.id);

        // Validate match exists
        let existing_match = self
            .db
            .get_team_match_by_id(data.id)
            .await
            .map_err(PawnError::from)?;

        // Validate status transition
        if let Some(ref new_status) = data.status {
            if !self.is_valid_status_transition(&existing_match.status, new_status) {
                return Err(PawnError::ValidationError(format!(
                    "Invalid status transition from {} to {}",
                    existing_match.status, new_status
                )));
            }
        }

        // Validate match points
        if let Some(team_a_points) = data.team_a_match_points {
            if team_a_points < 0.0 || team_a_points > 3.0 {
                return Err(PawnError::ValidationError(
                    "Team match points must be between 0 and 3".to_string(),
                ));
            }
        }

        if let Some(team_b_points) = data.team_b_match_points {
            if team_b_points < 0.0 || team_b_points > 3.0 {
                return Err(PawnError::ValidationError(
                    "Team match points must be between 0 and 3".to_string(),
                ));
            }
        }

        // Validate board points consistency
        if let (Some(a_match), Some(b_match), Some(a_board), Some(b_board)) = (
            data.team_a_match_points,
            data.team_b_match_points,
            data.team_a_board_points,
            data.team_b_board_points,
        ) {
            if (a_board + b_board) < (a_match + b_match) {
                warn!(
                    "Board points ({}) less than match points ({})",
                    a_board + b_board,
                    a_match + b_match
                );
            }
        }

        let team_match = self
            .db
            .update_team_match(data)
            .await
            .map_err(PawnError::from)?;

        info!("Team match updated successfully");
        Ok(team_match)
    }

    /// Get team matches for a tournament
    #[instrument(skip(self))]
    pub async fn get_team_matches(
        &self,
        tournament_id: i32,
        round_number: Option<i32>,
    ) -> Result<Vec<TeamMatch>, PawnError> {
        self.db
            .get_team_matches(tournament_id, round_number)
            .await
            .map_err(PawnError::from)
    }

    /// Get team match statistics
    #[instrument(skip(self))]
    pub async fn get_team_match_statistics(
        &self,
        tournament_id: i32,
    ) -> Result<TeamMatchStatistics, PawnError> {
        let matches = self.get_team_matches(tournament_id, None).await?;

        let total_matches = matches.len() as i32;
        let completed_matches = matches.iter().filter(|m| m.status == "completed").count() as i32;
        let scheduled_matches = matches.iter().filter(|m| m.status == "scheduled").count() as i32;
        let in_progress_matches =
            matches.iter().filter(|m| m.status == "in_progress").count() as i32;
        let postponed_matches = matches.iter().filter(|m| m.status == "postponed").count() as i32;
        let cancelled_matches = matches.iter().filter(|m| m.status == "cancelled").count() as i32;

        // Calculate average match duration (placeholder)
        let average_match_duration_minutes = 150.0; // Default 2.5 hours

        Ok(TeamMatchStatistics {
            total_matches,
            completed_matches,
            scheduled_matches,
            in_progress_matches,
            postponed_matches,
            cancelled_matches,
            average_match_duration_minutes,
        })
    }

    // =====================================================
    // Team Lineup Operations
    // =====================================================

    /// Create team lineup for a round
    #[instrument(skip(self))]
    pub async fn create_team_lineup(
        &self,
        data: CreateTeamLineup,
    ) -> Result<TeamLineup, PawnError> {
        info!(
            "Creating team lineup for team {} round {}",
            data.team_id, data.round_number
        );

        // Validate team exists
        let team = self
            .db
            .get_team_by_id(data.team_id)
            .await
            .map_err(PawnError::from)?;

        // Validate board number
        if data.board_number < 1 || data.board_number > team.max_board_count {
            return Err(PawnError::ValidationError(format!(
                "Board number must be between 1 and {}",
                team.max_board_count
            )));
        }

        // Validate player is on the team
        if !self
            .is_player_on_specific_team(data.player_id, data.team_id)
            .await?
        {
            return Err(PawnError::ValidationError(
                "Player is not on this team".to_string(),
            ));
        }

        // Check if lineup already exists for this board and round
        if self
            .lineup_exists(data.team_id, data.round_number, data.board_number)
            .await?
        {
            return Err(PawnError::ValidationError(format!(
                "Lineup already exists for board {} in round {}",
                data.board_number, data.round_number
            )));
        }

        // Validate substitution logic if applicable
        if data.is_substitute {
            if let Some(substituted_player_id) = data.substituted_player_id {
                if !self
                    .is_player_on_specific_team(substituted_player_id, data.team_id)
                    .await?
                {
                    return Err(PawnError::ValidationError(
                        "Substituted player is not on this team".to_string(),
                    ));
                }
            } else {
                return Err(PawnError::ValidationError(
                    "Substituted player must be specified for substitutions".to_string(),
                ));
            }
        }

        let lineup = self
            .db
            .create_team_lineup(data)
            .await
            .map_err(PawnError::from)?;

        info!("Team lineup created successfully");
        Ok(lineup)
    }

    /// Get team lineups for a team and round
    #[instrument(skip(self))]
    pub async fn get_team_lineups(
        &self,
        team_id: i32,
        round_number: i32,
    ) -> Result<Vec<TeamLineup>, PawnError> {
        self.db
            .get_team_lineups(team_id, round_number)
            .await
            .map_err(PawnError::from)
    }

    // =====================================================
    // Team Tournament Settings Operations
    // =====================================================

    /// Create team tournament settings
    #[instrument(skip(self))]
    pub async fn create_team_tournament_settings(
        &self,
        data: CreateTeamTournamentSettings,
    ) -> Result<TeamTournamentSettings, PawnError> {
        info!(
            "Creating team tournament settings for tournament {}",
            data.tournament_id
        );

        // Validate tournament exists and is a team tournament
        self.validate_tournament_for_teams(data.tournament_id)
            .await?;

        // Validate settings data
        self.validate_tournament_settings(&data)?;

        let settings = self
            .db
            .create_team_tournament_settings(data)
            .await
            .map_err(PawnError::from)?;

        info!("Team tournament settings created successfully");
        Ok(settings)
    }

    /// Update team tournament settings
    #[instrument(skip(self))]
    pub async fn update_team_tournament_settings(
        &self,
        data: UpdateTeamTournamentSettings,
    ) -> Result<TeamTournamentSettings, PawnError> {
        info!(
            "Updating team tournament settings for tournament {}",
            data.tournament_id
        );

        // Validate at least one field is being updated
        if data.team_size.is_none()
            && data.max_teams.is_none()
            && data.match_scoring_system.is_none()
        {
            return Err(PawnError::ValidationError(
                "No fields to update".to_string(),
            ));
        }

        let settings = self
            .db
            .update_team_tournament_settings(data)
            .await
            .map_err(PawnError::from)?;

        info!("Team tournament settings updated successfully");
        Ok(settings)
    }

    /// Get team tournament settings
    #[instrument(skip(self))]
    pub async fn get_team_tournament_settings(
        &self,
        tournament_id: i32,
    ) -> Result<TeamTournamentSettings, PawnError> {
        self.db
            .get_team_tournament_settings(tournament_id)
            .await
            .map_err(PawnError::from)
    }

    // =====================================================
    // Team Statistics Operations
    // =====================================================

    /// Get comprehensive team statistics for a tournament
    #[instrument(skip(self))]
    pub async fn get_team_statistics(
        &self,
        tournament_id: i32,
    ) -> Result<TeamStatistics, PawnError> {
        let teams = self.get_teams_by_tournament(tournament_id).await?;

        let total_teams = teams.len() as i32;
        let active_teams = teams.iter().filter(|t| t.status == "active").count() as i32;
        let withdrawn_teams = teams.iter().filter(|t| t.status == "withdrawn").count() as i32;
        let disqualified_teams = teams.iter().filter(|t| t.status == "disqualified").count() as i32;

        // Calculate total players across all teams
        let mut total_players = 0;
        let mut total_rating = 0.0;
        let mut rated_players = 0;

        for team in &teams {
            let memberships = self.get_team_memberships(team.id).await?;
            total_players += memberships.len() as i32;

            for membership in memberships {
                if let Some(rating) = membership.rating_at_assignment {
                    total_rating += rating as f64;
                    rated_players += 1;
                }
            }
        }

        let average_team_rating = if rated_players > 0 {
            total_rating / rated_players as f64
        } else {
            0.0
        };

        // Get match statistics
        let matches = self.get_team_matches(tournament_id, None).await?;
        let matches_played = matches.len() as i32;
        let matches_completed = matches.iter().filter(|m| m.status == "completed").count() as i32;
        let matches_scheduled = matches.iter().filter(|m| m.status == "scheduled").count() as i32;

        Ok(TeamStatistics {
            total_teams,
            active_teams,
            withdrawn_teams,
            disqualified_teams,
            total_players,
            matches_played,
            matches_completed,
            matches_scheduled,
            average_team_rating,
        })
    }

    // =====================================================
    // Private Helper Methods
    // =====================================================

    /// Validate basic team data
    fn validate_team_data(&self, data: &CreateTeam) -> Result<(), PawnError> {
        if data.name.trim().is_empty() {
            return Err(PawnError::ValidationError(
                "Team name cannot be empty".to_string(),
            ));
        }

        if data.name.len() > 100 {
            return Err(PawnError::ValidationError(
                "Team name cannot exceed 100 characters".to_string(),
            ));
        }

        if let Some(ref captain) = data.captain {
            if captain.trim().is_empty() {
                return Err(PawnError::ValidationError(
                    "Captain name cannot be empty".to_string(),
                ));
            }
        }

        if let Some(ref email) = data.contact_email {
            if !email.contains('@') {
                return Err(PawnError::ValidationError(
                    "Invalid email format".to_string(),
                ));
            }
        }

        Ok(())
    }

    /// Validate tournament settings
    fn validate_tournament_settings(
        &self,
        data: &CreateTeamTournamentSettings,
    ) -> Result<(), PawnError> {
        if data.team_size < 1 || data.team_size > 12 {
            return Err(PawnError::ValidationError(
                "Team size must be between 1 and 12".to_string(),
            ));
        }

        if let Some(max_teams) = data.max_teams {
            if max_teams < 2 || max_teams > 100 {
                return Err(PawnError::ValidationError(
                    "Max teams must be between 2 and 100".to_string(),
                ));
            }
        }

        if !["match_points", "board_points", "olympic_points", "custom"]
            .contains(&data.match_scoring_system.as_str())
        {
            return Err(PawnError::ValidationError(
                "Invalid match scoring system".to_string(),
            ));
        }

        Ok(())
    }

    /// Check if team name is already taken in tournament
    async fn is_team_name_taken(&self, tournament_id: i32, name: &str) -> Result<bool, PawnError> {
        let teams = self.get_teams_by_tournament(tournament_id).await?;
        Ok(teams
            .iter()
            .any(|t| t.name.to_lowercase() == name.to_lowercase()))
    }

    /// Validate tournament supports teams
    async fn validate_tournament_for_teams(&self, tournament_id: i32) -> Result<(), PawnError> {
        let tournament = self
            .db
            .get_tournament_by_id(tournament_id)
            .await
            .map_err(PawnError::from)?;

        if !tournament.is_team_tournament.unwrap_or(false) {
            return Err(PawnError::ValidationError(
                "Tournament is not configured for team play".to_string(),
            ));
        }

        Ok(())
    }

    /// Check if player is on any team in the tournament
    async fn is_player_on_team(
        &self,
        player_id: i32,
        tournament_id: i32,
    ) -> Result<bool, PawnError> {
        let teams = self.get_teams_by_tournament(tournament_id).await?;

        for team in teams {
            let memberships = self.get_team_memberships(team.id).await?;
            if memberships.iter().any(|m| m.player_id == player_id) {
                return Ok(true);
            }
        }

        Ok(false)
    }

    /// Check if player is on a specific team
    async fn is_player_on_specific_team(
        &self,
        player_id: i32,
        team_id: i32,
    ) -> Result<bool, PawnError> {
        let memberships = self.get_team_memberships(team_id).await?;
        Ok(memberships.iter().any(|m| m.player_id == player_id))
    }

    /// Check if board is already occupied
    async fn is_board_occupied(&self, team_id: i32, board_number: i32) -> Result<bool, PawnError> {
        let memberships = self.get_team_memberships(team_id).await?;
        Ok(memberships
            .iter()
            .any(|m| m.board_number == board_number && m.status == "active"))
    }

    /// Check if team already has a captain
    async fn team_has_captain(&self, team_id: i32) -> Result<bool, PawnError> {
        let memberships = self.get_team_memberships(team_id).await?;
        Ok(memberships.iter().any(|m| m.is_captain))
    }

    /// Check if team has active matches
    async fn has_active_matches(&self, team_id: i32) -> Result<bool, PawnError> {
        let team = self.get_team_by_id(team_id).await?;
        let matches = self.get_team_matches(team.tournament_id, None).await?;

        Ok(matches.iter().any(|m| {
            (m.team_a_id == team_id || m.team_b_id == team_id)
                && !["completed", "cancelled"].contains(&m.status.as_str())
        }))
    }

    /// Check if player has active lineups
    async fn has_active_lineups(&self, team_id: i32, player_id: i32) -> Result<bool, PawnError> {
        // This would need implementation to check if player has lineups in future rounds
        // For now, return false as a placeholder
        Ok(false)
    }

    /// Check if match exists between teams in a round
    async fn match_exists(
        &self,
        team_a_id: i32,
        team_b_id: i32,
        round_number: i32,
    ) -> Result<bool, PawnError> {
        let team_a = self.get_team_by_id(team_a_id).await?;
        let matches = self
            .get_team_matches(team_a.tournament_id, Some(round_number))
            .await?;

        Ok(matches.iter().any(|m| {
            (m.team_a_id == team_a_id && m.team_b_id == team_b_id)
                || (m.team_a_id == team_b_id && m.team_b_id == team_a_id)
        }))
    }

    /// Check if lineup exists for team, round, and board
    async fn lineup_exists(
        &self,
        team_id: i32,
        round_number: i32,
        board_number: i32,
    ) -> Result<bool, PawnError> {
        let lineups = self.get_team_lineups(team_id, round_number).await?;
        Ok(lineups.iter().any(|l| l.board_number == board_number))
    }

    /// Validate team match status transitions
    fn is_valid_status_transition(&self, current_status: &str, new_status: &str) -> bool {
        match (current_status, new_status) {
            ("scheduled", "in_progress") => true,
            ("scheduled", "postponed") => true,
            ("scheduled", "cancelled") => true,
            ("in_progress", "completed") => true,
            ("in_progress", "postponed") => true,
            ("postponed", "scheduled") => true,
            ("postponed", "cancelled") => true,
            (current, new) if current == new => true,
            _ => false,
        }
    }

    /// Get team match by ID
    pub async fn get_team_match_by_id(&self, match_id: i32) -> Result<TeamMatch, PawnError> {
        self.db
            .get_team_match_by_id(match_id)
            .await
            .map_err(PawnError::from)
    }

    /// Get all team memberships for a tournament
    pub async fn get_all_team_memberships(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<TeamMembership>, PawnError> {
        self.db
            .get_all_team_memberships(tournament_id)
            .await
            .map_err(PawnError::from)
    }

    /// Get team standings for a tournament
    pub async fn get_team_standings(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<TeamStanding>, PawnError> {
        // For now, return a simplified standings list based on teams
        // This could be enhanced with actual match results and scoring
        let teams = self.get_teams_by_tournament(tournament_id).await?;

        let mut standings = Vec::new();
        for (index, team) in teams.iter().enumerate() {
            let memberships = self.get_team_memberships(team.id).await?;
            let member_count = memberships.len() as i32;

            standings.push(TeamStanding {
                team: team.clone(),
                points: 0.0,         // Will be calculated from actual matches
                match_points: 0.0,   // Will be calculated from actual matches
                board_points: 0.0,   // Will be calculated from actual games
                games_played: 0,     // Will be calculated from actual games
                matches_won: 0,      // Will be calculated from actual matches
                matches_drawn: 0,    // Will be calculated from actual matches
                matches_lost: 0,     // Will be calculated from actual matches
                players: Vec::new(), // Will be populated from memberships
            });
        }

        Ok(standings)
    }

    /// Validate team lineup for a round
    pub async fn validate_team_lineup(
        &self,
        team_id: i32,
        round_number: i32,
    ) -> Result<bool, PawnError> {
        let lineups = self.get_team_lineups(team_id, round_number).await?;

        // Basic validation: check if lineups exist and are valid
        if lineups.is_empty() {
            return Ok(false);
        }

        // Check for duplicate board numbers
        let mut board_numbers = std::collections::HashSet::new();
        for lineup in &lineups {
            if board_numbers.contains(&lineup.board_number) {
                return Ok(false); // Duplicate board number
            }
            board_numbers.insert(lineup.board_number);
        }

        Ok(true)
    }

    /// Validate team board order for a round
    pub async fn validate_team_board_order(
        &self,
        team_id: i32,
        round_number: i32,
    ) -> Result<bool, PawnError> {
        let lineups = self.get_team_lineups(team_id, round_number).await?;

        if lineups.is_empty() {
            return Ok(false);
        }

        // Check if board numbers are sequential starting from 1
        let mut sorted_lineups = lineups.clone();
        sorted_lineups.sort_by_key(|l| l.board_number);

        for (index, lineup) in sorted_lineups.iter().enumerate() {
            if lineup.board_number != (index + 1) as i32 {
                return Ok(false); // Board numbers must be sequential
            }
        }

        Ok(true)
    }
}

// =====================================================
// Unit Tests
// =====================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_team() -> Team {
        Team {
            id: 1,
            tournament_id: 1,
            name: "Test Team".to_string(),
            captain: Some("Test Captain".to_string()),
            description: Some("Test Description".to_string()),
            color: Some("#FF0000".to_string()),
            club_affiliation: Some("Test Club".to_string()),
            contact_email: Some("test@example.com".to_string()),
            contact_phone: Some("123-456-7890".to_string()),
            max_board_count: 4,
            status: "active".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: Some("2024-01-01T00:00:00Z".to_string()),
        }
    }

    fn create_test_tournament() -> Tournament {
        Tournament {
            id: 1,
            name: "Test Tournament".to_string(),
            location: "Test Location".to_string(),
            date: "2024-01-01".to_string(),
            time_type: "classical".to_string(),
            tournament_type: Some("swiss".to_string()),
            player_count: 16,
            rounds_played: 0,
            total_rounds: 7,
            country_code: "US".to_string(),
            status: Some("active".to_string()),
            start_time: Some("10:00".to_string()),
            end_time: Some("18:00".to_string()),
            description: Some("Test Description".to_string()),
            website_url: Some("https://test.com".to_string()),
            contact_email: Some("contact@test.com".to_string()),
            entry_fee: Some(50.0),
            currency: Some("USD".to_string()),
            is_team_tournament: Some(true),
            team_size: Some(4),
            max_teams: Some(8),
        }
    }

    #[test]
    fn test_validate_team_data() {
        // Test invalid team data - empty name
        let invalid_data = CreateTeam {
            tournament_id: 1,
            name: "".to_string(),
            captain: None,
            description: None,
            color: None,
            club_affiliation: None,
            contact_email: None,
            contact_phone: None,
            max_board_count: 4,
        };

        assert!(TeamService::<()>::validate_team_data_static(&invalid_data).is_err());

        // Test valid team data
        let valid_data = CreateTeam {
            tournament_id: 1,
            name: "Valid Team".to_string(),
            captain: Some("Valid Captain".to_string()),
            description: Some("Valid Description".to_string()),
            color: Some("#FF0000".to_string()),
            club_affiliation: Some("Valid Club".to_string()),
            contact_email: Some("valid@example.com".to_string()),
            contact_phone: Some("123-456-7890".to_string()),
            max_board_count: 4,
        };

        assert!(TeamService::<()>::validate_team_data_static(&valid_data).is_ok());
    }

    #[test]
    fn test_is_valid_status_transition() {
        // Test valid transitions
        assert!(TeamService::<()>::is_valid_status_transition_static(
            "scheduled",
            "in_progress"
        ));
        assert!(TeamService::<()>::is_valid_status_transition_static(
            "scheduled",
            "postponed"
        ));
        assert!(TeamService::<()>::is_valid_status_transition_static(
            "in_progress",
            "completed"
        ));
        assert!(TeamService::<()>::is_valid_status_transition_static(
            "postponed",
            "scheduled"
        ));

        // Test invalid transitions
        assert!(!TeamService::<()>::is_valid_status_transition_static(
            "completed",
            "in_progress"
        ));
        assert!(!TeamService::<()>::is_valid_status_transition_static(
            "cancelled",
            "scheduled"
        ));
        assert!(!TeamService::<()>::is_valid_status_transition_static(
            "in_progress",
            "scheduled"
        ));
    }

    // Additional tests would go here, but require database integration
    // Use integration tests in tests/ directory for comprehensive testing
}
