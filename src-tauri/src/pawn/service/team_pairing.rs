use crate::pawn::{
    common::error::PawnError,
    db::Db,
    domain::model::{Pairing, Player, Team, TeamLineup, TeamMatch},
};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tracing::{info, instrument, warn};

/// Enhanced team pairing engine with multiple algorithms
pub struct TeamPairingEngine<D> {
    db: Arc<D>,
}

/// Team pairing configuration
#[derive(Debug, Clone)]
pub struct TeamPairingConfig {
    pub pairing_method: TeamPairingMethod,
    pub color_allocation: ColorAllocation,
    pub board_order_policy: BoardOrderPolicy,
    pub allow_team_vs_team: bool,
    pub prevent_early_rematches: bool,
    pub max_score_difference: Option<f32>,
    pub prefer_balanced_matches: bool,
}

/// Team pairing methods
#[derive(Debug, Clone)]
pub enum TeamPairingMethod {
    Swiss,            // Swiss system between teams
    RoundRobin,       // Each team plays every other team once
    Scheveningen,     // Two groups play against each other
    Knockout,         // Elimination-based team matches
    DoubleRoundRobin, // Each team plays every other team twice
}

/// Color allocation strategies for team matches
#[derive(Debug, Clone)]
pub enum ColorAllocation {
    AlternatingBoards, // Alternate colors board by board
    AlternatingRounds, // Alternate colors round by round
    BalancedRotation,  // Optimize for overall color balance
    FixedBoards,       // Fixed color assignments per board
}

/// Board order policies
#[derive(Debug, Clone)]
pub enum BoardOrderPolicy {
    RatingDescending, // Highest rated player on board 1
    RatingAscending,  // Lowest rated player on board 1
    CaptainChoice,    // Team captain determines order
    Flexible,         // Allow changes between rounds
}

/// Team pairing result
#[derive(Debug)]
pub struct TeamPairingResult {
    pub team_matches: Vec<TeamMatch>,
    pub individual_pairings: Vec<Pairing>,
    pub bye_team: Option<Team>,
    pub pairing_quality: PairingQuality,
}

/// Quality metrics for team pairings
#[derive(Debug)]
pub struct PairingQuality {
    pub color_balance_score: f32,     // 0.0 to 1.0, higher is better
    pub rating_balance_score: f32,    // 0.0 to 1.0, higher is better
    pub rematch_avoidance_score: f32, // 0.0 to 1.0, higher is better
    pub overall_quality: f32,         // Weighted combination
}

/// Team match context for pairing decisions
#[derive(Debug)]
pub struct TeamMatchContext {
    pub team_a: Team,
    pub team_b: Team,
    pub team_a_players: Vec<Player>,
    pub team_b_players: Vec<Player>,
    pub previous_matches: Vec<TeamMatch>,
    pub round_number: i32,
}

impl<D: Db> TeamPairingEngine<D> {
    pub fn new(db: Arc<D>) -> Self {
        Self { db }
    }

    /// Generate team pairings using the configured method
    #[instrument(skip(self))]
    pub async fn generate_team_pairings(
        &self,
        tournament_id: i32,
        round_number: i32,
        config: TeamPairingConfig,
    ) -> Result<TeamPairingResult, PawnError> {
        info!(
            "Generating team pairings for tournament {} round {} using method: {:?}",
            tournament_id, round_number, config.pairing_method
        );

        let teams = self.db.get_teams_by_tournament(tournament_id).await?;
        let all_memberships = self.db.get_all_team_memberships(tournament_id).await?;
        let previous_matches = self.db.get_team_matches(tournament_id, None).await?;

        match config.pairing_method {
            TeamPairingMethod::Swiss => {
                self.generate_swiss_team_pairings(
                    teams,
                    all_memberships,
                    previous_matches,
                    round_number,
                    &config,
                )
                .await
            }
            TeamPairingMethod::RoundRobin => {
                self.generate_round_robin_team_pairings(
                    teams,
                    all_memberships,
                    round_number,
                    &config,
                )
                .await
            }
            TeamPairingMethod::Scheveningen => {
                self.generate_scheveningen_team_pairings(
                    teams,
                    all_memberships,
                    round_number,
                    &config,
                )
                .await
            }
            TeamPairingMethod::Knockout => {
                self.generate_knockout_team_pairings(
                    teams,
                    all_memberships,
                    previous_matches,
                    round_number,
                    &config,
                )
                .await
            }
            TeamPairingMethod::DoubleRoundRobin => {
                self.generate_double_round_robin_team_pairings(
                    teams,
                    all_memberships,
                    round_number,
                    &config,
                )
                .await
            }
        }
    }

