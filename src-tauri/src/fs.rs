use std::collections::HashSet;
use std::io::Write;
use std::os::windows::fs::MetadataExt;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
//use std::time::Instant;
use futures_util::{StreamExt, TryStreamExt};
use hashbrown::HashMap;
use rayon::iter::{
    IndexedParallelIterator, IntoParallelIterator, IntoParallelRefIterator,
    IntoParallelRefMutIterator, ParallelBridge,
};
use rayon::slice::ParallelSliceMut;
use std::{env, fs, io};
use std::{fs::read_dir, process::Command};
use tauri_plugin_shell::process::CommandEvent;
use tokio::io::AsyncWriteExt;

use crate::database::data::v1::OsVideo;
use crate::database::{data::v1::OsFolder, update_os_folders};
use crate::database::{delete_os_folders, delete_os_videos, update_os_videos};
use crate::error::{DatabaseError, FfmpegError, MpvError, MpvShelfError, ReadDirError};
use crate::misc::get_date_time;
use crate::mpv::{MpvPlaybackData, EPISODE_TITLE_REGEX};
use rayon::iter::ParallelIterator;
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

trait Pushable {
    fn push(&mut self, value: String);
}

impl Pushable for Vec<String> {
    fn push(&mut self, value: String) {
        self.push(value);
    }
}

impl Pushable for HashSet<String> {
    fn push(&mut self, value: String) {
        self.insert(value);
    }
}

fn read_dir_helper(
    path: &str,
    child_folder_paths: &mut impl Pushable,
    video_file_paths: &mut impl Pushable,
) -> Result<(), io::Error> {
    for entry in read_dir(path)? {
        let entry = entry?;
        let entry_path = entry.path();

        if let Some(extension) = entry_path.extension() {
            let extension_lossy = extension.to_string_lossy();
            if SUPPORTED_VIDEO_FORMATS.get_key(&extension_lossy).is_some()
                || SUPPORTED_AUDIO_FORMATS.get_key(&extension_lossy).is_some()
            {
                video_file_paths.push(entry_path.to_string_lossy().to_string());
            }
        } else if entry_path.is_dir() {
            child_folder_paths.push(entry_path.to_string_lossy().to_string());
            continue;
        }
    }

    Ok(())
}

type FolderGroup = (OsFolder, Vec<OsFolder>, Vec<OsVideo>);

fn delete_stale_entries(
    handle: AppHandle,
    old_dirs: Vec<OsFolder>,
    old_vids: Vec<OsVideo>,
) -> Result<(), DatabaseError> {
    delete_os_folders(handle.clone(), old_dirs)?;
    delete_os_videos(&handle, old_vids)?;
    Ok(())
}

pub trait HasPath {
    fn path(&self) -> &str;
}

fn normalize_path_to_unix(path: impl AsRef<str>) -> String {
    path.as_ref().to_lowercase().replace('\\', "/") // Normalize case and separators.
}

#[allow(dead_code)]
#[derive(Debug)]
pub enum StaleEntries {
    Found {
        dirs: Option<HashSet<String>>,
        videos: Option<HashSet<String>>,
        deleted: Option<(Vec<OsFolder>, Vec<OsVideo>)>,
    },
    None,
}

impl StaleEntries {
    pub fn is_none(&self) -> bool {
        matches!(self, StaleEntries::None)
    }
}

fn find_missing_paths<'a, O, I>(old: &[O], new: I) -> Option<HashSet<String>>
where
    O: HasPath,
    I: Iterator<Item = &'a String>,
{
    // Normalize old paths and collect them into a set.
    let old_paths: HashSet<String> = old.iter().map(|x| x.path().to_string()).collect();

    // Normalize new paths and collect them into a set.
    let new_paths: HashSet<String> = new.cloned().collect();

    // Find paths missing in the new set (deletions) and paths missing in the old set (additions).
    let missing: HashSet<String> = old_paths
        .difference(&new_paths) // Paths in old but not in new (deletions).
        .chain(new_paths.difference(&old_paths)) // Paths in new but not in old (additions).
        .cloned()
        .collect();

    // Return `None` if there are no missing paths, otherwise return the set.
    if missing.is_empty() {
        None
    } else {
        Some(missing)
    }
}

