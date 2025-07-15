use crate::pawn::{
    common::error::PawnError,
    db::Db,
    domain::{
        dto::{CreateTimeControl, TimeControlFilter, TimeControlValidation, UpdateTimeControl},
        model::{TimeControl, TimeControlTemplate, TimeControlType},
    },
};

pub struct TimeControlService<D> {
    db: std::sync::Arc<D>,
}

impl<D: Db> TimeControlService<D> {
    pub fn new(db: std::sync::Arc<D>) -> Self {
        Self { db }
    }

    /// Get all time controls with optional filtering
    pub async fn get_time_controls(
        &self,
        filter: Option<TimeControlFilter>,
    ) -> Result<Vec<TimeControl>, PawnError> {
        // For now, get all time controls since we haven't implemented filtering in DB yet
        let time_controls = self.db.get_time_controls().await?;

        if let Some(filter) = filter {
            let filtered = time_controls
                .into_iter()
                .filter(|tc| {
                    let mut matches = true;

                    if let Some(tc_type) = &filter.time_control_type {
                        matches = matches && tc.time_control_type == *tc_type;
                    }

                    if let Some(is_default) = filter.is_default {
                        matches = matches && tc.is_default == is_default;
                    }

                    if let Some(is_real_time) = filter.is_real_time {
                        let time_type = TimeControlType::from_str(&tc.time_control_type);
                        matches = matches && time_type.is_real_time() == is_real_time;
                    }

                    matches
                })
                .collect();

            Ok(filtered)
        } else {
            Ok(time_controls)
        }
    }

    /// Get default time controls for each type
    pub async fn get_default_time_controls(&self) -> Result<Vec<TimeControl>, PawnError> {
        let filter = TimeControlFilter {
            time_control_type: None,
            is_default: Some(true),
            is_real_time: None,
        };
        self.get_time_controls(Some(filter)).await
    }

    /// Get a specific time control by ID
    pub async fn get_time_control(&self, id: i32) -> Result<TimeControl, PawnError> {
        self.db
            .get_time_control(id)
            .await
            .map_err(PawnError::Database)
    }

