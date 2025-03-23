use std::fs::File;

use chrono::{DateTime, Local, NaiveDate};
use tauri::{command, AppHandle, Manager};
use zip::ZipWriter;
use zip_extensions::ZipWriterExtensions;

use crate::fs::show_in_folder;

///! Functionality that has to do with exporting the user data

#[command]
pub fn export_portable_config(handle: AppHandle) {
    let download_dir = handle.path().download_dir().unwrap();
    let app_data_dir = handle.path().app_data_dir().unwrap();
    let date_time: DateTime<Local> = Local::now();
    let formatted_date = date_time.format("%Y-%m-%d_%H-%M-%S").to_string();
    let config_zip_path = app_data_dir
        .join(format!("portable_config-{}", formatted_date))
        .with_extension("zip");
    let config_zip_path = app_data_dir
        .join(format!("portable_config-{formatted_date}"))
        .with_extension("zip");
    let portable_config_dir = app_data_dir.join("portable_config");
    let file = File::create(&config_zip_path).unwrap();

    let zip = ZipWriter::new(file);
    zip.create_from_directory(&portable_config_dir).unwrap();
    if config_zip_path.exists() {
        show_in_folder(config_zip_path.to_string_lossy().to_string());
    }
}
