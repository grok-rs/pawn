use std::fmt;

use crate::common::error::PawnError;

/// Typed tournament status, replacing ad-hoc string arrays.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TournamentStatus {
    Created,
    Ongoing,
    Paused,
    Completed,
    Cancelled,
}

impl TournamentStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            TournamentStatus::Created => "created",
            TournamentStatus::Ongoing => "ongoing",
            TournamentStatus::Paused => "paused",
            TournamentStatus::Completed => "completed",
            TournamentStatus::Cancelled => "cancelled",
        }
    }

    pub fn parse(s: &str) -> Result<Self, PawnError> {
        match s {
            "created" => Ok(TournamentStatus::Created),
            "ongoing" => Ok(TournamentStatus::Ongoing),
            "paused" => Ok(TournamentStatus::Paused),
            "completed" => Ok(TournamentStatus::Completed),
            "cancelled" => Ok(TournamentStatus::Cancelled),
            other => Err(PawnError::InvalidInput(format!(
                "Invalid tournament status: {}. Valid statuses are: created, ongoing, paused, completed, cancelled",
                other
            ))),
        }
    }
}

impl fmt::Display for TournamentStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}
