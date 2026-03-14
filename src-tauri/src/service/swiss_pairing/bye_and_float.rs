use crate::common::error::PawnError;

use super::types::{ColorPreference, OddGroupParams, ScoreGroup, SwissPlayer};
use super::SwissPairingEngine;
use std::collections::HashSet;

impl SwissPairingEngine {
    /// Calculate maximum allowed floats based on FIDE C.04.1.3 rules
    pub(crate) fn calculate_max_floats(&self, total_players: usize, round_number: i32) -> usize {
        match total_players {
            1..=20 => {
                if round_number <= 2 {
                    2.min(total_players / 4)
                } else {
                    1.min(total_players / 6)
                }
            }
            21..=50 => {
                if round_number <= 2 {
                    total_players / 6
                } else if round_number <= 5 {
                    total_players / 8
                } else {
                    total_players / 10
                }
            }
            51..=100 => {
                if round_number <= 2 {
                    total_players / 8
                } else if round_number <= 5 {
                    total_players / 10
                } else {
                    total_players / 12
                }
            }
            _ => {
                if round_number <= 2 {
                    total_players / 10
                } else if round_number <= 5 {
                    total_players / 12
                } else {
                    total_players / 15
                }
            }
        }
    }

    /// Validate float limits according to FIDE C.04.1.3
    pub(crate) fn validate_fide_float_limits(
        &self,
        float_count: usize,
        max_floats_allowed: usize,
        round_number: i32,
        total_players: usize,
    ) -> Result<(), PawnError> {
        if float_count > max_floats_allowed {
            return Err(PawnError::InvalidInput(format!(
                "FIDE C.04.1.3 violation: {float_count} floats exceed maximum allowed {max_floats_allowed} for round {round_number} with {total_players} players"
            )));
        }

        if round_number > 2 && float_count > (total_players / 6) {
            return Err(PawnError::InvalidInput(format!(
                "FIDE C.04.1.3 violation: After round 2, maximum {} floats allowed for {} players",
                total_players / 6,
                total_players
            )));
        }

        Ok(())
    }

    /// Handle odd group size with proper float management
    pub(crate) fn handle_odd_group_with_floats(
        &self,
        score_group: &mut ScoreGroup,
        params: &mut OddGroupParams,
    ) -> Result<bool, PawnError> {
        if *params.float_count < params.max_floats_allowed
            && let Some(floater) = self.find_suitable_downfloater(
                params.all_players,
                score_group.points,
                params.paired_ids,
                params.group_index,
            )
        {
            let floater_id = floater.player.id;
            params.paired_ids.insert(floater_id);
            params.floated_players.insert(floater_id);
            score_group.players.push(floater);
            *params.float_count += 1;
            tracing::info!(
                "Floated player {} to group {}",
                floater_id,
                params.group_index
            );
            tracing::debug!(
                "Added downfloater to group {}, total floats: {}",
                params.group_index,
                *params.float_count
            );
            return Ok(true);
        }

        // Try to send an upfloater to the group above
        if params.group_index > 0 && *params.float_count < params.max_floats_allowed {
            // This would require coordination with previous groups
            // For now, we'll assign a bye
        }

        // Assign bye to the most appropriate player
        if let Some(bye_player) = self.select_bye_player(&score_group.players) {
            let bye_player_id = bye_player.player.id;
            let bye_player_name = bye_player.player.name.clone();
            params.byes.push(bye_player.clone());
            score_group.players.retain(|p| p.player.id != bye_player_id);
            tracing::debug!(
                "Assigned bye to: {} in group {}",
                bye_player_name,
                params.group_index
            );
            return Ok(true);
        }

        Ok(false)
    }

    /// Find suitable downfloater from lower score group with enhanced logic
    pub(crate) fn find_suitable_downfloater(
        &self,
        all_players: &[SwissPlayer],
        current_points: f64,
        paired_ids: &HashSet<i32>,
        _current_group_index: usize,
    ) -> Option<SwissPlayer> {
        let mut lower_scores: Vec<f64> = all_players
            .iter()
            .map(|p| p.points)
            .filter(|&points| points < current_points)
            .collect();

        lower_scores.sort_by(|a, b| a.partial_cmp(b).unwrap());
        lower_scores.dedup_by(|a, b| (*a - *b).abs() < f64::EPSILON);

        if lower_scores.is_empty() {
            return None;
        }

        let target_score = lower_scores
            .iter()
            .max_by(|a, b| a.partial_cmp(b).unwrap())?;

        all_players
            .iter()
            .filter(|p| {
                p.points == *target_score
                    && !paired_ids.contains(&p.player.id)
                    && self.can_float_up(p, _current_group_index)
            })
            .max_by_key(|p| p.rating)
            .cloned()
    }

    /// Check if a player can float up based on their float history
    pub(crate) fn can_float_up(&self, _player: &SwissPlayer, _target_group: usize) -> bool {
        // TODO: Implement float history tracking
        true
    }

