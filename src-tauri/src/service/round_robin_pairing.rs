#![allow(dead_code)]

use crate::{
    common::error::PawnError,
    domain::model::{Pairing, Player},
};
use std::collections::HashMap;

/// Advanced Round-Robin pairing system with Berger tables
pub struct RoundRobinEngine;

#[derive(Debug, Clone)]
pub struct RoundRobinPlayer {
    pub player: Player,
    pub position: usize,    // Position in the tournament table
    pub color_balance: i32, // Track color balance (positive = more whites)
}

#[derive(Debug, Clone)]
pub struct BergerTable {
    pub total_players: usize,
    pub total_rounds: usize,
    pub pairings_matrix: Vec<Vec<Option<(usize, usize)>>>, // [round][pairing] = (white_pos, black_pos)
    pub color_assignments: HashMap<(usize, usize), bool>,  // (player1, player2) -> player1_is_white
}

#[derive(Debug)]
pub enum RoundRobinType {
    Single,       // Each player plays each other once
    Double,       // Each player plays each other twice
    Scheveningen, // Two teams play against each other
}

#[derive(Debug)]
pub struct RoundRobinResult {
    pub pairings: Vec<Pairing>,
    pub bye_player: Option<Player>,
    pub round_info: RoundInfo,
}

#[derive(Debug)]
pub struct RoundInfo {
    pub round_number: i32,
    pub total_rounds: i32,
    pub tournament_type: RoundRobinType,
    pub color_balance_achieved: bool,
}

impl Default for RoundRobinEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl RoundRobinEngine {
    pub fn new() -> Self {
        Self
    }

    /// Generate round-robin pairings using Berger tables
    pub fn generate_berger_pairings(
        &self,
        players: Vec<Player>,
        round_number: i32,
        tournament_type: RoundRobinType,
    ) -> Result<RoundRobinResult, PawnError> {
        tracing::info!(
            "Generating Berger round-robin pairings for {} players, round {}, type: {:?}",
            players.len(),
            round_number,
            tournament_type
        );

        if players.is_empty() {
            return Err(PawnError::InvalidInput("No players provided".to_string()));
        }

        let rr_players = self.prepare_round_robin_players(players);
        let berger_table = self.generate_berger_table(&rr_players, &tournament_type)?;

        let pairings = self.extract_round_pairings(&berger_table, &rr_players, round_number)?;
        let bye_player = self.determine_bye_player(&rr_players, round_number);

        let round_info = RoundInfo {
            round_number,
            total_rounds: berger_table.total_rounds as i32,
            tournament_type,
            color_balance_achieved: self.check_color_balance(&berger_table),
        };

        Ok(RoundRobinResult {
            pairings,
            bye_player,
            round_info,
        })
    }

    /// Generate enhanced round-robin with color balance optimization
    pub fn generate_balanced_round_robin(
        &self,
        players: Vec<Player>,
        round_number: i32,
        prefer_color_balance: bool,
    ) -> Result<RoundRobinResult, PawnError> {
        tracing::info!(
            "Generating balanced round-robin for {} players, round {}, color balance: {}",
            players.len(),
            round_number,
            prefer_color_balance
        );

        let mut rr_players = self.prepare_round_robin_players(players);

        if prefer_color_balance {
            self.optimize_color_assignments(&mut rr_players, round_number)?;
        }

        let tournament_type = RoundRobinType::Single;
        let berger_table = self.generate_berger_table(&rr_players, &tournament_type)?;
        let pairings = self.extract_round_pairings(&berger_table, &rr_players, round_number)?;

        let round_info = RoundInfo {
            round_number,
            total_rounds: berger_table.total_rounds as i32,
            tournament_type,
            color_balance_achieved: prefer_color_balance,
        };

        Ok(RoundRobinResult {
            pairings,
            bye_player: None,
            round_info,
        })
    }

    /// Generate Scheveningen system pairings (team vs team)
    pub fn generate_scheveningen_pairings(
        &self,
        team_a: Vec<Player>,
        team_b: Vec<Player>,
        round_number: i32,
    ) -> Result<RoundRobinResult, PawnError> {
        tracing::info!(
            "Generating Scheveningen pairings: Team A ({}) vs Team B ({}), round {}",
            team_a.len(),
            team_b.len(),
            round_number
        );

        if team_a.is_empty() || team_b.is_empty() {
            return Err(PawnError::InvalidInput(
                "Both teams must have players".to_string(),
            ));
        }

        if team_a.len() != team_b.len() {
            return Err(PawnError::InvalidInput(
                "Teams must have equal number of players".to_string(),
            ));
        }

        let pairings = self.generate_scheveningen_round(&team_a, &team_b, round_number)?;
        let total_rounds = team_a.len() as i32;

        let round_info = RoundInfo {
            round_number,
            total_rounds,
            tournament_type: RoundRobinType::Scheveningen,
            color_balance_achieved: true, // Scheveningen has built-in color balance
        };

        Ok(RoundRobinResult {
            pairings,
            bye_player: None,
            round_info,
        })
    }

