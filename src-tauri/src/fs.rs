use std::path::{Path, PathBuf};
//use std::time::Instant;
use futures_util::{StreamExt, TryStreamExt};
use tokio::io::AsyncWriteExt;
use std::{env, fs, io};
use std::{fs::read_dir, process::Command};

use crate::database::data::v1::OsVideo;
use crate::database::update_os_videos;
use crate::error::MpvError;
use crate::misc::get_date_time;
use crate::mpv::EPISODE_TITLE_REGEX;
use crate::{
    database::{data::v1::OsFolder, update_os_folders},
    error::DatabaseError,
};
use reqwest::Client;
use tauri::{command, AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;

use crate::error::HttpClientError;

use phf::phf_set;

pub static SUPPORTED_VIDEO_FORMATS: phf::Set<&'static str> = phf_set! {
    "mp4", "mkv", "webm", "avi", "mov", "flv", "wmv", "mpg", "mpeg", "m4v",
    "3gp", "ogg", "mxf", "ts", "vob", "m2ts", "mts", "asf", "rm", "rmvb",
    "divx", "dv", "f4v", "f4p", "f4a", "f4b", "hevc"
};

pub static SUPPORTED_AUDIO_FORMATS: phf::Set<&'static str> = phf_set! {
    "aac", "ac3", "aiff", "alac", "amr", "ape", "au", "dts", "flac", "m4a",
    "m4b", "mka", "mlp", "mp3", "oga", "ogg", "opus", "ra", "rm", "tak",
    "truehd", "tta", "voc", "wav", "wma", "wv",
};

pub static SUPPORTED_SUBTITLE_FORMATS: phf::Set<&'static str> = phf_set! {
    "srt", "ass", "ssa", "sub", "idx", "vtt", "lrc",
};

#[command]
pub fn read_os_folder_dir(
    handle: AppHandle,
    path: String,
    user_id: String,
    cover_img_path: Option<String>,
    update_datetime: Option<(String, String)>,
) -> Result<OsFolder, DatabaseError> {
    let mut child_folder_paths: Vec<String> = Vec::new();
    let mut video_file_paths: Vec<String> = Vec::new();
    let mut audio_file_paths: Vec<String> = Vec::new();
    let mut cover_img_path: Option<String> = cover_img_path;
    let mut update_datetime = update_datetime;
    let app_data_dir = handle.path().app_data_dir()?;

    for entry in read_dir(&path)? {
        let entry = entry?;
        let entry_path = entry.path();

        if let Some(extension) = entry_path.extension() {
            let extension_lossy = extension.to_string_lossy();
            if SUPPORTED_VIDEO_FORMATS.get_key(&extension_lossy).is_some() {
                video_file_paths.push(entry_path.to_string_lossy().to_string());
            } else if SUPPORTED_AUDIO_FORMATS.get_key(&extension_lossy).is_some() {
                audio_file_paths.push(entry_path.to_string_lossy().to_string());
            }
        } else if entry_path.is_dir() {
            child_folder_paths.push(entry_path.to_string_lossy().to_string());
            continue;
        }
    }

    if child_folder_paths.is_empty() && video_file_paths.is_empty() && audio_file_paths.is_empty() {
        return Err(DatabaseError::IoError(io::Error::new(
            io::ErrorKind::NotFound,
            format!("{path} contains 0 supported files."),
        )));
    }

    if cover_img_path.is_none() {
        if let Some(first_vid_path) = video_file_paths.first() {
            let new_cover_img_path = join_cover_img_path(first_vid_path, &app_data_dir)?;
            call_ffmpeg_sidecar(
                &handle,
                first_vid_path.clone(),
                Path::new(&new_cover_img_path),
            )
            .unwrap();
            cover_img_path = Some(new_cover_img_path);
        }
    }

    let os_folder_path_clone = path.clone();
    let os_folder = Path::new(&os_folder_path_clone);
    if update_datetime.is_none() {
        let (update_date, update_time) = get_date_time();
        update_datetime = Some((update_date, update_time));
    }

    let update_date = update_datetime.clone().unwrap().0;
    let update_time = update_datetime.unwrap().1;

    let os_videos: Vec<OsVideo> = video_file_paths
        .into_iter()
        .map(|vid_path| {
            create_os_video(
                &handle,
                user_id.clone(),
                path.clone(),
                vid_path,
                update_date.clone(),
                update_time.clone(),
                &app_data_dir,
            )
        })
        .try_collect()?;

    let folder = OsFolder {
        user_id,
        path,
        title: os_folder.file_name().unwrap().to_string_lossy().to_string(),
        os_videos: os_videos.clone(),
        last_watched_video: os_videos[0].clone(),
        cover_img_path,
        update_date,
        update_time,
    };

    update_os_videos(&handle, os_videos, None)?;
    update_os_folders(handle, vec![folder.clone()])?;

    Ok(folder)
}

