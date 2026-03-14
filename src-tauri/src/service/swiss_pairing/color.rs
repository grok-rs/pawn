use crate::common::error::PawnError;
use crate::domain::model::Pairing;

use super::types::{Color, ColorPreference, SwissPlayer, opposite_color};
use super::SwissPairingEngine;

impl SwissPairingEngine {
    /// Calculate color preference based on recent games
    pub(crate) fn calculate_color_preference(&self, color_history: &[Color]) -> ColorPreference {
        if color_history.len() < 2 {
            return ColorPreference::None;
        }

        let recent_colors = &color_history[color_history.len().saturating_sub(3)..];

        // Check for 3+ consecutive same colors (absolute preference)
        if recent_colors.len() >= 3
            && recent_colors
                .windows(3)
                .any(|w| w.iter().all(|&c| c == w[0]))
        {
            let same_color = recent_colors[recent_colors.len() - 1];
            return ColorPreference::Absolute(opposite_color(same_color));
        }

        // Check for 2 consecutive same colors (strong preference)
        if recent_colors.len() >= 2
            && recent_colors[recent_colors.len() - 2] == recent_colors[recent_colors.len() - 1]
        {
            let same_color = recent_colors[recent_colors.len() - 1];
            return ColorPreference::Strong(opposite_color(same_color));
        }

        // Check overall color balance for mild preference
        let white_count = color_history.iter().filter(|&&c| c == Color::White).count();
        let black_count = color_history.len() - white_count;

        if white_count > black_count + 1 {
            ColorPreference::Mild(Color::Black)
        } else if black_count > white_count + 1 {
            ColorPreference::Mild(Color::White)
        } else {
            ColorPreference::None
        }
    }

    /// Calculate how well two players' color preferences match
    pub(crate) fn calculate_color_compatibility(
        &self,
        player1: &SwissPlayer,
        player2: &SwissPlayer,
    ) -> f64 {
        match (&player1.color_preference, &player2.color_preference) {
            (ColorPreference::Absolute(c1), ColorPreference::Absolute(c2)) => {
                if c1 != c2 { 1.0 } else { -1.0 }
            }
            (ColorPreference::Strong(c1), ColorPreference::Strong(c2)) => {
                if c1 != c2 { 0.8 } else { -0.5 }
            }
            (ColorPreference::Absolute(_), _) | (_, ColorPreference::Absolute(_)) => 0.9,
            (ColorPreference::Strong(_), _) | (_, ColorPreference::Strong(_)) => 0.6,
            (ColorPreference::Mild(c1), ColorPreference::Mild(c2)) => {
                if c1 != c2 { 0.3 } else { -0.1 }
            }
            _ => 0.0,
        }
    }

