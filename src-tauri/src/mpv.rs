use rayon::iter::{IntoParallelIterator, ParallelIterator};
use regex::Regex;
use tauri::path::BaseDirectory;
use tauri::{command, AppHandle, Manager};

use crate::database::data::v1::{OsFolder, OsVideo, User};
use crate::database::{update_os_folders, update_os_videos, update_user};
use crate::error::{MpvError, MpvStdoutError};
use crate::fs::{find_video_index, normalize_path};
use crate::tray::build_window;
use std::num::ParseIntError;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::LazyLock;
use std::{io, time};

pub static EPISODE_TITLE_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    regex::Regex::new(
        r"(?i)(?:S\d{1,2}[-\s]*|(?:第|EP?|Episode|Ch|Chapter|Vol|Volume|#)?\s*)?(\d{1,3})(?:話|巻|章|節|[._\-\s]|$)",
    )
    .unwrap()
});

#[derive(Debug, Clone)]
pub enum TimestampType {
    Duration,
    Position,
}

#[derive(Debug, Clone)]
pub struct MpvPlaybackData {
    /// Title of the last video played
    last_video_path: String,
    /// Timestamp of the last position watched
    last_video_position: u64,
    /// Total duration of the last video
    last_video_duration: u64,
}

impl MpvPlaybackData {
    fn new() -> Self {
        MpvPlaybackData {
            last_video_path: String::from(""),
            last_video_position: 0,
            last_video_duration: 0,
        }
    }

    /// this is only used for ffmpegs output currently
    pub fn get_duration(ts: String) -> Result<u64, MpvStdoutError> {
        // First handle the potential decimal portion from FFmpeg
        let base_timestamp = ts
            .split('.')
            .next()
            .ok_or_else(|| MpvStdoutError::InvalidTimestamp(ts.clone()))?;

        let parts: Vec<&str> = base_timestamp.split(':').collect();
        if parts.len() != 3 {
            return Err(MpvStdoutError::InvalidTimestamp(ts));
        }

        let hours: u64 = parts[0].parse().map_err(|e: ParseIntError| {
            MpvStdoutError::ParseInt(parts[0].to_string(), e.to_string())
        })?;
        let minutes: u64 = parts[1].parse().map_err(|e: ParseIntError| {
            MpvStdoutError::ParseInt(parts[1].to_string(), e.to_string())
        })?;
        let seconds: u64 = parts[2].parse().map_err(|e: ParseIntError| {
            MpvStdoutError::ParseInt(parts[2].to_string(), e.to_string())
        })?;

        let total_seconds = hours * 3600 + minutes * 60 + seconds;
        Ok(total_seconds)
    }

    pub fn update_timestamp(
        &mut self,
        ts_type: TimestampType,
        ts: String,
    ) -> Result<u64, MpvStdoutError> {
        // First handle the potential decimal portion from FFmpeg
        let base_timestamp = ts
            .split('.')
            .next()
            .ok_or_else(|| MpvStdoutError::InvalidTimestamp(ts.clone()))?;

        let parts: Vec<&str> = base_timestamp.split(':').collect();
        if parts.len() != 3 {
            return Err(MpvStdoutError::InvalidTimestamp(ts));
        }

        let hours: u64 = parts[0].parse().map_err(|e: ParseIntError| {
            MpvStdoutError::ParseInt(parts[0].to_string(), e.to_string())
        })?;
        let minutes: u64 = parts[1].parse().map_err(|e: ParseIntError| {
            MpvStdoutError::ParseInt(parts[1].to_string(), e.to_string())
        })?;
        let seconds: u64 = parts[2].parse().map_err(|e: ParseIntError| {
            MpvStdoutError::ParseInt(parts[2].to_string(), e.to_string())
        })?;

        let total_seconds = hours * 3600 + minutes * 60 + seconds;
        match ts_type {
            TimestampType::Position => self.last_video_position = total_seconds,
            TimestampType::Duration => self.last_video_duration = total_seconds,
        }
        Ok(total_seconds)
    }
}

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
                    if abs_path.is_empty() {
                        return Err(MpvError::AbsolutePathNotFound(abs_path));
                    }
                }
                Err(MpvError::SudoPATHNotFound)
            }
        }
        Err(e) if e.kind() == io::ErrorKind::NotFound => {
            if let Some(abs_path) = mpv_path {
                if abs_path.is_empty() {
                    return Err(MpvError::AbsolutePathNotFound(abs_path));
                }
            }
            Err(MpvError::SudoPATHNotFound)
        }
        Err(e) => Err(MpvError::IoError(e)),
    }
}

