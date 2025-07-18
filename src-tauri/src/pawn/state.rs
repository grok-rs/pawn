use std::{path::PathBuf, sync::Arc};

use sqlx::sqlite::SqlitePoolOptions;
use tracing::info;

use super::{
    db::sqlite::SqliteDb,
    service::{
        export::ExportService, norm_calculation::NormCalculationService, player::PlayerService, 
        realtime_standings::RealTimeStandingsService, round::RoundService, 
        round_robin_analysis::RoundRobinAnalysisService, swiss_analysis::SwissAnalysisService, 
        team::TeamService, tiebreak::TiebreakCalculator, time_control::TimeControlService, tournament::TournamentService,
    },
};

pub struct State<D> {
    #[allow(dead_code)]
    pub app_data_dir: PathBuf,
    pub db: Arc<D>,
    pub tournament_service: Arc<TournamentService<D>>,
    pub tiebreak_calculator: Arc<TiebreakCalculator<D>>,
    pub realtime_standings_service: Arc<RealTimeStandingsService<D>>,
    pub round_service: Arc<RoundService<D>>,
    pub player_service: Arc<PlayerService<D>>,
    pub time_control_service: Arc<TimeControlService<D>>,
    pub swiss_analysis_service: Arc<SwissAnalysisService<D>>,
    pub round_robin_analysis_service: Arc<RoundRobinAnalysisService<D>>,
    pub export_service: Arc<ExportService<D>>,
    pub norm_calculation_service: Arc<NormCalculationService<D>>,
    pub team_service: Arc<TeamService<D>>,
}

pub type PawnState = State<SqliteDb>;

impl PawnState {
    pub async fn init(db_dir: PathBuf, app_data_dir: PathBuf) -> Self {
        let db_file = db_dir.join("pawn.sqlite");

        info!(?db_file, "Database file");
        info!("Database file: {:?}", db_file);
        if !db_file.exists() {
            std::fs::File::create(&db_file).expect("Can not create db file");
        }

        let pool = SqlitePoolOptions::new()
            .max_connections(4)
            .min_connections(1)
            .acquire_timeout(std::time::Duration::from_secs(5))
            .connect_lazy(&format!(
                "sqlite://{}",
                db_file.to_str().expect("Use UTF-8 paths")
            ))
            .expect("can't connect to sqlite db");

        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .expect("Migration failed");

        let sqlite = Arc::new(SqliteDb::new(pool));

        let tournament_service = Arc::new(TournamentService::new(Arc::clone(&sqlite)));
        let tiebreak_calculator = Arc::new(TiebreakCalculator::new(Arc::clone(&sqlite)));
        let realtime_standings_service = Arc::new(RealTimeStandingsService::new(Arc::clone(&sqlite), Arc::clone(&tiebreak_calculator)));
        let round_service = Arc::new(RoundService::new(Arc::clone(&sqlite)));
        let player_service = Arc::new(PlayerService::new(Arc::clone(&sqlite)));
        let time_control_service = Arc::new(TimeControlService::new(Arc::clone(&sqlite)));
        let swiss_analysis_service = Arc::new(SwissAnalysisService::new(Arc::clone(&sqlite)));
        let round_robin_analysis_service = Arc::new(RoundRobinAnalysisService::new(Arc::clone(&sqlite)));
        
        // Create export directory in app data directory
        let export_dir = app_data_dir.join("exports");
        let export_service = Arc::new(ExportService::new(Arc::clone(&sqlite), Arc::clone(&tiebreak_calculator), export_dir));
        
        // Create norm calculation service
        let norm_calculation_service = Arc::new(NormCalculationService::new(Arc::clone(&sqlite), Arc::clone(&tiebreak_calculator)));
        
        // Create team service
        let team_service = Arc::new(TeamService::new(Arc::clone(&sqlite)));

        Self {
            app_data_dir,
            db: sqlite,
            tournament_service,
            tiebreak_calculator,
            realtime_standings_service,
            round_service,
            player_service,
            time_control_service,
            swiss_analysis_service,
            round_robin_analysis_service,
            export_service,
            norm_calculation_service,
            team_service,
        }
    }
}
