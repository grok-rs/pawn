use serde::{Deserialize, Serialize};
use specta::Type as SpectaType;
// Note: SQLx implementations removed for now to avoid compilation complexity
// They can be added back later when needed
use std::fmt::{self, Display};

/// Strong typing module for domain-specific types.
/// This module provides newtypes to prevent primitive obsession and improve type safety.

// ===========================
// ID Types for Type Safety
// ===========================

macro_rules! define_id_type {
    ($name:ident, $doc:expr) => {
        #[doc = $doc]
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, SpectaType)]
        #[serde(transparent)]
        pub struct $name(pub i32);

        impl $name {
            pub fn new(id: i32) -> Self {
                Self(id)
            }

            pub fn get(&self) -> i32 {
                self.0
            }
        }

        impl From<i32> for $name {
            fn from(id: i32) -> Self {
                Self(id)
            }
        }

        impl From<$name> for i32 {
            fn from(id: $name) -> i32 {
                id.0
            }
        }

        impl Display for $name {
            fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                write!(f, "{}", self.0)
            }
        }

        // SQLx implementations will be added later
    };
}

define_id_type!(TournamentId, "Unique identifier for tournaments");
define_id_type!(PlayerId, "Unique identifier for players");
define_id_type!(GameId, "Unique identifier for games");
define_id_type!(RoundId, "Unique identifier for rounds");
define_id_type!(TeamId, "Unique identifier for teams");
define_id_type!(CategoryId, "Unique identifier for player categories");
define_id_type!(TemplateId, "Unique identifier for tournament templates");
define_id_type!(TimeControlId, "Unique identifier for time controls");

// ===========================
// Domain String Types
// ===========================

macro_rules! define_string_type {
    ($name:ident, $doc:expr, $max_len:expr) => {
        #[doc = $doc]
        #[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, SpectaType)]
        #[serde(transparent)]
        pub struct $name(String);

        impl $name {
            pub fn new(value: impl Into<String>) -> Result<Self, ValidationError> {
                let s = value.into();
                if s.is_empty() {
                    return Err(ValidationError::new(format!(
                        "{} cannot be empty",
                        stringify!($name)
                    )));
                }
                if s.len() > $max_len {
                    return Err(ValidationError::new(format!(
                        "{} cannot exceed {} characters",
                        stringify!($name),
                        $max_len
                    )));
                }
                Ok(Self(s))
            }

            pub fn new_unchecked(value: impl Into<String>) -> Self {
                Self(value.into())
            }

            pub fn as_str(&self) -> &str {
                &self.0
            }

            pub fn into_string(self) -> String {
                self.0
            }
        }

        impl Display for $name {
            fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                write!(f, "{}", self.0)
            }
        }

        impl From<$name> for String {
            fn from(value: $name) -> String {
                value.0
            }
        }

        impl TryFrom<String> for $name {
            type Error = ValidationError;

            fn try_from(value: String) -> Result<Self, Self::Error> {
                Self::new(value)
            }
        }

        // SQLx implementations will be added later
    };
}

define_string_type!(PlayerName, "Player's full name", 100);
define_string_type!(TournamentName, "Tournament name", 200);
define_string_type!(TournamentLocation, "Tournament location", 100);
define_string_type!(TeamName, "Team name", 100);
define_string_type!(ClubName, "Chess club name", 100);

// ===========================
// Special String Types with Validation
// ===========================

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, SpectaType)]
#[serde(transparent)]
pub struct CountryCode(String);

impl CountryCode {
    pub fn new(code: impl Into<String>) -> Result<Self, ValidationError> {
        let s = code.into().to_uppercase();
        if s.len() != 2 && s.len() != 3 {
            return Err(ValidationError::new(
                "Country code must be 2 or 3 characters".to_string(),
            ));
        }
        if !s.chars().all(|c| c.is_ascii_alphabetic()) {
            return Err(ValidationError::new(
                "Country code must contain only letters".to_string(),
            ));
        }
        Ok(Self(s))
    }

    pub fn new_unchecked(code: impl Into<String>) -> Self {
        Self(code.into().to_uppercase())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, SpectaType)]
#[serde(transparent)]
pub struct EmailAddress(String);

impl EmailAddress {
    pub fn new(email: impl Into<String>) -> Result<Self, ValidationError> {
        let s = email.into();
        if !s.contains('@') || !s.contains('.') {
            return Err(ValidationError::new("Invalid email format".to_string()));
        }
        Ok(Self(s))
    }

