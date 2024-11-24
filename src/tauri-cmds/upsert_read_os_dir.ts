import { invoke } from "@tauri-apps/api/core";
import { OsFolder, OsVideo } from "../models";

export default async function upsert_read_os_dir(
  path: String,
  parentPath: String | undefined,
  userId: String,
  cFolders: OsFolder[] | undefined,
  cVideos: OsVideo[] | undefined
) {
  try {
    return await invoke("upsert_read_os_dir", { path, parentPath, userId, cFolders, cVideos }) as boolean;
  } catch (e) {
    console.error(e);
    return null;
  }
}

