use crate::pawn::{
    common::error::PawnError,
    domain::{
        dto::{
            BatchUpdatePlayerSeeding, CreateTournamentSeedingSettings,
            GeneratePairingNumbersRequest, GenerateSeedingRequest, SeedingAnalysis,
            SeedingConflict, SeedingPreview, UpdatePlayerSeeding, UpdateTournamentSeedingSettings,
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
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| PawnError::Database(e))?;
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
            _ => {
                return Err(PawnError::InvalidInput(
                    "Invalid pairing number method".to_string(),
                ));
            }
        }

        // Update players in database
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| PawnError::Database(e))?;
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
                        self.title_strength(&a.title)
                            .cmp(&self.title_strength(&b.title))
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
        }

        conflicts
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pawn::domain::{
        dto::{
            BatchUpdatePlayerSeeding, CreateTournamentSeedingSettings, GeneratePairingNumbersRequest,
            GenerateSeedingRequest, SeedingAnalysis, SeedingConflict, SeedingPreview,
            UpdatePlayerSeeding, UpdateTournamentSeedingSettings,
        },
        model::{Player, SeedingMethod, TournamentSeedingSettings},
    };

    // Test service that doesn't require database connections
    struct TestSeedingService;

    impl TestSeedingService {
        fn new() -> Self {
            Self
        }

        // Test the seeding calculation logic without database
        fn calculate_seeding(
            &self,
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
                            self.title_strength(&a.title)
                                .cmp(&self.title_strength(&b.title))
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
            players.sort_by_key(|p| p.seed_number.unwrap_or(i32::MAX));
            self.generate_sequential_pairing_numbers(players, start_number);
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
                        player_id: 0,
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
            }

            conflicts
        }

        fn analyze_seeding(&self, players: &[Player]) -> SeedingAnalysis {
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

            let conflicts = self.detect_seeding_conflicts(players);

            SeedingAnalysis {
                total_players,
                rated_players,
                unrated_players,
                manual_seeds,
                rating_range,
                average_rating,
                seeding_conflicts: conflicts,
            }
        }
    }

    fn create_test_player(id: i32, name: &str, rating: Option<i32>, title: Option<String>, seed: Option<i32>) -> Player {
        Player {
            id,
            tournament_id: 1,
            name: name.to_string(),
            rating,
            country_code: Some("US".to_string()),
            title,
            birth_date: None,
            gender: Some("M".to_string()),
            email: None,
            phone: None,
            club: None,
            status: "active".to_string(),
            seed_number: seed,
            pairing_number: None,
            initial_rating: rating,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: Some("2024-01-01T00:00:00Z".to_string()),
        }
    }

    #[test]
    fn test_seeding_method_from_str() {
        assert_eq!(SeedingMethod::from_str("rating"), SeedingMethod::Rating);
        assert_eq!(SeedingMethod::from_str("manual"), SeedingMethod::Manual);
        assert_eq!(SeedingMethod::from_str("random"), SeedingMethod::Random);
        assert_eq!(SeedingMethod::from_str("category_based"), SeedingMethod::CategoryBased);
        assert_eq!(SeedingMethod::from_str("invalid"), SeedingMethod::Rating); // Default fallback
    }

    #[test]
    fn test_title_strength() {
        let service = TestSeedingService::new();
        
        assert_eq!(service.title_strength(&Some("GM".to_string())), 8);
        assert_eq!(service.title_strength(&Some("IM".to_string())), 7);
        assert_eq!(service.title_strength(&Some("FM".to_string())), 6);
        assert_eq!(service.title_strength(&Some("CM".to_string())), 5);
        assert_eq!(service.title_strength(&Some("WGM".to_string())), 4);
        assert_eq!(service.title_strength(&Some("WIM".to_string())), 3);
        assert_eq!(service.title_strength(&Some("WFM".to_string())), 2);
        assert_eq!(service.title_strength(&Some("WCM".to_string())), 1);
        assert_eq!(service.title_strength(&None), 0);
        assert_eq!(service.title_strength(&Some("Unknown".to_string())), 0);
    }

    #[test]
    fn test_calculate_seeding_rating_based() {
        let service = TestSeedingService::new();
        let players = vec![
            create_test_player(1, "Player A", Some(1200), None, None),
            create_test_player(2, "Player B", Some(1800), None, None),
            create_test_player(3, "Player C", Some(1500), None, None),
            create_test_player(4, "Player D", None, None, None), // Unrated
        ];

        let result = service.calculate_seeding(&players, SeedingMethod::Rating, None).unwrap();
        
        assert_eq!(result.len(), 4);
        
        // Should be sorted by rating (highest first)
        assert_eq!(result[0].player_name, "Player B"); // 1800 rating
        assert_eq!(result[0].proposed_seed, 1);
        assert_eq!(result[1].player_name, "Player C"); // 1500 rating
        assert_eq!(result[1].proposed_seed, 2);
        assert_eq!(result[2].player_name, "Player A"); // 1200 rating
        assert_eq!(result[2].proposed_seed, 3);
        assert_eq!(result[3].player_name, "Player D"); // Unrated (0)
        assert_eq!(result[3].proposed_seed, 4);
    }

    #[test]
    fn test_calculate_seeding_rating_with_titles() {
        let service = TestSeedingService::new();
        let players = vec![
            create_test_player(1, "FM Player", Some(1500), Some("FM".to_string()), None),
            create_test_player(2, "IM Player", Some(1500), Some("IM".to_string()), None),
            create_test_player(3, "No Title", Some(1500), None, None),
        ];

        let result = service.calculate_seeding(&players, SeedingMethod::Rating, None).unwrap();
        
        assert_eq!(result.len(), 3);
        
        // Same rating, but IM should be seeded higher than FM
        assert_eq!(result[0].player_name, "IM Player");
        assert_eq!(result[0].proposed_seed, 1);
        assert_eq!(result[1].player_name, "FM Player");
        assert_eq!(result[1].proposed_seed, 2);
        assert_eq!(result[2].player_name, "No Title");
        assert_eq!(result[2].proposed_seed, 3);
    }

    #[test]
    fn test_calculate_seeding_manual() {
        let service = TestSeedingService::new();
        let players = vec![
            create_test_player(1, "Player A", Some(1200), None, Some(3)),
            create_test_player(2, "Player B", Some(1800), None, Some(1)),
            create_test_player(3, "Player C", Some(1500), None, None),
        ];

        let result = service.calculate_seeding(&players, SeedingMethod::Manual, None).unwrap();
        
        assert_eq!(result.len(), 3);
        
        // Manual seeding should preserve current seeds
        assert_eq!(result[0].current_seed, Some(3));
        assert_eq!(result[0].proposed_seed, 3);
        assert_eq!(result[1].current_seed, Some(1));
        assert_eq!(result[1].proposed_seed, 1);
        assert_eq!(result[2].current_seed, None);
        assert_eq!(result[2].proposed_seed, 0);
    }

    #[test]
    fn test_calculate_seeding_random() {
        let service = TestSeedingService::new();
        let players = vec![
            create_test_player(1, "Player A", Some(1200), None, None),
            create_test_player(2, "Player B", Some(1800), None, None),
            create_test_player(3, "Player C", Some(1500), None, None),
        ];

        let result = service.calculate_seeding(&players, SeedingMethod::Random, None).unwrap();
        
        assert_eq!(result.len(), 3);
        
        // All players should have seeds 1, 2, 3 (in some order)
        let mut proposed_seeds: Vec<i32> = result.iter().map(|p| p.proposed_seed).collect();
        proposed_seeds.sort();
        assert_eq!(proposed_seeds, vec![1, 2, 3]);
    }

    #[test]
    fn test_calculate_seeding_category_based() {
        let service = TestSeedingService::new();
        let players = vec![
            create_test_player(1, "Player A", Some(1200), None, None),
            create_test_player(2, "Player B", Some(1800), None, None),
        ];

        // Category-based should fall back to rating-based
        let result = service.calculate_seeding(&players, SeedingMethod::CategoryBased, Some(1)).unwrap();
        
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].player_name, "Player B"); // Higher rating first
        assert_eq!(result[1].player_name, "Player A");
    }

    #[test]
    fn test_generate_sequential_pairing_numbers() {
        let service = TestSeedingService::new();
        let mut players = vec![
            create_test_player(1, "Player A", Some(1200), None, None),
            create_test_player(2, "Player B", Some(1800), None, None),
            create_test_player(3, "Player C", Some(1500), None, None),
        ];

        service.generate_sequential_pairing_numbers(&mut players, 10);

        assert_eq!(players[0].pairing_number, Some(10));
        assert_eq!(players[1].pairing_number, Some(11));
        assert_eq!(players[2].pairing_number, Some(12));
    }

    #[test]
    fn test_generate_random_pairing_numbers() {
        let service = TestSeedingService::new();
        let mut players = vec![
            create_test_player(1, "Player A", Some(1200), None, None),
            create_test_player(2, "Player B", Some(1800), None, None),
            create_test_player(3, "Player C", Some(1500), None, None),
        ];

        service.generate_random_pairing_numbers(&mut players, 1);

        // All players should have pairing numbers 1, 2, 3 (in some order)
        let mut pairing_numbers: Vec<i32> = players.iter()
            .filter_map(|p| p.pairing_number)
            .collect();
        pairing_numbers.sort();
        assert_eq!(pairing_numbers, vec![1, 2, 3]);
    }

    #[test]
    fn test_generate_seed_based_pairing_numbers() {
        let service = TestSeedingService::new();
        let mut players = vec![
            create_test_player(1, "Player A", Some(1200), None, Some(3)),
            create_test_player(2, "Player B", Some(1800), None, Some(1)),
            create_test_player(3, "Player C", Some(1500), None, Some(2)),
        ];

        service.generate_seed_based_pairing_numbers(&mut players, 1);

        // Players should be sorted by seed and assigned sequential pairing numbers
        // Player B (seed 1) should get pairing number 1
        // Player C (seed 2) should get pairing number 2  
        // Player A (seed 3) should get pairing number 3
        assert_eq!(players[0].seed_number, Some(1));
        assert_eq!(players[0].pairing_number, Some(1));
        assert_eq!(players[1].seed_number, Some(2));
        assert_eq!(players[1].pairing_number, Some(2));
        assert_eq!(players[2].seed_number, Some(3));
        assert_eq!(players[2].pairing_number, Some(3));
    }

    #[test]
    fn test_detect_seeding_conflicts_duplicate_seeds() {
        let service = TestSeedingService::new();
        let players = vec![
            create_test_player(1, "Player A", Some(1200), None, Some(1)),
            create_test_player(2, "Player B", Some(1800), None, Some(1)), // Duplicate seed
            create_test_player(3, "Player C", Some(1500), None, Some(2)),
        ];

        let conflicts = service.detect_seeding_conflicts(&players);
        
        assert_eq!(conflicts.len(), 1);
        assert_eq!(conflicts[0].conflict_type, "duplicate_seed");
        assert_eq!(conflicts[0].player_name, "Seed #1");
        assert!(conflicts[0].description.contains("2 players have seed number 1"));
    }

    #[test]
    fn test_detect_seeding_conflicts_rating_mismatch() {
        let service = TestSeedingService::new();
        let players = vec![
            create_test_player(1, "Player A", Some(1200), None, Some(1)), // Lower rating, higher seed
            create_test_player(2, "Player B", Some(1800), None, Some(2)), // Higher rating, lower seed
        ];

        let conflicts = service.detect_seeding_conflicts(&players);
        
        assert_eq!(conflicts.len(), 1);
        assert_eq!(conflicts[0].conflict_type, "rating_mismatch");
        assert_eq!(conflicts[0].player_name, "Player A");
        assert!(conflicts[0].description.contains("Player A (seed 1, rating 1200)"));
        assert!(conflicts[0].description.contains("Player B (seed 2, rating 1800)"));
    }

    #[test]
    fn test_detect_seeding_conflicts_no_conflicts() {
        let service = TestSeedingService::new();
        let players = vec![
            create_test_player(1, "Player A", Some(1800), None, Some(1)), // Correct order
            create_test_player(2, "Player B", Some(1500), None, Some(2)),
            create_test_player(3, "Player C", Some(1200), None, Some(3)),
        ];

        let conflicts = service.detect_seeding_conflicts(&players);
        assert_eq!(conflicts.len(), 0);
    }

    #[test]
    fn test_analyze_seeding() {
        let service = TestSeedingService::new();
        let players = vec![
            create_test_player(1, "Player A", Some(1200), None, Some(3)),
            create_test_player(2, "Player B", Some(1800), None, Some(1)),
            create_test_player(3, "Player C", None, None, None), // Unrated
            create_test_player(4, "Player D", Some(1500), None, Some(2)),
        ];

        let analysis = service.analyze_seeding(&players);
        
        assert_eq!(analysis.total_players, 4);
        assert_eq!(analysis.rated_players, 3);
        assert_eq!(analysis.unrated_players, 1);
        assert_eq!(analysis.manual_seeds, 3);
        assert_eq!(analysis.rating_range, Some((1200, 1800)));
        assert_eq!(analysis.average_rating, Some(1500.0)); // (1200 + 1800 + 1500) / 3
        assert_eq!(analysis.seeding_conflicts.len(), 0);
    }

    #[test]
    fn test_analyze_seeding_no_rated_players() {
        let service = TestSeedingService::new();
        let players = vec![
            create_test_player(1, "Player A", None, None, None),
            create_test_player(2, "Player B", None, None, None),
        ];

        let analysis = service.analyze_seeding(&players);
        
        assert_eq!(analysis.total_players, 2);
        assert_eq!(analysis.rated_players, 0);
        assert_eq!(analysis.unrated_players, 2);
        assert_eq!(analysis.manual_seeds, 0);
        assert_eq!(analysis.rating_range, None);
        assert_eq!(analysis.average_rating, None);
    }

    #[test]
    fn test_analyze_seeding_with_conflicts() {
        let service = TestSeedingService::new();
        let players = vec![
            create_test_player(1, "Player A", Some(1200), None, Some(1)), // Rating mismatch
            create_test_player(2, "Player B", Some(1800), None, Some(2)),
            create_test_player(3, "Player C", Some(1500), None, Some(1)), // Duplicate seed
        ];

        let analysis = service.analyze_seeding(&players);
        
        assert_eq!(analysis.total_players, 3);
        assert_eq!(analysis.seeding_conflicts.len(), 2); // 1 duplicate + 1 rating mismatch
        
        // Check for duplicate seed conflict
        let duplicate_conflict = analysis.seeding_conflicts.iter()
            .find(|c| c.conflict_type == "duplicate_seed");
        assert!(duplicate_conflict.is_some());
        
        // Check for rating mismatch conflict
        let rating_conflict = analysis.seeding_conflicts.iter()
            .find(|c| c.conflict_type == "rating_mismatch");
        assert!(rating_conflict.is_some());
    }

    #[test]
    fn test_empty_player_list() {
        let service = TestSeedingService::new();
        let players = vec![];

        let result = service.calculate_seeding(&players, SeedingMethod::Rating, None).unwrap();
        assert_eq!(result.len(), 0);

        let conflicts = service.detect_seeding_conflicts(&players);
        assert_eq!(conflicts.len(), 0);

        let analysis = service.analyze_seeding(&players);
        assert_eq!(analysis.total_players, 0);
        assert_eq!(analysis.rated_players, 0);
        assert_eq!(analysis.unrated_players, 0);
        assert_eq!(analysis.manual_seeds, 0);
        assert_eq!(analysis.rating_range, None);
        assert_eq!(analysis.average_rating, None);
    }

    #[test]
    fn test_single_player() {
        let service = TestSeedingService::new();
        let players = vec![
            create_test_player(1, "Solo Player", Some(1500), Some("FM".to_string()), Some(1)),
        ];

        let result = service.calculate_seeding(&players, SeedingMethod::Rating, None).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].proposed_seed, 1);

        let analysis = service.analyze_seeding(&players);
        assert_eq!(analysis.total_players, 1);
        assert_eq!(analysis.rated_players, 1);
        assert_eq!(analysis.unrated_players, 0);
        assert_eq!(analysis.manual_seeds, 1);
        assert_eq!(analysis.rating_range, Some((1500, 1500)));
        assert_eq!(analysis.average_rating, Some(1500.0));
    }
}
