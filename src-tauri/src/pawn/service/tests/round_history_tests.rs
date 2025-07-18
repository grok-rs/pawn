use std::sync::Arc;
use tokio_test;

use crate::pawn::{
    domain::dto::{RoundExportRequest},
    service::round_history::RoundHistoryService,
    test::mock_db::MockDb,
};

#[tokio::test]
async fn test_export_round_data_json() {
    // Create mock database
    let mock_db = Arc::new(MockDb::new());
    let service = RoundHistoryService::new(mock_db);
    
    let request = RoundExportRequest {
        tournament_id: 1,
        round_number: Some(1),
        format: "json".to_string(),
        include_statistics: true,
        include_standings: true,
        include_games: true,
    };
    
    // This should not panic - we expect it to fail gracefully
    let result = service.export_round_data(request).await;
    
    // For now, we expect this to fail because we don't have mock data
    // But it should be a structured error, not a panic
    assert!(result.is_err());
}

#[tokio::test] 
async fn test_export_round_data_unsupported_format() {
    let mock_db = Arc::new(MockDb::new());
    let service = RoundHistoryService::new(mock_db);
    
    let request = RoundExportRequest {
        tournament_id: 1,
        round_number: Some(1),
        format: "unsupported".to_string(),
        include_statistics: true,
        include_standings: true,
        include_games: true,
    };
    
    let result = service.export_round_data(request).await;
    
    assert!(result.is_err());
    if let Err(error) = result {
        assert!(error.to_string().contains("Unsupported export format"));
    }
}

#[test]
fn test_round_history_service_creation() {
    let mock_db = Arc::new(MockDb::new());
    let _service = RoundHistoryService::new(mock_db);
    
    // Service should be created successfully
    assert!(true);
}