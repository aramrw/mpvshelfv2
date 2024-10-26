use std::borrow::Cow;
use std::fs::read_dir;
use std::io;
use std::path::{Path, PathBuf};

use crate::{database::data::v1::OsFolder, error::IoError};
use tauri::{command, AppHandle, Manager};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

use phf::phf_set;

static SUPPORTED_VIDEO_FORMATS: phf::Set<&'static str> = phf_set! {
    "mp4", "mkv", "webm", "avi", "mov", "flv", "wmv", "mpg", "mpeg", "m4v",
    "3gp", "ogg", "mxf", "ts", "vob", "m2ts", "mts", "asf", "rm", "rmvb",
    "divx", "dv", "f4v", "f4p", "f4a", "f4b", "hevc"
};

static SUPPORTED_AUDIO_FORMATS: phf::Set<&'static str> = phf_set! {
    "aac", "ac3", "aiff", "alac", "amr", "ape", "au", "dts", "flac", "m4a",
    "m4b", "mka", "mlp", "mp3", "oga", "ogg", "opus", "ra", "rm", "tak",
    "truehd", "tta", "voc", "wav", "wma", "wv",
};

#[command]
pub fn read_os_folder_dir(
    path: String,
    user_id: String,
    handle: AppHandle,
) -> Result<OsFolder, IoError> {
    let mut child_folder_paths: Vec<String> = Vec::new();
    let mut video_file_paths: Vec<String> = Vec::new();
    let mut audio_file_paths: Vec<String> = Vec::new();
    let mut cover_img_path: Option<String> = None;

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
        return Err(IoError::IoError(io::Error::new(
            io::ErrorKind::NotFound,
            format!("{path} contains 0 supported files."),
        )));
    }

    if let Some(first_vid_path) = video_file_paths.first() {
        if let Ok(app_data_dir) = handle.path().app_data_dir() {
            if let Some(first_vid_name) = std::path::Path::new(first_vid_path).file_stem() {
                // Construct the path for the entry frame without the original video extension
                let entry_frame_full_path = app_data_dir
                    .join("frames")
                    .join(first_vid_name) // This is the stem without the original extension
                    .with_extension("png");

                call_ffmpeg_sidecar(handle, first_vid_path.clone(), &entry_frame_full_path)
                    .unwrap();
                cover_img_path = Some(entry_frame_full_path.to_string_lossy().to_string());
            }
        }
    }
    let folder = OsFolder {
        user_id,
        path,
        cover_img_path,
    };

    Ok(folder)
}

fn call_ffmpeg_sidecar(
    handle: AppHandle,
    entry_path: String,
    entry_frame_full_path: &Path,
) -> Result<(), Box<dyn std::error::Error>> {
    let sidecar_cmd = handle.shell().sidecar("ffmpeg")?.args([
        "-ss",
        "2",
        "-i",
        &entry_path,
        "-frames:v",
        "1",
        &entry_frame_full_path.to_string_lossy(),
    ]);

    let (mut _rx, mut _child) = sidecar_cmd.spawn()?;

    Ok(())
}
