use std::{fs::create_dir, path::PathBuf, sync::LazyLock};

use data::v1::{OsFolder, OsFolderKey, OsVideo, OsVideoKey, User};
use native_db::*;
use tauri::{command, AppHandle, Manager};

use crate::{error::DatabaseError, misc::get_date_time, mpv::EPISODE_TITLE_REGEX};

pub mod data {
    use native_db::{native_db, ToKey};
    use native_model::{native_model, Model};
    use serde::{Deserialize, Serialize};

    pub mod v1 {
        use super::*;

        #[derive(Serialize, Deserialize, Debug)]
        #[native_model(id = 1, version = 1)]
        #[native_db]
        pub struct User {
            #[primary_key]
            pub id: String,
            #[secondary_key(unique)]
            pub username: String,
            pub settings: Settings,
        }

        #[derive(Serialize, Deserialize, Clone, Debug)]
        #[native_model(id = 3, version = 1)]
        #[native_db]
        pub struct OsFolder {
            #[secondary_key]
            pub user_id: String,
            #[primary_key]
            pub path: String,
            pub title: String,
            #[secondary_key]
            pub parent_path: Option<String>,
            pub os_videos: Vec<OsVideo>,
            pub last_watched_video: Option<OsVideo>,
            pub cover_img_path: Option<String>,
            pub update_date: String,
            pub update_time: String,
        }

        #[derive(Serialize, Deserialize, Clone, Debug)]
        #[native_model(id = 4, version = 1)]
        #[native_db]
        pub struct OsVideo {
            #[secondary_key]
            pub user_id: String,
            #[secondary_key]
            pub main_folder_path: String,
            #[primary_key]
            pub path: String,
            pub title: String,
            pub cover_img_path: Option<String>,
            pub watched: bool,
            pub update_date: String,
            pub update_time: String,
        }

        #[derive(Serialize, Deserialize, Clone, Debug)]
        #[native_model(id = 5, version = 1)]
        #[native_db]
        pub struct Settings {
            #[primary_key]
            pub user_id: String,
            pub mpv_path: Option<String>,
            pub plugins_path: Option<String>,
            pub autoplay: bool,
            pub update_date: String,
            pub update_time: String,
        }
    }
}

static DBMODELS: LazyLock<Models> = LazyLock::new(|| {
    let mut models = Models::new();
    models.define::<data::v1::User>().unwrap();
    models.define::<data::v1::OsFolder>().unwrap();
    models.define::<data::v1::OsVideo>().unwrap();
    models
});

pub fn init_database(app_data_dir: &PathBuf, handle: &AppHandle) -> Result<(), db_type::Error> {
    if !app_data_dir.exists() {
        std::fs::create_dir(app_data_dir)?;
        std::fs::create_dir(app_data_dir.join("frames"))?;
    }
    let plugins_dir = app_data_dir.join("plugins");
    if !plugins_dir.exists() {
        create_dir(plugins_dir).unwrap();
    }
    let db_path = app_data_dir.join("main").with_extension("rdb");
    Builder::new().create(&DBMODELS, &db_path)?;

    handle.manage(db_path);
    Ok(())
}

#[command]
pub fn get_os_folders(handle: AppHandle, user_id: String) -> Result<Vec<OsFolder>, DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().create(&DBMODELS, db_path)?;

    let rtx = db.r_transaction()?;
    let mut folders: Vec<OsFolder> = rtx
        .scan()
        .secondary(OsFolderKey::user_id)?
        .start_with(user_id.as_str())?
        .try_collect()?;

    folders.retain(|folder| folder.parent_path.is_none());

    println!("folders = {:#?}", folders);

    if folders.is_empty() {
        return Err(DatabaseError::OsFoldersNotFound(format!(
            "0 OsFolders found belonging to user_id: {user_id}",
        )));
    }

    Ok(folders)
}

#[command]
pub fn get_os_folder_by_path(
    handle: AppHandle,
    folder_path: String,
) -> Result<OsFolder, DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().create(&DBMODELS, db_path)?;

    let rtx = db.r_transaction()?;
    let folder: Option<OsFolder> = rtx.get().primary(folder_path.as_str())?;

    if let Some(folder) = folder {
        return Ok(folder);
    }

    Err(DatabaseError::OsFoldersNotFound(format!(
        "OsFolder found not found from path: {folder_path}",
    )))
}

