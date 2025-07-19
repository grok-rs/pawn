use crate::pawn::{
    common::error::PawnError,
    db::Db,
    domain::{
        dto::{CreateTimeControl, TimeControlFilter, TimeControlValidation, UpdateTimeControl},
        model::{TimeControl, TimeControlTemplate, TimeControlType},
    },
};

#[allow(dead_code)]
pub struct TimeControlService<D> {
    db: std::sync::Arc<D>,
}

#[allow(dead_code)]
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
                        let time_type = tc
                            .time_control_type
                            .parse()
                            .unwrap_or(TimeControlType::Classical);
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

}

// Methods that don't require database access
impl<D> TimeControlService<D> {
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

        let time_type = data
            .time_control_type
            .parse()
            .unwrap_or(TimeControlType::Classical);

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pawn::domain::model::TimeControl;

    // Helper function to create a basic TimeControl for testing
    fn create_test_time_control(
        base_time: Option<i32>,
        increment: Option<i32>,
        tc_type: &str,
    ) -> TimeControl {
        TimeControl {
            id: 1,
            name: "Test Time Control".to_string(),
            time_control_type: tc_type.to_string(),
            base_time_minutes: base_time,
            increment_seconds: increment,
            moves_per_session: None,
            session_time_minutes: None,
            total_sessions: None,
            is_default: false,
            description: None,
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }

    // Helper function to create test CreateTimeControl data
    fn create_test_data(
        name: &str,
        tc_type: &str,
        base_time: Option<i32>,
        increment: Option<i32>,
    ) -> CreateTimeControl {
        CreateTimeControl {
            name: name.to_string(),
            time_control_type: tc_type.to_string(),
            base_time_minutes: base_time,
            increment_seconds: increment,
            moves_per_session: None,
            session_time_minutes: None,
            total_sessions: None,
            description: None,
        }
    }

    #[test]
    fn test_validate_classical_time_control_valid() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("classical", "classical", Some(90), Some(30));
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(validation.is_valid);
        assert!(validation.errors.is_empty());
    }

