use serde::{Deserialize, Serialize};
use specta::Type as SpectaType;

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct ExportRequest {
    pub tournament_id: i32,
    pub export_type: ExportType,
    pub format: ExportFormat,
    pub include_tiebreaks: bool,
    pub include_cross_table: bool,
    pub include_game_results: bool,
    pub include_player_details: bool,
    pub custom_filename: Option<String>,
    pub template_options: Option<ExportTemplateOptions>,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub enum ExportType {
    Standings,
    CrossTable,
    GameResults,
    PlayerList,
    TournamentSummary,
    Complete,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub enum ExportFormat {
    Csv,
    Pdf,
    Html,
    Json,
    Xlsx,
    Txt,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct ExportTemplateOptions {
    pub include_header: bool,
    pub include_footer: bool,
    pub show_logos: bool,
    pub paper_size: PaperSize,
    pub orientation: PageOrientation,
    pub font_size: FontSize,
    pub color_scheme: ColorScheme,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub enum PaperSize {
    A4,
    A5,
    Letter,
    Legal,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub enum PageOrientation {
    Portrait,
    Landscape,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub enum FontSize {
    Small,
    Medium,
    Large,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub enum ColorScheme {
    Default,
    Professional,
    Minimal,
    Classic,
}

impl Default for ExportTemplateOptions {
    fn default() -> Self {
        Self {
            include_header: true,
            include_footer: true,
            show_logos: true,
            paper_size: PaperSize::A4,
            orientation: PageOrientation::Portrait,
            font_size: FontSize::Medium,
            color_scheme: ColorScheme::Professional,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct ExportResult {
    pub success: bool,
    pub file_path: Option<String>,
    pub file_name: String,
    pub file_size: u64,
    pub export_time_ms: u64,
    pub error_message: Option<String>,
}
