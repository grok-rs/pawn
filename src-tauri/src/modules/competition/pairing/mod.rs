//! Pairing engines for competition management.
//!
//! These are algorithmic services with no database dependencies.
//! They take domain objects as input and produce pairings as output.

pub mod dispatcher;
pub mod optimizer;
pub mod round_robin;
pub mod swiss;

