use crate::competition::model::Pairing;
use crate::participant::model::Player;
use std::collections::HashSet;

#[derive(Debug, Clone)]
pub struct SwissPlayer {
    pub player: Player,
    pub points: f64,
    pub rating: i32,
    pub color_history: Vec<Color>,
    pub opponents: HashSet<i32>,
    pub color_preference: ColorPreference,
    pub is_bye_eligible: bool,
    pub float_history: Vec<FloatDirection>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Color {
    White,
    Black,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ColorPreference {
    Absolute(Color), // Must have this color (3+ consecutive same color)
    Strong(Color),   // Strong preference (2 consecutive same color)
    Mild(Color),     // Mild preference (color balance)
    None,            // No preference
}

#[derive(Debug, Clone, Copy)]
pub enum FloatDirection {
    Up,   // Floated up to higher score group
    Down, // Floated down to lower score group
}

#[derive(Debug, Clone)]
pub struct ScoreGroup {
    pub points: f64,
    pub players: Vec<SwissPlayer>,
}

#[derive(Debug)]
pub struct PairingResult {
    pub pairings: Vec<Pairing>,
    pub byes: Vec<SwissPlayer>,
    pub float_count: usize,
    pub validation_errors: Vec<String>,
}

/// Parameters for handling odd groups with float management
pub(crate) struct OddGroupParams<'a> {
    pub all_players: &'a [SwissPlayer],
    pub paired_ids: &'a mut HashSet<i32>,
    pub float_count: &'a mut usize,
    pub max_floats_allowed: usize,
    pub group_index: usize,
    pub byes: &'a mut Vec<SwissPlayer>,
    pub floated_players: &'a mut HashSet<i32>,
}

/// Wrapper for f64 to enable ordering in BTreeMap
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct OrderedFloat(pub f64);

impl Eq for OrderedFloat {}

impl PartialOrd for OrderedFloat {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for OrderedFloat {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.0
            .partial_cmp(&other.0)
            .unwrap_or(std::cmp::Ordering::Equal)
    }
}

/// Helper function to get opposite color
pub fn opposite_color(color: Color) -> Color {
    match color {
        Color::White => Color::Black,
        Color::Black => Color::White,
    }
}
