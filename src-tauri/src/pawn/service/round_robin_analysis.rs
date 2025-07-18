use crate::pawn::{
    common::error::PawnError,
    db::Db,
    domain::{
        dto::{
            BergerTableInfoDto, PlayerColorStatsDto, RoundRobinAnalysis, RoundRobinOptions,
        },
        model::{GameResult, Player},
    },
};
use std::{collections::HashMap, sync::Arc};

pub struct RoundRobinAnalysisService<D> {
    db: Arc<D>,
}

impl<D: Db> RoundRobinAnalysisService<D> {
    pub fn new(db: Arc<D>) -> Self {
        Self { db }
    }

    pub async fn analyze_round_robin_pairings(
        &self,
        tournament_id: i32,
        round_number: i32,
        options: RoundRobinOptions,
    ) -> Result<RoundRobinAnalysis, PawnError> {
        // Get players and games
        let players = self
            .db
            .get_players_by_tournament(tournament_id)
            .await
            .map_err(PawnError::Database)?;

        let game_results = self
            .db
            .get_game_results(tournament_id)
            .await
            .map_err(PawnError::Database)?;

        // Filter games up to the specified round
        let games_up_to_round: Vec<_> = game_results
            .into_iter()
            .filter(|game| game.game.round_number < round_number)
            .collect();

        // Calculate total rounds needed
        let total_rounds_needed = self.calculate_total_rounds(&players, &options);

        // Calculate current progress
        let current_progress = if total_rounds_needed > 0 {
            ((round_number - 1) as f64 / total_rounds_needed as f64) * 100.0
        } else {
            0.0
        };

        // Generate Berger table info if requested
        let berger_table_info = if options.use_berger_tables {
            Some(self.generate_berger_table_info(&players, &options))
        } else {
            None
        };

        // Analyze color distribution
        let color_distribution = self.analyze_color_distribution(&players, &games_up_to_round);

        Ok(RoundRobinAnalysis {
            total_rounds_needed,
            current_progress,
            berger_table_info,
            color_distribution,
        })
    }

    fn calculate_total_rounds(&self, players: &[Player], options: &RoundRobinOptions) -> i32 {
        let player_count = players.len();
        
        if player_count < 2 {
            return 0;
        }

        match options.tournament_type.as_str() {
            "single" => {
                // Single round-robin: each player plays every other player once
                if player_count % 2 == 0 {
                    (player_count - 1) as i32
                } else {
                    player_count as i32 // Odd number needs extra round for byes
                }
            }
            "double" => {
                // Double round-robin: each player plays every other player twice
                if player_count % 2 == 0 {
                    (2 * (player_count - 1)) as i32
                } else {
                    (2 * player_count) as i32
                }
            }
            "scheveningen" => {
                // Scheveningen: team vs team
                if let Some(team_size) = options.team_size {
                    if team_size > 0 {
                        team_size as i32
                    } else {
                        player_count as i32
                    }
                } else {
                    player_count as i32
                }
            }
            _ => (player_count - 1) as i32, // Default to single round-robin
        }
    }

    fn generate_berger_table_info(
        &self,
        players: &[Player],
        options: &RoundRobinOptions,
    ) -> BergerTableInfoDto {
        let player_count = players.len();
        let table_size = if player_count % 2 == 0 {
            player_count
        } else {
            player_count + 1 // Add bye player
        };

        let rotation_pattern = match options.tournament_type.as_str() {
            "single" => "Standard Berger table rotation".to_string(),
            "double" => "Double round-robin with color reversal".to_string(),
            "scheveningen" => "Team-based fixed pairing schedule".to_string(),
            _ => "Standard rotation".to_string(),
        };

        let bye_player_position = if player_count % 2 == 1 {
            Some(player_count) // Last position for bye
        } else {
            None
        };

        BergerTableInfoDto {
            table_size,
            rotation_pattern,
            bye_player_position,
        }
    }

    fn analyze_color_distribution(
        &self,
        players: &[Player],
        games: &[GameResult],
    ) -> Vec<PlayerColorStatsDto> {
        let mut color_stats: HashMap<i32, (String, i32, i32)> = HashMap::new();

        // Initialize stats for all players
        for player in players {
            color_stats.insert(player.id, (player.name.clone(), 0, 0));
        }

        // Count colors for each player from completed games
        for game in games {
            if game.game.result != "*" {
                // Only count finished games
                if let Some(stats) = color_stats.get_mut(&game.game.white_player_id) {
                    stats.1 += 1; // White games
                }
                if let Some(stats) = color_stats.get_mut(&game.game.black_player_id) {
                    stats.2 += 1; // Black games
                }
            }
        }

        color_stats
            .into_iter()
            .map(|(player_id, (player_name, white_games, black_games))| {
                PlayerColorStatsDto {
                    player_id,
                    player_name,
                    white_games,
                    black_games,
                    color_balance: white_games - black_games,
                }
            })
            .collect()
    }
}