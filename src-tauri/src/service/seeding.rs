use crate::{
    common::error::PawnError,
    db::SeedingDb,
    domain::{
        dto::{
            BatchUpdatePlayerSeeding, CreateTournamentSeedingSettings,
            GeneratePairingNumbersRequest, GenerateSeedingRequest, SeedingAnalysis,
            SeedingConflict, SeedingPreview, UpdatePlayerSeeding, UpdateTournamentSeedingSettings,
        },
        model::{Player, SeedingMethod, TournamentSeedingSettings},
    },
};
use rand::{rng, seq::SliceRandom};
use std::{collections::HashMap, sync::Arc};

pub struct SeedingService<D> {
    db: Arc<D>,
}

impl<D: SeedingDb + Send + Sync + 'static> SeedingService<D> {
    pub fn new(db: Arc<D>) -> Self {
        Self { db }
    }

    /// Create tournament seeding settings
    pub async fn create_seeding_settings(
        &self,
        settings: CreateTournamentSeedingSettings,
    ) -> Result<TournamentSeedingSettings, PawnError> {
        self.db
            .create_seeding_settings(settings)
            .await
            .map_err(PawnError::Database)
    }

    /// Get tournament seeding settings
    pub async fn get_seeding_settings(
        &self,
        tournament_id: i32,
    ) -> Result<Option<TournamentSeedingSettings>, PawnError> {
        self.db
            .get_seeding_settings(tournament_id)
            .await
            .map_err(PawnError::Database)
    }

    /// Update tournament seeding settings
    pub async fn update_seeding_settings(
        &self,
        settings: UpdateTournamentSeedingSettings,
    ) -> Result<TournamentSeedingSettings, PawnError> {
        if settings.seeding_method.is_none()
            && settings.use_initial_rating.is_none()
            && settings.randomize_unrated.is_none()
            && settings.protect_top_seeds.is_none()
        {
            return Err(PawnError::InvalidInput("No fields to update".to_string()));
        }

        self.db
            .update_seeding_settings(settings)
            .await
            .map_err(PawnError::Database)
    }

    /// Generate seeding for tournament
    pub async fn generate_seeding(
        &self,
        request: GenerateSeedingRequest,
    ) -> Result<Vec<SeedingPreview>, PawnError> {
        let players = self
            .db
            .get_active_tournament_players(request.tournament_id)
            .await
            .map_err(PawnError::Database)?;

        let method = request
            .seeding_method
            .parse()
            .unwrap_or(SeedingMethod::Rating);
        let seeding_preview = Self::calculate_seeding(&players, method, request.category_id)?;

        Ok(seeding_preview)
    }

    /// Apply seeding to players
    pub async fn apply_seeding(
        &self,
        batch_update: BatchUpdatePlayerSeeding,
    ) -> Result<Vec<Player>, PawnError> {
        self.db
            .batch_update_player_seeding(batch_update.seeding_updates)
            .await
            .map_err(PawnError::Database)
    }

    /// Generate pairing numbers
    pub async fn generate_pairing_numbers(
        &self,
        request: GeneratePairingNumbersRequest,
    ) -> Result<Vec<Player>, PawnError> {
        let mut players = self
            .db
            .get_active_tournament_players(request.tournament_id)
            .await
            .map_err(PawnError::Database)?;

        match request.method.as_str() {
            "sequential" => {
                Self::generate_sequential_pairing_numbers(&mut players, request.start_number);
            }
            "random" => {
                Self::generate_random_pairing_numbers(&mut players, request.start_number);
            }
            "by_seed" => {
                Self::generate_seed_based_pairing_numbers(&mut players, request.start_number);
            }
            _ => {
                return Err(PawnError::InvalidInput(
                    "Invalid pairing number method".to_string(),
                ));
            }
        }

        // Build seeding updates from modified players
        let updates: Vec<UpdatePlayerSeeding> = players
            .iter()
            .filter(|p| p.pairing_number.is_some())
            .map(|player| UpdatePlayerSeeding {
                player_id: player.id,
                seed_number: player.seed_number,
                pairing_number: player.pairing_number,
                initial_rating: player.initial_rating,
            })
            .collect();

        self.db
            .batch_update_player_seeding(updates)
            .await
            .map_err(PawnError::Database)
    }

    /// Analyze current seeding
    pub async fn analyze_seeding(&self, tournament_id: i32) -> Result<SeedingAnalysis, PawnError> {
        let players = self
            .db
            .get_active_tournament_players(tournament_id)
            .await
            .map_err(PawnError::Database)?;

        let total_players = players.len() as i32;
        let rated_players = players.iter().filter(|p| p.rating.is_some()).count() as i32;
        let unrated_players = total_players - rated_players;
        let manual_seeds = players.iter().filter(|p| p.seed_number.is_some()).count() as i32;

        let rating_range = if rated_players > 0 {
            let ratings: Vec<i32> = players.iter().filter_map(|p| p.rating).collect();
            Some((
                *ratings.iter().min().unwrap(),
                *ratings.iter().max().unwrap(),
            ))
        } else {
            None
        };

        let average_rating = if rated_players > 0 {
            let sum: i32 = players.iter().filter_map(|p| p.rating).sum();
            Some(sum as f64 / rated_players as f64)
        } else {
            None
        };

        let conflicts = Self::detect_seeding_conflicts(&players);

        Ok(SeedingAnalysis {
            total_players,
            rated_players,
            unrated_players,
            manual_seeds,
            rating_range,
            average_rating,
            seeding_conflicts: conflicts,
        })
    }

    // Pure logic helpers (no DB access)

    fn calculate_seeding(
        players: &[Player],
        method: SeedingMethod,
        category_id: Option<i32>,
    ) -> Result<Vec<SeedingPreview>, PawnError> {
        let mut previews = Vec::new();

        match method {
            SeedingMethod::Rating => {
                let mut sorted_players = players.to_vec();
                sorted_players.sort_by(|a, b| {
                    let rating_a = a.rating.unwrap_or(0);
                    let rating_b = b.rating.unwrap_or(0);
                    rating_b.cmp(&rating_a).then_with(|| {
                        title_strength(&a.title)
                            .cmp(&title_strength(&b.title))
                            .reverse()
                    })
                });

                for (index, player) in sorted_players.iter().enumerate() {
                    previews.push(SeedingPreview {
                        player_id: player.id,
                        player_name: player.name.clone(),
                        current_seed: player.seed_number,
                        proposed_seed: (index + 1) as i32,
                        rating: player.rating,
                        title: player.title.clone(),
                        category: None,
                    });
                }
            }
            SeedingMethod::Random => {
                let mut indices: Vec<usize> = (0..players.len()).collect();
                indices.shuffle(&mut rng());

                for (seed, &index) in indices.iter().enumerate() {
                    let player = &players[index];
                    previews.push(SeedingPreview {
                        player_id: player.id,
                        player_name: player.name.clone(),
                        current_seed: player.seed_number,
                        proposed_seed: (seed + 1) as i32,
                        rating: player.rating,
                        title: player.title.clone(),
                        category: None,
                    });
                }
            }
            SeedingMethod::Manual => {
                for player in players {
                    previews.push(SeedingPreview {
                        player_id: player.id,
                        player_name: player.name.clone(),
                        current_seed: player.seed_number,
                        proposed_seed: player.seed_number.unwrap_or(0),
                        rating: player.rating,
                        title: player.title.clone(),
                        category: None,
                    });
                }
            }
            SeedingMethod::CategoryBased => {
                return Self::calculate_seeding(players, SeedingMethod::Rating, category_id);
            }
        }

        Ok(previews)
    }

    fn generate_sequential_pairing_numbers(players: &mut [Player], start_number: i32) {
        for (index, player) in players.iter_mut().enumerate() {
            player.pairing_number = Some(start_number + index as i32);
        }
    }

    fn generate_random_pairing_numbers(players: &mut [Player], start_number: i32) {
        let mut numbers: Vec<i32> = (start_number..start_number + players.len() as i32).collect();
        numbers.shuffle(&mut rng());

        for (player, &number) in players.iter_mut().zip(numbers.iter()) {
            player.pairing_number = Some(number);
        }
    }

    fn generate_seed_based_pairing_numbers(players: &mut [Player], start_number: i32) {
        players.sort_by_key(|p| p.seed_number.unwrap_or(i32::MAX));
        Self::generate_sequential_pairing_numbers(players, start_number);
    }

    fn detect_seeding_conflicts(players: &[Player]) -> Vec<SeedingConflict> {
        let mut conflicts = Vec::new();
        let mut seed_counts: HashMap<i32, i32> = HashMap::new();

        for player in players {
            if let Some(seed) = player.seed_number {
                *seed_counts.entry(seed).or_insert(0) += 1;
            }
        }

        for (seed, count) in seed_counts {
            if count > 1 {
                conflicts.push(SeedingConflict {
                    player_id: 0,
                    player_name: format!("Seed #{seed}"),
                    conflict_type: "duplicate_seed".to_string(),
                    description: format!("{count} players have seed number {seed}"),
                    suggested_action: "Reassign seed numbers to make them unique".to_string(),
                });
            }
        }

        let mut rated_players: Vec<_> = players
            .iter()
            .filter(|p| p.rating.is_some() && p.seed_number.is_some())
            .collect();
        rated_players.sort_by_key(|p| p.seed_number);

        for window in rated_players.windows(2) {
            let player1 = window[0];
            let player2 = window[1];

            if let (Some(rating1), Some(rating2)) = (player1.rating, player2.rating)
                && rating1 < rating2
            {
                conflicts.push(SeedingConflict {
                    player_id: player1.id,
                    player_name: player1.name.clone(),
                    conflict_type: "rating_mismatch".to_string(),
                    description: format!(
                        "{} (seed {}, rating {}) is seeded higher than {} (seed {}, rating {})",
                        player1.name,
                        player1.seed_number.unwrap(),
                        rating1,
                        player2.name,
                        player2.seed_number.unwrap(),
                        rating2
                    ),
                    suggested_action: "Consider adjusting seed numbers to match rating order"
                        .to_string(),
                });
            }
        }

        conflicts
    }
}

fn title_strength(title: &Option<String>) -> i32 {
    match title.as_ref().map(|s| s.as_str()) {
        Some("GM") => 8,
        Some("IM") => 7,
        Some("FM") => 6,
        Some("CM") => 5,
        Some("WGM") => 4,
        Some("WIM") => 3,
        Some("WFM") => 2,
        Some("WCM") => 1,
        _ => 0,
    }
}

