use crate::pawn::domain::model::{Player, RatingHistory, PlayerCategory, PlayerCategoryAssignment};
use crate::pawn::domain::dto::{
    CreatePlayer, UpdatePlayer, CreateRatingHistory, CreatePlayerCategory, 
    BulkImportRequest, BulkImportResult, PlayerSearchFilters, PlayerImportValidation,
    AssignPlayerToCategory
};
use crate::pawn::common::error::PawnError;
use crate::pawn::db::Db;
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct PlayerStatistics {
    pub total_players: i32,
    pub active_players: i32,
    pub withdrawn_players: i32,
    pub late_entries: i32,
    pub bye_requests: i32,
    pub average_rating: f64,
    pub titled_players: i32,
}

pub struct PlayerService<D> {
    db: Arc<D>,
}

impl<D: Db> PlayerService<D> {
    pub fn new(db: Arc<D>) -> Self {
        Self { db }
    }

    // Enhanced CRUD Operations

    pub async fn create_player(&self, data: CreatePlayer) -> Result<Player, PawnError> {
        // Validate player data
        self.validate_player_data(&data)?;

        // Use the existing trait method for now, will need to extend the trait for enhanced fields
        self.db.create_player(data).await.map_err(PawnError::from)
    }

    pub async fn update_player(&self, data: UpdatePlayer) -> Result<Player, PawnError> {
        // Validate that at least one field is being updated
        if data.name.is_none() && data.rating.is_none() && data.country_code.is_none() &&
           data.title.is_none() && data.birth_date.is_none() && data.gender.is_none() &&
           data.email.is_none() && data.phone.is_none() && data.club.is_none() && data.status.is_none() {
            return Err(PawnError::ValidationError("No fields to update".to_string()));
        }

        // Validate the data if provided
        if let Some(ref name) = data.name {
            if name.trim().is_empty() {
                return Err(PawnError::ValidationError("Player name cannot be empty".to_string()));
            }
        }
        
        if let Some(rating) = data.rating {
            if rating < 0 || rating > 4000 {
                return Err(PawnError::ValidationError("Rating must be between 0 and 4000".to_string()));
            }
        }

        if let Some(ref gender) = data.gender {
            if !["M", "F", "O"].contains(&gender.as_str()) {
                return Err(PawnError::ValidationError("Gender must be M, F, or O".to_string()));
            }
        }

        self.db.update_player(data).await.map_err(PawnError::from)
    }

    pub async fn delete_player(&self, player_id: i32) -> Result<(), PawnError> {
        self.db.delete_player(player_id).await.map_err(PawnError::from)
    }

    pub async fn get_player_by_id(&self, player_id: i32) -> Result<Player, PawnError> {
        self.db.get_player(player_id).await.map_err(PawnError::from)
    }

    pub async fn get_players_by_tournament(&self, tournament_id: i32) -> Result<Vec<Player>, PawnError> {
        self.db.get_players_by_tournament(tournament_id).await.map_err(PawnError::from)
    }

    pub async fn search_players(&self, filters: PlayerSearchFilters) -> Result<Vec<Player>, PawnError> {
        // TODO: Implement search with enhanced filters once schema is migrated
        // For now, just return players by tournament if specified
        if let Some(tournament_id) = filters.tournament_id {
            self.get_players_by_tournament(tournament_id).await
        } else {
            Ok(vec![])
        }
    }

    // Bulk Import Operations

    pub async fn bulk_import_players(&self, _request: BulkImportRequest) -> Result<BulkImportResult, PawnError> {
        // TODO: Implement bulk import once enhanced schema is ready
        Ok(BulkImportResult {
            success_count: 0,
            error_count: 0,
            validations: vec![],
            imported_player_ids: vec![],
        })
    }

    // Rating History Management

    pub async fn add_rating_history(&self, _data: CreateRatingHistory) -> Result<RatingHistory, PawnError> {
        // TODO: Implement rating history once enhanced schema is ready
        Err(PawnError::ValidationError("Rating history not yet implemented".to_string()))
    }

    pub async fn get_player_rating_history(&self, _player_id: i32) -> Result<Vec<RatingHistory>, PawnError> {
        // TODO: Implement rating history once enhanced schema is ready
        Ok(vec![])
    }


    // Private helper methods

    fn validate_player_data(&self, data: &CreatePlayer) -> Result<(), PawnError> {
        if data.name.trim().is_empty() {
            return Err(PawnError::ValidationError("Player name cannot be empty".to_string()));
        }

        if let Some(rating) = data.rating {
            if rating < 0 || rating > 4000 {
                return Err(PawnError::ValidationError("Rating must be between 0 and 4000".to_string()));
            }
        }

        if let Some(gender) = &data.gender {
            if !["M", "F", "O"].contains(&gender.as_str()) {
                return Err(PawnError::ValidationError("Gender must be M, F, or O".to_string()));
            }
        }

        Ok(())
    }

