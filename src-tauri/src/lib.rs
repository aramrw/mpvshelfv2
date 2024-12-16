#![feature(iterator_try_collect)]
#![allow(unused)]

use database::{create_default_user, init_database};
use tauri::Manager;
use tray::kill_dup_process;

mod database;
mod error;
mod fs;
mod misc;
mod mpv;
mod tray;

use crate::database::{
    delete_os_folders, get_default_user, get_os_folder_by_path, get_os_folders,
    get_os_folders_by_path, get_os_videos, get_user_by_id, update_os_folders, update_os_videos,
    update_user,
};
use crate::fs::{check_cover_img_exists, download_mpv_binary, show_in_folder, upsert_read_os_dir};
use crate::mpv::{mpv_system_check, play_video};
use crate::tray::init_tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            let handle = app.handle();
            let app_data_dir = handle.path().app_data_dir().unwrap();
            init_database(&app_data_dir, handle).unwrap();
            kill_dup_process();
            init_tray(app).unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_default_user,
            get_user_by_id,
            update_user,
            get_os_folders,
            get_os_folder_by_path,
            get_os_folders_by_path,
            update_os_folders,
            delete_os_folders,
            get_os_videos,
            update_os_videos,
            upsert_read_os_dir,
            check_cover_img_exists,
            show_in_folder,
            mpv_system_check,
            play_video,
            download_mpv_binary,
            upsert_read_os_dir,
            create_default_user,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                //for  example, prevent exit and continue running the process in the background
                api.prevent_exit();
            }
        });
}
