//! Functionality that has to do with exporting the user data

use std::{
    fmt::Display,
    fs::{self, File},
};

use chrono::{DateTime, Local, NaiveDate};
use serde::{Deserialize, Serialize};
use serde_json::to_string_pretty;
use tauri::{command, AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;
use zip::ZipWriter;
use zip_extensions::ZipWriterExtensions;

use crate::{
    database::{
        data::v1::{OsFolder, OsVideo, User},
        get_os_folders, get_os_videos,
    },
    fs::show_in_folder,
};

fn fmt_with_datetime(x: impl Display) -> String {
    let date_time: DateTime<Local> = Local::now();
    // to not use : in paths.
    let dt = date_time.format("%Y-%m-%d_%H-%M-%S").to_string();
    format!("{x}{dt}")
}

/// zips mpv's "portable_config" folder.
#[command]
pub fn export_portable_config(handle: AppHandle) {
    let download_dir = handle.path().download_dir().unwrap();
    let app_data_dir = handle.path().app_data_dir().unwrap();
    let config_zip_path = download_dir
        .join(fmt_with_datetime("portable_config-"))
        .with_extension("zip");
    let portable_config_dir = app_data_dir.join("portable_config");
    let file = File::create(&config_zip_path).unwrap();

    let zip = ZipWriter::new(file);
    zip.create_from_directory(&portable_config_dir).unwrap();
    if config_zip_path.exists() {
        show_in_folder(config_zip_path.to_string_lossy().to_string());
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct ExportData {
    user: User,
    dirs: Vec<OsFolder>,
    vids: Vec<OsVideo>,
}

#[command]
pub fn import_all_data(handle: AppHandle, user: User) {
    let dldir = handle.path().download_dir().unwrap();
    let opt = handle
        .dialog()
        .file()
        .set_title("import mpvshelf data *.json")
        .add_filter("json", &["json"])
        .set_directory(dldir);

    opt.pick_file(|f| {
        if f.is_none() {
            return;
        }
        let f = f.unwrap();
        let p = f.as_path().unwrap();
        let fstr = fs::read_to_string(p).unwrap();
        let Ok(data) = serde_json::from_str::<ExportData>(&fstr) else {
            return;
        };
        println!("{data:?}");
    });
}

#[command]
pub fn export_all_data(handle: AppHandle, user: User) {
    let dirs = get_os_folders(
        handle.clone(),
        user.id.clone(),
        crate::database::SortType::Updated,
    )
    .unwrap();
    let vids = get_os_videos(
        handle.clone(),
        user.id.clone(),
        crate::database::SortType::Updated,
    )
    .unwrap();

    let download_dir = handle.path().download_dir().unwrap();
    let dl_json_path = download_dir
        .join(fmt_with_datetime(format!("{}-", user.username)))
        .with_extension("json");

    let res = ExportData { dirs, vids, user };
    let json_str = to_string_pretty(&res).unwrap();
    std::fs::write(&dl_json_path, &json_str).unwrap();
    if dl_json_path.exists() {
        show_in_folder(dl_json_path.to_string_lossy().to_string());
    }
}
