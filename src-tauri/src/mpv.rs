use regex::Regex;
use tauri::path::BaseDirectory;
use tauri::{command, AppHandle, Manager};

use crate::database::data::v1::{OsFolder, OsVideo, User};
use crate::database::{update_os_folders, update_os_videos};
use crate::error::MpvError;
use crate::fs::{find_video_index, normalize_path};
use crate::tray::build_window;
use std::io;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::LazyLock;

pub static EPISODE_TITLE_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    regex::Regex::new(
        r"(?i)(?:S\d{1,2}E|第|EP?|Episode|Ch|Chapter|Vol|Volume|#)?\s*(\d{1,3})(?:話|巻|章|節|[._\-\s]|$)",
    )
    .unwrap()
});

#[command]
pub fn mpv_system_check(mpv_path: Option<String>) -> Result<(), MpvError> {
    let mpv_exe = mpv_path.as_deref().unwrap_or("mpv");

    let output = Command::new(mpv_exe).arg("--version").output();
    match output {
        Ok(output) => {
            if output.status.success() {
                Ok(())
            } else {
                // Distinguish based on provided absolute path or system PATH
                if let Some(abs_path) = mpv_path {
                    Err(MpvError::AbsolutePathNotFound(abs_path))
                } else {
                    Err(MpvError::SudoPATHNotFound)
                }
            }
        }
        Err(e) if e.kind() == io::ErrorKind::NotFound => {
            if let Some(abs_path) = mpv_path {
                Err(MpvError::AbsolutePathNotFound(abs_path))
            } else {
                Err(MpvError::SudoPATHNotFound)
            }
        }
        Err(e) => Err(MpvError::IoError(e)),
    }
}

#[command]
pub async fn play_video(
    handle: AppHandle,
    main_folder: OsFolder,
    video: OsVideo,
    user: User,
) -> Result<(), MpvError> {
    let webv_window = match handle.get_webview_window("main") {
        Some(win) => win,
        None => return Err(MpvError::WebviewWindowNotFound(String::from("main"))),
    };
    let last_url = webv_window.url()?;
    let last_url = format!("{}#video_title={}", last_url.as_str(), video.title);

    webv_window.close()?;
    let parent_path = match Path::new(&video.path).parent() {
        Some(pp) => pp,
        None => return Err(MpvError::InvalidPathName(video.path)),
    };

    let video_index = find_video_index(parent_path, video.path.clone())?;
    let mpvshelf_plugins = handle
        .path()
        .resolve("resources/mpvshelf.lua", BaseDirectory::Resource)?;
    let mut args = Vec::new();

    if user.settings.autoplay {
        args = vec![
            format!("--playlist-start={video_index}"),
            format!("--playlist={}", parent_path.to_string_lossy()),
        ];
    }

    args.extend([
        format!("--script={}", mpvshelf_plugins.to_string_lossy()),
        format!("--title={} | mpvshelf", main_folder.title),
    ]);

    let status = spawn_mpv(&args, user.settings.mpv_path)?;
    let output = status.wait_with_output()?;
    match extract_mpv_stdout_path(output.stdout.clone()) {
        Some(path) => {
            let last_watched_video_path = normalize_path(&path);
            match main_folder
                .os_videos
                .iter()
                .enumerate()
                .find(|(_, vid)| vid.path == last_watched_video_path.to_string_lossy())
            {
                Some((last_index, lvw)) => {
                    dbg!(last_index);
                    let mut main_folder_clone = main_folder.clone();
                    for (i, vid) in &mut main_folder_clone.os_videos.iter_mut().enumerate() {
                        vid.watched = true;
                        if i == last_index {
                            break;
                        }
                    }
                    main_folder_clone.last_watched_video = Some(lvw.clone());
                    update_os_videos(handle.clone(), main_folder_clone.os_videos.clone())?;
                    update_os_folders(handle.clone(), vec![main_folder_clone])?;
                }
                None => return Err(last_watched_video_path.into()),
            }
        }
        None => {
            return Err(MpvError::MissingStdoutVideoTitle(
                video.title,
                String::from_utf8(output.stdout)?,
            ))
        }
    }

    //println!("{:#?}", last_watched_video_path);

    build_window(handle, Some(last_url.as_str()))?;

    Ok(())
}

pub fn spawn_mpv(args: &[String], mpv_path: Option<String>) -> Result<Child, MpvError> {
    let mpv_exe = mpv_path.as_deref().unwrap_or("mpv");

    let child = Command::new(mpv_exe)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    Ok(child)
}

fn extract_mpv_stdout_path(stdout: Vec<u8>) -> Option<String> {
    let output_str = String::from_utf8(stdout).ok()?;

    for line in output_str.lines().rev() {
        if let Some(stripped) = line.strip_prefix("Playing: ") {
            return Some(stripped.to_string());
        }
    }

    None
}
