use std::io;

use native_db::db_type::Error;
use tauri::ipc::InvokeError;

#[derive(thiserror::Error, Debug)]
pub enum DatabaseError {
    #[error("{0:#?}")]
    NativeDbError(#[from] Error),
    #[error("User Not Found: {0}")]
    UserNotFound(String),
}

#[derive(thiserror::Error, Debug)]
pub enum IoError {
    #[error("{0:#?}")]
    NativeDbError(#[from] Error),
    #[error("{0:#?}")]
    IoError(#[from] io::Error),
}

impl From<IoError> for InvokeError {
    fn from(error: IoError) -> Self {
        InvokeError::from_error(error)
    }
}

impl From<DatabaseError> for InvokeError {
    fn from(error: DatabaseError) -> Self {
        InvokeError::from_error(error)
    }
}