    /// Generate Swiss system pairings between teams
    async fn generate_swiss_team_pairings(
        &self,
        teams: Vec<Team>,
        memberships: Vec<crate::pawn::domain::model::TeamMembership>,
        previous_matches: Vec<TeamMatch>,
        round_number: i32,
        config: &TeamPairingConfig,
    ) -> Result<TeamPairingResult, PawnError> {
        info!("Generating Swiss team pairings for {} teams", teams.len());

        // Calculate team scores from previous matches
        let team_scores = self.calculate_team_scores(&teams, &previous_matches);

        // Sort teams by score (descending) and rating (tiebreaker)
        let mut sorted_teams = teams.clone();
        sorted_teams.sort_by(|a, b| {
            let score_a = team_scores.get(&a.id).unwrap_or(&0.0);
            let score_b = team_scores.get(&b.id).unwrap_or(&0.0);

            score_b
                .partial_cmp(score_a)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| {
                    let rating_a = self.calculate_team_average_rating(&memberships, a.id);
                    let rating_b = self.calculate_team_average_rating(&memberships, b.id);
                    rating_b
                        .partial_cmp(&rating_a)
                        .unwrap_or(std::cmp::Ordering::Equal)
                })
        });

        // Group teams by similar scores
        let score_groups = self.create_score_groups(&sorted_teams, &team_scores);

        // Generate pairings within and between score groups
        let mut team_matches = Vec::new();
        let mut used_teams = HashSet::new();
        let mut bye_team = None;

        for group in score_groups {
            let available_teams: Vec<&Team> = group
                .iter()
                .filter(|t| !used_teams.contains(&t.id))
                .collect();

            if available_teams.len() == 1 {
                bye_team = Some(available_teams[0].clone());
                used_teams.insert(available_teams[0].id);
                continue;
            }

            // Pair teams within the group
            let group_pairings = self.pair_teams_in_group(
                &available_teams,
                &previous_matches,
                round_number,
                config,
            )?;

            for (team_a, team_b) in group_pairings {
                if !used_teams.contains(&team_a.id) && !used_teams.contains(&team_b.id) {
                    team_matches.push(TeamMatch {
                        id: 0, // Will be set by database
                        tournament_id: team_a.tournament_id,
                        round_number,
                        team_a_id: team_a.id,
                        team_b_id: team_b.id,
                        venue: None,
                        scheduled_time: None,
                        status: "scheduled".to_string(),
                        team_a_match_points: 0.0,
                        team_b_match_points: 0.0,
                        team_a_board_points: 0.0,
                        team_b_board_points: 0.0,
                        arbiter_name: None,
                        arbiter_notes: None,
                        result_approved: false,
                        approved_by: None,
                        approved_at: None,
                        created_at: chrono::Utc::now().to_rfc3339(),
                        updated_at: Some(chrono::Utc::now().to_rfc3339()),
                    });
                    used_teams.insert(team_a.id);
                    used_teams.insert(team_b.id);
                }
            }
        }

        // Generate individual board pairings for each team match
        let individual_pairings = self
            .generate_individual_board_pairings(&team_matches, &memberships, config)
            .await?;

        // Calculate pairing quality
        let pairing_quality = self.calculate_pairing_quality(
            &team_matches,
            &individual_pairings,
            &previous_matches,
            config,
        );

