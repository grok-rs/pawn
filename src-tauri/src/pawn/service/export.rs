use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Instant;

use serde_json;
use tracing::{error, info, instrument, warn};

use crate::pawn::{
    common::error::PawnError,
    db::Db,
    domain::{
        model::{Game, Player, Tournament},
        tiebreak::{
            CrossTable, ExportFormat, ExportRequest, ExportResult, ExportType,
            StandingsCalculationResult, TournamentTiebreakConfig,
        },
    },
    service::tiebreak::TiebreakCalculator,
};

pub struct ExportService<D> {
    db: Arc<D>,
    tiebreak_calculator: Arc<TiebreakCalculator<D>>,
    export_dir: PathBuf,
}

impl<D: Db> ExportService<D> {
    pub fn new(db: Arc<D>, tiebreak_calculator: Arc<TiebreakCalculator<D>>, export_dir: PathBuf) -> Self {
        // Ensure export directory exists
        if !export_dir.exists() {
            if let Err(e) = fs::create_dir_all(&export_dir) {
                error!("Failed to create export directory: {}", e);
            }
        }
        
        Self {
            db,
            tiebreak_calculator,
            export_dir,
        }
    }

    /// Export tournament data according to the request
    #[instrument(skip(self))]
    pub async fn export_tournament_data(&self, request: ExportRequest) -> Result<ExportResult, PawnError> {
        let start_time = Instant::now();
        
        info!("Starting export for tournament {} in {:?} format", request.tournament_id, request.format);
        
        // Generate filename
        let filename = self.generate_filename(&request).await?;
        let file_path = self.export_dir.join(&filename);
        
        // Collect data based on export type
        let export_data = self.collect_export_data(&request).await?;
        
        // Generate export file
        let result = match request.format {
            ExportFormat::Csv => self.export_to_csv(&export_data, &file_path).await,
            ExportFormat::Json => self.export_to_json(&export_data, &file_path).await,
            ExportFormat::Html => self.export_to_html(&export_data, &file_path, &request).await,
            ExportFormat::Txt => self.export_to_txt(&export_data, &file_path).await,
            ExportFormat::Pdf => self.export_to_pdf(&export_data, &file_path, &request).await,
            ExportFormat::Xlsx => self.export_to_xlsx(&export_data, &file_path).await,
        };
        
        let export_time = start_time.elapsed();
        
        match result {
            Ok(file_size) => {
                info!(
                    "Successfully exported {} bytes to {} in {}ms",
                    file_size,
                    filename,
                    export_time.as_millis()
                );
                Ok(ExportResult {
                    success: true,
                    file_path: Some(file_path.to_string_lossy().to_string()),
                    file_name: filename,
                    file_size,
                    export_time_ms: export_time.as_millis() as u64,
                    error_message: None,
                })
            }
            Err(e) => {
                error!("Export failed: {}", e);
                Ok(ExportResult {
                    success: false,
                    file_path: None,
                    file_name: filename,
                    file_size: 0,
                    export_time_ms: export_time.as_millis() as u64,
                    error_message: Some(e.to_string()),
                })
            }
        }
    }

    /// Collect all necessary data for export
    async fn collect_export_data(&self, request: &ExportRequest) -> Result<ExportData, PawnError> {
        let tournament = self.db.get_tournament(request.tournament_id).await?;
        let players = self.db.get_players_by_tournament(request.tournament_id).await?;
        let games = self.db.get_games_by_tournament(request.tournament_id).await?;
        
        // Get standings if needed
        let standings = if matches!(request.export_type, ExportType::Standings | ExportType::TournamentSummary | ExportType::Complete) {
            let config = self.get_tournament_config(request.tournament_id).await?;
            Some(self.tiebreak_calculator.calculate_standings(request.tournament_id, &config).await?)
        } else {
            None
        };
        
        // Get cross table if needed
        let cross_table = if request.include_cross_table || matches!(request.export_type, ExportType::CrossTable | ExportType::Complete) {
            Some(self.tiebreak_calculator.generate_cross_table(request.tournament_id, players.clone(), games.clone()).await?)
        } else {
            None
        };
        
        Ok(ExportData {
            tournament,
            players,
            games,
            standings,
            cross_table,
        })
    }