fn find_stale_metadata(
    old: &[OsVideo],
    new: &HashSet<String>, // new is directly a HashSet<String>
) -> Option<HashSet<String>> {
    // Build a map of old videos for easy lookup by path.
    let old_map: HashMap<&str, &OsVideo> = old.iter().map(|p| (p.path.as_str(), p)).collect();

    // Start with an empty set to store stale or missing paths.
    let mut result: HashSet<String> = HashSet::new();

    // Iterate over new video paths to check both missing and stale metadata.
    new.iter().for_each(|new_path| {
        // Check if the video exists in the old set.
        if let Some(old_video) = old_map.get(new_path.as_str()) {
            // Check if the video's metadata is stale.
            if old_video.is_stale_metadata() {
                result.insert(new_path.clone()); // Add to result if metadata is stale.
            }
        } else {
            result.insert(new_path.clone()); // Add missing video to result (video was added).
        }
    });

    // Also check for any videos that were in `old` but not in `new` (deleted videos).
    old.iter().for_each(|old_video| {
        // If a video in `old` is missing from `new`, consider it missing.
        if !new.contains(old_video.path()) {
            result.insert(old_video.path().to_string());
        }
    });

    // Return the result if not empty, otherwise None.
    if result.is_empty() {
        None
    } else {
        Some(result)
    }
}

fn find_stale_entries(
    main_dir: &str,
    old_dirs: Option<&mut Vec<OsFolder>>,
    old_videos: Option<&mut Vec<OsVideo>>,
) -> Result<StaleEntries, ReadDirError> {
    // Collect new directories and videos from the filesystem.
    let mut new_dirs = HashSet::new();
    let mut new_videos = HashSet::new();
    read_dir_helper(main_dir, &mut new_dirs, &mut new_videos)?;

    // If both old_dirs and old_videos are None, this is a fresh scan (no previous entries).
    if old_dirs.is_none() && old_videos.is_none() {
        return Ok(StaleEntries::None);
    }

    let old_dirs = match old_dirs {
        Some(dirs) => dirs,
        None => &mut Vec::new(),
    };

    let old_videos = match old_videos {
        Some(videos) => videos,
        None => &mut Vec::new(),
    };

    // Filter out missing videos (deleted videos)
    let deleted_videos: Vec<OsVideo> = old_videos
        .iter()
        .filter_map(|pan| {
            if !path_exists(&pan.path) {
                return Some(pan.clone());
            }
            None
        })
        .collect();

    // Filter out missing directories (deleted dirs)
    let deleted_dirs: Vec<OsFolder> = old_dirs
        .iter()
        .filter_map(|dir| {
            if !path_exists(&dir.path) {
                return Some(dir.clone());
            }
            None
        })
        .collect();

    // Remove deleted videos and dirs from old_dirs and old_videos
    old_dirs.retain(|dir| !deleted_dirs.iter().any(|del| del.path == dir.path));
    old_videos.retain(|video| !deleted_videos.iter().any(|del| del.path == video.path));

    // Find missing paths (stale directories) and videos
    let dirs = find_missing_paths(old_dirs, new_dirs.iter());
    let videos = find_stale_metadata(old_videos, &new_videos);

    // Return the found stale entries, including deleted items
    match (
        &dirs,
        &videos,
        deleted_dirs.is_empty() && deleted_videos.is_empty(),
    ) {
        (None, None, true) => Ok(StaleEntries::None),
        _ => Ok(StaleEntries::Found {
            dirs,
            videos,
            deleted: Some((deleted_dirs, deleted_videos)),
        }),
    }
}