    fn _validate_import_player(&self, player_data: &crate::pawn::domain::dto::BulkImportPlayer, _tournament_id: i32) -> PlayerImportValidation {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        if player_data.name.trim().is_empty() {
            errors.push("Player name cannot be empty".to_string());
        }

        if let Some(rating) = player_data.rating {
            if rating < 0 || rating > 4000 {
                errors.push("Rating must be between 0 and 4000".to_string());
            }
        }

        if let Some(gender) = &player_data.gender {
            if !["M", "F", "O"].contains(&gender.as_str()) {
                errors.push("Gender must be M, F, or O".to_string());
            }
        }

        if let Some(email) = &player_data.email {
            if !email.contains('@') {
                warnings.push("Email format may be invalid".to_string());
            }
        }

        PlayerImportValidation {
            is_valid: errors.is_empty(),
            errors,
            warnings,
            player_data: player_data.clone(),
        }
    }

    // Player Category Management

    pub async fn get_tournament_categories(&self, tournament_id: i32) -> Result<Vec<PlayerCategory>, PawnError> {
        self.db.get_tournament_categories(tournament_id).await.map_err(PawnError::from)
    }

    pub async fn create_player_category(&self, data: CreatePlayerCategory) -> Result<PlayerCategory, PawnError> {
        // Validate category data
        if data.name.trim().is_empty() {
            return Err(PawnError::ValidationError("Category name cannot be empty".to_string()));
        }

        if let (Some(min_rating), Some(max_rating)) = (data.min_rating, data.max_rating) {
            if min_rating > max_rating {
                return Err(PawnError::ValidationError("Minimum rating cannot be greater than maximum rating".to_string()));
            }
        }

        if let (Some(min_age), Some(max_age)) = (data.min_age, data.max_age) {
            if min_age > max_age {
                return Err(PawnError::ValidationError("Minimum age cannot be greater than maximum age".to_string()));
            }
        }

        self.db.create_player_category(data).await.map_err(PawnError::from)
    }

    pub async fn delete_player_category(&self, category_id: i32) -> Result<(), PawnError> {
        self.db.delete_player_category(category_id).await.map_err(PawnError::from)
    }

    pub async fn assign_player_to_category(&self, data: AssignPlayerToCategory) -> Result<PlayerCategoryAssignment, PawnError> {
        // Validate that player and category exist and belong to the same tournament
        let player = self.db.get_player(data.player_id).await.map_err(PawnError::from)?;
        let categories = self.db.get_tournament_categories(player.tournament_id).await.map_err(PawnError::from)?;
        
        let category = categories.iter().find(|c| c.id == data.category_id);
        if category.is_none() {
            return Err(PawnError::ValidationError("Category not found in this tournament".to_string()));
        }

        self.db.assign_player_to_category(data).await.map_err(PawnError::from)
    }

    pub async fn get_player_category_assignments(&self, tournament_id: i32) -> Result<Vec<PlayerCategoryAssignment>, PawnError> {
        self.db.get_player_category_assignments(tournament_id).await.map_err(PawnError::from)
    }

    // Player Status Management

    pub async fn update_player_status(&self, player_id: i32, status: String) -> Result<Player, PawnError> {
        // Validate status
        if !["active", "withdrawn", "bye_requested", "late_entry"].contains(&status.as_str()) {
            return Err(PawnError::ValidationError("Invalid player status".to_string()));
        }

        let data = UpdatePlayer {
            player_id,
            name: None,
            rating: None,
            country_code: None,
            title: None,
            birth_date: None,
            gender: None,
            email: None,
            phone: None,
            club: None,
            status: Some(status),
        };

        self.update_player(data).await
    }

    pub async fn withdraw_player(&self, player_id: i32) -> Result<Player, PawnError> {
        self.update_player_status(player_id, "withdrawn".to_string()).await
    }

    pub async fn request_player_bye(&self, player_id: i32) -> Result<Player, PawnError> {
        self.update_player_status(player_id, "bye_requested".to_string()).await
    }

    pub async fn get_player_statistics(&self, tournament_id: i32) -> Result<PlayerStatistics, PawnError> {
        let players = self.db.get_players_by_tournament(tournament_id).await.map_err(PawnError::from)?;
        
        let total_players = players.len() as i32;
        let active_players = players.iter().filter(|p| p.status == "active").count() as i32;
        let withdrawn_players = players.iter().filter(|p| p.status == "withdrawn").count() as i32;
        let late_entries = players.iter().filter(|p| p.status == "late_entry").count() as i32;
        let bye_requests = players.iter().filter(|p| p.status == "bye_requested").count() as i32;
        
        let average_rating = if players.is_empty() {
            0.0
        } else {
            let rated_players: Vec<&Player> = players.iter().filter(|p| p.rating.is_some()).collect();
            if rated_players.is_empty() {
                0.0
            } else {
                let sum: i32 = rated_players.iter().map(|p| p.rating.unwrap_or(0)).sum();
                sum as f64 / rated_players.len() as f64
            }
        };

        let titled_players = players.iter().filter(|p| p.title.is_some() && !p.title.as_ref().unwrap().is_empty()).count() as i32;

        Ok(PlayerStatistics {
            total_players,
            active_players,
            withdrawn_players,
            late_entries,
            bye_requests,
            average_rating,
            titled_players,
        })
    }
}