        Ok(TeamPairingResult {
            team_matches,
            individual_pairings,
            bye_team,
            pairing_quality,
        })
    }

    /// Generate round-robin team pairings
    async fn generate_round_robin_team_pairings(
        &self,
        teams: Vec<Team>,
        memberships: Vec<crate::pawn::domain::model::TeamMembership>,
        round_number: i32,
        config: &TeamPairingConfig,
    ) -> Result<TeamPairingResult, PawnError> {
        info!(
            "Generating round-robin team pairings for {} teams",
            teams.len()
        );

        let total_teams = teams.len();
        if total_teams < 2 {
            return Err(PawnError::InvalidInput(
                "Need at least 2 teams for round-robin".to_string(),
            ));
        }

        // Calculate total rounds needed
        let total_rounds = if total_teams % 2 == 0 {
            total_teams - 1
        } else {
            total_teams
        };

        if round_number > total_rounds as i32 {
            return Err(PawnError::InvalidInput(
                "Round number exceeds total rounds".to_string(),
            ));
        }

        // Use round-robin algorithm to generate pairings
        let mut team_matches = Vec::new();
        let mut bye_team = None;

        // If odd number of teams, one team gets a bye
        let working_teams = if total_teams % 2 == 1 {
            let bye_index = (round_number - 1) as usize % total_teams;
            bye_team = Some(teams[bye_index].clone());
            teams
                .iter()
                .enumerate()
                .filter(|(i, _)| *i != bye_index)
                .map(|(_, team)| team.clone())
                .collect()
        } else {
            teams.clone()
        };

        // Generate round-robin pairings using rotation method
        let pairings = self.generate_round_robin_rotation(&working_teams, round_number)?;

        for (team_a, team_b) in pairings {
            team_matches.push(TeamMatch {
                id: 0,
                tournament_id: team_a.tournament_id,
                round_number,
                team_a_id: team_a.id,
                team_b_id: team_b.id,
                venue: None,
                scheduled_time: None,
                status: "scheduled".to_string(),
                team_a_match_points: 0.0,
                team_b_match_points: 0.0,
                team_a_board_points: 0.0,
                team_b_board_points: 0.0,
                arbiter_name: None,
                arbiter_notes: None,
                result_approved: false,
                approved_by: None,
                approved_at: None,
                created_at: chrono::Utc::now().to_rfc3339(),
                updated_at: Some(chrono::Utc::now().to_rfc3339()),
            });
        }

        // Generate individual board pairings
        let individual_pairings = self
            .generate_individual_board_pairings(&team_matches, &memberships, config)
            .await?;

        // Calculate pairing quality
        let pairing_quality =
            self.calculate_pairing_quality(&team_matches, &individual_pairings, &[], config);

        Ok(TeamPairingResult {
            team_matches,
            individual_pairings,
            bye_team,
            pairing_quality,
        })
    }

    /// Generate Scheveningen team pairings (two groups play against each other)
    async fn generate_scheveningen_team_pairings(
        &self,
        teams: Vec<Team>,
        memberships: Vec<crate::pawn::domain::model::TeamMembership>,
        round_number: i32,
        config: &TeamPairingConfig,
    ) -> Result<TeamPairingResult, PawnError> {
        info!(
            "Generating Scheveningen team pairings for {} teams",
            teams.len()
        );

        if teams.len() % 2 != 0 {
            return Err(PawnError::InvalidInput(
                "Scheveningen requires even number of teams".to_string(),
            ));
        }

        // Split teams into two groups
        let mid_point = teams.len() / 2;
        let group_a = teams[..mid_point].to_vec();
        let group_b = teams[mid_point..].to_vec();

        // Each team from group A plays against each team from group B
        let mut team_matches = Vec::new();
        let teams_per_group = group_a.len();
        let total_rounds = teams_per_group as i32;

        if round_number > total_rounds {
            return Err(PawnError::InvalidInput(
                "Round number exceeds total rounds for Scheveningen".to_string(),
            ));
        }

        // Generate pairings for this round
        for (i, team_a) in group_a.iter().enumerate() {
            let opponent_index = (i + (round_number - 1) as usize) % teams_per_group;
            let team_b = &group_b[opponent_index];

            team_matches.push(TeamMatch {
                id: 0,
                tournament_id: team_a.tournament_id,
                round_number,
                team_a_id: team_a.id,
                team_b_id: team_b.id,
                venue: None,
                scheduled_time: None,
                status: "scheduled".to_string(),
                team_a_match_points: 0.0,
                team_b_match_points: 0.0,
                team_a_board_points: 0.0,
                team_b_board_points: 0.0,
                arbiter_name: None,
                arbiter_notes: None,
                result_approved: false,
                approved_by: None,
                approved_at: None,
                created_at: chrono::Utc::now().to_rfc3339(),
                updated_at: Some(chrono::Utc::now().to_rfc3339()),
            });
        }

        // Generate individual board pairings
        let individual_pairings = self
            .generate_individual_board_pairings(&team_matches, &memberships, config)
            .await?;

        // Calculate pairing quality
        let pairing_quality =
            self.calculate_pairing_quality(&team_matches, &individual_pairings, &[], config);

        Ok(TeamPairingResult {
            team_matches,
            individual_pairings,
            bye_team: None,
            pairing_quality,
        })
    }

    /// Generate knockout team pairings
    async fn generate_knockout_team_pairings(
        &self,
        teams: Vec<Team>,
        memberships: Vec<crate::pawn::domain::model::TeamMembership>,
        previous_matches: Vec<TeamMatch>,
        round_number: i32,
        config: &TeamPairingConfig,
    ) -> Result<TeamPairingResult, PawnError> {
        info!(
            "Generating knockout team pairings for {} teams",
            teams.len()
        );

        // Filter teams that haven't been eliminated
        let active_teams = self.filter_active_teams(&teams, &previous_matches);

        if active_teams.len() < 2 {
            return Err(PawnError::InvalidInput(
                "Not enough active teams for knockout round".to_string(),
            ));
        }

        // Pair teams based on bracket position or seeding
        let mut team_matches = Vec::new();
        let mut bye_team = None;

        // If odd number of teams, highest seeded team gets a bye
        let working_teams = if active_teams.len() % 2 == 1 {
            bye_team = Some(active_teams[0].clone());
            active_teams[1..].to_vec()
        } else {
            active_teams
        };

        // Generate knockout pairings (1 vs 2, 3 vs 4, etc.)
        for i in (0..working_teams.len()).step_by(2) {
            if i + 1 < working_teams.len() {
                let team_a = &working_teams[i];
                let team_b = &working_teams[i + 1];

                team_matches.push(TeamMatch {
                    id: 0,
                    tournament_id: team_a.tournament_id,
                    round_number,
                    team_a_id: team_a.id,
                    team_b_id: team_b.id,
                    venue: None,
                    scheduled_time: None,
                    status: "scheduled".to_string(),
                    team_a_match_points: 0.0,
                    team_b_match_points: 0.0,
                    team_a_board_points: 0.0,
                    team_b_board_points: 0.0,
                    arbiter_name: None,
                    arbiter_notes: None,
                    result_approved: false,
                    approved_by: None,
                    approved_at: None,
                    created_at: chrono::Utc::now().to_rfc3339(),
                    updated_at: Some(chrono::Utc::now().to_rfc3339()),
                });
            }
        }

        // Generate individual board pairings
        let individual_pairings = self
            .generate_individual_board_pairings(&team_matches, &memberships, config)
            .await?;

        // Calculate pairing quality
        let pairing_quality = self.calculate_pairing_quality(
            &team_matches,
            &individual_pairings,
            &previous_matches,
            config,
        );

        Ok(TeamPairingResult {
            team_matches,
            individual_pairings,
            bye_team,
            pairing_quality,
        })
    }

    /// Generate double round-robin team pairings
    async fn generate_double_round_robin_team_pairings(
        &self,
        teams: Vec<Team>,
        memberships: Vec<crate::pawn::domain::model::TeamMembership>,
        round_number: i32,
        config: &TeamPairingConfig,
    ) -> Result<TeamPairingResult, PawnError> {
        info!(
            "Generating double round-robin team pairings for {} teams",
            teams.len()
        );

        let total_teams = teams.len();
        if total_teams < 2 {
            return Err(PawnError::InvalidInput(
                "Need at least 2 teams for double round-robin".to_string(),
            ));
        }

        // Calculate total rounds needed (each team plays each other twice)
        let single_round_robin_rounds = if total_teams % 2 == 0 {
            total_teams - 1
        } else {
            total_teams
        };
        let total_rounds = single_round_robin_rounds * 2;

        if round_number > total_rounds as i32 {
            return Err(PawnError::InvalidInput(
                "Round number exceeds total rounds".to_string(),
            ));
        }

        // Determine if we're in the first or second cycle
        let is_second_cycle = round_number > single_round_robin_rounds as i32;
        let effective_round = if is_second_cycle {
            round_number - single_round_robin_rounds as i32
        } else {
            round_number
        };

        // Generate pairings using single round-robin logic
        let mut result = self
            .generate_round_robin_team_pairings(teams, memberships, effective_round, config)
            .await?;

        // In the second cycle, reverse colors for all matches
        if is_second_cycle {
            for pairing in &mut result.individual_pairings {
                // Swap white and black players
                if let Some(black_player) = pairing.black_player.take() {
                    let white_player = pairing.white_player.clone();
                    pairing.white_player = black_player;
                    pairing.black_player = Some(white_player);
                }
            }
        }

        Ok(result)
    }

    /// Generate individual board pairings within team matches
    async fn generate_individual_board_pairings(
        &self,
        team_matches: &[TeamMatch],
        memberships: &[crate::pawn::domain::model::TeamMembership],
        config: &TeamPairingConfig,
    ) -> Result<Vec<Pairing>, PawnError> {
        let mut pairings = Vec::new();

        for team_match in team_matches {
            // Get players for both teams
            let team_a_players = self.get_team_players(memberships, team_match.team_a_id);
            let team_b_players = self.get_team_players(memberships, team_match.team_b_id);

            // Generate board pairings based on configuration
            let board_pairings = self.generate_board_pairings(
                &team_a_players,
                &team_b_players,
                team_match.round_number,
                config,
            )?;

            pairings.extend(board_pairings);
        }

        Ok(pairings)
    }

    /// Generate pairings for individual boards within a team match
    fn generate_board_pairings(
        &self,
        team_a_players: &[Player],
        team_b_players: &[Player],
        round_number: i32,
        config: &TeamPairingConfig,
    ) -> Result<Vec<Pairing>, PawnError> {
        let mut pairings = Vec::new();
        let board_count = team_a_players.len().min(team_b_players.len());

        for board in 0..board_count {
            let team_a_player = &team_a_players[board];
            let team_b_player = &team_b_players[board];

            // Determine colors based on configuration
            let team_a_white = match config.color_allocation {
                ColorAllocation::AlternatingBoards => board % 2 == 0,
                ColorAllocation::AlternatingRounds => round_number % 2 == 1,
                ColorAllocation::BalancedRotation => {
                    // More complex logic for optimal color balance
                    (board + round_number as usize) % 2 == 0
                }
                ColorAllocation::FixedBoards => board % 2 == 0,
            };

            let (white_player, black_player) = if team_a_white {
                (team_a_player.clone(), team_b_player.clone())
            } else {
                (team_b_player.clone(), team_a_player.clone())
            };

            pairings.push(Pairing {
                white_player,
                black_player: Some(black_player),
                board_number: board as i32 + 1,
            });
        }

        Ok(pairings)
    }

    // Helper methods
    fn calculate_team_scores(
        &self,
        teams: &[Team],
        previous_matches: &[TeamMatch],
    ) -> HashMap<i32, f32> {
        let mut scores = HashMap::new();

        for team in teams {
            scores.insert(team.id, 0.0);
        }

        for team_match in previous_matches {
            // Use match points for team scoring
            *scores.entry(team_match.team_a_id).or_insert(0.0) +=
                team_match.team_a_match_points as f32;
            *scores.entry(team_match.team_b_id).or_insert(0.0) +=
                team_match.team_b_match_points as f32;
        }

        scores
    }

    fn calculate_team_average_rating(
        &self,
        memberships: &[crate::pawn::domain::model::TeamMembership],
        team_id: i32,
    ) -> f32 {
        let team_players: Vec<&crate::pawn::domain::model::TeamMembership> = memberships
            .iter()
            .filter(|m| m.team_id == team_id)
            .collect();

        if team_players.is_empty() {
            return 0.0;
        }

        let total_rating: i32 = team_players
            .iter()
            .map(|p| p.rating_at_assignment.unwrap_or(0))
            .sum();
        total_rating as f32 / team_players.len() as f32
    }

    fn create_score_groups(
        &self,
        teams: &[Team],
        team_scores: &HashMap<i32, f32>,
    ) -> Vec<Vec<Team>> {
        let mut groups = Vec::new();
        let mut current_group = Vec::new();
        let mut current_score: Option<f32> = None;

        for team in teams {
            let score = team_scores.get(&team.id).unwrap_or(&0.0);

            if current_score.is_none() || (current_score.unwrap() - *score).abs() < 0.1_f32 {
                current_group.push(team.clone());
                current_score = Some(*score);
            } else {
                if !current_group.is_empty() {
                    groups.push(current_group);
                }
                current_group = vec![team.clone()];
                current_score = Some(*score);
            }
        }

        if !current_group.is_empty() {
            groups.push(current_group);
        }

        groups
    }

    fn pair_teams_in_group(
        &self,
        teams: &[&Team],
        previous_matches: &[TeamMatch],
        round_number: i32,
        config: &TeamPairingConfig,
    ) -> Result<Vec<(Team, Team)>, PawnError> {
        let mut pairings = Vec::new();
        let mut used_indices = HashSet::new();

        for (i, team_a) in teams.iter().enumerate() {
            if used_indices.contains(&i) {
                continue;
            }

            for (j, team_b) in teams.iter().enumerate().skip(i + 1) {
                if used_indices.contains(&j) {
                    continue;
                }

                // Check if teams have played before (if rematch prevention is enabled)
                if config.prevent_early_rematches
                    && self.have_teams_played(team_a.id, team_b.id, previous_matches)
                {
                    continue;
                }

                pairings.push(((*team_a).clone(), (*team_b).clone()));
                used_indices.insert(i);
                used_indices.insert(j);
                break;
            }
        }

        Ok(pairings)
    }

    fn have_teams_played(
        &self,
        team_a_id: i32,
        team_b_id: i32,
        previous_matches: &[TeamMatch],
    ) -> bool {
        previous_matches.iter().any(|m| {
            (m.team_a_id == team_a_id && m.team_b_id == team_b_id)
                || (m.team_a_id == team_b_id && m.team_b_id == team_a_id)
        })
    }

    fn generate_round_robin_rotation(
        &self,
        teams: &[Team],
        round_number: i32,
    ) -> Result<Vec<(Team, Team)>, PawnError> {
        let mut pairings = Vec::new();
        let n = teams.len();

        if n < 2 {
            return Ok(pairings);
        }

        // Use round-robin rotation algorithm
        let mut positions = (0..n).collect::<Vec<_>>();

        // Rotate positions for the given round
        for _ in 1..round_number {
            let first = positions[0];
            positions[0] = positions[1];
            positions.rotate_left(1);
            positions[n - 1] = first;
        }

        // Create pairings
        for i in 0..n / 2 {
            let team_a = &teams[positions[i]];
            let team_b = &teams[positions[n - 1 - i]];
            pairings.push((team_a.clone(), team_b.clone()));
        }

        Ok(pairings)
    }

    fn filter_active_teams(&self, teams: &[Team], previous_matches: &[TeamMatch]) -> Vec<Team> {
        // For now, return all teams. In a real implementation, this would filter
        // based on elimination status from previous knockout rounds
        teams.to_vec()
    }

    fn get_team_players(
        &self,
        memberships: &[crate::pawn::domain::model::TeamMembership],
        team_id: i32,
    ) -> Vec<Player> {
        // For now, return an empty vector. This should be replaced with actual database queries
        // to get the real Player objects based on membership player_ids
        let team_members: Vec<&crate::pawn::domain::model::TeamMembership> = memberships
            .iter()
            .filter(|m| m.team_id == team_id)
            .collect();

        // Create placeholder players based on memberships
        team_members
            .iter()
            .map(|m| Player {
                id: m.player_id,
                tournament_id: 0, // This should be fetched from the database
                name: format!("Player {}", m.player_id), // Placeholder name
                rating: m.rating_at_assignment,
                country_code: None,
                title: None,
                birth_date: None,
                gender: None,
                email: None,
                phone: None,
                club: None,
                status: "active".to_string(),
                seed_number: None,
                pairing_number: None,
                initial_rating: m.rating_at_assignment,
                created_at: chrono::Utc::now().to_rfc3339(),
                updated_at: Some(chrono::Utc::now().to_rfc3339()),
            })
            .collect()
    }

    fn calculate_pairing_quality(
        &self,
        team_matches: &[TeamMatch],
        individual_pairings: &[Pairing],
        previous_matches: &[TeamMatch],
        config: &TeamPairingConfig,
    ) -> PairingQuality {
        // Calculate color balance score
        let color_balance_score = self.calculate_color_balance_score(individual_pairings);

        // Calculate rating balance score
        let rating_balance_score = self.calculate_rating_balance_score(individual_pairings);

        // Calculate rematch avoidance score
        let rematch_avoidance_score =
            self.calculate_rematch_avoidance_score(team_matches, previous_matches);

        // Calculate overall quality as weighted average
        let overall_quality = (color_balance_score * 0.3)
            + (rating_balance_score * 0.4)
            + (rematch_avoidance_score * 0.3);

        PairingQuality {
            color_balance_score,
            rating_balance_score,
            rematch_avoidance_score,
            overall_quality,
        }
    }

    fn calculate_color_balance_score(&self, pairings: &[Pairing]) -> f32 {
        if pairings.is_empty() {
            return 1.0;
        }

        // Simple color balance calculation
        // In a real implementation, this would be more sophisticated
        1.0 // Placeholder
    }

    fn calculate_rating_balance_score(&self, pairings: &[Pairing]) -> f32 {
        if pairings.is_empty() {
            return 1.0;
        }

        // Calculate rating differences and score balance
        let mut total_diff = 0.0;
        let mut count = 0;

        for pairing in pairings {
            if let Some(black_player) = &pairing.black_player {
                let white_rating = pairing.white_player.rating.unwrap_or(0) as f32;
                let black_rating = black_player.rating.unwrap_or(0) as f32;
                total_diff += (white_rating - black_rating).abs();
                count += 1;
            }
        }

        if count == 0 {
            return 1.0;
        }

        let avg_diff = total_diff / count as f32;
        // Convert to score where lower difference is better
        (400.0 - avg_diff.min(400.0)) / 400.0
    }

    fn calculate_rematch_avoidance_score(
        &self,
        team_matches: &[TeamMatch],
        previous_matches: &[TeamMatch],
    ) -> f32 {
        if team_matches.is_empty() {
            return 1.0;
        }

        let mut rematches = 0;
        for team_match in team_matches {
            if self.have_teams_played(team_match.team_a_id, team_match.team_b_id, previous_matches)
            {
                rematches += 1;
            }
        }

        1.0 - (rematches as f32 / team_matches.len() as f32)
    }
}