/// returns a bool to indicate whether a refetch should be performed
#[command]
pub async fn upsert_read_os_dir(
    handle: AppHandle,
    dir: String,
    parent_path: Option<String>,
    user_id: String,
    mut old_dirs: Option<Vec<OsFolder>>,
    mut old_videos: Option<Vec<OsVideo>>,
) -> Result<bool, MpvShelfError> {
    // Find stale entries based on the provided directory and old data.
    let mut stale_entries = find_stale_entries(&dir, old_dirs.as_mut(), old_videos.as_mut())?;
    //println!("stale_entries: {:#?}", stale_entries);

    // If there are no stale entries and either `old_dirs` or `old_videos` is provided,
    // return `false` to prevent unnecessary re-rendering.
    if (old_dirs.is_some() || old_videos.is_some()) && stale_entries.is_none() {
        return Ok(false);
    }

    if let StaleEntries::Found {
        ref mut deleted, ..
    } = stale_entries
    {
        if let Some(deleted_entries) = deleted.take() {
            // only move the deleted entries.
            delete_stale_entries(handle.clone(), deleted_entries.0, deleted_entries.1)?;
        }
    }
    if let StaleEntries::Found { dirs, videos, .. } = &stale_entries {
        if dirs.is_none() && videos.is_none() {
            stale_entries = StaleEntries::None
        }
    }

    let (main_folder, mut new_cfs, mut videos) =
        read_os_folder_dir(&handle, dir, user_id, None, parent_path, stale_entries)?;
    new_cfs.push(main_folder);

    futures_util::stream::iter(videos.iter_mut().enumerate())
        .for_each_concurrent(/* Limit concurrency level */ 10, |(i, vid)| {
            let handle = handle.clone();
            async move {
                if let Some(cip) = vid.cover_img_path.as_ref() {
                    match ffmpeg_extract_frame(&handle, Some(i + 3), &vid.path, Path::new(cip))
                        .await
                    {
                        Ok(dur) => {
                            if let Ok(dur) = MpvPlaybackData::get_duration(dur) {
                                vid.duration = dur;
                            }
                        }
                        Err(e) => {
                            eprintln!("failed to process {} with ffmpeg {i}: {:?}", vid.path, e)
                        }
                    }
                }
            }
        })
        .await;

    update_os_videos(handle.clone(), videos)?;
    update_os_folders(handle, new_cfs)?;

    Ok(true)
}

pub fn read_os_folder_dir(
    handle: &AppHandle,
    path: String,
    user_id: String,
    update_datetime: Option<(String, String)>,
    parent_path: Option<String>,
    stale_entries: StaleEntries,
) -> Result<FolderGroup, ReadDirError> {
    let mut childfolder_paths = Vec::new();
    let mut video_paths = Vec::new();
    read_dir_helper(&path, &mut childfolder_paths, &mut video_paths)?;

    let parent_path = parent_path.is_some().then(|| {
        Path::new(&path)
            .parent()
            .unwrap()
            .to_string_lossy()
            .to_string()
    });

    if childfolder_paths.is_empty() && video_paths.is_empty() {
        return Err(ReadDirError::Io(io::Error::new(
            io::ErrorKind::NotFound,
            format!("{path} contains 0 supported files."),
        )));
    } else {
        // Only filter if stale_entries is `Found`, otherwise process all paths.
        if let StaleEntries::Found { dirs, videos, .. } = stale_entries {
            let stale_dirs = dirs.unwrap_or_default();
            let stale_videos = videos.unwrap_or_default();

            // Filter out stale child folders that are not in the stale_dirs.
            childfolder_paths.retain(|cfp| stale_dirs.contains(cfp));

            video_paths.retain(|vp| stale_videos.contains(vp));
        }
        // If stale_entries is `None`, do nothing, no filtering occurs.
    }
    let os_folder_path_clone = path.clone();
    let os_folder = Path::new(&os_folder_path_clone);
    let (update_date, update_time) = update_datetime.clone().unwrap_or_else(get_date_time);
    let app_data_dir = handle.path().app_data_dir()?;

    let mut total_child_folders: Vec<OsFolder> = Vec::new();
    let mut total_videos: Vec<OsVideo> = Vec::new();
    let current_folders_videos: Vec<OsVideo> = video_paths
        .into_par_iter()
        .filter_map(|video_path| {
            OsVideo::new(
                user_id.clone(),
                parent_path.clone(),
                path.clone(),
                video_path,
                update_date.clone(),
                update_time.clone(),
                &app_data_dir,
            )
            .ok()
        })
        .collect::<Vec<OsVideo>>();
    total_videos.extend(current_folders_videos);

    total_videos.par_sort_by(|a, b| {
        // Extract the episode number from the title using regex
        let num_a = EPISODE_TITLE_REGEX
            .captures(&a.title)
            .and_then(|caps| caps.get(caps.len() - 1)) // Assuming the first capturing group contains the episode number
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(0);

        let num_b = EPISODE_TITLE_REGEX
            .captures(&b.title)
            .and_then(|caps| caps.get(caps.len() - 1))
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(0);

        num_a.cmp(&num_b)
    });

    let first_video = total_videos.first().cloned();
    //println!("first_video: {:?}", first_video); // Debug statement
    let mut cover_img = first_video.as_ref().and_then(|p| p.cover_img_path.clone());

    let child_folders_group: Vec<FolderGroup> = childfolder_paths
        .into_par_iter()
        .filter_map(|folder_path| {
            read_os_folder_dir(
                handle,
                folder_path,
                user_id.clone(),
                update_datetime.clone(),
                Some(path.clone()),
                StaleEntries::None,
            )
            .ok()
        })
        .collect();

    for group in child_folders_group.into_iter() {
        let (folder, c_folders, g_videos) = group;

        if cover_img.is_none() {
            if let Some(ref cover_img_path) = folder.cover_img_path {
                cover_img = Some(cover_img_path.to_string());
            }
        }

        total_videos.extend(g_videos);
        total_child_folders.push(folder);
        total_child_folders.extend(c_folders);
    }

    let main_folder = OsFolder {
        user_id,
        path,
        title: os_folder.file_name().unwrap().to_string_lossy().to_string(),
        parent_path,
        last_watched_video: first_video,
        cover_img_path: cover_img,
        update_date,
        update_time,
    };

    Ok((main_folder, total_child_folders, total_videos))
}