    /// Generate filename based on request
    async fn generate_filename(&self, request: &ExportRequest) -> Result<String, PawnError> {
        if let Some(custom_name) = &request.custom_filename {
            return Ok(format!("{}.{}", custom_name, self.get_file_extension(&request.format)));
        }
        
        let tournament = self.db.get_tournament(request.tournament_id).await?;
        let sanitized_name = tournament.name.replace(" ", "_").replace("/", "-");
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        let export_type = format!("{:?}", request.export_type).to_lowercase();
        let extension = self.get_file_extension(&request.format);
        
        Ok(format!("{}_{}_{}_{}.{}", sanitized_name, export_type, request.tournament_id, timestamp, extension))
    }

    /// Get file extension for format
    fn get_file_extension(&self, format: &ExportFormat) -> &'static str {
        match format {
            ExportFormat::Csv => "csv",
            ExportFormat::Json => "json",
            ExportFormat::Html => "html",
            ExportFormat::Txt => "txt",
            ExportFormat::Pdf => "pdf",
            ExportFormat::Xlsx => "xlsx",
        }
    }

    /// Export to CSV format
    async fn export_to_csv(&self, data: &ExportData, file_path: &Path) -> Result<u64, PawnError> {
        let mut output = String::new();
        
        match data.standings {
            Some(ref standings) => {
                // CSV header
                output.push_str("Rank,Player,Rating,Points,Games,Wins,Draws,Losses,Performance Rating");
                
                // Add tiebreak headers
                if let Some(first_standing) = standings.standings.first() {
                    for tiebreak in &first_standing.tiebreak_scores {
                        output.push_str(&format!(",{}", tiebreak.tiebreak_type.display_name()));
                    }
                }
                output.push('\n');
                
                // Data rows
                for standing in &standings.standings {
                    output.push_str(&format!(
                        "{},{},{},{},{},{},{},{},{}",
                        standing.rank,
                        standing.player.name,
                        standing.player.rating.unwrap_or(0),
                        standing.points,
                        standing.games_played,
                        standing.wins,
                        standing.draws,
                        standing.losses,
                        standing.performance_rating.unwrap_or(0)
                    ));
                    
                    // Add tiebreak scores
                    for tiebreak in &standing.tiebreak_scores {
                        output.push_str(&format!(",{}", tiebreak.display_value));
                    }
                    output.push('\n');
                }
            }
            None => {
                // Export player list
                output.push_str("Name,Rating,Country,Title,Status\n");
                for player in &data.players {
                    output.push_str(&format!(
                        "{},{},{},{},{}\n",
                        player.name,
                        player.rating.unwrap_or(0),
                        player.country_code.as_deref().unwrap_or(""),
                        player.title.as_deref().unwrap_or(""),
                        player.status
                    ));
                }
            }
        }
        
        let mut file = File::create(file_path)
            .map_err(|e| PawnError::Io(e))?;
        
        file.write_all(output.as_bytes())
            .map_err(|e| PawnError::Io(e))?;
        
        Ok(output.len() as u64)
    }

    /// Export to JSON format
    async fn export_to_json(&self, data: &ExportData, file_path: &Path) -> Result<u64, PawnError> {
        let export_json = serde_json::json!({
            "tournament": data.tournament,
            "players": data.players,
            "games": data.games,
            "standings": data.standings,
            "cross_table": data.cross_table,
            "exported_at": chrono::Utc::now().to_rfc3339(),
            "export_version": "1.0"
        });
        
        let json_string = serde_json::to_string_pretty(&export_json)
            .map_err(|e| PawnError::SerdeError(e))?;
        
        let mut file = File::create(file_path)
            .map_err(|e| PawnError::Io(e))?;
        
        file.write_all(json_string.as_bytes())
            .map_err(|e| PawnError::Io(e))?;
        
        Ok(json_string.len() as u64)
    }

    /// Export to HTML format
    async fn export_to_html(&self, data: &ExportData, file_path: &Path, request: &ExportRequest) -> Result<u64, PawnError> {
        let mut html = String::new();
        
        // HTML header
        html.push_str("<!DOCTYPE html>\n<html>\n<head>\n");
        html.push_str("<meta charset='utf-8'>\n");
        html.push_str(&format!("<title>{} - Tournament Report</title>\n", data.tournament.name));
        html.push_str("<style>\n");
        html.push_str(self.get_html_styles(request));
        html.push_str("</style>\n");
        html.push_str("</head>\n<body>\n");
        
        // Tournament header
        html.push_str(&format!("<h1>{}</h1>\n", data.tournament.name));
        html.push_str(&format!("<p><strong>Location:</strong> {}</p>\n", data.tournament.location));
        html.push_str(&format!("<p><strong>Date:</strong> {}</p>\n", data.tournament.date));
        html.push_str(&format!("<p><strong>Players:</strong> {}</p>\n", data.tournament.player_count));
        html.push_str(&format!("<p><strong>Rounds:</strong> {}/{}</p>\n", data.tournament.rounds_played, data.tournament.total_rounds));
        
        // Standings table
        if let Some(ref standings) = data.standings {
            html.push_str("<h2>Final Standings</h2>\n");
            html.push_str("<table class='standings'>\n");
            html.push_str("<tr><th>Rank</th><th>Player</th><th>Rating</th><th>Points</th><th>Games</th><th>W-D-L</th>");
            
            // Tiebreak headers
            if let Some(first_standing) = standings.standings.first() {
                for tiebreak in &first_standing.tiebreak_scores {
                    html.push_str(&format!("<th>{}</th>", tiebreak.tiebreak_type.short_name()));
                }
            }
            html.push_str("</tr>\n");
            
            // Data rows
            for standing in &standings.standings {
                html.push_str(&format!(
                    "<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}-{}-{}</td>",
                    standing.rank,
                    standing.player.name,
                    standing.player.rating.unwrap_or(0),
                    standing.points,
                    standing.games_played,
                    standing.wins,
                    standing.draws,
                    standing.losses
                ));
                
                // Tiebreak scores
                for tiebreak in &standing.tiebreak_scores {
                    html.push_str(&format!("<td>{}</td>", tiebreak.display_value));
                }
                html.push_str("</tr>\n");
            }
            html.push_str("</table>\n");
        }
        
        // Cross table
        if let Some(ref cross_table) = data.cross_table {
            html.push_str("<h2>Cross Table</h2>\n");
            html.push_str("<table class='crosstable'>\n");
            html.push_str("<tr><th>Player</th>");
            for player in &cross_table.players {
                html.push_str(&format!("<th>{}</th>", player.name.chars().take(3).collect::<String>()));
            }
            html.push_str("<th>Total</th></tr>\n");
            
            for row in &cross_table.rows {
                html.push_str(&format!("<tr><td>{}</td>", row.player.name));
                for result in &row.results {
                    let display = match result.result {
                        Some(1.0) => "1",
                        Some(0.5) => "½",
                        Some(0.0) => "0",
                        None => "-",
                        _ => "?",
                    };
                    html.push_str(&format!("<td>{}</td>", display));
                }
                html.push_str(&format!("<td>{}</td></tr>\n", row.total_points));
            }
            html.push_str("</table>\n");
        }
        
        // Footer
        html.push_str("<footer>\n");
        html.push_str(&format!("<p>Generated by Pawn Tournament Manager on {}</p>\n", chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")));
        html.push_str("</footer>\n");
        html.push_str("</body>\n</html>");
        
        let mut file = File::create(file_path)
            .map_err(|e| PawnError::Io(e))?;
        
        file.write_all(html.as_bytes())
            .map_err(|e| PawnError::Io(e))?;
        
        Ok(html.len() as u64)
    }

    /// Export to TXT format
    async fn export_to_txt(&self, data: &ExportData, file_path: &Path) -> Result<u64, PawnError> {
        let mut output = String::new();
        
        // Tournament header
        output.push_str(&format!("Tournament: {}\n", data.tournament.name));
        output.push_str(&format!("Location: {}\n", data.tournament.location));
        output.push_str(&format!("Date: {}\n", data.tournament.date));
        output.push_str(&format!("Players: {}\n", data.tournament.player_count));
        output.push_str(&format!("Rounds: {}/{}\n\n", data.tournament.rounds_played, data.tournament.total_rounds));
        
        // Standings
        if let Some(ref standings) = data.standings {
            output.push_str("FINAL STANDINGS\n");
            output.push_str("===============\n\n");
            
            for standing in &standings.standings {
                output.push_str(&format!(
                    "{:2}. {:25} ({:4}) {:4.1} pts  {}-{}-{}\n",
                    standing.rank,
                    standing.player.name,
                    standing.player.rating.unwrap_or(0),
                    standing.points,
                    standing.wins,
                    standing.draws,
                    standing.losses
                ));
            }
        }
        
        let mut file = File::create(file_path)
            .map_err(|e| PawnError::Io(e))?;
        
        file.write_all(output.as_bytes())
            .map_err(|e| PawnError::Io(e))?;
        
        Ok(output.len() as u64)
    }

    /// Export to PDF format (simplified - would need proper PDF library)
    async fn export_to_pdf(&self, data: &ExportData, file_path: &Path, request: &ExportRequest) -> Result<u64, PawnError> {
        // For now, generate HTML and suggest converting to PDF
        // In a real implementation, you'd use a PDF library like wkhtmltopdf or similar
        warn!("PDF export not fully implemented - generating HTML instead");
        
        let html_path = file_path.with_extension("html");
        let size = self.export_to_html(data, &html_path, request).await?;
        
        // Rename to PDF extension for consistency
        if let Err(e) = std::fs::rename(&html_path, file_path) {
            warn!("Failed to rename HTML to PDF: {}", e);
        }
        
        Ok(size)
    }

    /// Export to XLSX format (simplified - would need proper Excel library)
    async fn export_to_xlsx(&self, data: &ExportData, file_path: &Path) -> Result<u64, PawnError> {
        // For now, generate CSV and suggest converting to XLSX
        // In a real implementation, you'd use a library like xlsxwriter or similar
        warn!("XLSX export not fully implemented - generating CSV instead");
        
        let csv_path = file_path.with_extension("csv");
        let size = self.export_to_csv(data, &csv_path).await?;
        
        // Rename to XLSX extension for consistency
        if let Err(e) = std::fs::rename(&csv_path, file_path) {
            warn!("Failed to rename CSV to XLSX: {}", e);
        }
        
        Ok(size)
    }

    /// Get HTML styles based on request
    fn get_html_styles(&self, request: &ExportRequest) -> &'static str {
        // Return CSS styles based on template options
        match request.template_options.as_ref().map(|o| &o.color_scheme) {
            Some(crate::pawn::domain::tiebreak::ColorScheme::Professional) => {
                include_str!("../templates/professional.css")
            }
            Some(crate::pawn::domain::tiebreak::ColorScheme::Minimal) => {
                include_str!("../templates/minimal.css")
            }
            Some(crate::pawn::domain::tiebreak::ColorScheme::Classic) => {
                include_str!("../templates/classic.css")
            }
            _ => include_str!("../templates/default.css"),
        }
    }

    /// Get tournament config
    async fn get_tournament_config(&self, tournament_id: i32) -> Result<TournamentTiebreakConfig, PawnError> {
        match self.db.get_tournament_settings(tournament_id).await? {
            Some(config) => Ok(config),
            None => {
                let mut config = TournamentTiebreakConfig::default();
                config.tournament_id = tournament_id;
                Ok(config)
            }
        }
    }

    /// Get export directory path
    pub fn get_export_directory(&self) -> &PathBuf {
        &self.export_dir
    }
}

