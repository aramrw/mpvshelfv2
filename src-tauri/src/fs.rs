use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::thread::sleep;
use std::time::{Duration, Instant};
//use std::time::Instant;
use futures_util::TryStreamExt;
use rayon::iter::{
    IndexedParallelIterator, IntoParallelIterator, IntoParallelRefIterator, ParallelBridge,
};
use rayon::slice::ParallelSliceMut;
use std::{env, fs, io};
use std::{fs::read_dir, process::Command};
use tokio::io::AsyncWriteExt;

use crate::database::data::v1::OsVideo;
use crate::database::{data::v1::OsFolder, update_os_folders};
use crate::database::{delete_os_folders, delete_os_videos, update_os_videos};
use crate::error::{MpvError, MpvShelfError, ReadDirError};
use crate::misc::get_date_time;
use crate::mpv::EPISODE_TITLE_REGEX;
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

fn read_dir_helper(
    path: &str,
    child_folder_paths: &mut Vec<String>,
    video_file_paths: &mut Vec<String>,
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

#[command]
pub fn upsert_read_os_dir(
    handle: AppHandle,
    dir: String,
    parent_path: Option<String>,
    user_id: String,
    c_folders: Option<Vec<OsFolder>>,
    c_videos: Option<Vec<OsVideo>>,
) -> Result<bool, MpvShelfError> {
    let mut del_cf: Vec<OsFolder> = Vec::new();
    let mut del_v: Vec<OsVideo> = Vec::new();

    if let Some(c_folders) = &c_folders {
        //println!("| c_folders_length: {}", c_folders.len());
        for sf in c_folders {
            if !Path::new(&sf.path).exists() {
                del_cf.push(sf.clone())
            }
        }
    }

    if let Some(c_videos) = &c_videos {
        //println!("| c_videos_length: {}", c_videos.len());

        for sv in c_videos {
            if !Path::new(&sv.path).exists() {
                del_v.push(sv.clone())
            }
        }
    }

    let group = match read_os_folder_dir(
        handle.clone(),
        dir,
        user_id,
        None,
        parent_path,
        c_folders,
        c_videos,
    ) {
        Ok(g) => g,
        Err(ReadDirError::FullyHydrated(_)) => return Ok(false),
        Err(e) => return Err(MpvShelfError::ReadDir(e)),
    };

    let (main_folder, mut new_cfs, new_vids) = group;
    let cover_img = &main_folder.cover_img_path.clone();

    if !del_cf.is_empty() {
        delete_os_folders(handle.clone(), del_cf)?;
    }
    if !del_v.is_empty() {
        delete_os_videos(&handle, del_v)?;
    }

    new_cfs.push(main_folder);
    update_os_folders(handle.clone(), new_cfs)?;
    update_os_videos(handle.clone(), new_vids)?;

    let now = Instant::now();
    if let Some(path) = cover_img {
        while fs::metadata(path).is_err() {
            if now.elapsed() >= Duration::from_millis(5000) {
                break;
            } else {
                sleep(Duration::from_millis(100));
            }
        }
    }
    Ok(true)
}

type FolderGroup = (OsFolder, Vec<OsFolder>, Vec<OsVideo>);

#[command]
pub fn read_os_folder_dir(
    handle: AppHandle,
    path: String,
    user_id: String,
    update_datetime: Option<(String, String)>,
    parent_path: Option<String>,
    c_folders: Option<Vec<OsFolder>>,
    c_videos: Option<Vec<OsVideo>>,
) -> Result<FolderGroup, ReadDirError> {
    let mut child_folder_paths: Vec<String> = Vec::new();
    let mut video_file_paths: Vec<String> = Vec::new();
    let mut update_datetime = update_datetime;
    let app_data_dir = handle.path().app_data_dir()?;

    read_dir_helper(&path, &mut child_folder_paths, &mut video_file_paths)?;

    if child_folder_paths.is_empty() && video_file_paths.is_empty() {
        return Err(ReadDirError::Io(io::Error::new(
            io::ErrorKind::NotFound,
            format!("{path} contains 0 supported files."),
        )));
    } else if let Some(ref c_videos) = c_videos {
        if video_file_paths.len() == c_videos.len() {
            if let Some(ref c_folders) = c_folders {
                if child_folder_paths.len() == c_folders.len() {
                    return Err(ReadDirError::FullyHydrated(path));
                }
            } else {
                return Err(ReadDirError::FullyHydrated(path));
            }
        }
    } else if let Some(ref c_folders) = c_folders {
        if child_folder_paths.len() == c_folders.len() {
            return Err(ReadDirError::FullyHydrated(path));
        }
    }

    let os_folder_path_clone = path.clone();
    let os_folder = Path::new(&os_folder_path_clone);
    if update_datetime.is_none() {
        let (update_date, update_time) = get_date_time();
        update_datetime = Some((update_date, update_time));
    }

    let update_date = update_datetime.clone().unwrap().0;
    let update_time = update_datetime.clone().unwrap().1;

    let mut total_child_folders: Vec<OsFolder> = Vec::new();
    let mut total_videos: Vec<OsVideo> = Vec::new();
    let c_videos_paths: Option<HashSet<String>> =
        c_videos.map(|videos| videos.into_iter().map(|os_video| os_video.path).collect());

    let mut current_folder_videos: Vec<OsVideo> = video_file_paths
        .into_par_iter()
        .enumerate()
        .filter_map(|(i, vid_path)| {
            if let Some(ref paths) = c_videos_paths {
                if paths.contains(&vid_path) {
                    return None;
                }
            }
            create_os_video(
                &handle,
                user_id.clone(),
                parent_path.as_ref(),
                path.clone(),
                vid_path,
                i + 3,
                update_date.clone(),
                update_time.clone(),
                &app_data_dir,
            )
            .ok()
        })
        .collect::<Vec<OsVideo>>();

    let mut first_video: Option<OsVideo> = None;
    if let Some(mut first_vid) = current_folder_videos.first().cloned() {
        let new_cover_img_path =
            join_cover_img_path(parent_path.as_ref(), &path, &first_vid.path, &app_data_dir)?;
        call_ffmpeg_sidecar(
            &handle,
            None,
            &first_vid.path,
            Path::new(&new_cover_img_path),
        )
        .unwrap();
        first_vid.cover_img_path = Some(new_cover_img_path);
        first_video = Some(first_vid);
    }

    current_folder_videos.par_sort_by(|a, b| {
        // Extract the episode number from the title using regex
        let num_a = EPISODE_TITLE_REGEX
            .captures(&a.title)
            .and_then(|caps| caps.get(1)) // Assuming the first capturing group contains the episode number
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(0);

        let num_b = EPISODE_TITLE_REGEX
            .captures(&b.title)
            .and_then(|caps| caps.get(1))
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(0);

        num_a.cmp(&num_b)
    });
    total_videos.extend(current_folder_videos);

    let child_folder_groups: Vec<FolderGroup> = child_folder_paths
        .into_par_iter()
        .filter_map(|folder_path| {
            read_os_folder_dir(
                handle.clone(),
                folder_path,
                user_id.clone(),
                update_datetime.clone(),
                Some(path.clone()),
                None,
                None,
            )
            .ok()
        })
        .collect();

    for group in child_folder_groups.into_iter() {
        let (folder, c_folders, g_videos) = group;

        if first_video.is_none() {
            if let Some(mut first_vid) = g_videos.first().cloned() {
                let new_cover_img_path = join_cover_img_path(
                    parent_path.as_ref(),
                    &path,
                    &first_vid.path,
                    &app_data_dir,
                )?;
                call_ffmpeg_sidecar(
                    &handle,
                    None,
                    &first_vid.path,
                    Path::new(&new_cover_img_path),
                )
                .unwrap();
                first_vid.cover_img_path = Some(new_cover_img_path);
                first_video = Some(first_vid);
            }
        }

        total_child_folders.push(folder);
        total_child_folders.extend(c_folders);
        total_videos.extend(g_videos);
    }

    let mut cover_img_path = None;
    if let Some(first_vid) = &first_video {
        cover_img_path = first_vid.cover_img_path.clone();
    }

    let main_folder = OsFolder {
        user_id,
        path,
        title: os_folder.file_name().unwrap().to_string_lossy().to_string(),
        parent_path,
        last_watched_video: first_video,
        cover_img_path,
        update_date,
        update_time,
    };

    Ok((main_folder, total_child_folders, total_videos))
}

fn create_os_video(
    handle: &AppHandle,
    user_id: String,
    super_parent: Option<impl AsRef<str>>,
    main_folder_path: String,
    path: String,
    index: usize,
    update_date: String,
    update_time: String,
    app_data_dir: &Path,
) -> Result<OsVideo, io::Error> {
    let title =
        Path::new(&path)
            .file_name()
            .ok_or_else(|| {
                io::Error::new(
        io::ErrorKind::InvalidInput,
        format!("'{path}' contained invalid characters when trying get the the OsVideo title."),
    )
            })?
            .to_string_lossy()
            .to_string();

    let cover_img_path = join_cover_img_path(super_parent, &main_folder_path, &path, app_data_dir)?;
    if !check_cover_img_exists(&cover_img_path) {
        call_ffmpeg_sidecar(handle, Some(index), &path, Path::new(&cover_img_path)).unwrap();
    }

    let vid = OsVideo {
        user_id,
        main_folder_path,
        path,
        title,
        cover_img_path: Some(cover_img_path),
        watched: false,
        duration: 0,
        position: 0,
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

fn call_ffmpeg_sidecar(
    handle: &AppHandle,
    index: Option<usize>,
    entry_path: impl AsRef<str>,
    entry_frame_full_path: &Path,
) -> Result<(), MpvError> {
    let frame_index = index.unwrap_or(5).to_string();
    let sidecar_cmd = handle.shell().sidecar("ffmpeg").unwrap().args([
        "-ss",
        frame_index.as_str(),
        "-i",
        entry_path.as_ref(),
        "-frames:v",
        "1",
        &entry_frame_full_path.to_string_lossy(),
    ]);

    let (mut _rx, mut _child) = sidecar_cmd.spawn().unwrap();

    // while let Some(event) = rx.recv() {
    //     match event {
    //         // CommandEvent::Stdout(line) => {
    //         //     println!("stdout: {}", String::from_utf8_lossy(&line));
    //         // }
    //         // CommandEvent::Stderr(line) => {
    //         //     eprintln!("stderr: {}", String::from_utf8_lossy(&line));
    //         // }
    //         CommandEvent::Terminated(_) => {
    //             // Process has finished
    //             return Ok(());
    //         }
    //         _ => {}
    //     }
    // }

    Ok(())
}

pub fn normalize_path(path: &str) -> PathBuf {
    let normalized = path
        .replace("/", std::path::MAIN_SEPARATOR_STR)
        .replace("\\", std::path::MAIN_SEPARATOR_STR);
    Path::new(&normalized).to_path_buf()
}

pub fn find_video_index(parent_path: &Path, selected_video_path: String) -> Result<u32, MpvError> {
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

    media_files.par_sort_by(|a, b| {
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
        .par_iter()
        .position_any(|entry| entry.file_name() == selected_video_file_name);

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
