use sqlx::SqlitePool;

mod game;
mod knockout;
mod player;
mod round;
mod seeding;
mod settings;
mod team;
mod time_control;
mod tournament;

pub struct SqliteDb {
    pool: SqlitePool,
}

impl SqliteDb {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}