    /// Assign colors to two players based on their preferences
    pub(crate) fn assign_colors<'a>(
        &self,
        player1: &'a SwissPlayer,
        player2: &'a SwissPlayer,
    ) -> (&'a SwissPlayer, &'a SwissPlayer) {
        match (&player1.color_preference, &player2.color_preference) {
            (ColorPreference::Absolute(Color::White), _) => (player1, player2),
            (ColorPreference::Absolute(Color::Black), _) => (player2, player1),
            (_, ColorPreference::Absolute(Color::White)) => (player2, player1),
            (_, ColorPreference::Absolute(Color::Black)) => (player1, player2),
            (ColorPreference::Strong(Color::White), _) => (player1, player2),
            (ColorPreference::Strong(Color::Black), _) => (player2, player1),
            (_, ColorPreference::Strong(Color::White)) => (player2, player1),
            (_, ColorPreference::Strong(Color::Black)) => (player1, player2),
            _ => {
                // Use rating as tiebreaker (higher rated gets white)
                if player1.rating >= player2.rating {
                    (player1, player2)
                } else {
                    (player2, player1)
                }
            }
        }
    }

    /// Check if assigned color respects absolute color preference (FIDE C.04.2.2.3)
    pub(crate) fn respects_absolute_color_preference(
        &self,
        player: &SwissPlayer,
        assigned_color: Color,
    ) -> bool {
        match &player.color_preference {
            ColorPreference::Absolute(preferred_color) => *preferred_color == assigned_color,
            _ => true,
        }
    }

    /// Validate color sequences according to FIDE C.04.2.2
    pub(crate) fn validate_fide_color_sequences(
        &self,
        pairings: &[Pairing],
        players: &[SwissPlayer],
        round_number: i32,
    ) -> Result<(), PawnError> {
        let mut validation_errors = Vec::new();

        for pairing in pairings {
            let white_player = &pairing.white_player;
            if let Some(black_player) = &pairing.black_player {
                let white_swiss = players.iter().find(|p| p.player.id == white_player.id);
                let black_swiss = players.iter().find(|p| p.player.id == black_player.id);

                if let (Some(white), Some(black)) = (white_swiss, black_swiss) {
                    if let Err(e) = self.validate_consecutive_color_limit(
                        &white.color_history,
                        Color::White,
                        round_number,
                    ) {
                        validation_errors.push(format!(
                            "Player {name}: {error}",
                            name = white_player.name,
                            error = e
                        ));
                    }

                    if let Err(e) = self.validate_consecutive_color_limit(
                        &black.color_history,
                        Color::Black,
                        round_number,
                    ) {
                        validation_errors.push(format!(
                            "Player {name}: {error}",
                            name = black_player.name,
                            error = e
                        ));
                    }

                    if round_number >= 9 {
                        if let Err(e) =
                            self.validate_color_balance_limit(&white.color_history, round_number)
                        {
                            validation_errors.push(format!(
                                "Player {name}: {error}",
                                name = white_player.name,
                                error = e
                            ));
                        }

                        if let Err(e) =
                            self.validate_color_balance_limit(&black.color_history, round_number)
                        {
                            validation_errors.push(format!(
                                "Player {name}: {error}",
                                name = black_player.name,
                                error = e
                            ));
                        }
                    }

                    if !self.respects_absolute_color_preference(white, Color::White) {
                        validation_errors.push(format!(
                            "Player {} has absolute color preference violated",
                            white_player.name
                        ));
                    }

                    if !self.respects_absolute_color_preference(black, Color::Black) {
                        validation_errors.push(format!(
                            "Player {} has absolute color preference violated",
                            black_player.name
                        ));
                    }
                }
            } else {
                // Handle bye case
                if let Some(white_swiss) = players.iter().find(|p| p.player.id == white_player.id) {
                    if round_number >= 9
                        && let Err(e) = self
                            .validate_color_balance_limit(&white_swiss.color_history, round_number)
                    {
                        validation_errors.push(format!(
                            "Player {name} (bye): {error}",
                            name = white_player.name,
                            error = e
                        ));
                    }
                }
            }
        }

        if !validation_errors.is_empty() {
            return Err(PawnError::InvalidInput(format!(
                "FIDE C.04.2.2 color sequence violations: {}",
                validation_errors.join("; ")
            )));
        }

        Ok(())
    }

    /// Validate consecutive color limit (FIDE C.04.2.2.1)
    pub(crate) fn validate_consecutive_color_limit(
        &self,
        color_history: &[Color],
        assigned_color: Color,
        round_number: i32,
    ) -> Result<(), PawnError> {
        let mut new_history = color_history.to_vec();
        new_history.push(assigned_color);

        let mut consecutive = 0;
        for color in new_history.iter().rev() {
            if *color == assigned_color {
                consecutive += 1;
            } else {
                break;
            }
        }

        if round_number >= 7 && consecutive > 3 {
            return Err(PawnError::InvalidInput(format!(
                "FIDE C.04.2.2.1 violation: {} consecutive {} games exceeds maximum of 3",
                consecutive,
                if assigned_color == Color::White {
                    "white"
                } else {
                    "black"
                }
            )));
        }

        if consecutive > 4 {
            return Err(PawnError::InvalidInput(format!(
                "Excessive consecutive colors: {} consecutive {} games exceeds reasonable limit",
                consecutive,
                if assigned_color == Color::White {
                    "white"
                } else {
                    "black"
                }
            )));
        }

        Ok(())
    }

    /// Validate color balance limit (FIDE C.04.2.2.2)
    pub(crate) fn validate_color_balance_limit(
        &self,
        color_history: &[Color],
        round_number: i32,
    ) -> Result<(), PawnError> {
        let white_count = color_history.iter().filter(|&&c| c == Color::White).count();
        let black_count = color_history.len() - white_count;
        let difference = (white_count as i32 - black_count as i32).abs();

        if round_number >= 9 && difference > 2 {
            return Err(PawnError::InvalidInput(format!(
                "FIDE C.04.2.2.2 violation: Color imbalance of {difference} exceeds maximum of ±2 for tournament of {round_number} rounds"
            )));
        }

        if difference > 3 {
            return Err(PawnError::InvalidInput(format!(
                "Excessive color imbalance: {difference} exceeds reasonable limit of ±3"
            )));
        }

        Ok(())
    }
}
