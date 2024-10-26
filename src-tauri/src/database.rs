use std::{path::PathBuf, sync::LazyLock};

use data::v1::{User, UserKey};
use native_db::*;
use tauri::{command, AppHandle, Manager};

use crate::error::DatabaseError;

pub mod data {
    use native_db::{native_db, ToKey};
    use native_model::{native_model, Model};
    use serde::{Deserialize, Serialize};

    pub mod v1 {
        use std::ffi::OsString;

        use super::*;

        #[derive(Serialize, Deserialize, Debug)]
        #[native_model(id = 1, version = 1)]
        #[native_db]
        pub struct User {
            #[primary_key]
            pub id: String,
            #[secondary_key(unique)]
            pub username: String,
        }

        #[derive(Serialize, Deserialize, Debug)]
        #[native_model(id = 2, version = 1)]
        #[native_db]
        pub struct GlobalUser {
            #[primary_key]
            pub id: String,
            pub username: String,
        }

        #[derive(Serialize, Deserialize, Debug)]
        #[native_model(id = 3, version = 1)]
        #[native_db]
        pub struct OsFolder {
            #[primary_key]
            pub user_id: String,
            #[secondary_key]
            pub path: String,
            pub cover_img_path: Option<String>,
        }
    }
}

static DBMODELS: LazyLock<Models> = LazyLock::new(|| {
    let mut models = Models::new();
    models.define::<data::v1::User>().unwrap();
    models
});

pub fn init_database(app_data_dir: &PathBuf, handle: &AppHandle) -> Result<(), db_type::Error> {
    if !app_data_dir.exists() {
        std::fs::create_dir(app_data_dir)?;
        std::fs::create_dir(app_data_dir.join("frames"))?;
    }
    let db_path = app_data_dir.join("main").with_extension("rdb");
    Builder::new().create(&DBMODELS, &db_path)?;

    handle.manage(db_path);
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
pub fn update_user(user: User, handle: AppHandle) -> Result<(), DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().open(&DBMODELS, db_path)?;

    let rtx = db.rw_transaction()?;
    rtx.insert(user)?;
    rtx.commit()?;

    Ok(())
}