    #[test]
    fn test_validate_classical_time_control_too_short() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("classical", "classical", Some(15), Some(10));
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(!validation.is_valid);
        assert!(validation.errors.len() == 1);
        assert!(validation.errors[0].contains("at least 30 minutes"));
    }

    #[test]
    fn test_validate_classical_no_increment_warning() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("classical", "classical", Some(90), None);
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(validation.is_valid);
        assert!(validation.warnings.len() == 1);
        assert!(validation.warnings[0].contains("typically use increments"));
    }

    #[test]
    fn test_validate_rapid_time_control_valid() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("rapid", "rapid", Some(15), Some(10));
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(validation.is_valid);
        assert!(validation.errors.is_empty());
    }

    #[test]
    fn test_validate_rapid_no_base_time() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("rapid", "rapid", None, Some(10));
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(!validation.is_valid);
        assert!(validation.errors.len() == 1);
        assert!(validation.errors[0].contains("must have base time"));
    }

    #[test]
    fn test_validate_rapid_out_of_range_warning() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("rapid", "rapid", Some(120), Some(10));
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(validation.is_valid);
        assert!(validation.warnings.len() == 1);
        assert!(validation.warnings[0].contains("between 3-60 minutes"));
    }

    #[test]
    fn test_validate_blitz_time_control_valid() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("blitz", "blitz", Some(5), Some(3));
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(validation.is_valid);
        assert!(validation.errors.is_empty());
    }

    #[test]
    fn test_validate_blitz_no_base_time() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("blitz", "blitz", None, Some(3));
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(!validation.is_valid);
        assert!(validation.errors.len() == 1);
        assert!(validation.errors[0].contains("must have base time"));
    }

    #[test]
    fn test_validate_blitz_too_long_warning() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("blitz", "blitz", Some(15), Some(10));
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(validation.is_valid);
        assert!(validation.warnings.len() == 1);
        assert!(validation.warnings[0].contains("10 minutes or less"));
    }

    #[test]
    fn test_validate_bullet_time_control_valid() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("bullet", "bullet", Some(1), Some(1));
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(validation.is_valid);
        assert!(validation.errors.is_empty());
    }

    #[test]
    fn test_validate_bullet_no_base_time() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("bullet", "bullet", None, Some(1));
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(!validation.is_valid);
        assert!(validation.errors.len() == 1);
        assert!(validation.errors[0].contains("must have base time"));
    }

    #[test]
    fn test_validate_bullet_too_long_warning() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("bullet", "bullet", Some(5), Some(2));
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(validation.is_valid);
        assert!(validation.warnings.len() == 1);
        assert!(validation.warnings[0].contains("3 minutes or less"));
    }

    #[test]
    fn test_validate_correspondence_time_control() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("correspondence", "correspondence", Some(60), None);
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(validation.is_valid);
        assert!(validation.warnings.len() == 1);
        assert!(validation.warnings[0].contains("days per move"));
    }

    #[test]
    fn test_validate_fischer_time_control_valid() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("fischer", "fischer", Some(15), Some(10));
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(validation.is_valid);
        assert!(validation.errors.is_empty());
    }

    #[test]
    fn test_validate_fischer_missing_base_time() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("fischer", "fischer", None, Some(10));
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(!validation.is_valid);
        assert!(validation.errors.len() == 1);
        assert!(validation.errors[0].contains("must have base time"));
    }

    #[test]
    fn test_validate_fischer_missing_increment() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("fischer", "fischer", Some(15), None);
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(!validation.is_valid);
        assert!(validation.errors.len() == 1);
        assert!(validation.errors[0].contains("increment/delay"));
    }

    #[test]
    fn test_validate_bronstein_time_control_valid() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("bronstein", "bronstein", Some(30), Some(15));
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(validation.is_valid);
        assert!(validation.errors.is_empty());
    }

    #[test]
    fn test_validate_custom_time_control() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("custom", "custom", Some(123), Some(456));
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(validation.is_valid);
        assert!(validation.errors.is_empty());
        assert!(validation.warnings.is_empty());
    }

    #[test]
    fn test_validate_empty_name() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = CreateTimeControl {
            name: "".to_string(),
            time_control_type: "rapid".to_string(),
            base_time_minutes: Some(15),
            increment_seconds: Some(10),
            moves_per_session: None,
            session_time_minutes: None,
            total_sessions: None,
            description: None,
        };
        
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(!validation.is_valid);
        assert!(validation.errors.len() == 1);
        assert!(validation.errors[0].contains("cannot be empty"));
    }

    #[test]
    fn test_validate_whitespace_name() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = CreateTimeControl {
            name: "   ".to_string(),
            time_control_type: "rapid".to_string(),
            base_time_minutes: Some(15),
            increment_seconds: Some(10),
            moves_per_session: None,
            session_time_minutes: None,
            total_sessions: None,
            description: None,
        };
        
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(!validation.is_valid);
        assert!(validation.errors.len() == 1);
        assert!(validation.errors[0].contains("cannot be empty"));
    }

    #[test]
    fn test_calculate_estimated_duration_with_increment() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("Test", "rapid", Some(15), Some(10));
        let duration = service.calculate_estimated_duration(&data);
        
        assert!(duration.is_some());
        // 15 min base + (40 moves * 10 sec / 60) = 15 + 6.67 ≈ 21 min per player
        // Total: 21 * 2 = 42 minutes
        assert_eq!(duration.unwrap(), 42);
    }

    #[test]
    fn test_calculate_estimated_duration_no_increment() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("Test", "classical", Some(60), None);
        let duration = service.calculate_estimated_duration(&data);
        
        assert!(duration.is_some());
        // 60 min base per player * 2 = 120 minutes total
        assert_eq!(duration.unwrap(), 120);
    }

    #[test]
    fn test_calculate_estimated_duration_no_base_time() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("Test", "correspondence", None, Some(0));
        let duration = service.calculate_estimated_duration(&data);
        
        assert!(duration.is_none());
    }

    #[test]
    fn test_format_time_control_with_increment() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let tc = create_test_time_control(Some(15), Some(10), "rapid");
        let formatted = service.format_time_control(&tc);
        
        assert_eq!(formatted, "15min +10s");
    }

    #[test]
    fn test_format_time_control_no_increment() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let tc = create_test_time_control(Some(30), None, "classical");
        let formatted = service.format_time_control(&tc);
        
        assert_eq!(formatted, "30min");
    }

    #[test]
    fn test_format_time_control_no_base_time() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let tc = create_test_time_control(None, Some(30), "correspondence");
        let formatted = service.format_time_control(&tc);
        
        assert_eq!(formatted, "No limit +30s");
    }

    #[test]
    fn test_format_time_control_no_time_limits() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let tc = create_test_time_control(None, None, "custom");
        let formatted = service.format_time_control(&tc);
        
        assert_eq!(formatted, "No limit");
    }

    #[test]
    fn test_format_time_control_zero_increment() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let tc = create_test_time_control(Some(5), Some(0), "blitz");
        let formatted = service.format_time_control(&tc);
        
        assert_eq!(formatted, "5min +0s");
    }

    #[test]
    fn test_validation_with_estimated_duration() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("Test Rapid", "rapid", Some(10), Some(5));
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(validation.is_valid);
        assert!(validation.estimated_game_duration_minutes.is_some());
        // 10 + (40 * 5 / 60) = 10 + 3.33 ≈ 13 per player * 2 = 26 total
        assert_eq!(validation.estimated_game_duration_minutes.unwrap(), 26);
    }

    #[test]
    fn test_multiple_validation_errors() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = CreateTimeControl {
            name: "".to_string(),
            time_control_type: "fischer".to_string(),
            base_time_minutes: None,
            increment_seconds: None,
            moves_per_session: None,
            session_time_minutes: None,
            total_sessions: None,
            description: None,
        };
        
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(!validation.is_valid);
        assert_eq!(validation.errors.len(), 3); // empty name, no base time, no increment
        assert!(validation.errors.iter().any(|e| e.contains("cannot be empty")));
        assert!(validation.errors.iter().any(|e| e.contains("must have base time")));
        assert!(validation.errors.iter().any(|e| e.contains("increment/delay")));
    }

    #[test]
    fn test_validation_unknown_time_control_type() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("Unknown Type", "UnknownType", Some(30), Some(10));
        let validation = service.validate_time_control_data(&data).unwrap();
        
        // Should default to Classical validation rules
        assert!(validation.is_valid);
        assert!(validation.errors.is_empty());
    }

    #[test]
    fn test_edge_case_very_large_values() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        let data = create_test_data("Long Game", "custom", Some(999), Some(999));
        let validation = service.validate_time_control_data(&data).unwrap();
        
        assert!(validation.is_valid);
        let duration = validation.estimated_game_duration_minutes.unwrap();
        // 999 + (40 * 999 / 60) = 999 + 666 = 1665 per player * 2 = 3330 total
        assert_eq!(duration, 3330);
    }

    #[test]
    fn test_time_control_formatting_edge_cases() {
        let service = TimeControlService {
            db: std::sync::Arc::new(()),
        };
        
        // Test with very large values
        let tc_large = create_test_time_control(Some(999), Some(999), "custom");
        let formatted_large = service.format_time_control(&tc_large);
        assert_eq!(formatted_large, "999min +999s");
        
        // Test with single digit values
        let tc_small = create_test_time_control(Some(1), Some(1), "bullet");
        let formatted_small = service.format_time_control(&tc_small);
        assert_eq!(formatted_small, "1min +1s");
    }
}
