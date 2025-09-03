#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_sql::Builder as SqlBuilder;

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(SqlBuilder::default().build()) // <- IMPORTANTE
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