#[command]
pub fn get_os_folders_by_path(
    handle: AppHandle,
    parent_path: String,
) -> Result<Vec<OsFolder>, DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().create(&DBMODELS, db_path)?;

    let rtx = db.r_transaction()?;
    let folders: Vec<OsFolder> = rtx
        .scan()
        .secondary(OsFolderKey::parent_path)?
        .start_with(Some(parent_path.as_str()))?
        .try_collect()?;

    if folders.is_empty() {
        return Err(DatabaseError::OsFoldersNotFound(format!(
            "0 child folders found in dir: {parent_path}",
        )));
    }

    Ok(folders)
}

#[command]
pub fn update_os_folders(
    handle: AppHandle,
    os_folders: Vec<OsFolder>,
) -> Result<(), DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().open(&DBMODELS, db_path)?;
    let rtx = db.rw_transaction()?;
    let (date, time) = get_date_time();

    for mut folder in os_folders {
        folder.update_date = date.clone();
        folder.update_time = time.clone();

        rtx.upsert(folder)?;
    }

    rtx.commit()?;

    Ok(())
}

#[command]
pub fn update_os_videos(
    handle: &AppHandle,
    os_videos: Vec<OsVideo>,
    watched: Option<bool>,
) -> Result<(), DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().open(&DBMODELS, db_path)?;
    let rtx = db.rw_transaction()?;
    let (date, time) = get_date_time();

    for mut vid in os_videos {
        vid.update_date = date.clone();
        vid.update_time = time.clone();

        if let Some(watched) = watched {
            vid.watched = watched;
        }

        // if let Some(cover_img) = &vid.cover_img_path {
        //     if !check_cover_img_exists(cover_img) {
        //         vid.cover_img_path = None;
        //     }
        // }

        rtx.upsert(vid)?;
    }

    rtx.commit()?;

    Ok(())
}

#[command]
pub fn get_os_videos(
    handle: AppHandle,
    main_folder_path: String,
) -> Result<Vec<OsVideo>, DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().create(&DBMODELS, db_path)?;

    let rtx = db.r_transaction()?;
    let mut folders: Vec<OsVideo> = rtx
        .scan()
        .secondary(OsVideoKey::main_folder_path)?
        .start_with(main_folder_path.as_str())?
        .take_while(|e: &Result<OsVideo, db_type::Error>| match e {
            Ok(vid) => vid.main_folder_path == main_folder_path,
            Err(_) => false,
        })
        .try_collect()?;

    if folders.is_empty() {
        return Err(DatabaseError::OsVideosNotFound(format!(
            "0 OsVideos found belonging to: {main_folder_path}",
        )));
    }

    folders.sort_by(|a, b| {
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

    //println!("{:#?}", folders);

    Ok(folders)
}

#[command]
pub fn delete_os_folders(
    handle: AppHandle,
    os_folders: Vec<OsFolder>,
) -> Result<(), DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().open(&DBMODELS, db_path)?;

    let rtx = db.rw_transaction()?;

    for folder in os_folders {
        rtx.remove(folder)?;
    }

    rtx.commit()?;

    Ok(())
}

#[command]
pub fn get_default_user(handle: AppHandle) -> Result<User, DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().create(&DBMODELS, db_path)?;

    let rtx = db.r_transaction()?;
    let user: Option<User> = rtx.get().primary("1")?;

    user.ok_or_else(|| DatabaseError::UserNotFound(String::from("User with ID 1 not found.")))
}

#[command]
pub fn get_user_by_id(handle: AppHandle, user_id: String) -> Result<User, DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().create(&DBMODELS, db_path)?;

    let rtx = db.r_transaction()?;
    let user: Option<User> = rtx.get().primary(user_id.as_str())?;

    user.ok_or_else(|| DatabaseError::UserNotFound(format!("User with ID {user_id} not found.")))
}

#[command]
pub fn update_user(user: User, handle: AppHandle) -> Result<(), DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().open(&DBMODELS, db_path)?;

    let rtx = db.rw_transaction()?;
    rtx.upsert(user)?;
    rtx.commit()?;

    Ok(())
}
