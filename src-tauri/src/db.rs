use dirs::data_dir;
use rusqlite::{Connection, Result};
use std::path::PathBuf;

pub fn get_db_path() -> PathBuf {
    let mut path = data_dir().expect("Could not get user data directory");
    path.push("tournaments");
    if !path.exists() {
        std::fs::create_dir_all(&path).expect("Could not create tournaments directory");
    }
    path.push("tournaments.db");
    path
}

pub fn initialize_database() -> Result<Connection> {
    let path = get_db_path();
    let conn = Connection::open(path)?;

    conn.execute_batch(
        "
        DROP TABLE IF EXISTS tournaments;

        CREATE TABLE IF NOT EXISTS tournaments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            date TEXT NOT NULL,
            timeType TEXT NOT NULL,
            playerCount INTEGER NOT NULL,
            roundsPlayed INTEGER NOT NULL,
            totalRounds INTEGER NOT NULL,
            countryCode TEXT NOT NULL
        );
        ",
    )?;

    let migration_version: i32 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;
    if migration_version < 1 {
        conn.pragma_update(None, "user_version", 1)?;
    }

    Ok(conn)
}

pub fn seed_database(conn: &Connection) -> Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM tournaments", [], |row| row.get(0))?;

    if count == 0 {
        let tournaments = vec![
            (
                "Qualifying tournament for the championship of Ukraine among club teams",
                "Kharkiv, Ukraine",
                "28.04.2018",
                "Rapid",
                45,
                2,
                9,
                "UA",
            ),
            (
                "International Grandmasters Tournament",
                "Kyiv, Ukraine",
                "15.06.2020",
                "Classic",
                60,
                5,
                11,
                "UA",
            ),
            (
                "European Chess Championship",
                "Odessa, Ukraine",
                "10.09.2021",
                "Blitz",
                30,
                7,
                7,
                "UA",
            ),
        ];

        let mut stmt = conn.prepare(
            "INSERT INTO tournaments (name, location, date, timeType, playerCount, roundsPlayed, totalRounds, countryCode)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )?;

        for tournament in tournaments {
            stmt.execute(tournament)?;
        }

        println!("Database seeded with initial data.");
    } else {
        println!("Database already seeded.");
    }

    Ok(())
}
