use super::error::PawnError;

pub type CommandResult<T> = std::result::Result<T, PawnError>;