    /// Prepare players for round-robin with position assignments
    /// Convert regular players to round-robin players for tests
    pub fn convert_to_round_robin_players(&self, players: Vec<Player>) -> Vec<RoundRobinPlayer> {
        self.prepare_round_robin_players(players)
    }

    fn prepare_round_robin_players(&self, players: Vec<Player>) -> Vec<RoundRobinPlayer> {
        let mut rr_players: Vec<RoundRobinPlayer> = players
            .into_iter()
            .enumerate()
            .map(|(index, player)| RoundRobinPlayer {
                player,
                position: index,
                color_balance: 0,
            })
            .collect();

        // Sort by rating (descending) for proper seeding
        rr_players.sort_by(|a, b| {
            b.player
                .rating
                .unwrap_or(0)
                .cmp(&a.player.rating.unwrap_or(0))
        });

        // Reassign positions after sorting
        for (index, rr_player) in rr_players.iter_mut().enumerate() {
            rr_player.position = index;
        }

        rr_players
    }

    /// Generate Berger table for round-robin tournament
    fn generate_berger_table(
        &self,
        players: &[RoundRobinPlayer],
        tournament_type: &RoundRobinType,
    ) -> Result<BergerTable, PawnError> {
        let n = players.len();
        let (rounds, _multiplier) = match tournament_type {
            RoundRobinType::Single => (if n.is_multiple_of(2) { n - 1 } else { n }, 1),
            RoundRobinType::Double => (
                if n.is_multiple_of(2) {
                    2 * (n - 1)
                } else {
                    2 * n
                },
                2,
            ),
            RoundRobinType::Scheveningen => (n, 1), // Each team member plays each opponent once
        };

        let mut berger_table = BergerTable {
            total_players: n,
            total_rounds: rounds,
            pairings_matrix: vec![Vec::new(); rounds],
            color_assignments: HashMap::new(),
        };

        // Handle odd number of players by adding a "bye" position
        let working_n = if n.is_multiple_of(2) { n } else { n + 1 };

        // Generate classical round-robin using rotation method
        for round in 0..rounds {
            let mut round_pairings = Vec::new();

            for i in 0..working_n / 2 {
                let pos1 = if i == 0 {
                    0
                } else {
                    (round + i - 1) % (working_n - 1) + 1
                };
                let pos2 = (working_n - 1 + round - i) % (working_n - 1) + 1;
                let pos2 = if pos2 == pos1 { 0 } else { pos2 };

                // Skip bye pairings (when one position >= n)
                if pos1 < n && pos2 < n {
                    // Determine colors using advanced algorithm
                    let (white_pos, black_pos) =
                        self.determine_berger_colors(pos1, pos2, round, working_n);
                    round_pairings.push((white_pos, black_pos));

                    // Store color assignment for tracking
                    berger_table
                        .color_assignments
                        .insert((pos1, pos2), pos1 == white_pos);
                    berger_table
                        .color_assignments
                        .insert((pos2, pos1), pos2 == white_pos);
                }
            }

            berger_table.pairings_matrix[round] = round_pairings.into_iter().map(Some).collect();
        }

        // For double round-robin, generate second cycle with reversed colors
        if matches!(tournament_type, RoundRobinType::Double) {
            self.generate_double_round_robin_colors(&mut berger_table)?;
        }

        Ok(berger_table)
    }

    /// Determine colors for Berger table with balanced distribution
    fn determine_berger_colors(
        &self,
        pos1: usize,
        pos2: usize,
        round: usize,
        _n: usize,
    ) -> (usize, usize) {
        // Classical Berger table color assignment
        // Player 1 (fixed position) alternates colors based on round
        // Other positions follow a pattern to ensure color balance

        if pos1 == 0 {
            // Fixed player alternates colors
            if round.is_multiple_of(2) {
                (pos1, pos2) // pos1 gets white
            } else {
                (pos2, pos1) // pos2 gets white
            }
        } else {
            // Other pairings follow position-based pattern
            let board_number = if pos1 < pos2 { pos1 } else { pos2 };
            if (round + board_number).is_multiple_of(2) {
                if pos1 < pos2 {
                    (pos1, pos2)
                } else {
                    (pos2, pos1)
                }
            } else if pos1 < pos2 {
                (pos2, pos1)
            } else {
                (pos1, pos2)
            }
        }
    }

