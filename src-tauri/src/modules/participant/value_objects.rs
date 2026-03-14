use std::fmt;

use crate::common::error::PawnError;

// ── Rating ─────────────────────────────────────────────────────────

/// A chess rating value, enforced to be within 0..=4000.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Rating(i32);

impl Rating {
    pub const MIN: i32 = 0;
    pub const MAX: i32 = 4000;

    pub fn new(value: i32) -> Result<Self, PawnError> {
        if !(Self::MIN..=Self::MAX).contains(&value) {
            return Err(PawnError::ValidationError(
                "Rating must be between 0 and 4000".to_string(),
            ));
        }
        Ok(Self(value))
    }

}

impl fmt::Display for Rating {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

// ── PlayerStatus ───────────────────────────────────────────────────

/// Typed player status, replacing string comparisons.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PlayerStatus {
    Active,
    Withdrawn,
    ByeRequested,
    LateEntry,
}

impl PlayerStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            PlayerStatus::Active => "active",
            PlayerStatus::Withdrawn => "withdrawn",
            PlayerStatus::ByeRequested => "bye_requested",
            PlayerStatus::LateEntry => "late_entry",
        }
    }

    pub fn parse(s: &str) -> Result<Self, PawnError> {
        match s {
            "active" => Ok(PlayerStatus::Active),
            "withdrawn" => Ok(PlayerStatus::Withdrawn),
            "bye_requested" => Ok(PlayerStatus::ByeRequested),
            "late_entry" => Ok(PlayerStatus::LateEntry),
            _ => Err(PawnError::ValidationError(
                "Invalid player status".to_string(),
            )),
        }
    }

}

impl fmt::Display for PlayerStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

// ── Gender ─────────────────────────────────────────────────────────

/// Typed gender, replacing ad-hoc string validation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Gender {
    Male,
    Female,
    Other,
}

impl Gender {
    pub fn as_str(&self) -> &'static str {
        match self {
            Gender::Male => "M",
            Gender::Female => "F",
            Gender::Other => "O",
        }
    }

    pub fn parse(s: &str) -> Result<Self, PawnError> {
        match s {
            "M" => Ok(Gender::Male),
            "F" => Ok(Gender::Female),
            "O" => Ok(Gender::Other),
            _ => Err(PawnError::ValidationError(
                "Gender must be M, F, or O".to_string(),
            )),
        }
    }
}

impl fmt::Display for Gender {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}
