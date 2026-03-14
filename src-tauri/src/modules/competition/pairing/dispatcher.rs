use super::round_robin::{RoundRobinEngine, RoundRobinType};
use super::swiss::SwissPairingEngine;
use crate::{
    common::error::PawnError,
    competition::model::{GameResult, Pairing, PairingMethod},
    participant::model::{Player, PlayerResult},
};

pub struct PairingService {
    swiss_engine: SwissPairingEngine,
    round_robin_engine: RoundRobinEngine,
}

impl Default for PairingService {
    fn default() -> Self {
        Self::new()
    }
}

impl PairingService {
    pub fn new() -> Self {
        Self {
            swiss_engine: SwissPairingEngine::new(),
            round_robin_engine: RoundRobinEngine::new(),
        }
    }

    pub fn generate_pairings(
        &self,
        players: Vec<Player>,
        player_results: Vec<PlayerResult>,
        round_number: i32,
        method: &PairingMethod,
    ) -> Result<Vec<Pairing>, PawnError> {
        match method {
            PairingMethod::Swiss => {
                self.generate_swiss_pairings(players, player_results, round_number)
            }
            PairingMethod::RoundRobin => self.generate_round_robin_pairings(players, round_number),
            PairingMethod::Manual => Ok(vec![]), // Manual pairings are created by user
            PairingMethod::Knockout => Ok(vec![]), // Knockout pairings handled by KnockoutService
            PairingMethod::Scheveningen => {
                self.generate_scheveningen_pairings(players, round_number)
            }
        }
    }

    pub fn generate_pairings_with_history(
        &self,
        players: Vec<Player>,
        player_results: Vec<PlayerResult>,
        game_history: Vec<GameResult>,
        round_number: i32,
        method: &PairingMethod,
    ) -> Result<Vec<Pairing>, PawnError> {
        match method {
            PairingMethod::Swiss => self.generate_swiss_pairings_with_history(
                players,
                player_results,
                game_history,
                round_number,
            ),
            PairingMethod::RoundRobin => self.generate_round_robin_pairings(players, round_number),
            PairingMethod::Manual => Ok(vec![]), // Manual pairings are created by user
            PairingMethod::Knockout => Ok(vec![]), // Knockout pairings handled by KnockoutService
            PairingMethod::Scheveningen => {
                self.generate_scheveningen_pairings(players, round_number)
            }
        }
    }

    fn generate_swiss_pairings(
        &self,
        players: Vec<Player>,
        player_results: Vec<PlayerResult>,
        round_number: i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        // For first round or when no history is available, use Dutch System with empty history
        self.generate_swiss_pairings_with_history(players, player_results, vec![], round_number)
    }

    fn generate_swiss_pairings_with_history(
        &self,
        players: Vec<Player>,
        player_results: Vec<PlayerResult>,
        game_history: Vec<GameResult>,
        round_number: i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        // Use the FIDE-compliant Dutch System
        let pairing_result = self.swiss_engine.generate_dutch_system_pairings(
            players,
            player_results,
            game_history,
            round_number,
        )?;

        // Log any validation errors but still return pairings
        if !pairing_result.validation_errors.is_empty() {
            tracing::warn!(
                "Pairing validation warnings: {:?}",
                pairing_result.validation_errors
            );
        }

        tracing::info!(
            "Dutch System generated {} pairings with {} floats",
            pairing_result.pairings.len(),
            pairing_result.float_count
        );

        Ok(pairing_result.pairings)
    }

    fn generate_round_robin_pairings(
        &self,
        players: Vec<Player>,
        round_number: i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        // Use the enhanced Berger table Round-Robin engine
        let result = self.round_robin_engine.generate_berger_pairings(
            players,
            round_number,
            RoundRobinType::Single,
        )?;

        tracing::info!(
            "Berger Round-Robin generated {} pairings for round {}/{}",
            result.pairings.len(),
            result.round_info.round_number,
            result.round_info.total_rounds
        );

        Ok(result.pairings)
    }

    /// Generate Scheveningen (team-based) pairings
    /// In Scheveningen system, players from team A play against players from team B
    fn generate_scheveningen_pairings(
        &self,
        players: Vec<Player>,
        round_number: i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        if players.len() < 2 {
            return Ok(vec![]);
        }

        // Sort players by rating (descending) for fair team division
        let mut sorted_players = players;
        sorted_players.sort_by(|a, b| b.rating.unwrap_or(0).cmp(&a.rating.unwrap_or(0)));

        // Split into two balanced teams
        let team_size = sorted_players.len() / 2;
        let team_a: Vec<Player> = sorted_players.iter().take(team_size).cloned().collect();
        let team_b: Vec<Player> = sorted_players.iter().skip(team_size).cloned().collect();

        // Use the enhanced Scheveningen engine
        let result =
            self.round_robin_engine
                .generate_scheveningen_pairings(team_a, team_b, round_number)?;

        tracing::info!(
            "Enhanced Scheveningen generated {} pairings for round {}/{}",
            result.pairings.len(),
            result.round_info.round_number,
            result.round_info.total_rounds
        );

        Ok(result.pairings)
    }
}
