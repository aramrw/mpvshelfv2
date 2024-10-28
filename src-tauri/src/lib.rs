#![feature(iterator_try_collect)]
use database::init_database;
use tauri::Manager;

mod database;
mod error;
mod fs;
mod misc;
mod mpv;

use crate::database::{
    delete_os_folders, get_default_user, get_os_folders, update_os_folders, update_user,
};
use crate::fs::{check_cover_img_exists, read_os_folder_dir, show_in_folder};
use crate::mpv::mpv_system_check;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
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
            get_os_folders,
            update_os_folders,
            delete_os_folders,
            read_os_folder_dir,
            check_cover_img_exists,
            show_in_folder,
            mpv_system_check,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
