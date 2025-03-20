use std::{io, path::PathBuf, string::FromUtf8Error};

use native_db::db_type::Error;
use tauri::ipc::InvokeError;

#[derive(thiserror::Error, Debug)]
pub enum InitError {
    #[error("{0:#?}")]
    TuariError(#[from] tauri::Error),
}

#[derive(thiserror::Error, Debug)]
pub enum MpvShelfError {
    #[error("{0}")]
    Database(#[from] DatabaseError),
    #[error("{0}")]
    Mpv(#[from] MpvError),
    #[error("{0}")]
    Http(#[from] HttpClientError),
    #[error("{0}")]
    ReadDir(#[from] ReadDirError),
    #[error("{0}")]
    Ffmpeg(#[from] FfmpegError),
}

#[derive(thiserror::Error, Debug)]
pub enum DatabaseError {
    #[error("{0:#?}")]
    NativeDbError(#[from] Error),
    #[error("User Not Found: {0}")]
    UserNotFound(String),
    #[error("OsFolders Not Found: {0}")]
    OsFoldersNotFound(String),
    #[error("{0:#?}")]
    OsVideosNotFound(String),
    #[error("{0:#?}")]
    IoError(#[from] io::Error),
    #[error("{0:#?}")]
    TuariError(#[from] tauri::Error),
    #[error("{0}")]
    SortType(#[from] SortTypeError),
}

#[derive(thiserror::Error, Debug)]
pub enum ReadDirError {
    #[error("{0}")]
    Io(#[from] io::Error),
    #[error("{0} contains all the same folders & files as it did before")]
    FullyHydrated(String),
    #[error("{0}")]
    Tuari(#[from] tauri::Error),
}

#[derive(thiserror::Error, Debug)]
pub enum MpvError {
    #[error("Mpv Player was not found at: {0}")]
    AbsolutePathNotFound(String),
    #[error("Failed to execute Mpv Player: {0}")]
    IoError(#[from] io::Error),
    #[error("{0:#?}")]
    TuariError(#[from] tauri::Error),
    #[error("Failed to get Webview Window labeled: {0}")]
    WebviewWindowNotFound(String),
    #[error("OsVideo {0} not found in specified directory.")]
    OsVideoNotFound(String),
    #[error("Filename contains invalid characters: {0}")]
    InvalidPathName(String),
    #[error("{0}")]
    DatabaseError(#[from] DatabaseError),
    #[error("{0}")]
    StdOutError(#[from] MpvStdoutError),
}

#[non_exhaustive]
#[derive(thiserror::Error, Debug)]
pub enum FfmpegError {
    #[error("{0}")]
    Io(#[from] io::Error),
    #[error("{0}")]
    TauriPluginShell(#[from] tauri_plugin_shell::Error),
    #[error("ffmpeg panicked: {0}")]
    StdErr(String),
    #[error("ffmpeg process ended abnormally without properly terminating - for instance, if it was forcefully killed or if there was a system-level interruption.")]
    ProcessInterrupted,
}

#[derive(thiserror::Error, Debug)]
pub enum MpvStdoutError {
    #[error("Failed to convert stdout bytes to String: {0}")]
    Utf8Error(#[from] FromUtf8Error),
    #[error("failed to find title from mpv's stdout:\n {0}")]
    MissingVideoTitle(String),
    #[error("failed to find timestamp from mpv's stdout:\n {0}")]
    MissingTimestamp(String),
    #[error("failed to parse int: {0}; reason: {1}")]
    ParseInt(String, String),
    #[error("the given timestamp is invalid: {0}")]
    InvalidTimestamp(String),
}

#[derive(thiserror::Error, Debug)]
pub enum HttpClientError {
    #[error("{0}")]
    Request(#[from] reqwest::Error),
    #[error("{0:#?}")]
    Tuari(#[from] tauri::Error),
    #[error("{0:#?}")]
    Io(#[from] io::Error),
}

#[derive(thiserror::Error, Debug)]
pub enum SortTypeError {
    #[error("could not convert to SortType from &str: {0}")]
    FromStr(String),
}

impl From<SortTypeError> for InvokeError {
    fn from(error: SortTypeError) -> Self {
        InvokeError::from_error(error)
    }
}

impl From<ReadDirError> for InvokeError {
    fn from(error: ReadDirError) -> Self {
        InvokeError::from_error(error)
    }
}

impl From<MpvShelfError> for InvokeError {
    fn from(error: MpvShelfError) -> Self {
        InvokeError::from_error(error)
    }
}

impl From<HttpClientError> for InvokeError {
    fn from(error: HttpClientError) -> Self {
        InvokeError::from_error(error)
    }
}

impl From<PathBuf> for MpvError {
    fn from(path: PathBuf) -> Self {
        MpvError::OsVideoNotFound(path.to_string_lossy().to_string())
    }
}

impl From<MpvError> for InvokeError {
    fn from(error: MpvError) -> Self {
        InvokeError::from_error(error)
    }
}

impl From<DatabaseError> for InvokeError {
    fn from(error: DatabaseError) -> Self {
        InvokeError::from_error(error)
    }
}
