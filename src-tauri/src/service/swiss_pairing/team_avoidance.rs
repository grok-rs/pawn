use crate::common::error::PawnError;
use crate::domain::model::Pairing;

use super::types::SwissPlayer;
use super::SwissPairingEngine;

impl SwissPairingEngine {
    /// Validate team avoidance according to FIDE international tournament rules
    pub(crate) fn validate_fide_team_avoidance(
        &self,
        pairings: &[Pairing],
        players: &[SwissPlayer],
        round_number: i32,
    ) -> Result<(), PawnError> {
        let mut validation_errors = Vec::new();
        let mut same_club_violations = 0;
        let mut same_federation_violations = 0;

        for pairing in pairings {
            let white_player = &pairing.white_player;
            if let Some(black_player) = &pairing.black_player {
                let white_swiss = players.iter().find(|p| p.player.id == white_player.id);
                let black_swiss = players.iter().find(|p| p.player.id == black_player.id);

                if let (Some(white), Some(black)) = (white_swiss, black_swiss) {
                    if self.are_same_club(white, black) {
                        same_club_violations += 1;
                        validation_errors.push(format!(
                            "Same club pairing: {} vs {} (both from '{}')",
                            white_player.name,
                            black_player.name,
                            white.player.club.as_ref().unwrap_or(&"Unknown".to_string())
                        ));
                    } else if self.should_avoid_same_federation(white, black) {
                        same_federation_violations += 1;
                        validation_errors.push(format!(
                            "Same federation pairing: {} vs {} (both from {})",
                            white_player.name,
                            black_player.name,
                            white
                                .player
                                .country_code
                                .as_ref()
                                .unwrap_or(&"Unknown".to_string())
                        ));
                    }
                }
            }
        }

        let total_pairings = pairings.iter().filter(|p| p.black_player.is_some()).count();

        let max_allowed_federation_violations =
            self.calculate_max_federation_violations(total_pairings, round_number);
        let max_allowed_club_violations =
            self.calculate_max_club_violations(total_pairings, round_number);

        if same_club_violations > max_allowed_club_violations {
            validation_errors.insert(0, format!(
                "FIDE team avoidance violation: {same_club_violations} same-club pairings exceed maximum of {max_allowed_club_violations} allowed"
            ));
        }

        if same_federation_violations > max_allowed_federation_violations {
            validation_errors.insert(0, format!(
                "FIDE federation avoidance violation: {same_federation_violations} same-federation pairings exceed maximum of {max_allowed_federation_violations} allowed"
            ));
        }

        if !validation_errors.is_empty() {
            return Err(PawnError::InvalidInput(format!(
                "FIDE team avoidance violations: {}",
                validation_errors.join("; ")
            )));
        }

        Ok(())
    }

    /// Calculate maximum allowed federation violations based on FIDE rules
    pub(crate) fn calculate_max_federation_violations(
        &self,
        total_pairings: usize,
        round_number: i32,
    ) -> usize {
        let base_percentage = if round_number <= 3 {
            0.05
        } else if round_number <= 7 {
            0.10
        } else {
            0.15
        };

        (total_pairings as f64 * base_percentage).ceil() as usize
    }

    /// Calculate maximum allowed club violations (should be very rare)
    pub(crate) fn calculate_max_club_violations(
        &self,
        total_pairings: usize,
        _round_number: i32,
    ) -> usize {
        std::cmp::max(1, total_pairings / 50)
    }

    /// Check if two players are from the same team/club
    pub(crate) fn are_teammates(&self, player1: &SwissPlayer, player2: &SwissPlayer) -> bool {
        if self.are_same_club(player1, player2) {
            return true;
        }
        if self.should_avoid_same_federation(player1, player2) {
            return true;
        }
        false
    }

    /// Check if players are from the same club/team
    pub(crate) fn are_same_club(&self, player1: &SwissPlayer, player2: &SwissPlayer) -> bool {
        if let (Some(club1), Some(club2)) = (&player1.player.club, &player2.player.club) {
            if club1 == club2 && !club1.is_empty() && !self.is_generic_club_name(club1) {
                return true;
            }
        }
        false
    }

    /// Check if players are from same federation and should be avoided
    pub(crate) fn should_avoid_same_federation(
        &self,
        player1: &SwissPlayer,
        player2: &SwissPlayer,
    ) -> bool {
        if let (Some(country1), Some(country2)) =
            (&player1.player.country_code, &player2.player.country_code)
            && country1 == country2
            && !country1.is_empty()
        {
            return self.get_federation_avoidance_level(country1);
        }
        false
    }

    /// Determine federation avoidance level based on FIDE international tournament rules
    pub(crate) fn get_federation_avoidance_level(&self, country_code: &str) -> bool {
        let major_federations = [
            "RUS", "USA", "CHN", "IND", "FRA", "GER", "UKR", "ARM", "IRA", "BRA", "POL", "ESP",
            "HUN", "CZE", "NED", "NOR", "SWE", "ITA", "ISR", "CAN", "AZE", "GEO", "LTU", "LAT",
            "EST", "BUL", "ROU", "TUR", "GRE", "CRO",
        ];

        if major_federations.contains(&country_code) {
            return self.should_apply_federation_avoidance();
        }

        true
    }

    /// Determine if federation avoidance should be applied (configurable)
    pub(crate) fn should_apply_federation_avoidance(&self) -> bool {
        // TODO: Make this configurable based on tournament settings
        true
    }

    /// Check if club name is generic and shouldn't trigger avoidance
    pub(crate) fn is_generic_club_name(&self, club_name: &str) -> bool {
        let generic_names = [
            "Unaffiliated",
            "Independent",
            "No Club",
            "Individual",
            "Private",
            "Local Club",
            "Chess Club",
            "Unknown",
            "N/A",
            "None",
            "TBD",
        ];

        let normalized = club_name.trim().to_lowercase();
        generic_names
            .iter()
            .any(|&generic| normalized.contains(&generic.to_lowercase()))
    }

    /// Enhanced team avoidance scoring with multiple penalty levels
    pub(crate) fn calculate_team_avoidance_penalty(
        &self,
        player1: &SwissPlayer,
        player2: &SwissPlayer,
    ) -> f64 {
        if self.are_same_club(player1, player2) {
            return -8000.0;
        }

        if self.should_avoid_same_federation(player1, player2)
            && let (Some(country1), Some(country2)) =
                (&player1.player.country_code, &player2.player.country_code)
            && country1 == country2
        {
            return self.calculate_federation_penalty(country1);
        }

        0.0
    }

    /// Calculate federation-specific penalty
    pub(crate) fn calculate_federation_penalty(&self, country_code: &str) -> f64 {
        let major_federations = [
            "RUS", "USA", "CHN", "IND", "FRA", "GER", "UKR", "ARM", "IRA",
        ];

        if major_federations.contains(&country_code) {
            -2000.0
        } else {
            -4000.0
        }
    }
}