fn create_os_video(
    handle: &AppHandle,
    user_id: String,
    main_folder_path: String,
    path: String,
    update_date: String,
    update_time: String,
    app_data_dir: &Path,
) -> Result<OsVideo, DatabaseError> {
    let title =
        Path::new(&path)
            .file_name()
            .ok_or_else(|| {
                DatabaseError::IoError(io::Error::new(
        io::ErrorKind::InvalidInput,
        format!("'{path}' contained invalid characters when trying get the the OsVideo title."),
    ))
            })?
            .to_string_lossy()
            .to_string();

    let cover_img_path = join_cover_img_path(&path, app_data_dir)?;
    if !check_cover_img_exists(&cover_img_path) {
        call_ffmpeg_sidecar(handle, &path, Path::new(&cover_img_path)).unwrap();
    }

    let vid = OsVideo {
        user_id,
        main_folder_path,
        path,
        title,
        cover_img_path: Some(cover_img_path),
        watched: false,
        update_date,
        update_time,
    };

    Ok(vid)
}

#[command]
pub fn check_cover_img_exists(img_path: &str) -> bool {
    let path = Path::new(img_path);
    if path.exists() {
        return true;
    }
    false
}

fn join_cover_img_path(
    path: impl AsRef<str>,
    app_data_dir: &Path,
) -> Result<String, DatabaseError> {
    let title = Path::new(path.as_ref()).file_stem().ok_or_else(|| {
        DatabaseError::IoError(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!(
                "'{}' contained invalid characters when trying to join cover img path.",
                path.as_ref()
            ),
        ))
    })?;
    // Construct the path for the entry frame without the original video extension
    let cover_img_full_path = app_data_dir
        .join("frames")
        .join(title) // This is the stem without the original extension
        .with_extension("jpg")
        .to_string_lossy()
        .to_string();
    Ok(cover_img_full_path)
}

fn call_ffmpeg_sidecar(
    handle: &AppHandle,
    entry_path: impl AsRef<str>,
    entry_frame_full_path: &Path,
) -> Result<(), Box<dyn std::error::Error>> {
    let sidecar_cmd = handle.shell().sidecar("ffmpeg").unwrap().args([
        "-ss",
        "5",
        "-i",
        entry_path.as_ref(),
        "-frames:v",
        "1",
        &entry_frame_full_path.to_string_lossy(),
    ]);

    let (mut _rx, mut _child) = sidecar_cmd.spawn().unwrap();
    //println!("running ffmpegsidecar function");

    Ok(())
}

pub fn normalize_path(path: &str) -> PathBuf {
    let normalized = path
        .replace("/", std::path::MAIN_SEPARATOR_STR)
        .replace("\\", std::path::MAIN_SEPARATOR_STR);
    Path::new(&normalized).to_path_buf()
}

