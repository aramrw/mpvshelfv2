use database::init_database;
use tauri::Manager;

mod database;
mod error;
mod fs;

use crate::database::{get_default_user, update_user};
use crate::fs::read_os_folder_dir;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let handle = app.handle();
            let app_data_dir = handle.path().app_data_dir().unwrap();
            init_database(&app_data_dir, handle).unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_default_user,
            update_user,
            read_os_folder_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
