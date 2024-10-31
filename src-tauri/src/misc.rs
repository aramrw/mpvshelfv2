use chrono::Local;
use futures_util::{StreamExt, TryStreamExt};
use reqwest::Client;
use specta::specta;
use specta_typescript::Typescript;
use std::io::Write;
use std::mem::take;
use std::{env, fs::File};
use tauri::{command, AppHandle, Emitter, Manager, Window};
use tauri_plugin_os::platform;
use tauri_specta::{collect_commands, Builder};

use crate::error::HttpClientError;

pub fn get_date_time() -> (String, String) {
    let local_t = Local::now();
    let date_t_string = local_t.format("%Y-%m-%d %H:%M").to_string();

    let mut date_vec: Vec<String> = date_t_string
        .split_whitespace()
        .map(|x| x.to_owned())
        .collect();

    if date_vec.len() == 2 {
        let mut time = take(&mut date_vec[1]);
        if let Some((h, m)) = time.split_once(":") {
            if let Ok(int_h) = h.parse::<u8>() {
                time = format!(
                    "{:02}:{:02}{}",
                    int_h % 12,
                    m,
                    if int_h >= 12 { "pm" } else { "am" }
                );
            }
        }

        return (take(&mut date_vec[0]), time);
    }

    (String::new(), String::new())
}

#[command]
#[specta]
pub async fn download_mpv_binary(handle: AppHandle) -> Result<String, String> {
    let platform = env::consts::OS;
    let url = match platform {
        "macos" => "https://github.com/aramrw/mpv_shelf_v2/releases/download/v0.0.1/mpv-aarch64-apple-darwin",
        "windows" => "https://github.com/aramrw/mpv_shelf_v2/releases/download/v0.0.1/mpv-x86_64-pc-windows-msvc.exe",
        _ => return Ok("unsupported platform".to_string()),
    };

    let client = Client::new();
    let response = client.get(url).send().await.map_err(|e| e.to_string())?; // Handle errors
    let total_size = response.content_length().unwrap_or(0);

    handle
        .emit("progress", "downloading")
        .map_err(|e| e.to_string())?; // Handle errors

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    let app_data_dir = handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let mpv_file_name = match platform {
        "macos" => "mpv",
        "windows" => "mpv.exe",
        _ => "mpv",
    };
    let mpv_file_path = app_data_dir.join(mpv_file_name);

    let mut file = File::create(&mpv_file_path).unwrap();

    while let Some(chunk) = stream.try_next().await.map_err(|e| e.to_string())? {
        downloaded += chunk.len() as u64;

        //file.write_all(&chunk).unwrap();

        let percentage = (downloaded as f64 / total_size as f64) * 100.0;
        handle
            .emit("progress", percentage as u64)
            .map_err(|e| e.to_string())?; // Handle errors
    }

    handle
        .emit("progress", "download complete")
        .map_err(|e| e.to_string())?; // Handle errors

    Ok(mpv_file_path.to_string_lossy().to_string())
}
