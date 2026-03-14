use crate::common::error::PawnError;
use crate::db::*;
use crate::participant::dto::{
    AssignPlayerToCategory, BulkImportRequest, BulkImportResult, CreatePlayer,
    CreatePlayerCategory, CreateRatingHistory, PlayerImportValidation, PlayerSearchFilters,
    UpdatePlayer,
};
use crate::participant::model::{Player, PlayerCategory, PlayerCategoryAssignment, RatingHistory};
use crate::participant::value_objects::{Gender, PlayerStatus, Rating};
use std::sync::Arc;

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
        if data.name.is_none()
            && data.rating.is_none()
            && data.country_code.is_none()
            && data.title.is_none()
            && data.birth_date.is_none()
            && data.gender.is_none()
            && data.email.is_none()
            && data.phone.is_none()
            && data.club.is_none()
            && data.status.is_none()
        {
            return Err(PawnError::ValidationError(
                "No fields to update".to_string(),
            ));
        }

        // Validate the data if provided
        if let Some(ref name) = data.name
            && name.trim().is_empty()
        {
            return Err(PawnError::ValidationError(
                "Player name cannot be empty".to_string(),
            ));
        }

        if let Some(rating) = data.rating {
            Rating::new(rating)?;
        }

        if let Some(ref gender) = data.gender {
            Gender::parse(gender)?;
        }

        self.db.update_player(data).await.map_err(PawnError::from)
    }

    pub async fn delete_player(&self, player_id: i32) -> Result<(), PawnError> {
        self.db
            .delete_player(player_id)
            .await
            .map_err(PawnError::from)
    }

    pub async fn get_player_by_id(&self, player_id: i32) -> Result<Player, PawnError> {
        self.db.get_player(player_id).await.map_err(PawnError::from)
    }

    pub async fn get_players_by_tournament(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<Player>, PawnError> {
        self.db
            .get_players_by_tournament(tournament_id)
            .await
            .map_err(PawnError::from)
    }

    pub async fn search_players(
        &self,
        filters: PlayerSearchFilters,
    ) -> Result<Vec<Player>, PawnError> {
        // TODO: Implement search with enhanced filters once schema is migrated
        // For now, just return players by tournament if specified
        if let Some(tournament_id) = filters.tournament_id {
            self.get_players_by_tournament(tournament_id).await
        } else {
            Ok(vec![])
        }
    }

    // Bulk Import Operations

    pub async fn bulk_import_players(
        &self,
        _request: BulkImportRequest,
    ) -> Result<BulkImportResult, PawnError> {
        // TODO: Implement bulk import once enhanced schema is ready
        Ok(BulkImportResult {
            success_count: 0,
            error_count: 0,
            validations: vec![],
            imported_player_ids: vec![],
        })
    }

    // Rating History Management

    pub async fn add_rating_history(
        &self,
        _data: CreateRatingHistory,
    ) -> Result<RatingHistory, PawnError> {
        // TODO: Implement rating history once enhanced schema is ready
        Err(PawnError::ValidationError(
            "Rating history not yet implemented".to_string(),
        ))
    }

    pub async fn get_player_rating_history(
        &self,
        _player_id: i32,
    ) -> Result<Vec<RatingHistory>, PawnError> {
        // TODO: Implement rating history once enhanced schema is ready
        Ok(vec![])
    }

    // Private helper methods

    fn validate_player_data(&self, data: &CreatePlayer) -> Result<(), PawnError> {
        if data.name.trim().is_empty() {
            return Err(PawnError::ValidationError(
                "Player name cannot be empty".to_string(),
            ));
        }

        if let Some(rating) = data.rating {
            Rating::new(rating)?;
        }

        if let Some(ref gender) = data.gender {
            Gender::parse(gender)?;
        }

        Ok(())
    }

    fn _validate_import_player(
        &self,
        player_data: &crate::participant::dto::BulkImportPlayer,
        _tournament_id: i32,
    ) -> PlayerImportValidation {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        if player_data.name.trim().is_empty() {
            errors.push("Player name cannot be empty".to_string());
        }

        if let Some(rating) = player_data.rating
            && Rating::new(rating).is_err()
        {
            errors.push("Rating must be between 0 and 4000".to_string());
        }

        if let Some(ref gender) = player_data.gender
            && Gender::parse(gender).is_err()
        {
            errors.push("Gender must be M, F, or O".to_string());
        }

        if let Some(email) = &player_data.email
            && !email.contains('@')
        {
            warnings.push("Email format may be invalid".to_string());
        }

        PlayerImportValidation {
            is_valid: errors.is_empty(),
            errors,
            warnings,
            player_data: player_data.clone(),
        }
    }

    // Player Category Management

    pub async fn get_tournament_categories(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<PlayerCategory>, PawnError> {
        self.db
            .get_tournament_categories(tournament_id)
            .await
            .map_err(PawnError::from)
    }

    pub async fn create_player_category(
        &self,
        data: CreatePlayerCategory,
    ) -> Result<PlayerCategory, PawnError> {
        // Validate category data
        if data.name.trim().is_empty() {
            return Err(PawnError::ValidationError(
                "Category name cannot be empty".to_string(),
            ));
        }

        if let (Some(min_rating), Some(max_rating)) = (data.min_rating, data.max_rating)
            && min_rating > max_rating
        {
            return Err(PawnError::ValidationError(
                "Minimum rating cannot be greater than maximum rating".to_string(),
            ));
        }

        if let (Some(min_age), Some(max_age)) = (data.min_age, data.max_age)
            && min_age > max_age
        {
            return Err(PawnError::ValidationError(
                "Minimum age cannot be greater than maximum age".to_string(),
            ));
        }

        self.db
            .create_player_category(data)
            .await
            .map_err(PawnError::from)
    }

    pub async fn delete_player_category(&self, category_id: i32) -> Result<(), PawnError> {
        self.db
            .delete_player_category(category_id)
            .await
            .map_err(PawnError::from)
    }

    pub async fn assign_player_to_category(
        &self,
        data: AssignPlayerToCategory,
    ) -> Result<PlayerCategoryAssignment, PawnError> {
        // Validate that player and category exist and belong to the same tournament
        let player = self
            .db
            .get_player(data.player_id)
            .await
            .map_err(PawnError::from)?;
        let categories = self
            .db
            .get_tournament_categories(player.tournament_id)
            .await
            .map_err(PawnError::from)?;

        let category = categories.iter().find(|c| c.id == data.category_id);
        if category.is_none() {
            return Err(PawnError::ValidationError(
                "Category not found in this tournament".to_string(),
            ));
        }

        self.db
            .assign_player_to_category(data)
            .await
            .map_err(PawnError::from)
    }

    pub async fn get_player_category_assignments(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<PlayerCategoryAssignment>, PawnError> {
        self.db
            .get_player_category_assignments(tournament_id)
            .await
            .map_err(PawnError::from)
    }

    // Player Status Management

    pub async fn update_player_status(
        &self,
        player_id: i32,
        status: String,
    ) -> Result<Player, PawnError> {
        // Validate status using typed enum
        PlayerStatus::parse(&status)?;

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
        self.update_player_status(player_id, "withdrawn".to_string())
            .await
    }

    pub async fn request_player_bye(&self, player_id: i32) -> Result<Player, PawnError> {
        self.update_player_status(player_id, "bye_requested".to_string())
            .await
    }

    // Note: This method is now implemented in the command layer
    // to avoid circular dependencies with the PlayerStatistics type.
    // The command layer handles the statistics calculation directly.
}
