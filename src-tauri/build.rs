fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().plugin(
        "pawn",
        tauri_build::InlinedPlugin::new().commands(&[
            "get_tournaments",
            "get_tournament",
            "create_tournament",
            "get_tournament_details",
            "get_players_by_tournament",
            "create_player",
            "get_games_by_tournament",
            "create_game",
            "get_player_results",
            "get_game_results",
            "populate_mock_data",
        ]),
    ))
    .expect("Tauri app build should not fail")
}