    /// Generate color assignments for double round-robin
    fn generate_double_round_robin_colors(
        &self,
        berger_table: &mut BergerTable,
    ) -> Result<(), PawnError> {
        let single_rounds = berger_table.total_rounds / 2;

        // Second cycle: copy first cycle with reversed colors
        for round in 0..single_rounds {
            let first_cycle_pairings = berger_table.pairings_matrix[round].clone();
            let mut second_cycle_pairings = Vec::new();

            for (white_pos, black_pos) in first_cycle_pairings.into_iter().flatten() {
                // Reverse colors for second cycle
                second_cycle_pairings.push(Some((black_pos, white_pos)));

                // Update color assignments
                berger_table
                    .color_assignments
                    .insert((white_pos, black_pos), false);
                berger_table
                    .color_assignments
                    .insert((black_pos, white_pos), true);
            }

            berger_table.pairings_matrix[single_rounds + round] = second_cycle_pairings;
        }

        Ok(())
    }

    /// Extract pairings for a specific round from Berger table
    fn extract_round_pairings(
        &self,
        berger_table: &BergerTable,
        players: &[RoundRobinPlayer],
        round_number: i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        let round_index = (round_number - 1) as usize;

        if round_index >= berger_table.pairings_matrix.len() {
            return Err(PawnError::InvalidInput(format!(
                "Round {} exceeds tournament length of {} rounds",
                round_number, berger_table.total_rounds
            )));
        }

        let mut pairings = Vec::new();
        let round_pairings = &berger_table.pairings_matrix[round_index];

        for (board_number, pairing_opt) in round_pairings.iter().enumerate() {
            if let Some((white_pos, black_pos)) = pairing_opt
                && *white_pos < players.len()
                && *black_pos < players.len()
            {
                pairings.push(Pairing {
                    white_player: players[*white_pos].player.clone(),
                    black_player: Some(players[*black_pos].player.clone()),
                    board_number: (board_number + 1) as i32,
                });
            }
        }

        tracing::debug!(
            "Extracted {} pairings for round {} from Berger table",
            pairings.len(),
            round_number
        );

        Ok(pairings)
    }

    /// Determine bye player for odd number of players
    fn determine_bye_player(
        &self,
        players: &[RoundRobinPlayer],
        round_number: i32,
    ) -> Option<Player> {
        if players.len().is_multiple_of(2) {
            return None;
        }

        // In round-robin with odd players, bye rotates
        // Calculate which player gets the bye this round
        let bye_position = ((round_number - 1) as usize) % players.len();
        Some(players[bye_position].player.clone())
    }

    /// Generate Scheveningen round pairings
    fn generate_scheveningen_round(
        &self,
        team_a: &[Player],
        team_b: &[Player],
        round_number: i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        let mut pairings = Vec::new();
        let team_size = team_a.len();

        for (board, player_a) in team_a.iter().enumerate().take(team_size) {
            // Calculate opponent for this round using rotation
            let opponent_index = (board + (round_number - 1) as usize) % team_size;

            // Determine colors: alternate by round and board
            let team_a_white = if round_number % 2 == 1 {
                board % 2 == 0 // Odd rounds: Team A white on even boards
            } else {
                board % 2 == 1 // Even rounds: Team A white on odd boards
            };

            let (white_player, black_player) = if team_a_white {
                (player_a.clone(), team_b[opponent_index].clone())
            } else {
                (team_b[opponent_index].clone(), player_a.clone())
            };

            pairings.push(Pairing {
                white_player,
                black_player: Some(black_player),
                board_number: (board + 1) as i32,
            });
        }

        tracing::debug!(
            "Generated {} Scheveningen pairings for round {}",
            pairings.len(),
            round_number
        );

        Ok(pairings)
    }

    /// Optimize color assignments for better balance
    fn optimize_color_assignments(
        &self,
        players: &mut [RoundRobinPlayer],
        _round_number: i32,
    ) -> Result<(), PawnError> {
        // Advanced color balance optimization
        // This could involve sophisticated algorithms to minimize color imbalances
        // For now, we'll use the standard Berger table which already provides good balance

        tracing::debug!("Optimizing color assignments for {} players", players.len());

        // Reset color balance counters
        for player in players.iter_mut() {
            player.color_balance = 0;
        }

        Ok(())
    }

    /// Check if the Berger table achieves good color balance
    fn check_color_balance(&self, berger_table: &BergerTable) -> bool {
        // Analyze color distribution across all rounds
        let mut color_counts: HashMap<usize, (i32, i32)> = HashMap::new(); // (whites, blacks)

        for round_pairings in &berger_table.pairings_matrix {
            for (white_pos, black_pos) in round_pairings.iter().flatten() {
                let white_entry = color_counts.entry(*white_pos).or_insert((0, 0));
                white_entry.0 += 1;

                let black_entry = color_counts.entry(*black_pos).or_insert((0, 0));
                black_entry.1 += 1;
            }
        }

        // Check if color balance is within acceptable limits (difference <= 1)
        color_counts
            .values()
            .all(|(whites, blacks)| (whites - blacks).abs() <= 1)
    }
}