    /// Create a new time control
    pub async fn create_time_control(
        &self,
        data: CreateTimeControl,
    ) -> Result<TimeControl, PawnError> {
        // Validate the time control
        let validation = self.validate_time_control_data(&data)?;
        if !validation.is_valid {
            return Err(PawnError::InvalidInput(validation.errors.join(", ")));
        }

        let time_control = TimeControl {
            id: 0, // Will be set by database
            name: data.name,
            time_control_type: data.time_control_type,
            base_time_minutes: data.base_time_minutes,
            increment_seconds: data.increment_seconds,
            moves_per_session: data.moves_per_session,
            session_time_minutes: data.session_time_minutes,
            total_sessions: data.total_sessions,
            is_default: false, // New time controls are not default
            description: data.description,
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        self.db
            .create_time_control(time_control)
            .await
            .map_err(PawnError::Database)
    }

    /// Update an existing time control
    pub async fn update_time_control(
        &self,
        data: UpdateTimeControl,
    ) -> Result<TimeControl, PawnError> {
        // Get current time control
        let current = self.get_time_control(data.id).await?;

        // Create updated data for validation
        let validation_data = CreateTimeControl {
            name: data.name.clone().unwrap_or(current.name.clone()),
            time_control_type: data
                .time_control_type
                .clone()
                .unwrap_or(current.time_control_type.clone()),
            base_time_minutes: data.base_time_minutes.or(current.base_time_minutes),
            increment_seconds: data.increment_seconds.or(current.increment_seconds),
            moves_per_session: data.moves_per_session.or(current.moves_per_session),
            session_time_minutes: data.session_time_minutes.or(current.session_time_minutes),
            total_sessions: data.total_sessions.or(current.total_sessions),
            description: data.description.clone().or(current.description.clone()),
        };

        // Validate the updated time control
        let validation = self.validate_time_control_data(&validation_data)?;
        if !validation.is_valid {
            return Err(PawnError::InvalidInput(validation.errors.join(", ")));
        }

        self.db
            .update_time_control(data)
            .await
            .map_err(PawnError::Database)
    }

    /// Delete a time control
    pub async fn delete_time_control(&self, id: i32) -> Result<(), PawnError> {
        // Check if time control is being used by any tournaments
        let tournaments_using = self.db.get_tournaments_using_time_control(id).await?;
        if !tournaments_using.is_empty() {
            return Err(PawnError::InvalidInput(format!(
                "Cannot delete time control: it is used by {} tournament(s)",
                tournaments_using.len()
            )));
        }

        self.db
            .delete_time_control(id)
            .await
            .map_err(PawnError::Database)
    }

    /// Set a time control as default for its type
    pub async fn set_as_default(&self, id: i32) -> Result<TimeControl, PawnError> {
        let time_control = self.get_time_control(id).await?;

        // Unset all other defaults for this type
        self.db
            .unset_default_time_controls(&time_control.time_control_type)
            .await?;

        // Set this one as default
        let update_data = UpdateTimeControl {
            id,
            name: None,
            time_control_type: None,
            base_time_minutes: None,
            increment_seconds: None,
            moves_per_session: None,
            session_time_minutes: None,
            total_sessions: None,
            description: None,
            is_default: Some(true),
        };

        self.update_time_control(update_data).await
    }

    /// Get time control templates for common formats
    pub async fn get_time_control_templates(&self) -> Result<Vec<TimeControlTemplate>, PawnError> {
        let time_controls = self.get_time_controls(None).await?;

        let templates = time_controls
            .into_iter()
            .map(|tc| TimeControlTemplate {
                id: tc.id,
                name: tc.name,
                time_control_type: tc.time_control_type,
                base_time_minutes: tc.base_time_minutes,
                increment_seconds: tc.increment_seconds,
                moves_per_session: tc.moves_per_session,
                session_time_minutes: tc.session_time_minutes,
                total_sessions: tc.total_sessions,
                description: tc.description,
            })
            .collect();

        Ok(templates)
    }

    /// Validate time control data
    pub fn validate_time_control_data(
        &self,
        data: &CreateTimeControl,
    ) -> Result<TimeControlValidation, PawnError> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Validate name
        if data.name.trim().is_empty() {
            errors.push("Time control name cannot be empty".to_string());
        }

        let time_type = TimeControlType::from_str(&data.time_control_type);

        // Validate based on time control type
        match time_type {
            TimeControlType::Classical => {
                if data.base_time_minutes.is_none() || data.base_time_minutes.unwrap_or(0) < 30 {
                    errors.push(
                        "Classical games should have at least 30 minutes base time".to_string(),
                    );
                }
                if data.increment_seconds.is_none() {
                    warnings.push("Classical games typically use increments".to_string());
                }
            }
            TimeControlType::Rapid => {
                if let Some(base) = data.base_time_minutes {
                    if !(3..=60).contains(&base) {
                        warnings.push("Rapid games are typically between 3-60 minutes".to_string());
                    }
                } else {
                    errors.push("Rapid games must have base time specified".to_string());
                }
            }
            TimeControlType::Blitz => {
                if let Some(base) = data.base_time_minutes {
                    if base > 10 {
                        warnings.push("Blitz games are typically 10 minutes or less".to_string());
                    }
                } else {
                    errors.push("Blitz games must have base time specified".to_string());
                }
            }
            TimeControlType::Bullet => {
                if let Some(base) = data.base_time_minutes {
                    if base > 3 {
                        warnings.push("Bullet games are typically 3 minutes or less".to_string());
                    }
                } else {
                    errors.push("Bullet games must have base time specified".to_string());
                }
            }
            TimeControlType::Correspondence => {
                if data.base_time_minutes.is_some() {
                    warnings.push(
                        "Correspondence games typically use days per move, not minutes".to_string(),
                    );
                }
            }
            TimeControlType::Fischer | TimeControlType::Bronstein => {
                if data.base_time_minutes.is_none() {
                    errors.push("Fischer/Bronstein time controls must have base time".to_string());
                }
                if data.increment_seconds.is_none() {
                    errors.push(
                        "Fischer/Bronstein time controls must have increment/delay".to_string(),
                    );
                }
            }
            TimeControlType::Custom => {
                // Custom time controls can have any configuration
            }
        }

        // Calculate estimated game duration
        let estimated_duration = self.calculate_estimated_duration(data);

        let is_valid = errors.is_empty();
        Ok(TimeControlValidation {
            is_valid,
            errors,
            warnings,
            estimated_game_duration_minutes: estimated_duration,
        })
    }

    /// Calculate estimated game duration in minutes
    fn calculate_estimated_duration(&self, data: &CreateTimeControl) -> Option<i32> {
        let base_time = data.base_time_minutes?;
        let increment = data.increment_seconds.unwrap_or(0);

        // Rough estimation: 40 moves per game on average
        let estimated_moves_per_player = 40;
        let increment_time_minutes = (estimated_moves_per_player * increment) / 60;

        // Total time per player
        let time_per_player = base_time + increment_time_minutes;

        // Total game time (both players)
        Some(time_per_player * 2)
    }

    /// Generate time control display string
    pub fn format_time_control(&self, time_control: &TimeControl) -> String {
        let base = time_control
            .base_time_minutes
            .map(|t| format!("{t}min"))
            .unwrap_or_else(|| "No limit".to_string());

        let increment = time_control
            .increment_seconds
            .map(|i| format!("+{i}s"))
            .unwrap_or_default();

        if increment.is_empty() {
            base
        } else {
            format!("{base} {increment}")
        }
    }
}