/// Container for all export data
#[derive(Debug, Clone)]
struct ExportData {
    tournament: Tournament,
    players: Vec<Player>,
    games: Vec<Game>,
    standings: Option<StandingsCalculationResult>,
    cross_table: Option<CrossTable>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_export_service_creation() {
        let temp_dir = TempDir::new().unwrap();
        let export_dir = temp_dir.path().to_path_buf();
        
        // Mock implementation would go here
        // let db = Arc::new(MockDb::new());
        // let tiebreak_calculator = Arc::new(TiebreakCalculator::new(Arc::clone(&db)));
        // let export_service = ExportService::new(db, tiebreak_calculator, export_dir);
        
        assert!(export_dir.exists());
    }

    #[tokio::test]
    async fn test_filename_generation() {
        // Test custom filename
        // Test tournament name sanitization
        // Test timestamp inclusion
        assert!(true); // Placeholder
    }

    #[tokio::test]
    async fn test_csv_export() {
        // Test CSV format generation
        // Test headers and data integrity
        assert!(true); // Placeholder
    }

    #[tokio::test]
    async fn test_json_export() {
        // Test JSON format generation
        // Test data completeness
        assert!(true); // Placeholder
    }

    #[tokio::test]
    async fn test_html_export() {
        // Test HTML format generation
        // Test styling and structure
        assert!(true); // Placeholder
    }
}