#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]


use tauri::Manager;
use tauri_plugin_sql::Builder as SqlBuilder; // <-- plugin SQL


fn main() {
tauri::Builder::default()
.plugin(SqlBuilder::default().build()) // registrar plugin
.run(tauri::generate_context!())
.expect("error while running tauri application");
}