    pub fn new_unchecked(email: impl Into<String>) -> Self {
        Self(email.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

// ===========================
// Validated Numeric Types
// ===========================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, SpectaType)]
#[serde(transparent)]
pub struct Rating(i32);

impl Rating {
    pub const MIN_RATING: i32 = 100;
    pub const MAX_RATING: i32 = 3500;

    pub fn new(rating: i32) -> Result<Self, ValidationError> {
        if rating < Self::MIN_RATING || rating > Self::MAX_RATING {
            return Err(ValidationError::new(format!(
                "Rating must be between {} and {}",
                Self::MIN_RATING,
                Self::MAX_RATING
            )));
        }
        Ok(Self(rating))
    }

    pub fn new_unchecked(rating: i32) -> Self {
        Self(rating)
    }

    pub fn get(&self) -> i32 {
        self.0
    }

    pub fn is_master_level(&self) -> bool {
        self.0 >= 2200
    }

    pub fn is_expert_level(&self) -> bool {
        self.0 >= 2000
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, SpectaType)]
#[serde(transparent)]
pub struct RoundNumber(i32);

impl RoundNumber {
    pub fn new(round: i32) -> Result<Self, ValidationError> {
        if round < 1 {
            return Err(ValidationError::new(
                "Round number must be positive".to_string(),
            ));
        }
        if round > 99 {
            return Err(ValidationError::new(
                "Round number cannot exceed 99".to_string(),
            ));
        }
        Ok(Self(round))
    }

    pub fn new_unchecked(round: i32) -> Self {
        Self(round)
    }

    pub fn get(&self) -> i32 {
        self.0
    }

    pub fn next(&self) -> Self {
        Self(self.0 + 1)
    }

    pub fn previous(&self) -> Option<Self> {
        if self.0 > 1 {
            Some(Self(self.0 - 1))
        } else {
            None
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize, SpectaType)]
#[serde(transparent)]
pub struct Points(f32);

impl Points {
    pub fn new(points: f32) -> Result<Self, ValidationError> {
        if points < 0.0 {
            return Err(ValidationError::new(
                "Points cannot be negative".to_string(),
            ));
        }
        if points > 999.0 {
            return Err(ValidationError::new("Points cannot exceed 999".to_string()));
        }
        Ok(Self(points))
    }

    pub fn new_unchecked(points: f32) -> Self {
        Self(points)
    }

    pub fn get(&self) -> f32 {
        self.0
    }

    pub fn zero() -> Self {
        Self(0.0)
    }

    pub fn half() -> Self {
        Self(0.5)
    }

    pub fn one() -> Self {
        Self(1.0)
    }

    pub fn add(&self, other: Points) -> Self {
        Self(self.0 + other.0)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, SpectaType)]
#[serde(transparent)]
pub struct BoardNumber(i32);

impl BoardNumber {
    pub fn new(board: i32) -> Result<Self, ValidationError> {
        if board < 1 {
            return Err(ValidationError::new(
                "Board number must be positive".to_string(),
            ));
        }
        Ok(Self(board))
    }

    pub fn new_unchecked(board: i32) -> Self {
        Self(board)
    }

    pub fn get(&self) -> i32 {
        self.0
    }
}

// ===========================
// Validation Error Type
// ===========================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, SpectaType)]
pub struct ValidationError {
    pub message: String,
}

impl ValidationError {
    pub fn new(message: String) -> Self {
        Self { message }
    }
}

impl Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Validation error: {}", self.message)
    }
}

impl std::error::Error for ValidationError {}

// ===========================
// Convenience Implementations
// ===========================

// SQLx implementations removed for now to avoid compilation complexity
// They can be added back later when needed

// Display implementations for the rest
impl Display for CountryCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl Display for EmailAddress {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl Display for Rating {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl Display for RoundNumber {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl Display for Points {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:.1}", self.0)
    }
}

impl Display for BoardNumber {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_id_types() {
        let tournament_id = TournamentId::new(1);
        let player_id = PlayerId::new(2);

        assert_eq!(tournament_id.get(), 1);
        assert_eq!(player_id.get(), 2);

        // This should not compile (different types):
        // assert_eq!(tournament_id, player_id);
    }

    #[test]
    fn test_rating_validation() {
        assert!(Rating::new(1200).is_ok());
        assert!(Rating::new(50).is_err());
        assert!(Rating::new(4000).is_err());

        let rating = Rating::new(2300).unwrap();
        assert!(rating.is_master_level());
        assert!(rating.is_expert_level());
    }

    #[test]
    fn test_country_code_validation() {
        assert!(CountryCode::new("US").is_ok());
        assert!(CountryCode::new("USA").is_ok());
        assert!(CountryCode::new("INVALID").is_err());
        assert!(CountryCode::new("123").is_err());
    }

    #[test]
    fn test_email_validation() {
        assert!(EmailAddress::new("test@example.com").is_ok());
        assert!(EmailAddress::new("invalid").is_err());
        assert!(EmailAddress::new("@example.com").is_err());
    }

    #[test]
    fn test_points_operations() {
        let points1 = Points::new(1.0).unwrap();
        let points2 = Points::new(0.5).unwrap();
        let total = points1.add(points2);

        assert_eq!(total.get(), 1.5);
    }
}
