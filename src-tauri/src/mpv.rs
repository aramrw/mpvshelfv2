use tauri::command;

use crate::error::MpvError;
use std::io;
use std::process::Command;

#[command]
pub fn mpv_system_check(mpv_path: Option<String>) -> Result<(), MpvError> {
    let mpv_exe = mpv_path.as_deref().unwrap_or("mpv");

    // Run the command and handle possible errors
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
        Err(e) => Err(MpvError::CmdError(e)),
    }
}
