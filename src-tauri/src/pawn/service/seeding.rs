use crate::pawn::{
    common::error::PawnError,
    domain::{
        dto::{
            BatchUpdatePlayerSeeding, CreateTournamentSeedingSettings, GeneratePairingNumbersRequest,
            GenerateSeedingRequest, SeedingAnalysis, SeedingConflict, SeedingPreview,
            UpdatePlayerSeeding, UpdateTournamentSeedingSettings,
        },
        model::{Player, SeedingMethod, TournamentSeedingSettings},
    },
};
use rand::{seq::SliceRandom, thread_rng};
use sqlx::SqlitePool;
use std::collections::HashMap;

pub struct SeedingService {
    pool: SqlitePool,
}

impl SeedingService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Create tournament seeding settings
    pub async fn create_seeding_settings(
        &self,
        settings: CreateTournamentSeedingSettings,
    ) -> Result<TournamentSeedingSettings, PawnError> {
        let result = sqlx::query_as::<_, TournamentSeedingSettings>(
            r#"
            INSERT INTO tournament_seeding_settings 
                (tournament_id, seeding_method, use_initial_rating, randomize_unrated, protect_top_seeds)
            VALUES (?, ?, ?, ?, ?)
            RETURNING *
            "#,
        )
        .bind(&settings.tournament_id)
        .bind(&settings.seeding_method)
        .bind(settings.use_initial_rating)
        .bind(settings.randomize_unrated)
        .bind(settings.protect_top_seeds)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| PawnError::Database(e))?;

        Ok(result)
    }

    /// Get tournament seeding settings
    pub async fn get_seeding_settings(
        &self,
        tournament_id: i32,
    ) -> Result<Option<TournamentSeedingSettings>, PawnError> {
        let settings = sqlx::query_as::<_, TournamentSeedingSettings>(
            "SELECT * FROM tournament_seeding_settings WHERE tournament_id = ?",
        )
        .bind(tournament_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| PawnError::Database(e))?;

        Ok(settings)
    }

    /// Update tournament seeding settings
    pub async fn update_seeding_settings(
        &self,
        settings: UpdateTournamentSeedingSettings,
    ) -> Result<TournamentSeedingSettings, PawnError> {
        // Build the update query dynamically
        let mut sql = "UPDATE tournament_seeding_settings SET ".to_string();
        let mut updates = Vec::new();

        if settings.seeding_method.is_some() {
            updates.push("seeding_method = ?");
        }
        if settings.use_initial_rating.is_some() {
            updates.push("use_initial_rating = ?");
        }
        if settings.randomize_unrated.is_some() {
            updates.push("randomize_unrated = ?");
        }
        if settings.protect_top_seeds.is_some() {
            updates.push("protect_top_seeds = ?");
        }

        if updates.is_empty() {
            return Err(PawnError::InvalidInput("No fields to update".to_string()));
        }

        sql.push_str(&updates.join(", "));
        sql.push_str(" WHERE id = ? RETURNING *");

        let mut query = sqlx::query_as::<_, TournamentSeedingSettings>(&sql);

        // Bind parameters in the same order as the updates
        if let Some(method) = &settings.seeding_method {
            query = query.bind(method);
        }
        if let Some(use_initial) = &settings.use_initial_rating {
            query = query.bind(use_initial);
        }
        if let Some(randomize) = &settings.randomize_unrated {
            query = query.bind(randomize);
        }
        if let Some(protect) = &settings.protect_top_seeds {
            query = query.bind(protect);
        }
        query = query.bind(settings.id);

        let result = query
            .fetch_one(&self.pool)
            .await
            .map_err(|e| PawnError::Database(e))?;

        Ok(result)
    }

    /// Generate seeding for tournament
    pub async fn generate_seeding(
        &self,
        request: GenerateSeedingRequest,
    ) -> Result<Vec<SeedingPreview>, PawnError> {
        let players = self.get_tournament_players(request.tournament_id).await?;
        
        let method = SeedingMethod::from_str(&request.seeding_method);
        let seeding_preview = self.calculate_seeding(&players, method, request.category_id)?;

        Ok(seeding_preview)
    }

    /// Apply seeding to players
    pub async fn apply_seeding(
        &self,
        batch_update: BatchUpdatePlayerSeeding,
    ) -> Result<Vec<Player>, PawnError> {
        let mut tx = self.pool.begin().await.map_err(|e| PawnError::Database(e))?;
        let mut updated_players = Vec::new();

        for update in batch_update.seeding_updates {
            let player = self.update_player_seeding_internal(&mut tx, update).await?;
            updated_players.push(player);
        }

        tx.commit().await.map_err(|e| PawnError::Database(e))?;
        Ok(updated_players)
    }

    /// Generate pairing numbers
    pub async fn generate_pairing_numbers(
        &self,
        request: GeneratePairingNumbersRequest,
    ) -> Result<Vec<Player>, PawnError> {
        let mut players = self.get_tournament_players(request.tournament_id).await?;
        
        match request.method.as_str() {
            "sequential" => {
                self.generate_sequential_pairing_numbers(&mut players, request.start_number);
            }
            "random" => {
                self.generate_random_pairing_numbers(&mut players, request.start_number);
            }
            "by_seed" => {
                self.generate_seed_based_pairing_numbers(&mut players, request.start_number);
            }
            _ => return Err(PawnError::InvalidInput("Invalid pairing number method".to_string())),
        }

        // Update players in database
        let mut tx = self.pool.begin().await.map_err(|e| PawnError::Database(e))?;
        let mut updated_players = Vec::new();

        for player in players {
            if let Some(pairing_number) = player.pairing_number {
                let update = UpdatePlayerSeeding {
                    player_id: player.id,
                    seed_number: player.seed_number,
                    pairing_number: Some(pairing_number),
                    initial_rating: player.initial_rating,
                };
                let updated = self.update_player_seeding_internal(&mut tx, update).await?;
                updated_players.push(updated);
            }
        }

        tx.commit().await.map_err(|e| PawnError::Database(e))?;
        Ok(updated_players)
    }

    /// Analyze current seeding
    pub async fn analyze_seeding(&self, tournament_id: i32) -> Result<SeedingAnalysis, PawnError> {
        let players = self.get_tournament_players(tournament_id).await?;
        
        let total_players = players.len() as i32;
        let rated_players = players.iter().filter(|p| p.rating.is_some()).count() as i32;
        let unrated_players = total_players - rated_players;
        let manual_seeds = players.iter().filter(|p| p.seed_number.is_some()).count() as i32;

        let rating_range = if rated_players > 0 {
            let ratings: Vec<i32> = players.iter().filter_map(|p| p.rating).collect();
            Some((*ratings.iter().min().unwrap(), *ratings.iter().max().unwrap()))
        } else {
            None
        };

        let average_rating = if rated_players > 0 {
            let sum: i32 = players.iter().filter_map(|p| p.rating).sum();
            Some(sum as f64 / rated_players as f64)
        } else {
            None
        };

        let conflicts = self.detect_seeding_conflicts(&players);

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

    // Internal helper methods

    async fn get_tournament_players(&self, tournament_id: i32) -> Result<Vec<Player>, PawnError> {
        let players = sqlx::query_as::<_, Player>(
            "SELECT * FROM players WHERE tournament_id = ? AND status = 'active' ORDER BY rating DESC NULLS LAST",
        )
        .bind(tournament_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| PawnError::Database(e))?;

        Ok(players)
    }

    fn calculate_seeding(
        &self,
        players: &[Player],
        method: SeedingMethod,
        category_id: Option<i32>,
    ) -> Result<Vec<SeedingPreview>, PawnError> {
        let mut previews = Vec::new();

        match method {
            SeedingMethod::Rating => {
                // Sort by rating (highest first), then by title strength
                let mut sorted_players = players.to_vec();
                sorted_players.sort_by(|a, b| {
                    let rating_a = a.rating.unwrap_or(0);
                    let rating_b = b.rating.unwrap_or(0);
                    rating_b.cmp(&rating_a).then_with(|| {
                        self.title_strength(&a.title).cmp(&self.title_strength(&b.title)).reverse()
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
                indices.shuffle(&mut thread_rng());

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
                // Return current seeding for manual review
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
                // Category-based seeding would require category information
                // For now, fall back to rating-based seeding
                return self.calculate_seeding(players, SeedingMethod::Rating, category_id);
            }
        }

        Ok(previews)
    }

    fn title_strength(&self, title: &Option<String>) -> i32 {
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

    fn generate_sequential_pairing_numbers(&self, players: &mut [Player], start_number: i32) {
        for (index, player) in players.iter_mut().enumerate() {
            player.pairing_number = Some(start_number + index as i32);
        }
    }

    fn generate_random_pairing_numbers(&self, players: &mut [Player], start_number: i32) {
        let mut numbers: Vec<i32> = (start_number..start_number + players.len() as i32).collect();
        numbers.shuffle(&mut thread_rng());

        for (player, &number) in players.iter_mut().zip(numbers.iter()) {
            player.pairing_number = Some(number);
        }
    }

    fn generate_seed_based_pairing_numbers(&self, players: &mut [Player], start_number: i32) {
        // Sort by seed number first, then assign sequential pairing numbers
        players.sort_by_key(|p| p.seed_number.unwrap_or(i32::MAX));
        self.generate_sequential_pairing_numbers(players, start_number);
    }

    async fn update_player_seeding_internal(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
        update: UpdatePlayerSeeding,
    ) -> Result<Player, PawnError> {
        let player = sqlx::query_as::<_, Player>(
            r#"
            UPDATE players SET 
                seed_number = COALESCE(?, seed_number),
                pairing_number = COALESCE(?, pairing_number),
                initial_rating = COALESCE(?, initial_rating),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            RETURNING *
            "#,
        )
        .bind(update.seed_number)
        .bind(update.pairing_number)
        .bind(update.initial_rating)
        .bind(update.player_id)
        .fetch_one(&mut **tx)
        .await
        .map_err(|e| PawnError::Database(e))?;

        Ok(player)
    }

    fn detect_seeding_conflicts(&self, players: &[Player]) -> Vec<SeedingConflict> {
        let mut conflicts = Vec::new();
        let mut seed_counts: HashMap<i32, i32> = HashMap::new();

        // Check for duplicate seeds
        for player in players {
            if let Some(seed) = player.seed_number {
                *seed_counts.entry(seed).or_insert(0) += 1;
            }
        }

        for (seed, count) in seed_counts {
            if count > 1 {
                conflicts.push(SeedingConflict {
                    player_id: 0, // Will be filled with specific players
                    player_name: format!("Seed #{}", seed),
                    conflict_type: "duplicate_seed".to_string(),
                    description: format!("{} players have seed number {}", count, seed),
                    suggested_action: "Reassign seed numbers to make them unique".to_string(),
                });
            }
        }

        // Check for rating mismatches with seeding
        let mut rated_players: Vec<_> = players
            .iter()
            .filter(|p| p.rating.is_some() && p.seed_number.is_some())
            .collect();
        rated_players.sort_by_key(|p| p.seed_number);

        for window in rated_players.windows(2) {
            let player1 = window[0];
            let player2 = window[1];
            
            if let (Some(rating1), Some(rating2)) = (player1.rating, player2.rating) {
                if rating1 < rating2 {
                    conflicts.push(SeedingConflict {
                        player_id: player1.id,
                        player_name: player1.name.clone(),
                        conflict_type: "rating_mismatch".to_string(),
                        description: format!(
                            "{} (seed {}, rating {}) is seeded higher than {} (seed {}, rating {})",
                            player1.name, player1.seed_number.unwrap(), rating1,
                            player2.name, player2.seed_number.unwrap(), rating2
                        ),
                        suggested_action: "Consider adjusting seed numbers to match rating order".to_string(),
                    });
                }
            }
        }

        conflicts
    }
}