#[command]
pub async fn play_video(
    handle: AppHandle,
    main_folder: OsFolder,
    mut os_videos: Vec<OsVideo>,
    video: OsVideo,
    mut user: User,
) {
    let instant = time::Instant::now();
    (|| -> Result<(), MpvError> {
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

        let status = spawn_mpv(&args, user.settings.mpv_path.as_deref())?;
        println!(
            "it took {:.2}ms until mpv was spawned",
            instant.elapsed().as_millis()
        );
        let output = status.wait_with_output()?;
        let parsed_stdout = parse_mpv_stdout(output.stdout.clone())?;

        //println!("{:#?}", data);
        let mut main_folder_clone = main_folder.clone();
        let mut last_watched_video = None; // Track the last updated video

        for entry in &parsed_stdout {
            let video_path = &entry.last_video_path;

            // Iterate through all videos in `os_videos` and update those that match the path
            for vid in &mut os_videos.iter_mut() {
                if vid.path == *video_path {
                    vid.watched = true;
                    vid.position = entry.last_video_position;
                    vid.duration = entry.last_video_duration;

                    // track this as the last watched video
                    last_watched_video = Some(vid.clone());
                }
            }
        }

        // Assign the tracked last watched video (if any)
        main_folder_clone.last_watched_video = last_watched_video.clone();
        user.last_watched_video = last_watched_video;

        // Continue with the update
        update_os_videos(handle.clone(), os_videos)?;
        update_os_folders(handle.clone(), vec![main_folder_clone])?;
        update_user(user, handle.clone())?;

        build_window(handle, Some(last_url.as_str()))?;

        Ok(())
    })()
    .unwrap();
}

pub fn spawn_mpv(args: &[String], mpv_path: Option<&str>) -> Result<Child, MpvError> {
    let mpv_exe = mpv_path.as_deref().unwrap_or("mpv");

    let child = Command::new(mpv_exe)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    Ok(child)
}

fn parse_mpv_stdout(stdout: Vec<u8>) -> Result<Vec<MpvPlaybackData>, MpvStdoutError> {
    let output_str = String::from_utf8(stdout)?;

    // Split the output by the keyword "Playing", which indicates the start of each new part
    let parts: Vec<String> = output_str
        .split("Playing")
        .skip(1) // skip the first part before the first "Playing"
        .map(|part| format!("Playing{}", part.trim())) // re-add the "Playing" to each part
        .collect();

    // Process each part in parallel
    let data: Result<Vec<MpvPlaybackData>, MpvStdoutError> = parts
        .into_par_iter() // Parallel iteration
        .map(|part| {
            // Handle each part, and propagate errors correctly using Result
            handle_mpv_stdout_section(part)
        })
        .collect(); // Collect the results into a Result<Vec<_>, _>

    data
}

fn handle_mpv_stdout_section(sect: String) -> Result<MpvPlaybackData, MpvStdoutError> {
    //println!("\n{sect}\n");
    let mut data = MpvPlaybackData::new();
    let mut found_path = false;
    let mut found_timestamp = false;

    // First find the path since it's at the start
    for line in sect.lines() {
        if let Some(path) = line.strip_prefix("Playing: ") {
            data.last_video_path = normalize_path(path).to_string_lossy().to_string();
            found_path = true;
            break;
        }
    }

    // Then find the last actual timestamp (going backwards)
    for line in sect.lines().rev() {
        if line.starts_with("Exiting...") || line.starts_with("Saving state.") {
            continue; // Skip these lines as they might appear after the final timestamp
        }
        if let Some(whole_duration) = line.strip_prefix("AV: ") {
            let parts: Vec<&str> = whole_duration.split('/').map(str::trim).collect();
            if parts.len() >= 2 {
                if let Some((duration, _)) = parts[1].split_once("(") {
                    data.update_timestamp(TimestampType::Position, parts[0].to_string())?;
                    data.update_timestamp(TimestampType::Duration, duration.trim().to_string())?;
                    found_timestamp = true;
                    break; // Stop after finding the first (last) valid timestamp
                }
            }
        }
    }

    if !found_path {
        return Err(MpvStdoutError::MissingVideoTitle(sect));
    }

    // handle the edge case where path is found but timestamp isn't
    // this only seems to happen when you finish watching a video that has a timestamp-
    // and then exit mpv on the video that plays after
    if !found_timestamp {
        // Set default values for already watched videos
        data.update_timestamp(TimestampType::Position, "00:10:00".to_string())?;
        data.update_timestamp(TimestampType::Duration, "00:10:00".to_string())?;
        println!(
            "Warning: No timestamp found for '{}', using default values.",
            data.last_video_path
        );
    }

    Ok(data)
}
