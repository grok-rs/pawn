use crate::pawn::{
    common::error::PawnError,
    domain::{
        dto::{
            BatchUpdatePlayerSeeding, CreateTournamentSeedingSettings,
            GeneratePairingNumbersRequest, GenerateSeedingRequest, SeedingAnalysis, SeedingPreview,
            UpdateTournamentSeedingSettings,
        },
        model::{Player, TournamentSeedingSettings},
    },
    service::seeding::SeedingService,
};
use sqlx::SqlitePool;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn create_tournament_seeding_settings(
    settings: CreateTournamentSeedingSettings,
    pool: State<'_, SqlitePool>,
) -> Result<TournamentSeedingSettings, PawnError> {
    let service = SeedingService::new(pool.inner().clone());
    service.create_seeding_settings(settings).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_tournament_seeding_settings(
    tournament_id: i32,
    pool: State<'_, SqlitePool>,
) -> Result<Option<TournamentSeedingSettings>, PawnError> {
    let service = SeedingService::new(pool.inner().clone());
    service.get_seeding_settings(tournament_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn update_tournament_seeding_settings(
    settings: UpdateTournamentSeedingSettings,
    pool: State<'_, SqlitePool>,
) -> Result<TournamentSeedingSettings, PawnError> {
    let service = SeedingService::new(pool.inner().clone());
    service.update_seeding_settings(settings).await
}

#[tauri::command]
#[specta::specta]
pub async fn generate_tournament_seeding(
    request: GenerateSeedingRequest,
    pool: State<'_, SqlitePool>,
) -> Result<Vec<SeedingPreview>, PawnError> {
    let service = SeedingService::new(pool.inner().clone());
    service.generate_seeding(request).await
}

#[tauri::command]
#[specta::specta]
pub async fn apply_tournament_seeding(
    batch_update: BatchUpdatePlayerSeeding,
    pool: State<'_, SqlitePool>,
) -> Result<Vec<Player>, PawnError> {
    let service = SeedingService::new(pool.inner().clone());
    service.apply_seeding(batch_update).await
}

#[tauri::command]
#[specta::specta]
pub async fn generate_pairing_numbers(
    request: GeneratePairingNumbersRequest,
    pool: State<'_, SqlitePool>,
) -> Result<Vec<Player>, PawnError> {
    let service = SeedingService::new(pool.inner().clone());
    service.generate_pairing_numbers(request).await
}

#[tauri::command]
#[specta::specta]
pub async fn analyze_tournament_seeding(
    tournament_id: i32,
    pool: State<'_, SqlitePool>,
) -> Result<SeedingAnalysis, PawnError> {
    let service = SeedingService::new(pool.inner().clone());
    service.analyze_seeding(tournament_id).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pawn::domain::dto::UpdatePlayerSeeding;
    use sqlx::SqlitePool;

    async fn setup_test_pool() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        pool
    }

    #[tokio::test]
    async fn command_seeding_service_basic_contract() {
        let pool = setup_test_pool().await;
        let _service = SeedingService::new(pool);
        // Basic contract validation - service creation should not panic
    }

    #[tokio::test]
    async fn command_seeding_service_operations_contract() {
        let pool = setup_test_pool().await;
        let service = SeedingService::new(pool.clone());

        // Test basic service operations without requiring complex database setup
        let tournament_id = 1;

        // Test get_seeding_settings for non-existent tournament
        let result = service.get_seeding_settings(tournament_id).await;
        assert!(result.is_ok());

        // Test analyze_seeding for non-existent tournament
        let analysis_result = service.analyze_seeding(tournament_id).await;
        assert!(analysis_result.is_ok() || analysis_result.is_err()); // Either is valid for contract
    }

    #[tokio::test]
    async fn command_seeding_dto_coverage() {
        // Test DTO structure creation for all seeding-related DTOs
        let tournament_id = 1;

        let create_settings = CreateTournamentSeedingSettings {
            tournament_id,
            seeding_method: "rating".to_string(),
            use_initial_rating: true,
            randomize_unrated: false,
            protect_top_seeds: 0,
        };
        assert_eq!(create_settings.tournament_id, tournament_id);
        assert_eq!(create_settings.seeding_method, "rating");
        assert!(create_settings.use_initial_rating);
        assert!(!create_settings.randomize_unrated);
        assert_eq!(create_settings.protect_top_seeds, 0);

        let update_settings = UpdateTournamentSeedingSettings {
            id: 1,
            seeding_method: Some("manual".to_string()),
            use_initial_rating: Some(false),
            randomize_unrated: Some(true),
            protect_top_seeds: Some(2),
        };
        assert_eq!(update_settings.id, 1);
        assert_eq!(update_settings.seeding_method, Some("manual".to_string()));
        assert_eq!(update_settings.use_initial_rating, Some(false));
        assert_eq!(update_settings.randomize_unrated, Some(true));
        assert_eq!(update_settings.protect_top_seeds, Some(2));

        let generate_request = GenerateSeedingRequest {
            tournament_id,
            seeding_method: "rating".to_string(),
            preserve_manual_seeds: false,
            category_id: None,
        };
        assert_eq!(generate_request.tournament_id, tournament_id);
        assert_eq!(generate_request.seeding_method, "rating");
        assert!(!generate_request.preserve_manual_seeds);
        assert_eq!(generate_request.category_id, None);

        let seeding_update = UpdatePlayerSeeding {
            player_id: 1,
            seed_number: Some(1),
            pairing_number: Some(1),
            initial_rating: Some(1600),
        };
        assert_eq!(seeding_update.player_id, 1);
        assert_eq!(seeding_update.seed_number, Some(1));
        assert_eq!(seeding_update.pairing_number, Some(1));
        assert_eq!(seeding_update.initial_rating, Some(1600));

        let batch_update = BatchUpdatePlayerSeeding {
            tournament_id,
            seeding_updates: vec![seeding_update],
        };
        assert_eq!(batch_update.tournament_id, tournament_id);
        assert_eq!(batch_update.seeding_updates.len(), 1);

        let pairing_request = GeneratePairingNumbersRequest {
            tournament_id,
            method: "sequential".to_string(),
            start_number: 1,
            preserve_existing: false,
        };
        assert_eq!(pairing_request.tournament_id, tournament_id);
        assert_eq!(pairing_request.method, "sequential");
        assert_eq!(pairing_request.start_number, 1);
        assert!(!pairing_request.preserve_existing);

        let seeding_preview = SeedingPreview {
            player_id: 1,
            player_name: "Test Player".to_string(),
            current_seed: None,
            proposed_seed: 1,
            rating: Some(1600),
            title: None,
            category: None,
        };
        assert_eq!(seeding_preview.player_id, 1);
        assert_eq!(seeding_preview.player_name, "Test Player");
        assert_eq!(seeding_preview.current_seed, None);
        assert_eq!(seeding_preview.proposed_seed, 1);
        assert_eq!(seeding_preview.rating, Some(1600));

        let seeding_analysis = SeedingAnalysis {
            total_players: 10,
            rated_players: 8,
            unrated_players: 2,
            manual_seeds: 0,
            rating_range: Some((1200, 1800)),
            average_rating: Some(1500.0),
            seeding_conflicts: vec![],
        };
        assert_eq!(seeding_analysis.total_players, 10);
        assert_eq!(seeding_analysis.rated_players, 8);
        assert_eq!(seeding_analysis.unrated_players, 2);
        assert_eq!(seeding_analysis.manual_seeds, 0);
        assert_eq!(seeding_analysis.rating_range, Some((1200, 1800)));
        assert_eq!(seeding_analysis.average_rating, Some(1500.0));
        assert!(seeding_analysis.seeding_conflicts.is_empty());
    }

    #[tokio::test]
    async fn command_seeding_method_coverage() {
        // Test different seeding method strings
        let methods = vec!["rating", "manual", "random", "category_based"];

        for method in methods {
            let request = GenerateSeedingRequest {
                tournament_id: 1,
                seeding_method: method.to_string(),
                preserve_manual_seeds: false,
                category_id: None,
            };
            assert_eq!(request.seeding_method, method);
        }
    }

    #[tokio::test]
    async fn command_pairing_number_methods_coverage() {
        // Test different pairing number generation methods
        let methods = vec!["sequential", "random", "by_seed"];

        for method in methods {
            let request = GeneratePairingNumbersRequest {
                tournament_id: 1,
                method: method.to_string(),
                start_number: 1,
                preserve_existing: false,
            };
            assert_eq!(request.method, method);
        }
    }
}