#[command]
pub fn check_cover_img_exists(img_path: &str) -> bool {
    let path = Path::new(img_path);
    if path.exists() {
        return true;
    }
    false
}

pub fn join_cover_img_path(
    super_parent: Option<impl AsRef<str>>,
    parent: impl AsRef<str>,
    vid_path: impl AsRef<str>,
    app_data_dir: &Path,
) -> Result<String, io::Error> {
    let parent = parent.as_ref();
    let vid_path = vid_path.as_ref();

    // Extract the super_parent_title if present
    let super_parent_title = super_parent
        .map(|sp| {
            Path::new(sp.as_ref())
                .file_stem()
                .map(|stem| stem.to_string_lossy().to_string())
                .ok_or_else(|| {
                    io::Error::new(
                        io::ErrorKind::NotFound,
                        format!(
                            "failed to get the dir name (super_parent) for '{}'",
                            sp.as_ref()
                        ),
                    )
                })
        })
        .transpose()?;

    // Extract the parent directory title (directory name)
    let parent_title = Path::new(parent)
        .file_stem()
        .and_then(|stem| stem.to_str()) // Convert to string if possible
        .ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                format!("failed to get this dir name (vid_parent) for '{}'", parent),
            )
        })?;

    // Extract the title (filename without extension) from vid_path
    let title = Path::new(vid_path)
        .file_stem()
        .and_then(|stem| stem.to_str()) // Convert to string if possible
        .ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::InvalidInput,
                format!(
                    "'{}' contained invalid characters when trying to join cover img path.",
                    vid_path
                ),
            )
        })?;

    // Construct the path to store the cover image
    let mut cover_img_parent_dir_path = app_data_dir.join("frames");

    // Conditionally join super_parent_title if it exists
    if let Some(super_parent_title) = super_parent_title {
        cover_img_parent_dir_path = cover_img_parent_dir_path.join(super_parent_title);
    }

    // Always join parent_title
    cover_img_parent_dir_path = cover_img_parent_dir_path.join(parent_title);

    // Create the directory if it doesn't exist
    if !cover_img_parent_dir_path.exists() {
        fs::create_dir_all(&cover_img_parent_dir_path)?;
    }

    // Construct the full path for the cover image (video filename with .jpg extension)
    let cover_img_full_path = cover_img_parent_dir_path
        .join(title)
        .with_extension("jpg")
        .to_string_lossy()
        .to_string();

    Ok(cover_img_full_path)
}