impl Default for TeamPairingConfig {
    fn default() -> Self {
        Self {
            pairing_method: TeamPairingMethod::Swiss,
            color_allocation: ColorAllocation::AlternatingBoards,
            board_order_policy: BoardOrderPolicy::RatingDescending,
            allow_team_vs_team: true,
            prevent_early_rematches: true,
            max_score_difference: Some(1.0),
            prefer_balanced_matches: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pawn::domain::model::*;
    use mockall::mock;

    mock! {
        TestDb {}

        #[async_trait::async_trait]
        impl Db for TestDb {
            async fn get_teams_by_tournament(&self, tournament_id: i32) -> Result<Vec<Team>, sqlx::Error>;
            async fn get_all_team_memberships(&self, tournament_id: i32) -> Result<Vec<TeamMembership>, sqlx::Error>;
            async fn get_team_matches(&self, tournament_id: i32, round_number: Option<i32>) -> Result<Vec<TeamMatch>, sqlx::Error>;
            // Add other required methods...
        }
    }

    #[tokio::test]
    async fn test_swiss_team_pairing() {
        let mut mock_db = MockTestDb::new();

        mock_db.expect_get_teams_by_tournament().returning(|_| {
            Ok(vec![
                Team {
                    id: 1,
                    tournament_id: 1,
                    name: "Team A".to_string(),
                    captain: Some("Captain 1".to_string()),
                    description: None,
                    color: None,
                    club_affiliation: None,
                    contact_email: None,
                    contact_phone: None,
                    max_board_count: 4,
                    status: "active".to_string(),
                    created_at: chrono::Utc::now().to_rfc3339(),
                    updated_at: Some(chrono::Utc::now().to_rfc3339()),
                },
                Team {
                    id: 2,
                    tournament_id: 1,
                    name: "Team B".to_string(),
                    captain: Some("Captain 2".to_string()),
                    description: None,
                    color: None,
                    club_affiliation: None,
                    contact_email: None,
                    contact_phone: None,
                    max_board_count: 4,
                    status: "active".to_string(),
                    created_at: chrono::Utc::now().to_rfc3339(),
                    updated_at: Some(chrono::Utc::now().to_rfc3339()),
                },
            ])
        });

        mock_db
            .expect_get_all_team_memberships()
            .returning(|_| Ok(vec![]));

        mock_db
            .expect_get_team_matches()
            .returning(|_, _| Ok(vec![]));

        let engine = TeamPairingEngine::new(Arc::new(mock_db));
        let config = TeamPairingConfig::default();

        let result = engine.generate_team_pairings(1, 1, config).await;
        assert!(result.is_ok());

        let pairing_result = result.unwrap();
        assert_eq!(pairing_result.team_matches.len(), 1);
        assert!(pairing_result.pairing_quality.overall_quality >= 0.0);
    }

    #[tokio::test]
    async fn test_round_robin_team_pairing() {
        let mut mock_db = MockTestDb::new();

        mock_db.expect_get_teams_by_tournament().returning(|_| {
            Ok(vec![
                Team {
                    id: 1,
                    tournament_id: 1,
                    name: "Team A".to_string(),
                    captain: Some("Captain 1".to_string()),
                    description: None,
                    color: None,
                    club_affiliation: None,
                    contact_email: None,
                    contact_phone: None,
                    max_board_count: 4,
                    status: "active".to_string(),
                    created_at: chrono::Utc::now().to_rfc3339(),
                    updated_at: Some(chrono::Utc::now().to_rfc3339()),
                },
                Team {
                    id: 2,
                    tournament_id: 1,
                    name: "Team B".to_string(),
                    captain: Some("Captain 2".to_string()),
                    description: None,
                    color: None,
                    club_affiliation: None,
                    contact_email: None,
                    contact_phone: None,
                    max_board_count: 4,
                    status: "active".to_string(),
                    created_at: chrono::Utc::now().to_rfc3339(),
                    updated_at: Some(chrono::Utc::now().to_rfc3339()),
                },
                Team {
                    id: 3,
                    tournament_id: 1,
                    name: "Team C".to_string(),
                    captain: Some("Captain 3".to_string()),
                    description: None,
                    color: None,
                    club_affiliation: None,
                    contact_email: None,
                    contact_phone: None,
                    max_board_count: 4,
                    status: "active".to_string(),
                    created_at: chrono::Utc::now().to_rfc3339(),
                    updated_at: Some(chrono::Utc::now().to_rfc3339()),
                },
            ])
        });

        mock_db
            .expect_get_all_team_memberships()
            .returning(|_| Ok(vec![]));

        let engine = TeamPairingEngine::new(Arc::new(mock_db));
        let config = TeamPairingConfig {
            pairing_method: TeamPairingMethod::RoundRobin,
            ..Default::default()
        };

        let result = engine.generate_team_pairings(1, 1, config).await;
        assert!(result.is_ok());

        let pairing_result = result.unwrap();
        assert_eq!(pairing_result.team_matches.len(), 1); // One match per round in round-robin
        assert!(pairing_result.bye_team.is_some()); // Odd number of teams
    }
}