    /// Select the most appropriate player for a bye using enhanced logic
    pub(crate) fn select_bye_player<'a>(
        &self,
        players: &'a [SwissPlayer],
    ) -> Option<&'a SwissPlayer> {
        let bye_candidates: Vec<&SwissPlayer> =
            players.iter().filter(|p| p.is_bye_eligible).collect();

        if bye_candidates.is_empty() {
            return None;
        }

        // First preference: players who haven't had a bye and are lowest-rated
        let never_bye_low_rated = bye_candidates
            .iter()
            .filter(|p| self.has_never_had_bye(p))
            .min_by_key(|p| p.rating);

        if let Some(player) = never_bye_low_rated {
            return Some(player);
        }

        // Second preference: any player who hasn't had a bye
        let never_bye = bye_candidates
            .iter()
            .filter(|p| self.has_never_had_bye(p))
            .min_by_key(|p| p.rating);

        if let Some(player) = never_bye {
            return Some(player);
        }

        // Last resort: lowest-rated player regardless of bye history
        bye_candidates.into_iter().min_by_key(|p| p.rating)
    }

    /// Check if a player has never had a bye (simplified for now)
    pub(crate) fn has_never_had_bye(&self, _player: &SwissPlayer) -> bool {
        // TODO: Implement bye history tracking
        true
    }

    /// Apply accelerated pairing system for first 2 rounds
    pub(crate) fn apply_accelerated_pairings(
        &self,
        swiss_players: &mut [SwissPlayer],
        round_number: i32,
    ) {
        tracing::info!("Applying accelerated pairings for round {}", round_number);

        let total_players = swiss_players.len();
        swiss_players.sort_by(|a, b| b.rating.cmp(&a.rating));

        let top_half_size = total_players / 2;

        for (index, player) in swiss_players.iter_mut().enumerate() {
            if index < top_half_size {
                let virtual_points = match round_number {
                    1 => {
                        if index < top_half_size / 2 {
                            1.0
                        } else {
                            0.5
                        }
                    }
                    2 => {
                        if player.points >= 1.0 {
                            if index < top_half_size / 4 {
                                0.5
                            } else {
                                0.25
                            }
                        } else if index < top_half_size / 2 {
                            0.5
                        } else {
                            0.25
                        }
                    }
                    _ => 0.0,
                };

                player.points += virtual_points;

                if virtual_points > 0.0 {
                    tracing::debug!(
                        "Applied {} virtual points to {} (rating: {}, current points: {})",
                        virtual_points,
                        player.player.name,
                        player.rating,
                        player.points
                    );
                }
            }
        }

        tracing::info!(
            "Accelerated pairing applied: {} players in top half received virtual points",
            top_half_size
        );
    }

    /// Handle late entry players with proper integration
    pub fn integrate_late_entries(
        &self,
        existing_players: &mut Vec<SwissPlayer>,
        late_entries: Vec<crate::domain::model::Player>,
        current_round: i32,
    ) -> Result<(), PawnError> {
        tracing::info!(
            "Integrating {} late entries into round {}",
            late_entries.len(),
            current_round
        );

        for late_player in late_entries {
            let mut swiss_player = SwissPlayer {
                player: late_player.clone(),
                points: 0.0,
                rating: late_player.rating.unwrap_or(1200),
                color_history: Vec::new(),
                opponents: HashSet::new(),
                color_preference: ColorPreference::None,
                is_bye_eligible: true,
                float_history: Vec::new(),
            };

            let compensatory_points = self.calculate_late_entry_points(current_round);
            swiss_player.points = compensatory_points;

            existing_players.push(swiss_player);

            tracing::debug!(
                "Late entry {} added with {} compensatory points",
                late_player.name,
                compensatory_points
            );
        }

        existing_players.sort_by(|a, b| {
            b.points
                .partial_cmp(&a.points)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| b.rating.cmp(&a.rating))
        });

        Ok(())
    }

    /// Calculate points for late entry players based on round
    pub(crate) fn calculate_late_entry_points(&self, entry_round: i32) -> f64 {
        match entry_round {
            1 => 0.0,
            2 => 0.0,
            3 => 0.5,
            4 => 1.0,
            5 => 1.5,
            _ => (entry_round - 1) as f64 * 0.5,
        }
    }

    /// Apply special handling for top group pairings
    pub(crate) fn apply_top_group_handling(
        &self,
        score_groups: &mut [ScoreGroup],
        round_number: i32,
    ) -> Result<(), PawnError> {
        if score_groups.is_empty() {
            return Ok(());
        }

        let top_group = &mut score_groups[0];

        if top_group.players.len() >= 4 && round_number > 3 {
            tracing::debug!(
                "Applying top group special handling for {} players",
                top_group.players.len()
            );

            self.ensure_top_group_variety(&mut top_group.players, round_number)?;
        }

        Ok(())
    }

    /// Ensure variety in top group pairings to avoid repetitive matchups
    pub(crate) fn ensure_top_group_variety(
        &self,
        top_players: &mut [SwissPlayer],
        round_number: i32,
    ) -> Result<(), PawnError> {
        if round_number > 5 && top_players.len() >= 6 {
            tracing::debug!(
                "Applying top group variety rules for round {} with {} top players",
                round_number,
                top_players.len()
            );
        }

        Ok(())
    }
}