pub fn find_video_index(parent_path: &Path, selected_video_path: String) -> Result<u32, MpvError> {
    let mut media_files: Vec<fs::DirEntry> = fs::read_dir(parent_path)
        .unwrap()
        .filter_map(|entry| entry.ok())
        .collect();

    media_files.retain(|entry| {
        if let Ok(metadata) = entry.metadata() {
            if metadata.is_file() {
                if let Some(extension) = entry.path().extension() {
                    if let Some(extension_str) = extension.to_str() {
                        let extension_str = extension_str.to_lowercase();
                        // Check if it's a supported video, audio, or subtitle format
                        return SUPPORTED_VIDEO_FORMATS.get_key(&extension_str).is_some()
                            || SUPPORTED_AUDIO_FORMATS.get_key(&extension_str).is_some()
                            || SUPPORTED_SUBTITLE_FORMATS.get_key(&extension_str).is_some();
                    }
                }
            }
        }
        false
    });

    // media_files.sort_by(|a, b| {
    //     let nums_a: Vec<u32> = EPISODE_TITLE_REGEX
    //         .find_iter(&a.file_name().to_string_lossy())
    //         .filter_map(|m| m.as_str().parse::<u32>().ok())
    //         .collect();
    //     let nums_b: Vec<u32> = EPISODE_TITLE_REGEX
    //         .find_iter(&b.file_name().to_string_lossy())
    //         .filter_map(|m| m.as_str().parse::<u32>().ok())
    //         .collect();
    //     nums_a.cmp(&nums_b)
    // });

    media_files.sort_by(|a, b| {
        // Extract the episode number from the title using regex
        let num_a = EPISODE_TITLE_REGEX
            .captures(&a.file_name().to_string_lossy())
            .and_then(|caps| caps.get(1)) // Assuming the first capturing group contains the episode number
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(0);

        let num_b = EPISODE_TITLE_REGEX
            .captures(&b.file_name().to_string_lossy())
            .and_then(|caps| caps.get(1))
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(0);

        num_a.cmp(&num_b)
    });

    let selected_video_file_name = match Path::new(&selected_video_path).file_name() {
        Some(file_name) => file_name,
        None => return Err(MpvError::InvalidPathName(selected_video_path)),
    };

    let current_video_index = media_files
        .iter()
        .position(|entry| entry.file_name() == selected_video_file_name);

    match current_video_index {
        Some(index) => Ok(index as u32),
        None => Err(MpvError::OsVideoNotFound(selected_video_path)),
    }
}

#[command]
pub async fn download_mpv_binary(handle: AppHandle) -> Result<String, HttpClientError> {
    let platform = env::consts::OS;
    let url = match platform {
        "macos" => "https://github.com/aramrw/mpv_shelf_v2/releases/download/v0.0.1/mpv-aarch64-apple-darwin",
        "windows" => "https://github.com/aramrw/mpv_shelf_v2/releases/download/v0.0.1/mpv-x86_64-pc-windows-msvc.exe",
        _ => return Ok("unsupported platform".to_string()),
    };

    let client = Client::new();
    let response = client.get(url).send().await?; // Handle errors
    let total_size = response.content_length().unwrap_or(0);

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    let app_data_dir = handle.path().app_data_dir()?;
    let mpv_file_name = match platform {
        "macos" => "mpv",
        "windows" => "mpv.exe",
        _ => "mpv",
    };
    let mpv_file_path = app_data_dir.join(mpv_file_name);

    let mut file = tokio::fs::File::create(&mpv_file_path).await?;

    while let Some(chunk) = stream.try_next().await? {
        downloaded += chunk.len() as u64;

        file.write_all(&chunk).await?;

        let percentage = (downloaded as f64 / total_size as f64) * 100.0;
        handle.emit("progress", percentage as u64)?; 
    }

    Ok(mpv_file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn show_in_folder(path: String) {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args(["/select,", &path]) // The comma after select is not a typo
            .spawn()
            .unwrap();
    }

    // #[cfg(target_os = "linux")]
    // {
    //     if path.contains(",") {
    //         // see https://gitlab.freedesktop.org/dbus/dbus/-/issues/76
    //         let new_path = match metadata(&path).unwrap().is_dir() {
    //             true => path,
    //             false => {
    //                 let mut path2 = PathBuf::from(path);
    //                 path2.pop();
    //                 path2.into_os_string().into_string().unwrap()
    //             }
    //         };
    //         Command::new("xdg-open").arg(&new_path).spawn().unwrap();
    //     } else {
    //         if let Ok(Fork::Child) = daemon(false, false) {
    //             Command::new("dbus-send")
    //                 .args([
    //                     "--session",
    //                     "--dest=org.freedesktop.FileManager1",
    //                     "--type=method_call",
    //                     "/org/freedesktop/FileManager1",
    //                     "org.freedesktop.FileManager1.ShowItems",
    //                     format!("array:string:\"file://{path}\"").as_str(),
    //                     "string:\"\"",
    //                 ])
    //                 .spawn()
    //                 .unwrap();
    //         }
    //     }
    // }
    //

    #[cfg(target_os = "macos")]
    {
        Command::new("open").args(["-R", &path]).spawn().unwrap();
    }
}
