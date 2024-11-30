use std::{
    fs::{self, create_dir, remove_file},
    io,
    path::{Path, PathBuf},
    sync::LazyLock,
};

use data::v1::{OsFolder, OsFolderKey, OsVideo, OsVideoKey, User};
use native_db::*;
use tauri::{command, AppHandle, Manager};

use crate::{
    error::DatabaseError,
    fs::{join_cover_img_path, HasPath},
    misc::get_date_time,
    mpv::EPISODE_TITLE_REGEX,
};
use serde::{Deserialize, Serialize};
use std::time::{Duration, SystemTime};

#[derive(Serialize, Deserialize, Clone, Debug, Eq, Hash, PartialEq)]
pub struct FileMetadata {
    #[serde(
        serialize_with = "serialize_system_time",
        deserialize_with = "deserialize_system_time"
    )]
    pub created: Option<SystemTime>,

    #[serde(
        serialize_with = "serialize_system_time",
        deserialize_with = "deserialize_system_time"
    )]
    pub modified: Option<SystemTime>,

    #[serde(
        serialize_with = "serialize_system_time",
        deserialize_with = "deserialize_system_time"
    )]
    pub accessed: Option<SystemTime>,

    pub size: Option<u64>,
}

impl FileMetadata {
    // Constructor to get metadata of a file
    pub fn from_path(path: impl AsRef<Path>) -> Option<Self> {
        let metadata = std::fs::metadata(path).ok();

        if let Some(metadata) = metadata {
            let modified = metadata.modified().ok();
            let created = metadata.created().ok();
            let accessed = metadata.accessed().ok();
            let size = Some(metadata.len());

            return Some(Self {
                modified,
                created,
                accessed,
                size,
            });
        }

        None
    }
}

// Serialize SystemTime as u64 (seconds since epoch)
fn serialize_system_time<S>(time: &Option<SystemTime>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    match time {
        Some(t) => {
            let duration_since_epoch = t.duration_since(SystemTime::UNIX_EPOCH).unwrap();
            serializer.serialize_some(&duration_since_epoch.as_secs())
        }
        None => serializer.serialize_none(),
    }
}

// Deserialize u64 back into SystemTime
fn deserialize_system_time<'de, D>(deserializer: D) -> Result<Option<SystemTime>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let seconds: Option<u64> = Option::deserialize(deserializer)?;
    Ok(seconds.map(|sec| SystemTime::UNIX_EPOCH + Duration::new(sec, 0)))
}

pub mod data {
    use native_db::{native_db, ToKey};
    use native_model::{native_model, Model};
    use serde::{Deserialize, Serialize};

    pub mod v1 {
        use crate::database::FileMetadata;

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
            /// * in seconds.
            /// `19:45:12` = `1185` min.
            pub duration: u64,
            pub position: u64,
            pub metadata: Option<FileMetadata>,
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

impl OsFolder {
    pub fn get_appdata_frames_folder(&self, app_data_dir: &Path) -> PathBuf {
        app_data_dir.join("frames").join(&self.title)
    }
}

impl HasPath for OsFolder {
    fn path(&self) -> &str {
        self.path.as_ref()
    }
}

impl HasPath for OsVideo {
    fn path(&self) -> &str {
        self.path.as_ref()
    }
}

impl OsVideo {
    pub fn new(
        user_id: String,
        super_parent: Option<impl AsRef<str>>,
        main_folder_path: String,
        path: String,
        update_date: String,
        update_time: String,
        app_data_dir: &Path,
    ) -> Result<OsVideo, io::Error> {
        let title = Path::new(&path)
            .file_name()
            .ok_or_else(|| {
                io::Error::new(
        io::ErrorKind::InvalidInput,
        format!("'{path}' contained invalid characters when trying get the the OsVideo title."),
    )
            })?
            .to_string_lossy()
            .to_string();

        let metadata = FileMetadata::from_path(&path);

        let cover_img_path =
            join_cover_img_path(super_parent, &main_folder_path, &path, app_data_dir)?;
        // if !check_cover_img_exists(&cover_img_path) {
        //     call_ffmpeg_sidecar(handle, Some(index), &path, Path::new(&cover_img_path)).unwrap();
        // }

        let vid = OsVideo {
            user_id,
            main_folder_path,
            path,
            title,
            cover_img_path: Some(cover_img_path),
            watched: false,
            duration: 0,
            position: 0,
            metadata,
            update_date,
            update_time,
        };

        Ok(vid)
    }

    pub fn is_stale_metadata(&self) -> bool {
        if let Some(ref current_metadata) = self.metadata {
            // Fetch the current metadata of the file
            match FileMetadata::from_path(&self.path) {
                Some(new_metadata) => {
                    // Compare the modified time and size
                    current_metadata.size != new_metadata.size
                }
                None => true, // If metadata can't be fetched, assume it's stale
            }
        } else {
            true // If no metadata is stored, consider it stale
        }
    }

    fn _delete_cover_img(&self) -> io::Result<()> {
        if let Some(path) = &self.cover_img_path {
            remove_file(path)?
        }
        Ok(())
    }
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
pub fn update_os_videos(handle: AppHandle, os_videos: Vec<OsVideo>) -> Result<(), DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().open(&DBMODELS, db_path)?;
    let rtx = db.rw_transaction()?;
    let (date, time) = get_date_time();

    for mut vid in os_videos {
        vid.update_date = date.clone();
        vid.update_time = time.clone();

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
    let app_data_dir = handle.path().app_data_dir()?;
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().open(&DBMODELS, db_path)?;

    let rwtx = db.rw_transaction()?;

    for folder in os_folders {
        let child_folders: Vec<OsFolder> = rwtx
            .scan()
            .secondary(OsFolderKey::parent_path)?
            .start_with(Some(folder.path.as_str()))?
            .try_collect()?;

        let videos: Vec<OsVideo> = rwtx
            .scan()
            .secondary(OsVideoKey::main_folder_path)?
            .start_with(folder.path.as_str())?
            .try_collect()?;

        for vid in videos {
            rwtx.remove(vid)?;
        }

        for cf in child_folders {
            rwtx.remove(cf)?;
        }

        // removes the frames folder
        if let Err(e) = fs::remove_dir_all(folder.get_appdata_frames_folder(&app_data_dir)) {
            if e.kind() != io::ErrorKind::NotFound {
                return Err(DatabaseError::IoError(e));
            }
        }

        rwtx.remove(folder)?;
    }

    rwtx.commit()?;

    Ok(())
}

pub fn delete_os_videos(handle: &AppHandle, os_videos: Vec<OsVideo>) -> Result<(), DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().open(&DBMODELS, db_path)?;

    let rwtx = db.rw_transaction()?;

    for vid in os_videos {
        let videos: Vec<OsVideo> = rwtx
            .scan()
            .secondary(OsVideoKey::main_folder_path)?
            .start_with(vid.path.as_str())?
            .try_collect()?;

        for vid in videos {
            vid._delete_cover_img()?;
            rwtx.remove(vid)?;
        }

        rwtx.remove(vid)?;
    }

    rwtx.commit()?;

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
