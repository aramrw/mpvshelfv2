use std::io;

use native_db::db_type::Error;
use tauri::ipc::InvokeError;

#[derive(thiserror::Error, Debug)]
pub enum DatabaseError {
    #[error("{0:#?}")]
    NativeDbError(#[from] Error),
    #[error("User Not Found: {0}")]
    UserNotFound(String),
    #[error("OsFolders Not Found: {0}")]
    OsFoldersNotFound(String),
    #[error("{0:#?}")]
    IoError(#[from] io::Error),
    #[error("{0:#?}")]
    TuariError(#[from] tauri::Error),
}

#[derive(thiserror::Error, Debug)]
pub enum MpvError {
    #[error("MPV Player was not found on the System PATH.")]
    SudoPATHNotFound,
    #[error("MPV Player was not found @ the specified path: {0}")]
    AbsolutePathNotFound(String),
    #[error("Failed to execute MPV Player: {0}")]
    CmdError(#[from] io::Error),

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