/// returns the full duration of the given video
/// while also extracting the cover img frame
pub async fn ffmpeg_extract_frame(
    handle: &AppHandle,
    index: Option<usize>,
    entry_path: impl AsRef<str>,
    cover_img_path: &Path,
) -> Result<String, FfmpegError> {
    let frame_index = index.unwrap_or(5).to_string();
    // Arguments for ffmpeg to extract a frame and to retrieve video duration
    let args = [
        "-ss",
        frame_index.as_str(),
        "-i",
        entry_path.as_ref(),
        "-frames:v",
        "1",
        &cover_img_path.to_string_lossy(),
    ];

    // Spawn ffmpeg process
    let sidecar_cmd = handle.shell().sidecar("ffmpeg")?.args(args);
    let (mut rx, _) = sidecar_cmd.spawn()?;

    let mut stderr = String::new();
    let mut duration = None;
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stderr(line) => {
                let line = String::from_utf8_lossy(&line);
                if line.contains("Duration:") {
                    // The line will look like "Duration: 00:23:45.00, start: 0.000000, bitrate: 1000 kb/s"
                    if let Some(duration_str) = line.split("Duration:").nth(1) {
                        if let Some(duration_clean) = duration_str.split(',').next() {
                            //println!("Found duration: {}", duration_clean.trim());
                            let n_duration = duration_clean.trim();
                            duration = Some(n_duration.to_string());
                        }
                    }
                }
                stderr.push_str(&line);
            }
            CommandEvent::Error(e) => {
                stderr.push_str(&format!("\nexit error:\n{}", e));
            }
            CommandEvent::Terminated(_) => match duration {
                Some(dur) => return Ok(dur.to_string()),
                None => return Err(FfmpegError::StdErr(stderr)),
            },
            _ => return Err(FfmpegError::ProcessInterrupted),
        }
    }
    Err(FfmpegError::ProcessInterrupted)
}

pub fn normalize_path(path: &str) -> PathBuf {
    let normalized = path
        .replace("/", std::path::MAIN_SEPARATOR_STR)
        .replace("\\", std::path::MAIN_SEPARATOR_STR);
    Path::new(&normalized).to_path_buf()
}

pub fn find_video_index(parent_path: &Path, selected_video_path: String) -> Result<u32, MpvError> {
    //println!("looking for selected video: {selected_video_path}");
    let mut media_files: Vec<fs::DirEntry> = fs::read_dir(parent_path)?
        .par_bridge()
        .filter_map(|entry| entry.ok())
        .collect();
    media_files.retain(|entry| {
        if let Ok(metadata) = entry.metadata() {
            if metadata.is_file() {
                if let Some(extension) = entry.path().extension() {
                    if let Some(extension_str) = extension.to_str() {
                        let extension_str = extension_str.to_lowercase();
                        return SUPPORTED_VIDEO_FORMATS.get_key(&extension_str).is_some()
                            || SUPPORTED_AUDIO_FORMATS.get_key(&extension_str).is_some()
                            || SUPPORTED_SUBTITLE_FORMATS.get_key(&extension_str).is_some();
                    }
                }
            }
        }
        false
    });
    media_files.par_sort_by(|a, b| {
        let num_a = EPISODE_TITLE_REGEX
            .captures(&a.file_name().to_string_lossy())
            .and_then(|caps| caps.get(caps.len() - 1))
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(0);
        let num_b = EPISODE_TITLE_REGEX
            .captures(&b.file_name().to_string_lossy())
            .and_then(|caps| caps.get(caps.len() - 1))
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(0);
        num_a.cmp(&num_b)
    });

    // debug for the media files
    //dbg!(&media_files);

    let selected_video_file_name = match Path::new(&selected_video_path).file_name() {
        Some(file_name) => file_name,
        None => return Err(MpvError::InvalidPathName(selected_video_path)),
    };

    let current_video_index = media_files
        .par_iter()
        .position_any(|entry| entry.file_name() == selected_video_file_name);
    //dbg!(current_video_index);
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
pub fn path_exists(path: &str) -> bool {
    Path::exists(&PathBuf::from(path))
}

#[tauri::command]
pub fn show_in_folder(path: String) {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args(["/select,", &path]) // The comma after select is not a typo
            .spawn()
            .unwrap()
            .wait()
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
        Command::new("open")
            .args(["-R", &path])
            .spawn()
            .unwrap()
            .wait()
            .unwrap();
    }
}
