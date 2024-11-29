import { invoke } from "@tauri-apps/api/core";
import { OsFolder, OsVideo } from "../models";

export default async function upsert_read_os_dir(
  dir: String,
  parentPath: String | undefined,
  userId: String,
  oldDirs: OsFolder[] | undefined,
  oldVideos: OsVideo[] | undefined
) {
  try {
    return await invoke("upsert_read_os_dir", { dir, parentPath, userId, oldDirs, oldVideos }) as boolean;
  } catch (e) {
    console.error(e);
    return null;
  }
}

